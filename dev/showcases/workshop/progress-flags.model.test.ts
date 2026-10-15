/**
 * progress-flags: the step-timeline model, observed headlessly. Each topic
 * prints both lines, the verdict per interval and the flags, so the picture
 * can be checked against numbers.
 */
import { describe, expect, it } from "vitest";
import { TOPICS, TOPIC_18 } from "./progress-flags.fixtures";
import {
  MIN_MS,
  actualLine,
  bandFor,
  endOf,
  estimateLine,
  flagsOf,
  intervalsOf,
  observe,
  receiptRows,
  startOf,
  toleranceOf,
  verdictMinutes,
  verdictOf,
} from "./progress-flags.model";

const minutes = (t0: number, x: number): number => Math.round(((x - t0) / MIN_MS) * 10) / 10;

describe("every topic", () => {
  it("prints its observation", () => {
    for (const t of TOPICS) console.log(`\n${observe(t)}\n`);
  });
});

describe("tolerance", () => {
  it("is 100% of planned so far, never under 5 minutes", () => {
    expect(toleranceOf(0)).toBe(5);
    expect(toleranceOf(3)).toBe(5);
    expect(toleranceOf(40)).toBe(40);
    expect(toleranceOf(40, 0.5)).toBe(20);
  });

  it("calls ahead, behind and within", () => {
    expect(verdictOf(10, 30)).toBe("ahead");
    expect(verdictOf(10, 18)).toBe("within");
    expect(verdictOf(40, 10, 0.5)).toBe("behind");
  });

  it("cannot call behind at 100%, because the deficit never exceeds what was planned", () => {
    expect(verdictOf(40, 0)).toBe("within");
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
    const rows = receiptRows(t);
    expect(rows[0]?.kind).toBe("Claimed");
    expect(rows.filter((r) => r.kind === "Estimated").map((r) => r.detail)).toEqual([
      "none -> 30m", "30m -> 80m", "80m -> 100m",
    ]);
  });
});

describe("synthetic traces", () => {
  it("only show red once the tolerance is under 100%", () => {
    for (const id of [901, 902]) {
      const t = TOPICS.find((x) => x.id === id);
      if (!t) throw new Error(`no topic ${id}`);
      const at100 = verdictMinutes(intervalsOf(t));
      const at50 = verdictMinutes(intervalsOf(t, endOf(t), 0.5));
      console.log(`topic ${id} minutes by verdict at 100%: ${JSON.stringify(at100)}, at 50%: ${JSON.stringify(at50)}`);
      expect(at100.behind).toBe(0);
      expect(at50.behind).toBeGreaterThan(0);
    }
  });

  it("steadily behind finishes late", () => {
    const t = TOPICS.find((x) => x.id === 901);
    expect(t).toBeDefined();
    if (t) expect(endOf(t) - startOf(t)).toBeGreaterThan(60 * MIN_MS);
  });
});
