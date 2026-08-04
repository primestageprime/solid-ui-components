#!/usr/bin/env node
// ============================================
// Render coverage — which component modules does no test ever mount?
//
// This replaces the `foldersWithoutTests` health metric, which read 0 across
// all 145 component folders and had done for its whole life. It certified
// something untrue: a folder passed as soon as SOME file in it contained
// `.test.`, no matter what that file tested. `src/components/Combobox` passed
// with 589 lines of component and zero `render()` calls — its only suite
// exercised the pure `computeBackspaceAction` transition and imported nothing
// from `Combobox.tsx` but a type. A real defect lived behind that green 0 (a
// disabled Combobox still accepts typing; dside sui#12528) and the metric had
// nothing to say about it. A metric that cannot go up is not a ratchet, it is
// decoration.
//
// The rule here: a component module is covered when SOME test file both
//   (a) can see it — a relative import that resolves to the module, or to a
//       barrel that re-exports it (transitively; tests import `./index`), and
//   (b) mounts it — the JSX tag `<Name` appears, for a PascalCase value the
//       module exports.
//
// Both halves are load-bearing. Import alone is what let Combobox pass. JSX
// alone would let `Layout/Grid`'s tests vouch for `Chart/Grid` — two different
// components sharing a name, both currently uncovered.
//
// WHAT THIS DOES NOT CLAIM. "Rendered once" is a floor, not coverage: a module
// that mounts in one smoke test and asserts nothing still counts. The metric
// answers "has any test ever seen this component run?", which is the question
// `foldersWithoutTests` pretended to answer. Depth of coverage is not
// mechanical and does not belong in a ratchet.
//
// A PascalCase `.tsx` exporting no PascalCase value is not a component module
// and is skipped — `Combobox/ComboboxSingle.tsx` exports `renderSingle`,
// `Table/CellRenderers.tsx` is a pure barrel. Renaming an export to duck the
// metric would LOWER the count and therefore tighten the ceiling, so the
// escape hatch closes behind whoever uses it.
//
//   node scripts/render-coverage.mjs           # summary + nonzero exit if any
//   node scripts/render-coverage.mjs --list    # the module paths, one per line
//   node scripts/render-coverage.mjs --json    # machine-readable
//
// Surfaced as the `componentsNeverRendered` health metric.
// ============================================
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import posix from "node:path/posix";
import { length } from "./fn.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── pure helpers (the test surface) ──────────────────────────────────────────

export const isTestPath = (p) => p.includes(".test.");

/** A component ENTRY: PascalCase `.tsx` under src/components. Same selector the
 *  `missingDepthHeaders` metric uses, so the two agree on what a component
 *  module is. */
export const isEntryPath = (p) =>
  p.includes("/src/components/") &&
  !isTestPath(p) &&
  !p.endsWith(".d.ts") &&
  /\/[A-Z][^/]*\.tsx$/.test(p);

/** Comments are stripped before JSX matching: a header that explains `<Combobox
 *  multiple>` is prose, not a mount. Kept local rather than shared with
 *  health.mjs / showcase-coverage.mjs — those two already disagree about what a
 *  comment line is, and unifying them would move their published numbers. */
export const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? "" : l))
    .join("\n");

/** Every module specifier the source imports or re-exports from. */
export const specifiersOf = (src) =>
  [
    ...stripComments(src).matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g),
  ].map((m) => m[1]);

/** Specifiers a barrel re-exports (`export * from`, `export { X } from`). */
export const reexportsOf = (src) =>
  [
    ...stripComments(src).matchAll(
      /export\s+(?:\*|\{[^}]*\})\s*from\s*["']([^"']+)["']/g,
    ),
  ].map((m) => m[1]);

/** PascalCase VALUES a module exports — the things a test could write as JSX.
 *  `export type`/`export interface` are excluded by requiring const/function/
 *  class; a re-export list is included by name. */
export const componentExportsOf = (src) => {
  const text = stripComments(src);
  const names = new Set();
  for (const m of text.matchAll(
    /export\s+(?:const|function|class)\s+([A-Z]\w*)/g,
  ))
    names.add(m[1]);
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of m[1].split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      // `export { type Foo }` is a type even inside a value-looking list.
      if (name && /^[A-Z]\w*$/.test(name) && !/^\s*type\s/.test(part))
        names.add(name);
    }
  return [...names];
};

