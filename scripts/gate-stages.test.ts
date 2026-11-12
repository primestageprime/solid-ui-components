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
import { STAGES, commandLine, planStages } from "./gate-stages.mjs";

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

  it("calls gate.mjs --pre-push", () => {
    expect(code.some((l) => l.includes("node scripts/gate.mjs --pre-push"))).toBe(true);
  });

  it("invokes nothing else (echo text aside)", () => {
    const invocations = code
      .filter((l) => !l.startsWith("echo "))
      .filter((l) => /\b(npm|npx|node|vitest|tsc|biome)\b/.test(l));
    expect(invocations).toEqual(["if ! node scripts/gate.mjs --pre-push; then"]);
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
    expect(() => planStages({ only: ["nope"] })).toThrow(/unknown step/);
  });
});
