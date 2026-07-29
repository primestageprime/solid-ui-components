// ============================================
// Health ratchet guard — a ceiling must never loosen by accident
// ============================================
//
// `--update-baseline` used to write EVERY metric at once. It was the only escape
// hatch, so accepting one deliberate increase silently blessed every unrelated
// drift in the same command. The damage is in the git history: `dotChains` was
// burned down 127 → 55 and `collectionMethodCalls` 362 → 225 by real work, then
// both crept back to 59 / 230 as side effects of commits about other things
// (`e72db8f` "bless baseline for Auth composites", `6cc7609` "fix(themes):
// button labels clear WCAG 4.5:1"). A ratchet whose last recorded action was
// loosening is not a ratchet. Separately, `cssTypedProps` had TWO exemption
// routes — scripts/prop-rubric.json, which demands a justification string, and
// the baseline, which demanded nothing. `67b89c7` took the silent one.
//
// These tests pin the rules against the PURE layer (scripts/health-ratchet.mjs)
// with hand-built metric objects. An earlier version spawned
// `node scripts/health.mjs` once per case; each spawn walks all of src/ and runs
// the TypeScript compiler API, and nine of them inside the jsdom suite hung CI
// until it was cancelled at 15 minutes. One subprocess smoke test remains, to
// prove the CLI is actually wired to these rules.
//
// The tempting "simplification" is to go back to one unconditional write of
// `metrics` — that is exactly what must keep failing here.
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { classify, planBaselineUpdate } from "./health-ratchet.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Two metrics is enough to prove "named one, not the other". */
const BASE = { alpha: 10, beta: 20 };
const plan = (
  metrics: Record<string, number>,
  raisable: string[] = [],
  reason?: string,
  baseline: Record<string, unknown> = BASE,
) =>
  planBaselineUpdate({
    metrics,
    baseline,
    raisable: new Set(raisable),
    reason,
  });

describe("health ratchet: classify", () => {
  it("splits rises from gains, and ignores metrics with no ceiling yet", () => {
    const { regressions, improvements } = classify(
      { alpha: 12, beta: 18, gamma: 5 },
      BASE,
    );
    expect(regressions).toEqual([{ k: "alpha", base: 10, v: 12 }]);
    expect(improvements).toEqual([{ k: "beta", base: 20, v: 18 }]);
    // `gamma` has no baseline — it is neither a rise nor a gain.
  });
});

describe("health ratchet: a ceiling may not loosen by accident", () => {
  it("the bare flag REFUSES to raise a ceiling", () => {
    const r = plan({ alpha: 12, beta: 20 });
    expect(r.error?.kind).toBe("unblessed-rise");
    expect(r.error?.detail).toEqual([{ k: "alpha", base: 10, v: 12 }]);
    // The whole write is refused — a partial one would report success while
    // the ceiling it failed to raise still fails the next run.
    expect(r.next).toBeUndefined();
  });

  it("naming one risen metric does not bless a second one", () => {
    const r = plan({ alpha: 12, beta: 22 }, ["alpha"], "deliberate");
    expect(r.error?.kind).toBe("unblessed-rise");
    expect(r.error?.detail).toEqual([{ k: "beta", base: 20, v: 22 }]);
  });

  it("the bare flag still lowers, and never raises, in one pass", () => {
    // Mixed movement with nothing named: refused outright rather than
    // cherry-picking the gain and leaving the rise unrecorded.
    expect(plan({ alpha: 12, beta: 18 }).error?.kind).toBe("unblessed-rise");
    // Gains alone: clamped down, no rises possible.
    const r = plan({ alpha: 8, beta: 18 });
    expect(r.next).toEqual({ alpha: 8, beta: 18 });
    expect(r.raised).toEqual([]);
  });
});

