// ============================================
// generator-lib — shared plumbing for the three scaffold generators
// (new-component.mjs, new-variant.mjs, new-bench.mjs).
//
// The brief these three scripts implement (docs/handoffs — see the PR that
// added this file) asks for one behaviour common to all of them: REFUSE
// atomically when any target exists, so a refusal always leaves the tree
// byte-identical and a re-run after fixing the collision just works. That
// only composes if every generator builds its FULL edit plan (new files +
// anchored insertions into shared files) and validates every target BEFORE
// writing anything — never write-as-you-go. This module is the plan/validate/
// apply pipeline every generator drives, plus the small pure string helpers
// (kebab/pascal conversion, anchored-insert) each generator's plan is built
// from.
//
//   node scripts/fn.mjs is the project's function-first mirror; this module
//   follows the same convention (direct form outside pipes).
// ============================================
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── naming ────────────────────────────────────────────────────────────────

/** "RateGauge" -> "rate-gauge". Mirrors workshop-lib.mjs's slug vocabulary,
 *  inverted: PascalCase in, kebab-case out. */
export const pascalToKebab = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

/** "rate-gauge" -> "RateGauge". */
export const kebabToPascal = (slug) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

export const isPascalName = (s) => /^[A-Z][A-Za-z0-9]*$/.test(s);

// ── plan / validate / apply ──────────────────────────────────────────────
//
// A Plan is: { writes: [{ path, content }], edits: [{ path, check, apply }] }
//   - `writes` are brand-new files. They refuse when the path already exists.
//   - `edits` transform an existing shared file's TEXT. `check(text)` returns
//     `null` when the edit is safe to apply (anchor found, insertion not
//     already present) or a STRING naming what's wrong. `apply(text)` returns
//     the new text; called only once every check in the whole plan passed.
//
// Nothing is written until every write-target's absence and every edit's
// check have been confirmed — that is the whole atomicity guarantee.

export const fileWrite = (path, content) => ({ path, content });

export const anchoredEdit = (path, check, apply) => ({ path, check, apply });

/** Validate every target in `plan`. Returns `{ ok: true }` or
 *  `{ ok: false, problems: string[] }`. Never touches the filesystem. */
export function validatePlan(plan) {
  const problems = [];
  for (const w of plan.writes) {
    if (existsSync(w.path))
      problems.push(`refusing to overwrite existing file: ${relOf(w.path)}`);
  }
  for (const e of plan.edits) {
    if (!existsSync(e.path)) {
      problems.push(`edit target does not exist: ${relOf(e.path)}`);
      continue;
    }
    const text = readFileSync(e.path, "utf8");
    const problem = e.check(text);
    if (problem) problems.push(`${relOf(e.path)}: ${problem}`);
  }
  return problems.length === 0 ? { ok: true } : { ok: false, problems };
}

/** Apply every write and edit in `plan`. Call only after `validatePlan` has
 *  returned `{ ok: true }` for this exact plan — re-validate if anything
 *  about the tree could have changed in between. */
export function applyPlan(plan) {
  for (const w of plan.writes) {
    mkdirSync(dirname(w.path), { recursive: true });
    writeFileSync(w.path, w.content);
  }
  for (const e of plan.edits) {
    const text = readFileSync(e.path, "utf8");
    writeFileSync(e.path, e.apply(text));
  }
}

/** Run `validatePlan` then `applyPlan`, printing a uniform refusal message
 *  and exiting 1 when validation fails. The one entry point every generator
 *  CLI calls once its plan is built. */
export function runPlan(plan, { name }) {
  const result = validatePlan(plan);
  if (!result.ok) {
    console.error(`${name}: refusing — nothing was written.\n`);
    for (const p of result.problems) console.error(`  - ${p}`);
    console.error(
      "\nFix the collision above and re-run — this command is idempotent " +
        "after a refusal because nothing is written until every target checks out.",
    );
    process.exit(1);
  }
  applyPlan(plan);
  console.log(`${name}: wrote ${plan.writes.length} file(s), ${plan.edits.length} edit(s):`);
  for (const w of plan.writes) console.log(`  + ${relOf(w.path)}`);
  for (const e of plan.edits) console.log(`  ~ ${relOf(e.path)}`);
}

