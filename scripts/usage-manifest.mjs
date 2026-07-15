#!/usr/bin/env node
// Production usage manifest — instant pre-push survey of SUI consumers.
//
// Scans the SUI-consuming production repos listed in usage-manifest.config.json
// and emits docs/usage-manifest.json: the authoritative answer to "which SUI
// components/factories/variants does production actually use, and where".
//
// Zero npm dependencies. Deterministic output (sorted keys/arrays, no
// timestamps) so reruns over unchanged sources are byte-identical.
//
// CLI:
//   node scripts/usage-manifest.mjs           regenerate docs/usage-manifest.json
//   node scripts/usage-manifest.mjs --check   exit 1 if the committed manifest is stale
//   node scripts/usage-manifest.mjs --stats   print timing + per-repo file counts
//
// Speed: files are enumerated via `git ls-files` (respects .gitignore), a
// size+mtime cache at scripts/.usage-manifest-cache.json (gitignored) means a
// warm run stats candidates but re-reads only changed files, and a plain
// substring quick-reject skips regex work on files that never mention the
// package name.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.dirname(SCRIPT_DIR);
const CONFIG_PATH = path.join(SCRIPT_DIR, "usage-manifest.config.json");
const CACHE_PATH = path.join(SCRIPT_DIR, ".usage-manifest-cache.json");
const MANIFEST_PATH = path.join(REPO_ROOT, "docs", "usage-manifest.json");

const CACHE_VERSION = 1;
const FILE_PATTERNS = ["*.ts", "*.tsx", "*.js", "*.jsx", "*.mts", "*.mjs", "*.css"];
const FILE_EXT_RE = /\.(ts|tsx|js|jsx|mts|mjs|css)$/;
const WALK_PRUNE = new Set([
  "node_modules", ".git", "dist", "build", ".vinxi", ".output",
  "coverage", "storybook-static", "target", ".next", ".cache",
]);
const QUICK_REJECT_NEEDLE = "solid-ui-components";
const CONCURRENCY = 64;

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Longest-first alternation so "@primestageprime/solid-ui-components" wins
 * over the bare "solid-ui-components" alias. */
function specAlternation(specifiers) {
  return [...specifiers]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join("|");
}

