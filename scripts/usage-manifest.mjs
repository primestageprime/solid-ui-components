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
//
// ── Consumers are DISCOVERED, not configured (changed 2026-08-04) ────────────
//
// The config used to hold a map of name → ABSOLUTE PATH, all of them under one
// developer's home directory. On any other machine every path resolved
// `missing`, the all-missing branch fired, and the pre-push gate returned
// without comparing anything — printing a line that reads like a normal no-op.
// It was inert on Adlai's machine for its whole life.
//
// A local override alone would NOT have fixed it: the emitted manifest recorded
// each repo's absolute `root`, so `--check`'s byte comparison against the
// committed file could never pass on a second machine even with correct paths.
// Both halves had to go.
//
// Now: walk the SUI checkout's parent directory (the workspace root) to a
// bounded depth and take every package.json declaring a SUI specifier. That
// survives the two layouts in use — `<workspace>/dside/dside-ui` and
// `<workspace>/dside-workspace/dside-ui` — without either developer editing
// paths for the other, and it picked up three real consumers the hand-written
// list had never contained, including the only `SelectableTable` caller in
// existence. Set SUI_WORKSPACE_ROOT to search somewhere else.
//
// Two consequences worth knowing before changing any of this:
//
//   - **Repos are keyed by package.json `name`**, not by directory. Three of
//     the discovered consumers live in a directory called `ui` or `frontend`,
//     so the basename is not unique.
//   - **Regeneration MERGES, it does not replace.** A machine only ever
//     rewrites the entries it can actually see; everything else is carried
//     forward from the committed manifest verbatim. Otherwise whoever pushed
//     last would delete the other's repos, and `--check` would fail forever in
//     both directions. `--prune` is the deliberate way to drop a dead repo.

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

/** Where to look for consumers. The workspace holding this checkout, unless
 *  told otherwise — the one location both developers' layouts have in common. */
const WORKSPACE_ROOT = process.env.SUI_WORKSPACE_ROOT
  ? path.resolve(process.env.SUI_WORKSPACE_ROOT)
  : path.dirname(REPO_ROOT);

/** How far below the workspace root a consumer may sit. `dside/dside-ui` is 2;
 *  `rhinotools/netsuite_extract_rs/ui` is 3. Deeper is almost always a nested
 *  package inside a repo already counted, so 3 is the floor that covers every
 *  real layout without turning discovery into a full-disk walk. */
const DISCOVERY_MAX_DEPTH = 3;

const CACHE_VERSION = 1;
const FILE_PATTERNS = [
  "*.ts",
  "*.tsx",
  "*.js",
  "*.jsx",
  "*.mts",
  "*.mjs",
  "*.css",
];
const FILE_EXT_RE = /\.(ts|tsx|js|jsx|mts|mjs|css)$/;
const WALK_PRUNE = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".vinxi",
  ".output",
  "coverage",
  "storybook-static",
  "target",
  ".next",
  ".cache",
]);
const QUICK_REJECT_NEEDLE = "solid-ui-components";
const CONCURRENCY = 64;

// ---------------------------------------------------------------------------
// Discovery — which repos on THIS machine consume SUI
// ---------------------------------------------------------------------------

/**
 * Does this package.json text declare a dependency on SUI?
 *
 * Reads the dependency maps rather than substring-matching the whole file: a
 * repo that merely mentions the package in a `description` or a script is not a
 * consumer, and SUI's own package.json names itself in `name`.
 */
export function dependsOnSui(pkgText, specifiers) {
  let pkg;
  try {
    pkg = JSON.parse(pkgText);
  } catch {
    return false;
  }
  const maps = [
    pkg.dependencies,
    pkg.devDependencies,
    pkg.peerDependencies,
    pkg.optionalDependencies,
  ];
  for (const m of maps)
    for (const key of Object.keys(m ?? {})) {
      if (specifiers.includes(key)) return true;
      // An aliased install — "solid-ui-components":
      // "npm:@primestageprime/solid-ui-components@0.135.0" — is keyed by the
      // alias, and amygdala-ui uses exactly that form.
      const val = m[key];
      if (typeof val === "string" && specifiers.some((s) => val.includes(s)))
        return true;
    }
  return false;
}

