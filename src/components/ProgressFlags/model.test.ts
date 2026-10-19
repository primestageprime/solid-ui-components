/**
 * ProgressFlags: the step-timeline model, observed headlessly. Each topic
 * prints both lines, the verdict per interval and the flags, so the picture
 * can be checked against numbers.
 */
import { describe, expect, it } from "vitest";
import { SCENARIOS, TOPICS, TOPIC_18 } from "./fixtures";
import {
  MIN_MS,
  actualLine,
  bandFor,
  endOf,
  estimateLine,
  flagTip,
  flagsOf,
  intervalsOf,
  observeProgressFlags,
  progressReceiptRows,
  startOf,
  toleranceOf,
  verdictMinutes,
  verdictOf,
} from "./model";

const minutes = (t0: number, x: number): number => Math.round(((x - t0) / MIN_MS) * 10) / 10;

describe("every topic", () => {
  it("prints its observation", () => {
    for (const t of TOPICS) console.log(`\n${observeProgressFlags(t)}\n`);
  });
});

describe("tolerance", () => {
  it("is half the planned minutes so far, never under 5 minutes", () => {
    expect(toleranceOf(0)).toBe(5);
    expect(toleranceOf(6)).toBe(5);
    expect(toleranceOf(40)).toBe(20);
    expect(toleranceOf(40, 1)).toBe(40);
  });

  it("calls ahead, behind and within", () => {
    expect(verdictOf(10, 30)).toBe("ahead");
    expect(verdictOf(10, 14)).toBe("within");
    expect(verdictOf(40, 10)).toBe("behind");
  });

  it("cannot call behind at 100%, because the deficit never exceeds what was planned", () => {
    expect(verdictOf(40, 0, 1)).toBe("within");
  });
});

describe("topic 18 (M15 rolling bars)", () => {
  const t = TOPIC_18;
  const t0 = startOf(t);

  it("estimates 11 steps stepping to 100 minutes", () => {
    const line = estimateLine(t);
    expect(line.length).toBe(12);
    expect(minutes(t0, line[11]?.x ?? 0)).toBe(100);
    expect(line[11]?.y).toBe(100);
  });

  it("earns the whole 100 at the end of the real trace", () => {
    const line = actualLine(t);
    expect(line[line.length - 1]?.y).toBe(100);
    expect(minutes(t0, endOf(t))).toBeLessThan(25);
  });

  it("flags every step as past once the topic is done", () => {
    const flags = flagsOf(t);
    expect(flags.length).toBe(11);
    expect(flags.every((f) => f.state === "past")).toBe(true);
  });

  it("mid-flight, flags one current step and the rest planned", () => {
    const flags = flagsOf(t, t0 + 12 * MIN_MS);
    expect(flags.map((f) => f.state)).toEqual([
      "past", "past", "past", "past", "past", "past", "past", "current",
      "planned", "planned", "planned",
    ]);
  });

  it("is ahead for most of the run, never behind", () => {
    const v = verdictMinutes(intervalsOf(t));
    expect(v.ahead).toBeGreaterThan(v.within);
    expect(v.behind).toBe(0);
  });

  it("builds a band that breaks between runs", () => {
    const band = bandFor(intervalsOf(t), "ahead");
    expect(band.length).toBeGreaterThan(0);
    expect(Number.isNaN(band[band.length - 1]?.x)).toBe(true);
  });

  it("lists the receipts with elapsed time", () => {
    const rows = progressReceiptRows(t);
    expect(rows[0]?.kind).toBe("Claimed");
    expect(rows.filter((r) => r.kind === "Estimated").map((r) => r.detail)).toEqual([
      "none -> 30m", "30m -> 80m", "80m -> 100m",
    ]);
  });
});

describe("scenarios", () => {
  const minutesOf = (name: string) => {
    const sc = SCENARIOS.find((x) => x.name === name);
    if (!sc) throw new Error(`no scenario ${name}`);
    return verdictMinutes(intervalsOf(sc.topic));
  };

  it("prints the verdict minutes of each", () => {
    for (const sc of SCENARIOS)
      console.log(`${sc.name}: ${JSON.stringify(verdictMinutes(intervalsOf(sc.topic)))}`);
  });

  it("on target is all blue", () => {
    const v = minutesOf("On target");
    expect(v.ahead + v.behind).toBe(0);
  });

  it("behind is red for its long middle", () => {
    const v = minutesOf("Behind");
    expect(v.behind).toBeGreaterThan(100);
  });

  it("over and under shows all three", () => {
    const v = minutesOf("Over and under");
    expect(v.ahead).toBeGreaterThan(0);
    expect(v.within).toBeGreaterThan(0);
    expect(v.behind).toBeGreaterThan(0);
  });

  it("procrastinate is red for most of the span", () => {
    const v = minutesOf("Procrastinate");
    expect(v.behind).toBeGreaterThan(v.within + v.ahead);
  });
});

describe("receipt durations", () => {
  const rows = progressReceiptRows(TOPIC_18);
  it("shows a step's estimate when it starts and estimate plus actual when it ends", () => {
    const started = rows.find((r) => r.kind === "StepStarted");
    const done = rows.find((r) => r.kind === "StepDone");
    expect(started?.estimate).toBe("10m");
    expect(started?.actual).toBe("");
    expect(done?.estimate).toBe("10m");
    expect(done?.actual).toBe("2.7m");
  });

  it("shows the topic estimate and claim-to-milestone at the Milestone", () => {
    const m = rows.find((r) => r.kind === "Milestone");
    expect(m?.estimate).toBe("100m");
    expect(m?.actual).toBe("21.2m");
  });

  it("is blank for the rest", () => {
    const c = rows.find((r) => r.kind === "Claimed");
    expect([c?.estimate, c?.actual]).toEqual(["", ""]);
  });
});

describe("flag tooltip and receipt links", () => {
  const t0 = startOf(TOPIC_18);
  it("tells a done step's number, title, estimate, actual and state", () => {
    const f = flagsOf(TOPIC_18)[0];
    expect(f && flagTip(f)).toEqual([
      "Step 1: Rolling bars on SUI, one track width",
      "Estimated 10m",
      "Actual 2.7m",
      "Done",
    ]);
  });

  it("has no actual line until the step is done", () => {
    const f = flagsOf(TOPIC_18, t0 + 12 * MIN_MS)[7];
    expect(f && flagTip(f)).toEqual([
      "Step 8: Tick performance, one shared clock",
      "Estimated 10m",
      "In progress",
    ]);
  });

  it("links step receipts to their flag number", () => {
    const steps = progressReceiptRows(TOPIC_18).filter((r) => r.step !== undefined);
    expect(steps.length).toBe(22);
    expect(steps[0]?.step).toBe(1);
  });
});
