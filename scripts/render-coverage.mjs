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
//       module exports, OR for a Curried Variant of it (see `curriedExportsOf`:
//       `variants.ts` calls the module's Factory, so `<ActionList>` runs
//       `ActionList.tsx`).
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

/**
 * Does `src` mount any of `names` as JSX?
 *
 * The delimiter after the name decides it, and each character in the class is
 * load-bearing:
 *
 *   `\s` `/` `>`  the ordinary forms — `<Foo prop>`, `<Foo/>`, `<Foo>`.
 *   `.`           a compound call site: `<Combobox.Item>` mounts `Combobox`.
 *   `<`           an explicit type argument: `<BucketQueue<Item> …>`. Solid
 *                 components are generic functions, and a test that pins a row
 *                 shape writes the parameter out. MISSING THIS READ AS "NEVER
 *                 RENDERED" FOR TWO COMPONENTS THAT HAD SEVEN TEST FILES
 *                 BETWEEN THEM — BucketQueue alone has five — and both sat near
 *                 the top of the risk ranking, so the burn-down would have sent
 *                 someone to write tests that already existed. Fixed 2026-08-04.
 *
 * Requiring a delimiter at all is what keeps `<FooBar>` from vouching for
 * `Foo`, so the fix is a wider class, not a looser match.
 *
 * `<` costs a little precision in return: `Array<BucketQueue<Item>>` in a TYPE
 * position also matches. That is the right side to err on — a false negative
 * sends a reader to write tests that exist, while the type position is
 * vanishingly rare for a component (they are values, not types) and would at
 * worst let one module pass on a mention. Prefer under-reporting here.
 */
export const mountsAny = (src, names) => {
  const text = stripComments(src);
  return names.some((n) => new RegExp(`<${n}[\\s/>.<]`).test(text));
};

/** Local name → the specifier it was imported from, for named value imports.
 *  `import type` and inline `{ type Foo }` are skipped: a type cannot be called.
 *  Default and namespace imports are not tracked — nothing in `src/` curries
 *  through one, and guessing would cost precision for no coverage. */
export const importBindingsOf = (src) => {
  const out = new Map();
  for (const m of stripComments(src).matchAll(
    /import\s+(type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g,
  )) {
    if (m[1]) continue;
    for (const part of m[2].split(",")) {
      if (/^\s*type\s/.test(part)) continue;
      const local = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (local) out.set(local, m[3]);
    }
  }
  return out;
};

/**
 * PascalCase names a module binds by CALLING something — `const X = callee(…)`,
 * with the callee's local name. The `export` is optional: a library Curried
 * Variant is exported from `variants.ts`, but a test just as often curries the
 * Factory inline (`const Result = createFormulaResult(cfg)`), and both mount.
 *
 * This is the Curried Variant shape (CONTEXT.md): a Factory lives in the
 * Primitive's module, and the caller locks in Override Props.
 * `ActionList.tsx` exports `createActionList` and no component at all; the name
 * a test writes as JSX is born next door:
 *
 *   export const ActionList: Component<ActionListDataProps> =
 *     createActionList({ statusTones: DEFAULT_STATUS_TONES });
 *
 * The optional type annotation between the name and `=` is why this is not a
 * simple `=\s*callee\(` match.
 */
export const curriedBindingsOf = (src) =>
  [
    ...stripComments(src).matchAll(
      /\bconst\s+([A-Z]\w*)\s*(?::[^=;]+)?=\s*([A-Za-z_$][\w$]*)\s*\(/g,
    ),
  ].map(([, name, callee]) => ({ name, callee }));

/** Does the module ship a Factory? `create<Pascal>` is the naming convention
 *  for one (CONTEXT.md). A module exporting only Factories exports no component
 *  value, and would otherwise be skipped as "not a component module" — which is
 *  the escape hatch this metric claims to have closed. */
export const exportsFactory = (src) =>
  /export\s+(?:const|function)\s+create[A-Z]\w*/.test(stripComments(src));

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

  // Curried Variant aliases: which module does a curried name stand in for?
  // `variants.ts` calls a Factory the module exports, so `<ActionList>` runs
  // every line of `ActionList.tsx` even though that module exports no component
  // of its own. Only a call counts, and only through a relative specifier that
  // resolves to the module — so the alias is evidence the module's code ran,
  // not merely that two files share a folder.
  const aliasesIn = (file) => {
    const src = read(file);
    const curried = curriedBindingsOf(src);
    const out = new Map();
    if (length(curried) === 0) return out;
    const bindings = importBindingsOf(src);
    for (const { name, callee } of curried) {
      const spec = bindings.get(callee);
      const target = spec ? resolveSpec(file, spec) : null;
      if (!target) continue;
      if (!out.has(target)) out.set(target, new Set());
      out.get(target).add(name);
    }
    return out;
  };

  // A variant exported from a shared module is mountable by any test that can
  // see the module; one a test curries for itself vouches only for that test.
  // Keeping them apart is what stops test A's local `Result` from vouching for
  // an unrelated `<Result>` in test B.
  const shared = new Map();
  for (const file of files) {
    if (isTestPath(file)) continue;
    for (const [target, names] of aliasesIn(file))
      shared.set(target, new Set([...(shared.get(target) ?? []), ...names]));
  }
  const localTo = new Map(tests.map((t) => [t, aliasesIn(t)]));

  const entries = files.filter(isEntryPath).sort();
  const skipped = [];
  const missing = [];
  for (const entry of entries) {
    const src = read(entry);
    const names = componentExportsOf(src);
    // A Factory module exports no component but IS one — see `exportsFactory`.
    if (length(names) === 0 && !exportsFactory(src)) {
      skipped.push(entry);
      continue;
    }
    const mounted = tests.some((t) => {
      if (!visibleTo.get(t).has(entry)) return false;
      const mountable = new Set([
        ...names,
        ...(shared.get(entry) ?? []),
        ...(localTo.get(t).get(entry) ?? []),
      ]);
      return mountsAny(read(t), [...mountable]);
    });
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
