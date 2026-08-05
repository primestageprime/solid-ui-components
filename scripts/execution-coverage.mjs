#!/usr/bin/env node
// ============================================
// Execution coverage — which component modules never RUN?
//
// The companion to `componentsNeverRendered` (scripts/render-coverage.mjs), and
// deliberately not a replacement. The two answer different questions:
//
//   componentsNeverRendered  does a test MOUNT this module directly?
//                            → is there a suite that OWNS it
//   componentsNeverExecuted  does any line of it EVER run?
//                            → is it dark
//
// A module can pass one and fail the other, and both failures matter. `Chart/
// Crosshair` executes on every ThroughputChart test but has no owning suite;
// `DateRangePicker/TimeInputs` has no owning suite AND never executes, because
// it sits behind a condition inside a Popover that the tests open but never
// satisfy. Only the second is dark.
//
// WHY THIS EXISTS. A static rule cannot answer the execution question. The
// obvious extension to the static metric — "count a module as covered when a
// mounted parent renders it" — was measured against real coverage before being
// written, and it was wrong in BOTH directions on the first list it produced:
// it would have cleared TimeInputs (0 of 7 functions ever called) and kept
// Section (18 of 23) and StaticSplitLayout (21 of 25). Reachability in the JSX
// is not execution, because the branch may never be taken. So this metric is
// measured, not inferred.
//
// FUNCTIONS, NOT LINES. v8 attributes module INITIALISATION to the file, so a
// module that is merely imported reads as partly covered: Table/GroupedTable
// had zero call sites in this repo or any consumer and still showed 1.8% of
// lines (measured 2026-08-04; the module was deleted shortly after, under dside
// sui#12546). Its function coverage was 0/22, which is the truth. Every
// threshold discussion
// ("is 40% enough?") is avoided by asking only whether the count is ZERO — the
// same floor `componentsNeverRendered` uses, for the same reason. Depth of
// coverage is not mechanical and does not belong in a ratchet.
//
//   npm run test:coverage          # produces coverage/coverage-summary.json
//   npm run execution-coverage     # summary + nonzero exit if any
//   npm run execution-coverage -- --list
//
// Surfaced as the `componentsNeverExecuted` metric, ratcheted against
// scripts/execution-baseline.json. It lives in the `test` CI job rather than
// `health` because it needs the suite to have run; `health` stays a fast static
// pass with no subprocess.
// ============================================
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run as runRenderCoverage } from "./render-coverage.mjs";
import { length } from "./fn.mjs";
import { classify } from "./health-ratchet.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── pure helpers (the test surface) ──────────────────────────────────────────

/**
 * Which component modules never executed a single function.
 *
 * Pure over the coverage summary and the entry list — no fs, no cwd — so the
 * rules pin against a hand-built map rather than a real coverage run.
 *
 * @param entries  component module paths (the same selector `isEntryPath` uses,
 *                 so this metric and `componentsNeverRendered` agree on what a
 *                 component module is)
 * @param summary  istanbul-shaped `coverage-summary.json`: path → {functions:
 *                 {covered, total}}
 * @returns {{dark: string[], unmeasured: string[], measured: number}}
 *   `unmeasured` are entries the report does not mention at all. They count as
 *   dark — a file the instrumenter never saw was never run — but come back
 *   separately, because ALL of them being unmeasured means a broken `include`
 *   glob rather than a dark codebase, and that should read as a config fault,
 *   not as work to do.
 */
export function analyse({ entries, summary }) {
  const dark = [];
  const unmeasured = [];
  let measured = 0;
  for (const entry of [...entries].sort()) {
    const stats = summary[entry]?.functions;
    if (!stats) {
      unmeasured.push(entry);
      continue;
    }
    // A module declaring no functions has nothing to execute; it is not dark,
    // it is not a component either, and `covered === 0` would libel it.
    if (stats.total === 0) continue;
    measured += 1;
    if (stats.covered === 0) dark.push(entry);
  }
  return { dark, unmeasured, measured };
}

// ── the edge: read the real report ───────────────────────────────────────────

const SUMMARY = join(root, "coverage", "coverage-summary.json");

export function run() {
  if (!existsSync(SUMMARY))
    throw new Error(
      `no coverage report at ${SUMMARY}\n` +
        `Run \`npm run test:coverage\` first — this metric is measured, not inferred.`,
    );
  const summary = JSON.parse(readFileSync(SUMMARY, "utf8"));
  const entries = runRenderCoverage().entries.map((p) => join(root, p));
  const { dark, unmeasured, measured } = analyse({ entries, summary });
  const rel = (p) => p.replace(`${root}/`, "");
  return {
    dark: dark.map(rel),
    unmeasured: unmeasured.map(rel),
    measured,
    total: length(entries),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { dark, unmeasured, measured, total } = run();
  const never = [...dark, ...unmeasured];

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ total, measured, dark, unmeasured }, null, 2));
    process.exit(0);
  }
  if (process.argv.includes("--list")) {
    for (const m of never) console.log(m);
    process.exit(length(never) ? 1 : 0);
  }

  // An entry the report never mentions is dark, but it is far more often a
  // broken include glob. Say so rather than filing 228 modules as work.
  if (length(unmeasured) > measured)
    console.log(
      `\n  ⚠ ${length(unmeasured)} of ${total} component modules are absent from the\n` +
        `    coverage report. That is a coverage \`include\` fault, not a backlog.\n`,
    );

  const baselinePath = join(root, "scripts", "execution-baseline.json");
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const metrics = { componentsNeverExecuted: length(never) };
  const { regressions, improvements, unbaselined } = classify(
    metrics,
    baseline,
  );

  console.log(
    `componentsNeverExecuted: ${length(never)}   (of ${total} component modules; ${measured} measured)`,
  );
  for (const m of never) console.log(`  ${m}`);

  if (process.argv.includes("--update-baseline")) {
    const next = { ...baseline, ...metrics };
    writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`\nBaseline updated: ${baselinePath}`);
    process.exit(0);
  }

  for (const { k, base, v } of regressions)
    console.log(`\n✗ ${k} rose ${base} → ${v}. Add a test that runs it.`);
  for (const { k, base, v } of improvements)
    console.log(
      `\n✗ ${k} fell ${base} → ${v} without the baseline moving.\n` +
        `  Re-run with --update-baseline to lock the gain in.`,
    );
  for (const k of unbaselined) console.log(`\n✗ ${k} has no baseline.`);

  const bad =
    length(regressions) + length(improvements) + length(unbaselined) > 0;
  if (!bad) console.log("\n✓ At baseline.");
  process.exit(bad ? 1 : 0);
}
