#!/usr/bin/env node
// ============================================
// Doc coverage — every exported component and factory should be findable in
// COMPONENTS.md. That file is the discovery surface: `src/index.ts` is ~175
// `export *` lines, so a component's name never literally appears in it and
// grepping the barrel to ask "does SUI have X?" is unsound (the exact method
// corrected on dside sui#12300). If the manifest never says a name, nothing
// short of reading 145 directories will tell a consumer it exists.
//
//   node scripts/doc-coverage.mjs           # summary + the missing names
//   node scripts/doc-coverage.mjs --list    # names only, one per line
//   node scripts/doc-coverage.mjs --json    # machine-readable
//
// Surfaced as the `undocumentedExports` health metric.
//
// ── WHY THIS REPLACED `undocumentedComponents` ──────────────────────────────
//
// The metric this supersedes read 0 for its entire life. It asked whether each
// of the 145 `src/components/<Dir>` names appeared ANYWHERE in COMPONENTS.md:
//
//     componentDirs.filter((d) => !new RegExp(`\\b${d}\\b`).test(componentsDoc))
//
// Two defects, and the second is the one that matters.
//
// 1. Directory names are short and generic — `Chart`, `Badge`, `Duration`,
//    `InlineText`, `DatePicker` — so they matched other components' prose.
//    Measured at 3fb1095: 145 of 145 dirs passed, but 32 had no section of
//    their own. A green 0 overstated real coverage by at least 22%.
//
// 2. The granularity was wrong in a way no fix at the directory level reaches.
//    619 exported components and factories live in those 143 directories, and
//    adding one to a directory that is already mentioned was never checked at
//    all. That is the common case: a new curried variant lands in an existing
//    family. `Chart/` alone exports 40 names against one mention of "Chart".
//
// Same question, correct subject: does each EXPORTED NAME appear in
// COMPONENTS.md? Export names are distinctive, so the accidental-match problem
// that sank `Chart` is not a realistic worry for `ClipFillColumnFlush`.
// Measured 2026-08-06 at 049bb92: 172 of 619 are named nowhere in the file.
//
// ── WHAT THIS DELIBERATELY DOES NOT ASK ─────────────────────────────────────
//
// Not "does it have a section heading", and not "does it have a bolded bullet"
// (which would read 384). Many exports are curried variants documented as a
// family — "a Panel variant (`InfoPanel`, `AccentPanel`, `DangerPanel`, …)" —
// and demanding an entry each would push a 1753-line file to grow. That is the
// opposite of dside sui#16389, which is about splitting it. A mention is a low
// bar on purpose; the point is that it is an HONEST low bar, where the old one
// was a bar the file could clear without containing the name at all.
//
// ── DIVERGENCES FROM `componentsWithoutShowcase`, ON PURPOSE ────────────────
//
// scripts/showcase-coverage.mjs drops `create*` factories (they are exercised
// through their variants) and treats a renaming re-export as covered when its
// target is (looking at the SwimlaneChart showcase IS looking at
// SwimlaneChartStatic). Neither carries over here:
//
//   • Factories are the thing COMPONENTS.md's own policy tells you to reach
//     for — "Curry your own once with the factory and reuse it". A factory the
//     manifest never names cannot be reached for. 30-odd of the current 172
//     are `create*`, and that is a real gap, not noise.
//   • An alias is a distinct import specifier. A consumer typing
//     `SwimlaneChartStatic` finds nothing, whatever the manifest says about
//     `SwimlaneChart`.
//
// Types are excluded. `ComboboxProps` is discovered from the component's entry,
// not on its own, and 533 of them would swamp the signal.
//
// Components in a directory with no exported component — today `PivotTreemap`
// (unexported since 2026-05-12, dside sui#16400) and `StatusFlowChart` — are
// not counted, because they are not public API. This is the distinction the
// directory-name metric could not draw: it demanded documentation for internal
// components (`CandlestickRenderer`, `GhostRow`) on the same terms as shipped
// ones. Restoring an export to the barrel makes its names due here, which is
// the correct coupling.
// ============================================
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildExportSurface } from "./export-surface.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const DOCUMENTABLE = new Set(["component", "factory"]);

/**
 * Every identifier-shaped token in the manifest, code fences included — an
 * import line in an example documents a name as surely as prose does.
 */
export const mentionedNames = (doc) =>
  new Set(doc.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []);

/**
 * Pure: which of `exports` the manifest never names, as `Name (file:line)`.
 * Split out from `run` so the rule can be tested without building a Program.
 */
export const undocumented = (exports, doc) => {
  const mentioned = mentionedNames(doc);
  return exports
    .filter((e) => DOCUMENTABLE.has(e.kind) && !mentioned.has(e.name))
    .map((e) => `${e.name} (${e.file}:${e.line})`)
    .sort();
};

// An `import { A, B, type C } from "solid-ui-components"` line in a fenced
// example, including the subpath forms (`solid-ui-components/Duration`).
const IMPORT_RE =
  /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["'](solid-ui-components[^"']*)["']/gs;

/**
 * Pure: import specifiers in the manifest's examples that name something the
 * library does not export, as `Name (COMPONENTS.md:line)`.
 *
 * Zero judgment, unlike `undocumented` — an example a reader copies either
 * compiles or it does not, so this one is ratcheted at 0. It is the check that
 * would have caught all three of its founding cases, each a different bug:
 *
 *   • `DailyDateAxis` / `dayCellContext` — real components, exported from
 *     `src/components/DateAxis/index.ts`, unreachable from the root barrel.
 *     src/index.ts re-exports that family by an EXPLICIT list (a `Cell` name
 *     collision forces it) and the list never kept up, so both shipped in the
 *     tarball while no consumer could import them.
 *   • `Row` — a base component, deliberately unexported under the curried-only
 *     policy stated at the top of the very same file. The example also passed
 *     `gap="xl"`, which is not in the `xs|sm|md|lg` scale.
 *
 * Matching is on the import specifier alone. Prose may name a base component
 * freely — explaining that `Row` exists and is not exported is exactly what
 * COMPONENTS.md is for. Writing `import { Row }` is a different claim.
 */
export const brokenImports = (exports, doc) => {
  const exported = new Set(exports.map((e) => e.name));
  const lineOf = (index) => doc.slice(0, index).split("\n").length;
  return [...doc.matchAll(IMPORT_RE)].flatMap((match) =>
    match[1]
      .split(",")
      .map((s) =>
        s
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)[0]
          .trim(),
      )
      .filter((name) => name && !exported.has(name))
      .map((name) => `${name} (COMPONENTS.md:${lineOf(match.index)})`),
  );
};

export function run({ root = REPO_ROOT, ...surfaceOpts } = {}) {
  const surface = buildExportSurface({ root, ...surfaceOpts });
  const doc = readFileSync(join(root, "COMPONENTS.md"), "utf8");
  const documentable = surface.exports.filter((e) => DOCUMENTABLE.has(e.kind));
  return {
    total: documentable.length,
    missing: undocumented(surface.exports, doc),
    broken: brokenImports(surface.exports, doc),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { total, missing, broken } = run();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ total, missing, broken }, null, 2));
  } else if (process.argv.includes("--list")) {
    for (const m of missing) console.log(m.split(" ")[0]);
  } else {
    console.log(
      `undocumentedExports: ${missing.length}   (of ${total} exported components and factories)`,
    );
    for (const m of missing) console.log(`  ${m}`);
    console.log(
      `\nbrokenDocImports: ${broken.length}   (import examples naming a non-export)`,
    );
    for (const b of broken) console.log(`  ${b}`);
  }
  process.exit(missing.length || broken.length ? 1 : 0);
}
