// @vitest-environment node
//
// ============================================
// Gate stage guard — one list, and nothing outside it
// ============================================
//
// `npm run gate` green must mean "the pre-push hook will pass and CI's checks
// will pass". That only holds while every check CI or the hook runs is a stage
// in scripts/gate-stages.mjs. On 2026-11-12 it did not hold: `npm run catalog
// -- --check` was in ci.yml's health job and written out in githooks/pre-push,
// but was not a gate stage, so a push reported "gate green" was refused on a
// stale catalog.json (thorcasting #4471 / #4472).
//
// These tests read the real ci.yml and the real hook, so adding a check to
// either without adding the stage fails the suite.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  STAGES,
  commandLine,
  ledgerCalls,
  mainPushCommits,
  planStages,
  receiptStages,
  resolveProfile,
} from "./gate-stages.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// Every job's `npm ci --ignore-scripts` is install, not a check — gate.mjs's
// header explains why the gate never runs it.
const CI_SETUP = new Set(["npm ci --ignore-scripts"]);

/** ci.yml's `run:` lines, grouped by job. Single-line `run:` only; a block
 * scalar (`run: |`) is reported as "|" and fails the coverage test below on
 * purpose — transcribe it into a stage and teach this parser. */
function ciRunLines(): { job: string; line: string }[] {
  const out: { job: string; line: string }[] = [];
  let inJobs = false;
  let job = "";
  for (const raw of read(".github/workflows/ci.yml").split("\n")) {
    if (/^jobs:\s*$/.test(raw)) {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    const jobMatch = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(raw);
    if (jobMatch) {
      job = jobMatch[1];
      continue;
    }
    const runMatch = /^\s*-?\s*run:\s*(.+?)\s*$/.exec(raw);
    if (runMatch && !CI_SETUP.has(runMatch[1])) out.push({ job, line: runMatch[1] });
  }
  return out;
}

const stageLines = STAGES.flatMap((s) =>
  s.commands.map((c) => ({ job: s.ciJob, line: commandLine(c), stage: s.name })),
);

describe("gate stages cover CI", () => {
  const ci = ciRunLines();

  it("finds ci.yml's checks (parser sanity)", () => {
    expect(ci.length).toBeGreaterThanOrEqual(9);
    expect(ci).toContainEqual({ job: "health", line: "npm run catalog -- --check" });
  });

  it("every `run:` line in ci.yml is a stage command, under the same job", () => {
    const missing = ci.filter(
      (c) => !stageLines.some((s) => s.job === c.job && s.line === c.line),
    );
    expect(missing, "ci.yml runs a check that scripts/gate-stages.mjs has no stage for").toEqual(
      [],
    );
  });

  it("every stage that names a CI job runs a command ci.yml really has", () => {
    const stale = stageLines
      .filter((s) => s.job !== null)
      .filter((s) => !ci.some((c) => c.job === s.job && c.line === s.line));
    expect(stale, "a stage claims a ci.yml command that ci.yml no longer runs").toEqual([]);
  });

  it("the full tier runs every stage", () => {
    expect(planStages().every((p) => p.action === "run")).toBe(true);
  });
});

describe("the pre-push hook holds no check of its own", () => {
  // Lines that execute something: not comments, not blank.
  const code = read("githooks/pre-push")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  it("calls gate.mjs --pre-push and hands it the pushed refs", () => {
    expect(code.some((l) => l.includes("node scripts/gate.mjs --pre-push --push-refs-stdin"))).toBe(
      true,
    );
  });

  it("invokes nothing else (echo text aside)", () => {
    const invocations = code
      .filter((l) => !l.startsWith("echo "))
      .filter((l) => /\b(npm|npx|node|vitest|tsc|biome)\b/.test(l));
    expect(invocations).toEqual(["if ! node scripts/gate.mjs --pre-push --push-refs-stdin; then"]);
  });
});

describe("planStages tiers", () => {
  const names = (plan: ReturnType<typeof planStages>, action: string) =>
    plan.filter((p) => p.action === action).map((p) => p.stage.name);

  it("lists every stage in every tier, run or skipped", () => {
    for (const opts of [{}, { fast: true }, { prePush: true }, { only: ["lint"] }]) {
      expect(planStages(opts).map((p) => p.stage.name)).toEqual(STAGES.map((s) => s.name));
    }
  });

  it("--pre-push: lint, typecheck, affected tests, catalog, usage-manifest", () => {
    const plan = planStages({ prePush: true });
    expect(names(plan, "run")).toEqual(["test", "lint", "typecheck", "catalog", "usage-manifest"]);
    expect(names(plan, "skip")).toEqual(["health", "build", "bundle-budget"]);
    expect(plan.find((p) => p.stage.name === "test")?.mode).toBe("affected");
    for (const p of plan.filter((x) => x.action === "skip")) expect(p.why).toMatch(/^--pre-push: /);
  });

  it("--fast skips only the two builds", () => {
    expect(names(planStages({ fast: true }), "skip")).toEqual(["build", "bundle-budget"]);
  });

  it("catalog freshness runs in every tier and blocks", () => {
    for (const opts of [{}, { fast: true }, { prePush: true }]) {
      expect(names(planStages(opts), "run")).toContain("catalog");
    }
    expect(STAGES.find((s) => s.name === "catalog")?.warnOnly).toBeFalsy();
  });

  it("usage-manifest is the only warn-only stage", () => {
    expect(STAGES.filter((s) => s.warnOnly).map((s) => s.name)).toEqual(["usage-manifest"]);
  });

  it("--only reaches a stage its tier would skip, and rejects unknown names", () => {
    expect(names(planStages({ prePush: true, only: ["health"] }), "run")).toEqual(["health"]);
    expect(() => planStages({ only: ["nope"] })).toThrow(/unknown stage/);
  });
});

describe("profiles are compositions of stages", () => {
  const names = (plan: ReturnType<typeof planStages>, pick: (p: (typeof plan)[number]) => unknown) =>
    plan.filter(pick).map((p) => p.stage.name);

  it("quality runs every stage in full", () => {
    const plan = planStages({ profile: "quality" });
    expect(plan.every((p) => p.action === "run" && p.mode === "full")).toBe(true);
  });

  it("speed is the push tier exactly, and what it leaves out is deferred", () => {
    const speed = planStages({ profile: "speed" });
    const push = planStages({ prePush: true });
    expect(names(speed, (p) => p.action === "run")).toEqual(names(push, (p) => p.action === "run"));
    expect(speed.map((p) => p.mode)).toEqual(push.map((p) => p.mode));
    expect(names(speed, (p) => p.deferred === true)).toEqual(["health", "build", "bundle-budget"]);
  });

  it("a named stage runs alone and in full, whatever the profile", () => {
    const plan = planStages({ only: ["test"], profile: "speed" });
    expect(names(plan, (p) => p.action === "run")).toEqual(["test"]);
    expect(plan.find((p) => p.stage.name === "test")?.mode).toBe("full");
    expect(plan.some((p) => p.deferred)).toBe(false);
  });

  it("the push tier ignores a profile: it is never weakened", () => {
    expect(planStages({ prePush: true, profile: "speed" })).toEqual(planStages({ prePush: true }));
  });
});

describe("resolveProfile", () => {
  it("an explicit --profile wins over workmode", () => {
    expect(resolveProfile({ flag: "quality", workmode: { mode: "speed", reason: "x" } })).toEqual({
      profile: "quality",
      source: "--profile",
    });
  });

  it("no flag: workmode decides, and its reason is carried", () => {
    expect(resolveProfile({ workmode: { mode: "speed", reason: "Peter active 3 min ago" } })).toEqual({
      profile: "speed",
      source: "workmode: Peter active 3 min ago",
    });
  });

  it("no flag and no usable workmode answer: quality", () => {
    expect(resolveProfile({}).profile).toBe("quality");
    expect(resolveProfile({ workmode: { mode: "turbo" } as never }).profile).toBe("quality");
  });

  it("refuses a profile on the push tier or with --fast, and unknown profiles", () => {
    expect(resolveProfile({ flag: "speed", prePush: true }).error).toMatch(/--pre-push/);
    expect(resolveProfile({ flag: "quality", prePush: true }).error).toMatch(/--pre-push/);
    expect(resolveProfile({ flag: "speed", fast: true }).error).toMatch(/--fast/);
    expect(resolveProfile({ flag: "rush" }).error).toMatch(/must be one of/);
  });

  it("tier flags and --stage never consult workmode", () => {
    const workmode = { mode: "speed", reason: "x" };
    expect(resolveProfile({ prePush: true, workmode }).profile).toBeNull();
    expect(resolveProfile({ fast: true, workmode }).profile).toBeNull();
    expect(resolveProfile({ only: ["lint"], workmode }).profile).toBeNull();
  });
});

describe("ledgerCalls", () => {
  const rows = (plan: ReturnType<typeof planStages>, failed: string | null = null) =>
    plan.map((p) => ({
      stage: p.stage,
      mode: p.mode,
      state: p.action === "skip" ? (p.deferred ? "deferred" : "skipped") : p.stage.name === failed ? "FAILED" : "passed",
    }));

  it("a passing speed run defers the full test suite and every stage it left out", () => {
    const calls = ledgerCalls(rows(planStages({ profile: "speed" })), { profile: "speed", passed: true });
    expect(calls.defer).toEqual(["test", "health", "build", "bundle-budget"]);
    expect(calls.settle).toEqual(["lint", "typecheck", "catalog", "usage-manifest"]);
  });

  it("a failing speed run defers nothing", () => {
    const calls = ledgerCalls(rows(planStages({ profile: "speed" }), "lint"), { profile: "speed", passed: false });
    expect(calls.defer).toEqual([]);
    expect(calls.settle).not.toContain("lint");
  });

  it("a quality run settles everything and defers nothing", () => {
    const calls = ledgerCalls(rows(planStages({ profile: "quality" })), { profile: "quality", passed: true });
    expect(calls.defer).toEqual([]);
    expect(calls.settle).toEqual(STAGES.map((s) => s.name));
  });

  it("the push tier never settles its affected-only test run", () => {
    const calls = ledgerCalls(rows(planStages({ prePush: true })), { profile: null, passed: true });
    expect(calls.settle).toEqual(["lint", "typecheck", "catalog", "usage-manifest"]);
    expect(calls.defer).toEqual([]);
  });

  it("a warned stage is not settled", () => {
    const r = rows(planStages({})).map((x) => (x.stage.name === "usage-manifest" ? { ...x, state: "warned" } : x));
    expect(ledgerCalls(r, { profile: "quality", passed: true }).settle).not.toContain("usage-manifest");
  });
});

describe("a push to main needs a quality receipt", () => {
  const sha = "1b6e6666aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const zero = "0".repeat(40);

  it("asks for every stage that can block, and no warn-only stage", () => {
    expect(receiptStages()).toEqual(["test", "lint", "typecheck", "health", "catalog", "build", "bundle-budget"]);
  });

  it("picks out the commits headed for main or master, whatever the local branch is called", () => {
    const stdin = [
      `refs/heads/feat/x ${sha} refs/heads/feat/x ${zero}`,
      `refs/heads/feat/x ${sha} refs/heads/main ${zero}`,
      `HEAD ${sha} refs/heads/master ${zero}`,
      "",
    ].join("\n");
    expect(mainPushCommits(stdin)).toEqual([
      { localRef: "refs/heads/feat/x", sha, remoteRef: "refs/heads/main" },
      { localRef: "HEAD", sha, remoteRef: "refs/heads/master" },
    ]);
  });

  it("ignores other branches, tags, deletes and empty input", () => {
    expect(mainPushCommits(`refs/heads/feat/x ${sha} refs/heads/feat/x ${zero}`)).toEqual([]);
    expect(mainPushCommits(`refs/tags/v1 ${sha} refs/tags/v1 ${zero}`)).toEqual([]);
    expect(mainPushCommits(`(delete) ${zero} refs/heads/main ${sha}`)).toEqual([]);
    expect(mainPushCommits("")).toEqual([]);
    expect(mainPushCommits(null as never)).toEqual([]);
  });
});