const relOf = (p) => p.replace(`${root}/`, "");

// ── anchored text insertion (pure — the check/apply pair every edit uses) ──

/** An edit that inserts `insertion` right after the first line matching
 *  `anchorRe`, unless `alreadyRe` already matches the file (then it's a
 *  no-op the caller should not even plan — see `alreadyPresent`). */
export function insertAfterLine(anchorRe, insertion) {
  return {
    check: (text) => {
      if (!anchorRe.test(text))
        return `anchor not found (${anchorRe}) — shared file shape changed underneath this generator`;
      return null;
    },
    apply: (text) => {
      const lines = text.split("\n");
      const i = lines.findIndex((l) => anchorRe.test(l));
      lines.splice(i + 1, 0, insertion);
      return lines.join("\n");
    },
  };
}

/** An edit that inserts `insertion` right BEFORE the first line matching
 *  `anchorRe`. */
export function insertBeforeLine(anchorRe, insertion) {
  return {
    check: (text) => (anchorRe.test(text) ? null : `anchor not found (${anchorRe})`),
    apply: (text) => {
      const lines = text.split("\n");
      const i = lines.findIndex((l) => anchorRe.test(l));
      lines.splice(i, 0, insertion);
      return lines.join("\n");
    },
  };
}

/** Wraps a check/apply pair so the edit is skipped (check passes trivially,
 *  apply is identity) when `presentRe` already matches — the mechanism that
 *  makes an edit safe to describe in a plan that might be re-run after a
 *  PARTIAL manual fix. Generators mostly don't need this because refusal is
 *  atomic, but shared multi-purpose anchors (e.g. a marker comment a second
 *  generator run also wants) do. */
export function skipIfPresent(presentRe, edit) {
  return {
    check: (text) => (presentRe.test(text) ? null : edit.check(text)),
    apply: (text) => (presentRe.test(text) ? text : edit.apply(text)),
  };
}

// ── health ────────────────────────────────────────────────────────────────

/** Run `node scripts/health.mjs`, returning { ok, output, metrics }. Never
 *  throws on a failing (regressed) health run — the caller decides what a
 *  nonzero exit means for a probe vs. a real component. `metrics` is parsed
 *  from health's own per-line report (`key   value  status…`), which is the
 *  only machine-readable surface it has (no --json mode). */
export function runHealth() {
  let output = "";
  let ok = true;
  try {
    output = execFileSync("node", ["scripts/health.mjs"], {
      cwd: root,
      encoding: "utf8",
    });
  } catch (err) {
    ok = false;
    output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  const metrics = {};
  for (const line of output.split("\n")) {
    const m = line.match(/^\s{2}(\w+)\s+(\d+)/);
    if (m) metrics[m[1]] = Number(m[2]);
  }
  return { ok, output, metrics };
}

/** Diff two `runHealth().metrics` snapshots down to just what moved. */
export function diffMetrics(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = [];
  for (const k of [...keys].sort()) {
    const b = before[k];
    const a = after[k];
    if (b !== a) changed.push({ metric: k, before: b, after: a });
  }
  return changed;
}

/** Print a health run's delta as a short table. */
export function printHealthDelta(before, after) {
  const changed = diffMetrics(before, after);
  if (changed.length === 0) {
    console.log("\nhealth: no metric moved.");
    return;
  }
  console.log("\nhealth delta:");
  for (const { metric, before: b, after: a } of changed) {
    const arrow = a > b ? "↑" : "↓";
    console.log(`  ${metric.padEnd(28)} ${b} ${arrow} ${a}`);
  }
}