/**
 * The stable identity of a discovered repo.
 *
 * package.json `name` first, directory basename only as a fallback. Three of
 * the real consumers live in a directory called `ui` or `frontend`, so the
 * basename is not unique and cannot be the primary key. The name has to be
 * stable across machines because it is what the committed manifest is keyed by
 * — rename a consumer's package and its history reads as one repo removed and
 * another added.
 */
export function repoNameFor(pkgText, dir) {
  try {
    const name = JSON.parse(pkgText)?.name;
    if (typeof name === "string" && name.trim()) return name.trim();
  } catch {
    // fall through
  }
  return path.basename(dir);
}

/**
 * Walk `searchRoot` for SUI consumers, returning `{ name: absolutePath }` in
 * the shape `buildManifest` already takes.
 *
 * Stops descending into a directory once it has claimed it: a consumer's own
 * sub-packages are part of that repo, not separate consumers. SUI's own
 * checkout is skipped — it names itself in `name`, not in a dependency map, but
 * skipping by path is cheaper and unambiguous.
 */
export async function discoverRepos(
  searchRoot,
  { specifiers, maxDepth = DISCOVERY_MAX_DEPTH, skipDir = null } = {},
) {
  const found = {};
  async function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable — not our business
    }
    if (depth > 0) {
      const pkgPath = path.join(dir, "package.json");
      let pkgText = null;
      try {
        pkgText = await fs.readFile(pkgPath, "utf8");
      } catch {
        pkgText = null;
      }
      if (pkgText && dependsOnSui(pkgText, specifiers)) {
        const name = repoNameFor(pkgText, dir);
        // First one wins, so a shallower repo is not shadowed by a nested
        // package that happens to share a name.
        if (!(name in found)) found[name] = dir;
        return; // claimed — do not descend into its sub-packages
      }
    }
    await Promise.all(
      entries
        .filter((e) => e.isDirectory())
        .filter((e) => !e.name.startsWith(".") && !WALK_PRUNE.has(e.name))
        .map((e) => path.join(dir, e.name))
        .filter((abs) => abs !== skipDir)
        .map((abs) => walk(abs, depth + 1)),
    );
  }
  await walk(searchRoot, 0);
  return found;
}

/**
 * Combine what this machine can see with what the committed manifest already
 * knows, so a push from one developer never deletes another's repos.
 *
 * `fresh` wins for every repo it contains; every other committed entry is
 * carried through verbatim. Without this the two of us would take turns
 * emptying the manifest and `--check` would fail forever in both directions —
 * the failure this whole change exists to end. `--prune` is how a genuinely
 * dead repo leaves.
 */