/** Does `src` mount any of `names` as JSX? `.` is allowed after the name so a
 *  compound call site (`<Combobox.Item>`) counts as mounting `Combobox`. */
export const mountsAny = (src, names) => {
  const text = stripComments(src);
  return names.some((n) => new RegExp(`<${n}[\\s/>.]`).test(text));
};

/**
 * Which component modules no test ever mounts.
 *
 * Pure: everything comes from `files` (POSIX paths) and `read(path)`. No fs, no
 * cwd, no globals — so the rules can be pinned against a hand-built file map
 * instead of a fixture tree or a subprocess.
 *
 * @returns {{entries: string[], missing: string[], skipped: string[]}}
 *   `skipped` are entries exporting no PascalCase value (not components).
 */
export function analyse({ files, read }) {
  const known = new Set(files);

  const resolveSpec = (fromFile, spec) => {
    if (!spec.startsWith(".")) return null;
    const base = posix.resolve(posix.dirname(fromFile), spec);
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      posix.join(base, "index.ts"),
      posix.join(base, "index.tsx"),
    ];
    return candidates.find((c) => known.has(c)) ?? null;
  };

  // What a file makes visible: itself, plus everything its re-export targets
  // make visible. Cycle-guarded — a barrel pair that re-exports each other
  // would otherwise recur forever.
  const exposedCache = new Map();
  const exposes = (file, seen = new Set()) => {
    const cached = exposedCache.get(file);
    if (cached) return cached;
    if (seen.has(file)) return new Set();
    seen.add(file);
    const out = new Set([file]);
    for (const spec of reexportsOf(read(file))) {
      const target = resolveSpec(file, spec);
      if (target) for (const x of exposes(target, seen)) out.add(x);
    }
    // Only memoise a result computed outside a cycle, so a partial set from a
    // guarded branch never becomes the cached answer.
    if (seen.size === 1) exposedCache.set(file, out);
    return out;
  };

  const tests = files.filter(isTestPath);
  const visibleTo = new Map(
    tests.map((t) => [
      t,
      new Set(
        specifiersOf(read(t))
          .map((s) => resolveSpec(t, s))
          .filter(Boolean)
          .flatMap((target) => [...exposes(target)]),
      ),
    ]),
  );

  const entries = files.filter(isEntryPath).sort();
  const skipped = [];
  const missing = [];
  for (const entry of entries) {
    const names = componentExportsOf(read(entry));
    if (length(names) === 0) {
      skipped.push(entry);
      continue;
    }
    const mounted = tests.some(
      (t) => visibleTo.get(t).has(entry) && mountsAny(read(t), names),
    );
    if (!mounted) missing.push(entry);
  }
  return { entries, missing, skipped };
}

// ── the edge: read the real tree ─────────────────────────────────────────────

const walk = (dir, pred) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, pred));
    else if (pred(p)) out.push(p);
  }
  return out;
};

export function run() {
  const files = walk(
    join(root, "src"),
    (p) => /\.tsx?$/.test(p) && !p.endsWith(".d.ts"),
  );
  const { entries, missing, skipped } = analyse({
    files,
    read: (p) => readFileSync(p, "utf8"),
  });
  const rel = (p) => p.replace(`${root}/`, "");
  return {
    entries: entries.map(rel),
    missing: missing.map(rel),
    skipped: skipped.map(rel),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { entries, missing, skipped } = run();
  if (process.argv.includes("--json")) {
    console.log(
      JSON.stringify({ total: length(entries), missing, skipped }, null, 2),
    );
  } else if (process.argv.includes("--list")) {
    for (const m of missing) console.log(m);
  } else {
    console.log(
      `componentsNeverRendered: ${length(missing)}   (of ${length(entries)} component modules; ${length(skipped)} export no component and are skipped)`,
    );
    for (const m of missing) console.log(`  ${m}`);
  }
  process.exit(length(missing) ? 1 : 0);
}
