#!/usr/bin/env node
// Compare SUI's public export surface against what consumer apps actually
// import, so unused exports can be pruned without breaking consumers.
//
//   node scripts/export-usage-report.mjs          # human-readable report
//   node scripts/export-usage-report.mjs --json    # machine-readable output
//
// Consumer discovery is NOT implemented here — it is imported from
// scripts/usage-manifest.mjs so the two tools cannot disagree about who
// consumes SUI. They did: this script used to walk `resolve(repoRoot, "..",
// "..")` (the grandparent) to depth 3, which reaches `<ws>/dside/dside-ui` but
// stops one level short of `<ws>/rhinotools/netsuite_extract_rs/ui`. It
// therefore reported 4 consumers while usage-manifest found 7, silently missing
// the only SelectableTable caller in existence. See dside sui#12565.
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative } from "node:path";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { discoverRepos, WORKSPACE_ROOT } from "./usage-manifest.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(repoRoot, "src");
const configPath = join(repoRoot, "scripts", "usage-manifest.config.json");

// ---------------------------------------------------------------------------
// 1. EXTRACT SUI's export surface — walk re-exports reachable from index.ts.
// ---------------------------------------------------------------------------

// Resolve an import specifier (relative) to an on-disk file path.
function resolveModule(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

// Strip line + block comments so commented-out re-exports don't count.
export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * The set of names importable from `entryFile`, following re-export chains.
 *
 * Text-based on purpose (no `typescript` dependency), which bounds what it can
 * see: it resolves NAMES, not types. Anything needing a prop's actual union
 * needs the compiler API instead — see dside sui#16389.
 */
export function collectExportSurface(
  entryFile,
  { readFile = readFileSync } = {},
) {
  const valueExports = new Set();
  const typeExports = new Set();
  const visited = new Set();

  const addExport = (name, isType) => {
    if (!name || name === "default") return;
    if (isType) typeExports.add(name);
    else valueExports.add(name);
  };

  const collectFromFile = (file) => {
    if (!file || visited.has(file)) return;
    visited.add(file);
    const src = stripComments(readFile(file, "utf8"));

    // export * as ns from "./x" — the NAMESPACE OBJECT is the export. Its
    // members are reached as `ns.Member`, never as bare top-level names, so
    // unlike a bare `export *` this must add the alias and NOT recurse.
    //
    // Missing this form was a real defect, not a corner case: `export * as
    // fields from "./components/Table/fields"` (src/index.ts:81) left `fields`
    // out of the surface, so jtf-ui's legitimate `import { fields }` was
    // reported as a BROKEN import. It was the report's only broken entry, and
    // it was an artifact of this extractor rather than a consumer problem.
    for (const m of src.matchAll(
      /export\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s*["'][^"']+["']/g,
    ))
      addExport(m[1], false);

    // export * from "./x"  — recurse into the module's own exports.
    for (const m of src.matchAll(/export\s+\*\s+from\s*["']([^"']+)["']/g)) {
      const target = resolveModule(file, m[1]);
      if (target) collectFromFile(target);
    }

    // export { A, B as C, type D } from "./x"   and   export { A, B }
    for (const m of src.matchAll(
      /export\s+(type\s+)?\{([^}]*)\}(\s*from\s*["'][^"']+["'])?/g,
    )) {
      const groupType = Boolean(m[1]);
      for (let part of m[2].split(",")) {
        part = part.trim();
        if (!part) continue;
        let isType = groupType;
        if (/^type\s+/.test(part)) {
          isType = true;
          part = part.replace(/^type\s+/, "");
        }
        // "A as B" -> exported name is B (the public-facing alias).
        const asMatch = part.match(/(\S+)\s+as\s+(\S+)/);
        const name = asMatch ? asMatch[2] : part;
        addExport(name.trim(), isType);
      }
    }

    // export const/let/var NAME ,  export function NAME , export class NAME
    for (const m of src.matchAll(
      /export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)/g,
    ))
      addExport(m[1], false);
    for (const m of src.matchAll(
      /export\s+(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)/g,
    ))
      addExport(m[1], false);
    for (const m of src.matchAll(
      /export\s+(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)/g,
    ))
      addExport(m[1], false);

    // export type NAME = ... ,  export interface NAME , export enum NAME
    for (const m of src.matchAll(/export\s+type\s+([A-Za-z0-9_$]+)\s*[=<]/g))
      addExport(m[1], true);
    for (const m of src.matchAll(/export\s+interface\s+([A-Za-z0-9_$]+)/g))
      addExport(m[1], true);
    for (const m of src.matchAll(/export\s+enum\s+([A-Za-z0-9_$]+)/g))
      addExport(m[1], false);

    // export default — not a named import target; ignore.
  };

  collectFromFile(entryFile);

  return {
    valueExports,
    typeExports,
    allExports: new Set([...valueExports, ...typeExports]),
  };
}