export function mergeRepos(committedRepos, freshRepos, { prune = false } = {}) {
  // A carried entry is normalised on the way through, not copied verbatim.
  // Entries written before 2026-08-04 carry an absolute `root` from whichever
  // machine wrote them; leaving those in would keep another developer's home
  // directory in the file indefinitely, since the machine that could refresh
  // them is by definition not this one.
  const carry = ([name, entry]) => {
    const { root: _dropped, ...rest } = entry;
    return [name, rest];
  };
  const out = prune
    ? {}
    : Object.fromEntries(Object.entries(committedRepos ?? {}).map(carry));
  for (const [name, entry] of Object.entries(freshRepos)) out[name] = entry;
  return Object.fromEntries(
    Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

/** Repos the committed manifest knows that this machine cannot see. */
export function unseenRepos(committedRepos, freshRepos) {
  return Object.keys(committedRepos ?? {})
    .filter((n) => !(n in freshRepos))
    .sort();
}

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
      if (full.startsWith(`${base}/`))
        return { full, subpath: full.slice(base.length + 1) };
    }
    return { full, subpath: "" };
  };

  const record = (name, pos, kind) =>
    hits.push({ name, line: lineOf(pos), kind });

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
  scan(
    new RegExp(`\\bimport\\s+(type\\s+)?([^'"()]+?)\\bfrom\\s*${SPEC}`, "g"),
    (m, spec) => {
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
    },
  );

  // side-effect import "<spec>" (no clause)
  scan(new RegExp(`\\bimport\\s*${SPEC}`, "g"), (m, spec) => {
    importRanges.push([m.index, m.index + m[0].length]);
    const kind = spec.subpath.endsWith(".css") ? "css" : "named";
    record(spec.subpath || "*", m.index, kind);
  });

  // export { ... } from "<spec>"  /  export type { ... } from "<spec>"
  scan(
    new RegExp(`\\bexport\\s+(type\\s+)?\\{([^}]*)\\}\\s*from\\s*${SPEC}`, "g"),
    (m) => {
      importRanges.push([m.index, m.index + m[0].length]);
      for (const raw of m[2].split(",")) {
        const item = raw
          .trim()
          .match(/^(type\s+)?([\w$]+)(?:\s+as\s+[\w$]+)?$/);
        if (item) record(item[2], m.index, "reexport");
      }
    },
  );

  // export * [as ns] from "<spec>"
  scan(
    new RegExp(
      `\\bexport\\s*\\*(?:\\s*as\\s+[\\w$]+)?\\s*from\\s*${SPEC}`,
      "g",
    ),
    (m) => {
      importRanges.push([m.index, m.index + m[0].length]);
      record("*", m.index, "reexport");
    },
  );

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
    for (const m of source.matchAll(
      new RegExp(`\\b${escapeRe(local)}\\s*\\(`, "g"),
    )) {
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
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    },
  );
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
      const { hits, specifiers: specs } = extractFromSource(
        source,
        specifiers,
        {
          isCss: rel.endsWith(".css"),
        },
      );
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
    sortedUses[exportName] = uses
      .get(exportName)
      .sort(
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
 * Which repos use each export. Derived from the repo map rather than
 * accumulated while scanning, so it stays correct after a merge folds in
 * entries this machine never scanned.
 */
export function summarize(repos) {
  const byExport = new Map();
  for (const [name, entry] of Object.entries(repos))
    for (const exportName of Object.keys(entry.uses ?? {})) {
      if (!byExport.has(exportName)) byExport.set(exportName, []);
      byExport.get(exportName).push(name);
    }
  const summary = {};
  for (const exportName of [...byExport.keys()].sort())
    summary[exportName] = byExport.get(exportName).sort();
  return summary;
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
    if (
      cache.version === CACHE_VERSION &&
      cache.specKey === specifiers.join(",")
    ) {
      cacheFiles = cache.files;
    }
  } catch {
    // cold run
  }
  const nextCacheFiles = {};

  const repoNames = Object.keys(config.repos).sort();
  const repoResults = await Promise.all(
    repoNames.map((name) =>
      scanRepo(
        name,
        config.repos[name],
        specifiers,
        cacheFiles,
        nextCacheFiles,
      ),
    ),
  );

  const repos = {};
  const perRepoStats = {};
  repoNames.forEach((name, i) => {
    const r = repoResults[i];
    // `root` is deliberately NOT recorded. It used to be, and it is why a
    // correct set of local paths still could not make `--check` pass on a
    // second machine: every entry carried an absolute path from whichever
    // machine last regenerated the file. Where a consumer sits on disk is a
    // property of the machine; the manifest answers "which exports does
    // production use, and in which file of which repo". The path is available
    // to a human via `--stats`.
    repos[name] = {
      status: r.status,
      specifiers: r.specifiers,
      uses: r.uses,
    };
    perRepoStats[name] = { status: r.status, root: r.root, ...r.stats };
  });

  const summary = summarize(repos);

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
  const names = new Set([
    ...Object.keys(fresh.repos),
    ...Object.keys(committed.repos ?? {}),
  ]);
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
    if (a.status !== b.status)
      lines.push(`  ${name}: status ${a.status} -> ${b.status}`);
    const aUses = Object.keys(a.uses ?? {});
    const bUses = Object.keys(b.uses ?? {});
    const added = bUses.filter((k) => !aUses.includes(k));
    const removed = aUses.filter((k) => !bUses.includes(k));
    if (added.length) lines.push(`  ${name}: now uses ${added.join(", ")}`);
    if (removed.length)
      lines.push(`  ${name}: no longer uses ${removed.join(", ")}`);
    if (
      !added.length &&
      !removed.length &&
      JSON.stringify(a) !== JSON.stringify(b)
    ) {
      lines.push(`  ${name}: use sites changed (same export set)`);
    }
  }
  return lines.length ? lines : ["  (structural/ordering change)"];
}