function makeLineOf(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return (pos) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/** Parse an ESM import clause ("Default", "* as NS", "{ A, B as C, type D }",
 * "Default, { ... }") into { sui, local, typeOnly } records. */
function parseImportClause(clause) {
  const out = [];
  const trimmed = clause.trim();
  const braceMatch = trimmed.match(/\{([\s\S]*)\}/);
  const before = braceMatch ? trimmed.slice(0, braceMatch.index) : trimmed;
  const star = before.match(/\*\s*as\s+([\w$]+)/);
  if (star) {
    out.push({ sui: "*", local: star[1], typeOnly: false });
  } else {
    const def = before.match(/^([\w$]+)/);
    if (def && def[1] !== "type") {
      out.push({ sui: "default", local: def[1], typeOnly: false });
    }
  }
  if (braceMatch) {
    for (const raw of braceMatch[1].split(",")) {
      const m = raw.trim().match(/^(type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?$/);
      if (m) out.push({ sui: m[2], local: m[3] || m[2], typeOnly: !!m[1] });
    }
  }
  return out;
}

/**
 * Extract every SUI consumption form from one source file.
 * Returns { hits: [{ name, line, kind }], specifiers: [string] }.
 * Exported for tests.
 */
export function extractFromSource(source, specifiers, { isCss = false } = {}) {
  const hits = [];
  const specifiersSeen = new Set();
  if (!source.includes(QUICK_REJECT_NEEDLE)) return { hits, specifiers: [] };

  const alt = specAlternation(specifiers);
  const SPEC = `["'](?:${alt})(?:/[^"']*)?["']`;
  const specInnerRe = new RegExp(`["']((?:${alt})(?:/[^"']*)?)["']`);
  const lineOf = makeLineOf(source);
  const importRanges = [];

  const splitSpec = (matchText) => {
    const inner = matchText.match(specInnerRe);
    if (!inner) return null;
    const full = inner[1];
    for (const base of [...specifiers].sort((a, b) => b.length - a.length)) {
      if (full === base) return { full, subpath: "" };
      if (full.startsWith(`${base}/`)) return { full, subpath: full.slice(base.length + 1) };
    }
    return { full, subpath: "" };
  };

  const record = (name, pos, kind) => hits.push({ name, line: lineOf(pos), kind });

  const scan = (re, handler) => {
    for (const m of source.matchAll(re)) {
      const spec = splitSpec(m[0]);
      if (!spec) continue;
      specifiersSeen.add(spec.full);
      handler(m, spec);
    }
  };

  if (isCss) {
    scan(new RegExp(`@import\\s+(?:url\\(\\s*)?${SPEC}`, "g"), (m, spec) => {
      record(spec.subpath || "*", m.index, "css");
    });
    return { hits: sortHits(hits), specifiers: [...specifiersSeen].sort() };
  }

  const factoryImports = []; // { sui, local } of value imports matching createX

  // import [type] <clause> from "<spec>"
  scan(new RegExp(`\\bimport\\s+(type\\s+)?([^'"()]+?)\\bfrom\\s*${SPEC}`, "g"), (m, spec) => {
    importRanges.push([m.index, m.index + m[0].length]);
    const statementType = !!m[1];
    if (spec.subpath.endsWith(".css")) {
      record(spec.subpath, m.index, "css");
      return;
    }
    for (const item of parseImportClause(m[2])) {
      const typeOnly = statementType || item.typeOnly;
      record(item.sui, m.index, typeOnly ? "type" : "named");
      if (!typeOnly && /^create[A-Z]/.test(item.sui)) {
        factoryImports.push({ sui: item.sui, local: item.local });
      }
    }
  });

  // side-effect import "<spec>" (no clause)
  scan(new RegExp(`\\bimport\\s*${SPEC}`, "g"), (m, spec) => {
    importRanges.push([m.index, m.index + m[0].length]);
    const kind = spec.subpath.endsWith(".css") ? "css" : "named";
    record(spec.subpath || "*", m.index, kind);
  });

  // export { ... } from "<spec>"  /  export type { ... } from "<spec>"
  scan(new RegExp(`\\bexport\\s+(type\\s+)?\\{([^}]*)\\}\\s*from\\s*${SPEC}`, "g"), (m) => {
    importRanges.push([m.index, m.index + m[0].length]);
    for (const raw of m[2].split(",")) {
      const item = raw.trim().match(/^(type\s+)?([\w$]+)(?:\s+as\s+[\w$]+)?$/);
      if (item) record(item[2], m.index, "reexport");
    }
  });

  // export * [as ns] from "<spec>"
  scan(new RegExp(`\\bexport\\s*\\*(?:\\s*as\\s+[\\w$]+)?\\s*from\\s*${SPEC}`, "g"), (m) => {
    importRanges.push([m.index, m.index + m[0].length]);
    record("*", m.index, "reexport");
  });

  // dynamic import("<spec>") and require("<spec>")
  for (const dynRe of [
    new RegExp(`\\bimport\\s*\\(\\s*${SPEC}`, "g"),
    new RegExp(`\\brequire\\s*\\(\\s*${SPEC}`, "g"),
  ]) {
    scan(dynRe, (m, spec) => {
      importRanges.push([m.index, m.index + m[0].length]);
      const kind = spec.subpath.endsWith(".css") ? "css" : "dynamic";
      record(spec.subpath || "*", m.index, kind);
    });
  }

  // Factory consumption: an imported createX identifier that is CALLED in this
  // file. Clients shouldn't normally need factories — flagged specially.
  const insideImport = (pos) =>
    importRanges.some(([a, b]) => pos >= a && pos < b);
  for (const { sui, local } of factoryImports) {
    for (const m of source.matchAll(new RegExp(`\\b${escapeRe(local)}\\s*\\(`, "g"))) {
      if (insideImport(m.index)) continue;
      record(sui, m.index, "factory-call");
    }
  }

  return { hits: sortHits(hits), specifiers: [...specifiersSeen].sort() };
}

function sortHits(hits) {
  return hits.sort(
    (a, b) =>
      a.line - b.line ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) ||
      (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0),
  );
}

// ---------------------------------------------------------------------------
// File enumeration
// ---------------------------------------------------------------------------

async function gitListFiles(root) {
  const run = (args) =>
    execFileP("git", ["-C", root, ...args], { maxBuffer: 64 * 1024 * 1024 });
  const [tracked, untracked] = await Promise.all([
    run(["ls-files", "-z", "--", ...FILE_PATTERNS]),
    run(["ls-files", "-z", "-o", "--exclude-standard", "--", ...FILE_PATTERNS]),
  ]);
  const files = new Set();
  for (const out of [tracked.stdout, untracked.stdout]) {
    for (const rel of out.split("\0")) {
      if (rel && !rel.includes("node_modules/")) files.add(rel);
    }
  }
  return [...files];
}

async function walkFiles(root) {
  const files = [];
  async function walk(dir, relBase) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    await Promise.all(
      entries.map(async (e) => {
        if (e.name.startsWith(".")) return;
        const rel = relBase ? `${relBase}/${e.name}` : e.name;
        if (e.isDirectory()) {
          if (!WALK_PRUNE.has(e.name)) await walk(path.join(dir, e.name), rel);
        } else if (FILE_EXT_RE.test(e.name)) {
          files.push(rel);
        }
      }),
    );
  }
  await walk(root, "");
  return files;
}