// ---------------------------------------------------------------------------
// 2. COLLECT imported identifiers per consumer.
// ---------------------------------------------------------------------------

function walkSourceFiles(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === ".git")
        continue;
      walkSourceFiles(full, out);
    } else if (/\.(ts|tsx|js|jsx|mts|cts)$/.test(e.name)) {
      out.push(full);
    }
  }
}

const importFromSui =
  /(?:import|export)\b((?:(?!\bfrom\b)[\s\S])*?)\bfrom\s*["']solid-ui-components["']/g;

export function parseClause(clause, file, consumerName, rec, onNamespace) {
  // Namespace import: import * as Foo from "..."
  const ns = clause.match(/\*\s+as\s+([A-Za-z0-9_$]+)/);
  if (ns) onNamespace({ consumer: consumerName, file, alias: ns[1] });
  // Named bindings live inside { ... }
  const braces = clause.match(/\{([\s\S]*?)\}/);
  if (!braces) return;
  for (let part of braces[1].split(",")) {
    part = part.trim();
    if (!part) continue;
    part = part.replace(/^type\s+/, ""); // import { type T }
    // "A as B" -> record original exported name A
    const asMatch = part.match(/(\S+)\s+as\s+\S+/);
    const name = (asMatch ? asMatch[1] : part).trim();
    if (!name || name === "type") continue;
    rec(name, file);
  }
}

// ---------------------------------------------------------------------------
// 3. REPORT
// ---------------------------------------------------------------------------

async function main() {
  const asJson = process.argv.includes("--json");

  const { valueExports, typeExports, allExports } = collectExportSurface(
    join(srcDir, "index.ts"),
  );

  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const discovered = await discoverRepos(WORKSPACE_ROOT, {
    specifiers: config.specifiers,
    skipDir: repoRoot,
  });

  if (Object.keys(discovered).length === 0) {
    console.error(
      `export-usage-report: no SUI consumers found under ${WORKSPACE_ROOT}. ` +
        `Set SUI_WORKSPACE_ROOT if your checkouts live elsewhere.`,
    );
  }

  const consumers = [];
  const usage = new Map(); // name -> Set of consumer names
  const broken = new Map(); // name -> [{consumer, file}]
  const namespaceImports = [];

  for (const [name, root] of Object.entries(discovered).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const files = [];
    for (const sub of ["src", "routes", "app", "lib", "components"]) {
      const d = join(root, sub);
      if (existsSync(d)) walkSourceFiles(d, files);
    }
    // Fallback: if none of the conventional dirs exist, scan repo root shallowly.
    if (files.length === 0) walkSourceFiles(root, files);

    const names = new Set();
    const detail = new Map();
    const nsFiles = [];
    const rec = (n, file) => {
      names.add(n);
      if (!detail.has(n)) detail.set(n, new Set());
      detail.get(n).add(file);
    };

    for (const file of files) {
      const raw = readFileSync(file, "utf8");
      if (!raw.includes("solid-ui-components")) continue;
      const src = stripComments(raw);
      for (const m of src.matchAll(importFromSui)) {
        parseClause(m[1], file, name, rec, (s) => namespaceImports.push(s));
      }
      if (
        /import\s+\*\s+as\s+[A-Za-z0-9_$]+\s+from\s*["']solid-ui-components["']/.test(
          src,
        )
      ) {
        nsFiles.push(file);
      }
    }

    consumers.push({ name, root, names, detail, namespaceFiles: nsFiles });

    for (const n of names) {
      if (allExports.has(n)) {
        if (!usage.has(n)) usage.set(n, new Set());
        usage.get(n).add(name);
      } else {
        if (!broken.has(n)) broken.set(n, []);
        for (const file of detail.get(n))
          broken.get(n).push({ consumer: name, file });
      }
    }
  }

  const used = [...usage.keys()].sort();
  const unused = [...allExports]
    .filter((n) => !usage.has(n))
    .sort((a, b) => a.localeCompare(b));
  const brokenNames = [...broken.keys()].sort();

  const rel = (f) => relative(WORKSPACE_ROOT, f);

  if (asJson) {
    const out = {
      summary: {
        totalExports: allExports.size,
        valueExports: valueExports.size,
        typeExports: typeExports.size,
        used: used.length,
        unused: unused.length,
        broken: brokenNames.length,
        consumers: consumers.map((c) => c.name),
      },
      used: used
        .map((n) => ({
          name: n,
          count: usage.get(n).size,
          consumers: [...usage.get(n)].sort(),
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      unused,
      broken: brokenNames.map((n) => ({
        name: n,
        sites: broken
          .get(n)
          .map((s) => ({ consumer: s.consumer, file: rel(s.file) })),
      })),
      namespaceImports: namespaceImports.map((s) => ({
        consumer: s.consumer,
        alias: s.alias,
        file: rel(s.file),
      })),
    };
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const hr = "=".repeat(72);
  console.log(hr);
  console.log("SUI EXPORT-USAGE REPORT");
  console.log(hr);
  console.log(
    `Consumers discovered (${consumers.length}): ${consumers.map((c) => c.name).join(", ") || "none"}`,
  );
  console.log("");

  console.log(`-- (a) USED EXPORTS (${used.length}) ${"-".repeat(40)}`);
  const usedSorted = used
    .map((n) => ({
      n,
      count: usage.get(n).size,
      who: [...usage.get(n)].sort(),
    }))
    .sort((a, b) => b.count - a.count || a.n.localeCompare(b.n));
  for (const { n, count, who } of usedSorted) {
    console.log(
      `  ${n.padEnd(34)} ${String(count).padStart(2)}  [${who.join(", ")}]`,
    );
  }
  console.log("");

  console.log(
    `-- (b) UNUSED EXPORTS / PRUNE CANDIDATES (${unused.length}) ` +
      "-".repeat(20),
  );
  for (const n of unused) {
    const kind = typeExports.has(n) && !valueExports.has(n) ? " (type)" : "";
    console.log(`  ${n}${kind}`);
  }
  console.log("");

  console.log(
    `-- (c) BROKEN IMPORTS (${brokenNames.length}) ${"-".repeat(35)}`,
  );
  if (brokenNames.length === 0) {
    console.log(
      "  none — every imported identifier resolves to a current export.",
    );
  } else {
    for (const n of brokenNames) {
      console.log(`  ${n}`);
      for (const s of broken.get(n))
        console.log(`      <- ${s.consumer}: ${rel(s.file)}`);
    }
  }
  console.log("");

  console.log(
    `-- (d) NAMESPACE-IMPORT FILES (${namespaceImports.length}) ` +
      "-".repeat(25),
  );
  if (namespaceImports.length === 0) {
    console.log(
      "  none — no `import * as` sites; per-symbol analysis is complete.",
    );
  } else {
    console.log(
      "  These use `import * as` so per-symbol usage is UNDER-COUNTED for them:",
    );
    for (const s of namespaceImports) {
      console.log(`  ${s.consumer}: ${rel(s.file)}  (as ${s.alias})`);
    }
  }
  console.log("");

  console.log(hr);
  console.log(
    `SUMMARY: ${allExports.size} exports total (${valueExports.size} value, ${typeExports.size} type) | ` +
      `${used.length} used | ${unused.length} unused | ${brokenNames.length} broken | ` +
      `${consumers.length} consumers`,
  );
  console.log(hr);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((err) => {
    console.error("export-usage-report: fatal:", err);
    process.exitCode = 1;
  });
}