async function readCommitted() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  } catch {
    return { repos: {}, summary: {} };
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));

  const discovered = await discoverRepos(WORKSPACE_ROOT, {
    specifiers: config.specifiers,
    skipDir: REPO_ROOT,
  });
  if (Object.keys(discovered).length === 0) {
    // Not the old silent skip: nothing was found where we looked, and saying
    // WHERE is the whole difference between "no consumers here" and "the gate
    // is pointed at the wrong directory". The previous version printed a
    // cheerful skip line and the gate was inert for months.
    console.log(
      `usage-manifest: no SUI consumers found under ${WORKSPACE_ROOT} ` +
        `(depth ${DISCOVERY_MAX_DEPTH}). Set SUI_WORKSPACE_ROOT if your ` +
        `checkouts live elsewhere.`,
    );
  }

  const { manifest: fresh, stats } = await buildManifest(
    { ...config, repos: discovered },
    {},
  );
  const committed = await readCommitted();
  const carried = unseenRepos(committed.repos, fresh.repos);
  const repos = mergeRepos(committed.repos, fresh.repos, {
    prune: args.has("--prune"),
  });
  const manifest = { repos, summary: summarize(repos) };
  const json = manifestToJson(manifest);

  if (args.has("--stats")) {
    const totalRead = Object.values(stats.repos).reduce(
      (n, r) => n + (r.read ?? 0),
      0,
    );
    console.log(
      `usage-manifest: ${stats.ms.toFixed(0)}ms (${totalRead === 0 ? "warm" : `read ${totalRead} files`})`,
    );
    for (const [name, r] of Object.entries(stats.repos)) {
      if (r.status !== "ok") {
        console.log(`  ${name.padEnd(26)} ${r.status}  ${r.root}`);
        continue;
      }
      console.log(
        `  ${name.padEnd(26)} files=${r.files} read=${r.read} cached=${r.cached} hits=${r.hits}  ${r.root}`,
      );
    }
    for (const name of carried)
      console.log(`  ${name.padEnd(26)} carried forward (not on this machine)`);
  }

  if (args.has("--check")) {
    const committedText = JSON.stringify(committed, null, 2) + "\n";
    if (committedText === json) {
      if (!args.has("--stats"))
        console.log(
          `usage-manifest --check: up to date (${stats.ms.toFixed(0)}ms)` +
            (carried.length ? `, ${carried.length} carried forward` : ""),
        );
      return;
    }
    console.error(
      "usage-manifest --check: docs/usage-manifest.json is STALE. Changes:",
    );
    for (const line of summarizeDiff(committed, manifest)) console.error(line);
    console.error("  Run: npm run usage-manifest, then commit the result.");
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

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((err) => {
    console.error("usage-manifest: fatal:", err);
    process.exitCode = 1;
  });
}