describe("health ratchet: raising demands a written reason", () => {
  it("a named metric without a reason is refused", () => {
    // `67b89c7` raised cssTypedProps 13 -> 14 with the message "bless
    // TableColumn.minWidth" and never touched scripts/prop-rubric.json, whose
    // whole purpose is to hold that justification. It is now unavoidable.
    const r = plan({ alpha: 12, beta: 20 }, ["alpha"]);
    expect(r.error?.kind).toBe("missing-reason");
    expect(r.next).toBeUndefined();
  });

  it("a named metric with a reason rises, and the reason is recorded", () => {
    const r = plan({ alpha: 12, beta: 20 }, ["alpha"], "ch-unit column needs it");
    expect(r.error).toBeUndefined();
    expect(r.next?.alpha).toBe(12);
    expect(r.raised).toEqual([["alpha", 12]]);
    // The reason must outlive the commit message.
    expect((r.next as any)._raises).toEqual({
      alpha: { from: 10, to: 12, reason: "ch-unit column needs it" },
    });
  });

  it("previously recorded reasons are carried forward, not dropped", () => {
    const withHistory = {
      ...BASE,
      _raises: { beta: { from: 19, to: 20, reason: "earlier decision" } },
    };
    const r = plan({ alpha: 12, beta: 20 }, ["alpha"], "new decision", withHistory);
    expect((r.next as any)._raises).toEqual({
      beta: { from: 19, to: 20, reason: "earlier decision" },
      alpha: { from: 10, to: 12, reason: "new decision" },
    });
  });

  it("_raises is metadata, never treated as a metric", () => {
    const withHistory = {
      ...BASE,
      _raises: { beta: { from: 19, to: 20, reason: "x" } },
    };
    const { regressions, improvements } = classify({ alpha: 10, beta: 20 }, withHistory);
    expect(regressions).toEqual([]);
    expect(improvements).toEqual([]);
  });
});

describe("health ratchet: operator errors surface", () => {
  it("an unknown metric name is rejected rather than ignored", () => {
    // Silently failing to bless a typo'd name would then error about the
    // "unexpected" regression, sending the reader down the wrong path.
    const r = plan({ alpha: 10, beta: 20 }, ["alfa"], "reason");
    expect(r.error?.kind).toBe("unknown-metric");
    expect(r.error?.detail).toEqual(["alfa"]);
  });

  it("a typo is reported ahead of a missing reason", () => {
    // Given both mistakes, the misspelling is the more useful one to surface.
    expect(plan({ alpha: 10, beta: 20 }, ["alfa"]).error?.kind).toBe(
      "unknown-metric",
    );
  });

  it("a clean tree with tight ceilings changes nothing", () => {
    const r = plan({ alpha: 10, beta: 20 });
    expect(r.error).toBeUndefined();
    expect(r.lowered).toEqual([]);
    expect(r.raised).toEqual([]);
  });
});

// One end-to-end case, so a refactor cannot leave the CLI wired to nothing.
// Deliberately a single spawn: see the header note about CI.
describe("health ratchet: the CLI is wired to these rules", () => {
  it("refuses a bare raise against a real baseline", () => {
    const realBaseline = JSON.parse(
      readFileSync(join(root, "scripts", "health-baseline.json"), "utf8"),
    );
    const metric = Object.entries(realBaseline).find(
      ([, v]) => typeof v === "number" && (v as number) > 5,
    );
    if (!metric) throw new Error("no non-trivial metric in health-baseline.json");
    const [name, value] = metric as [string, number];

    const dir = mkdtempSync(join(tmpdir(), "sui-ratchet-"));
    const path = join(dir, "baseline.json");
    // Set the ceiling BELOW the real count, so the run sees an unnamed rise.
    writeFileSync(path, JSON.stringify({ ...realBaseline, [name]: value - 5 }));

    let status = 0;
    let output = "";
    try {
      output = execFileSync(
        process.execPath,
        [
          join(root, "scripts", "health.mjs"),
          `--baseline-path=${path}`,
          "--update-baseline",
        ],
        { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (e: any) {
      status = e.status ?? 1;
      output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }

    expect(status, output).toBe(1);
    expect(output).toMatch(/Refusing to update the baseline/);
    // And the stale ceiling survived.
    expect(JSON.parse(readFileSync(path, "utf8"))[name]).toBe(value - 5);
  }, 60_000);
});
