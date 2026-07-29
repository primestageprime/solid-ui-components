// ============================================
// Health ratchet guard — a ceiling must never loosen by accident
// ============================================
//
// `--update-baseline` used to write EVERY metric at once. It was the only
// escape hatch, so accepting one deliberate increase silently blessed every
// unrelated drift in the same command. The damage is in the git history:
// `dotChains` was burned down 127 → 55 and `collectionMethodCalls` 362 → 225 by
// real work, then both crept back to 59 / 230 as side effects of commits about
// other things (`e72db8f` "bless baseline for Auth composites", `6cc7609`
// "fix(themes): button labels clear WCAG 4.5:1"). A ratchet whose last recorded
// action was loosening is not a ratchet.
//
// These tests pin the three rules that fixed it. The tempting "simplification"
// is to go back to one unconditional write of `metrics` — that is precisely
// what must keep failing here.
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(root, "scripts", "health.mjs");

// Each case spawns a real health run, which walks all of src/ and executes three
// rubric scripts. That is ~1.5s locally but ~4.7s on a CI runner, which
// overshoots vitest's 5s default — the first version of this file passed here
// and timed out in CI. Set generously and per-file: raising the global timeout
// would also let a genuinely hung component test sit for 30s.
const SPAWN_TIMEOUT_MS = 30_000;

// The committed baseline is the source of truth for which metrics exist and
// what the real counts are; tests perturb a COPY via --baseline-path so a
// failing run can never leave a wrong ceiling behind.
const realBaseline = () =>
  JSON.parse(readFileSync(join(root, "scripts", "health-baseline.json"), "utf8"));

/** Write a temp baseline with `overrides` applied, run health, return the result. */
const runHealth = (overrides: Record<string, number>, ...args: string[]) => {
  const dir = mkdtempSync(join(tmpdir(), "sui-ratchet-"));
  const path = join(dir, "baseline.json");
  writeFileSync(path, JSON.stringify({ ...realBaseline(), ...overrides }, null, 2));
  let status = 0;
  let output = "";
  try {
    output = execFileSync(
      process.execPath,
      [SCRIPT, `--baseline-path=${path}`, ...args],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (e: any) {
    status = e.status ?? 1;
    output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  return { status, output, after: JSON.parse(readFileSync(path, "utf8")) };
};

// A metric with a real, non-zero count, so it can be perturbed in both
// directions. Chosen from the baseline rather than hardcoded, so renaming a
// metric fails loudly here instead of silently skipping the assertions.
const [METRIC, ACTUAL] = (() => {
  const entry = Object.entries(realBaseline()).find(
    ([, v]) => typeof v === "number" && (v as number) > 5,
  );
  if (!entry) throw new Error("no non-trivial metric in health-baseline.json");
  return entry as [string, number];
})();

describe("health ratchet: a ceiling may not loosen by accident", () => {
  it("the bare flag REFUSES to raise a ceiling", () => {
    // The exact 6cc7609 failure: a metric rose as a side effect of unrelated
    // work, and the blanket update would have written it in as the new normal.
    const lowered = ACTUAL - 5;
    const r = runHealth({ [METRIC]: lowered }, "--update-baseline");
    expect(r.status, r.output).toBe(1);
    expect(r.output).toMatch(/Refusing to update the baseline/);
    // Nothing may be written — not even the metrics that were fine.
    expect(r.after[METRIC], "the stale ceiling must survive the refusal").toBe(
      lowered,
    );
  }, SPAWN_TIMEOUT_MS);

  it("naming one risen metric does not bless a second one", () => {
    const others = Object.entries(realBaseline()).filter(
      ([k, v]) => k !== METRIC && typeof v === "number" && (v as number) > 5,
    );
    if (others.length === 0) return; // only one non-trivial metric; nothing to prove
    const [other, otherVal] = others[0] as [string, number];
    const r = runHealth(
      { [METRIC]: ACTUAL - 5, [other]: otherVal - 5 },
      `--update-baseline=${METRIC}`,
      "--reason=guard test",
    );
    expect(r.status, r.output).toBe(1);
    expect(r.output).toContain(other);
    expect(r.output).toMatch(/were not named/);
  }, SPAWN_TIMEOUT_MS);

  it("naming a metric without a reason is refused", () => {
    // `67b89c7` raised cssTypedProps 13 -> 14 with the message "bless
    // TableColumn.minWidth" and never touched scripts/prop-rubric.json, whose
    // entire purpose is to hold the justification. The baseline was a second,
    // silent exemption route. A raise must now carry its own reason.
    const r = runHealth({ [METRIC]: ACTUAL - 5 }, `--update-baseline=${METRIC}`);
    expect(r.status, r.output).toBe(1);
    expect(r.output).toMatch(/requires --reason/);
    expect(r.after[METRIC], "nothing may be written").toBe(ACTUAL - 5);
  }, SPAWN_TIMEOUT_MS);

  it("naming a metric with a reason raises it and records why", () => {
    const r = runHealth(
      { [METRIC]: ACTUAL - 5 },
      `--update-baseline=${METRIC}`,
      "--reason=deliberate, for the guard test",
    );
    expect(r.status, r.output).toBe(0);
    expect(r.after[METRIC]).toBe(ACTUAL);
    expect(r.output).toMatch(/raised, as named/);
    // The reason must survive in the baseline, not just the commit message.
    expect(r.after._raises?.[METRIC]).toEqual({
      from: ACTUAL - 5,
      to: ACTUAL,
      reason: "deliberate, for the guard test",
    });
  }, SPAWN_TIMEOUT_MS);
});

describe("health ratchet: a gain may not leak back", () => {
  it("an unrecorded improvement fails the run", () => {
    // Left as a passing advisory, a gain sits behind a ceiling that still
    // permits undoing it — with CI green the entire time.
    const r = runHealth({ [METRIC]: ACTUAL + 10 });
    expect(r.status, r.output).toBe(1);
    expect(r.output).toMatch(/Improvements are not locked in/);
  }, SPAWN_TIMEOUT_MS);

  it("the bare flag locks the improvement in", () => {
    const r = runHealth({ [METRIC]: ACTUAL + 10 }, "--update-baseline");
    expect(r.status, r.output).toBe(0);
    expect(r.after[METRIC]).toBe(ACTUAL);
    expect(r.output).toMatch(/locked in/);
  }, SPAWN_TIMEOUT_MS);
});

describe("health ratchet: operator errors surface", () => {
  it("an unknown metric name is rejected rather than ignored", () => {
    // Silently failing to bless a typo'd name would then error about the
    // "unexpected" regression, sending the reader down the wrong path.
    const r = runHealth({}, "--update-baseline=notAMetric");
    expect(r.status, r.output).toBe(1);
    expect(r.output).toMatch(/unknown metric/);
  }, SPAWN_TIMEOUT_MS);

  it("a clean tree with tight ceilings passes", () => {
    const r = runHealth({});
    expect(r.status, r.output).toBe(0);
  }, SPAWN_TIMEOUT_MS);
});