async function listRepoFiles(root) {
  try {
    return await gitListFiles(root);
  } catch {
    return walkFiles(root);
  }
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function scanRepo(name, root, specifiers, cacheFiles, nextCacheFiles) {
  const stats = { files: 0, read: 0, cached: 0, hits: 0 };
  const result = { root, status: "ok", specifiers: [], uses: {}, stats };

  let rootStat;
  try {
    rootStat = await fs.stat(root);
  } catch {
    rootStat = null;
  }
  if (!rootStat?.isDirectory()) {
    result.status = "missing";
    return result;
  }

  let pkgText = null;
  try {
    pkgText = await fs.readFile(path.join(root, "package.json"), "utf8");
  } catch {
    pkgText = null;
  }
  if (!pkgText || !pkgText.includes(QUICK_REJECT_NEEDLE)) {
    result.status = "no-sui-dep";
    return result;
  }

  const rels = (await listRepoFiles(root)).sort();
  const specifiersSeen = new Set();
  const uses = new Map(); // name -> [{file, line, kind}]

  await mapPool(rels, CONCURRENCY, async (rel) => {
    const abs = path.join(root, rel);
    let st;
    try {
      st = await fs.stat(abs);
    } catch {
      return; // tracked but deleted
    }
    if (!st.isFile()) return;
    stats.files++;
    const key = `${name}\0${rel}`;
    const cached = cacheFiles[key];
    let entry;
    if (cached && cached.size === st.size && cached.mtimeMs === st.mtimeMs) {
      entry = cached;
      stats.cached++;
    } else {
      let source;
      try {
        source = await fs.readFile(abs, "utf8");
      } catch {
        return;
      }
      stats.read++;
      const { hits, specifiers: specs } = extractFromSource(source, specifiers, {
        isCss: rel.endsWith(".css"),
      });
      entry = { size: st.size, mtimeMs: st.mtimeMs, hits, specifiers: specs };
    }
    nextCacheFiles[key] = entry;
    for (const s of entry.specifiers) specifiersSeen.add(s);
    for (const hit of entry.hits) {
      stats.hits++;
      if (!uses.has(hit.name)) uses.set(hit.name, []);
      uses.get(hit.name).push({ file: rel, line: hit.line, kind: hit.kind });
    }
  });

  result.specifiers = [...specifiersSeen].sort();
  const sortedUses = {};
  for (const exportName of [...uses.keys()].sort()) {
    sortedUses[exportName] = uses.get(exportName).sort(
      (a, b) =>
        (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) ||
        a.line - b.line ||
        (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0),
    );
  }
  result.uses = sortedUses;
  return result;
}

/**
 * Build the manifest for a config. Returns { manifest, stats }.
 * Exported for tests.
 */
export async function buildManifest(config, { cachePath = CACHE_PATH } = {}) {
  const t0 = performance.now();
  const specifiers = config.specifiers;

  let cacheFiles = {};
  try {
    const cache = JSON.parse(await fs.readFile(cachePath, "utf8"));
    if (cache.version === CACHE_VERSION && cache.specKey === specifiers.join(",")) {
      cacheFiles = cache.files;
    }
  } catch {
    // cold run
  }
  const nextCacheFiles = {};

  const repoNames = Object.keys(config.repos).sort();
  const repoResults = await Promise.all(
    repoNames.map((name) =>
      scanRepo(name, config.repos[name], specifiers, cacheFiles, nextCacheFiles),
    ),
  );

  const repos = {};
  const summaryMap = new Map();
  const perRepoStats = {};
  repoNames.forEach((name, i) => {
    const r = repoResults[i];
    repos[name] = {
      root: r.root,
      status: r.status,
      specifiers: r.specifiers,
      uses: r.uses,
    };
    perRepoStats[name] = { status: r.status, ...r.stats };
    for (const exportName of Object.keys(r.uses)) {
      if (!summaryMap.has(exportName)) summaryMap.set(exportName, []);
      summaryMap.get(exportName).push(name);
    }
  });

  const summary = {};
  for (const exportName of [...summaryMap.keys()].sort()) {
    summary[exportName] = summaryMap.get(exportName).sort();
  }

  await fs.writeFile(
    cachePath,
    JSON.stringify({
      version: CACHE_VERSION,
      specKey: specifiers.join(","),
      files: nextCacheFiles,
    }),
  );

  return {
    manifest: { repos, summary },
    stats: { ms: performance.now() - t0, repos: perRepoStats },
  };
}

export function manifestToJson(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function summarizeDiff(committed, fresh) {
  const lines = [];
  const names = new Set([...Object.keys(fresh.repos), ...Object.keys(committed.repos ?? {})]);
  for (const name of [...names].sort()) {
    const a = committed.repos?.[name];
    const b = fresh.repos[name];
    if (!a) {
      lines.push(`  ${name}: repo added to manifest`);
      continue;
    }
    if (!b) {
      lines.push(`  ${name}: repo removed from manifest`);
      continue;
    }
    if (a.status !== b.status) lines.push(`  ${name}: status ${a.status} -> ${b.status}`);
    const aUses = Object.keys(a.uses ?? {});
    const bUses = Object.keys(b.uses ?? {});
    const added = bUses.filter((k) => !aUses.includes(k));
    const removed = aUses.filter((k) => !bUses.includes(k));
    if (added.length) lines.push(`  ${name}: now uses ${added.join(", ")}`);
    if (removed.length) lines.push(`  ${name}: no longer uses ${removed.join(", ")}`);
    if (!added.length && !removed.length && JSON.stringify(a) !== JSON.stringify(b)) {
      lines.push(`  ${name}: use sites changed (same export set)`);
    }
  }
  return lines.length ? lines : ["  (structural/ordering change)"];
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const { manifest, stats } = await buildManifest(config);
  const json = manifestToJson(manifest);

  if (args.has("--stats")) {
    const totalRead = Object.values(stats.repos).reduce((n, r) => n + (r.read ?? 0), 0);
    console.log(`usage-manifest: ${stats.ms.toFixed(0)}ms (${totalRead === 0 ? "warm" : `read ${totalRead} files`})`);
    for (const [name, r] of Object.entries(stats.repos)) {
      if (r.status !== "ok") {
        console.log(`  ${name.padEnd(16)} ${r.status}`);
        continue;
      }
      console.log(
        `  ${name.padEnd(16)} files=${r.files} read=${r.read} cached=${r.cached} hits=${r.hits}`,
      );
    }
  }

  if (args.has("--check")) {
    const statuses = Object.values(manifest.repos).map((r) => r.status);
    if (statuses.every((s) => s === "missing")) {
      console.log("usage-manifest --check: no consumer repos present on this machine; skipping.");
      return;
    }
    let committedText = null;
    try {
      committedText = await fs.readFile(MANIFEST_PATH, "utf8");
    } catch {
      committedText = null;
    }
    if (committedText === json) {
      if (!args.has("--stats")) console.log(`usage-manifest --check: up to date (${stats.ms.toFixed(0)}ms)`);
      return;
    }
    console.error("usage-manifest --check: docs/usage-manifest.json is STALE. Changes:");
    let committed = {};
    try {
      committed = JSON.parse(committedText ?? "{}");
    } catch {
      committed = {};
    }
    for (const line of summarizeDiff(committed, manifest)) console.error(line);
    process.exitCode = 1;
    return;
  }

  await fs.writeFile(MANIFEST_PATH, json);
  if (!args.has("--stats")) {
    const exportCount = Object.keys(manifest.summary).length;
    console.log(
      `usage-manifest: wrote docs/usage-manifest.json (${exportCount} exports across ${Object.keys(manifest.repos).length} repos, ${stats.ms.toFixed(0)}ms)`,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("usage-manifest: fatal:", err);
    process.exitCode = 1;
  });
}
