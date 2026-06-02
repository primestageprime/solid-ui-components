import { describe, it, expect } from "vitest";
import {
  deriveCardBar,
  statusAccent,
  actualFromSegments,
  isRunning,
  CARD_BAR_COLOR as C,
  type CardProgressInput,
} from "./cardProgress";

// Asserts a single segment's color + width (width compared with tolerance to
// dodge floating-point noise from the over-budget ratios).
const seg = (s: { width: number; color: string }, color: string, width: number) => {
  expect(s.color).toBe(color);
  expect(s.width).toBeCloseTo(width, 5);
};

describe("deriveCardBar", () => {
  it("A — new: empty dim bar, no sign", () => {
    const bar = deriveCardBar({ status: "NEW" });
    expect(bar.sign).toBeNull();
    expect(bar.segments).toHaveLength(1);
    seg(bar.segments[0], C.empty, 1);
  });

  it("B — in progress 40%: blue fill + faded remainder", () => {
    const { segments, sign } = deriveCardBar({ status: "DOING", estimate: 5, actual: 2 });
    expect(sign).toBeNull();
    seg(segments[0], C.fillActive, 0.4);
    seg(segments[1], C.remainder, 0.6);
  });

  it("C — in progress over budget 120%: blue est-share + crimson overrun (reproportioned)", () => {
    const { segments } = deriveCardBar({ status: "DOING", estimate: 5, actual: 6 });
    seg(segments[0], C.fillActive, 5 / 6);
    seg(segments[1], C.overrun, 1 / 6);
  });

  it("D — done on-time (95%): green + dark-grey unused", () => {
    const { segments, sign } = deriveCardBar({ status: "DONE", estimate: 100, actual: 95 });
    expect(sign).toBeNull();
    seg(segments[0], C.fillDone, 0.95);
    seg(segments[1], C.unused, 0.05);
  });

  it("E — done under budget (60%): green + dark-grey unused", () => {
    const { segments } = deriveCardBar({ status: "DONE", estimate: 5, actual: 3 });
    seg(segments[0], C.fillDone, 0.6);
    seg(segments[1], C.unused, 0.4);
  });

  it("F — done over budget: green est-share + crimson overrun", () => {
    const { segments } = deriveCardBar({ status: "DONE", estimate: 5, actual: 6 });
    seg(segments[0], C.fillDone, 5 / 6);
    seg(segments[1], C.overrun, 1 / 6);
  });

  it("G — blocked: blue fill + dim remainder + yield sign", () => {
    const { segments, sign } = deriveCardBar({ status: "BLOCKED", estimate: 5, actual: 2 });
    expect(sign).toBe("yield");
    seg(segments[0], C.fillActive, 0.4);
    seg(segments[1], C.empty, 0.6);
  });

  it("H — question: same bar as blocked + question sign", () => {
    const { segments, sign } = deriveCardBar({ status: "QUESTION", estimate: 5, actual: 2 });
    expect(sign).toBe("question");
    seg(segments[0], C.fillActive, 0.4);
    seg(segments[1], C.empty, 0.6);
  });

  it("I — closed/incomplete: empty dim bar regardless of work done", () => {
    const bar = deriveCardBar({ status: "CLOSED", estimate: 5, actual: 3 });
    expect(bar.sign).toBeNull();
    expect(bar.segments).toHaveLength(1);
    seg(bar.segments[0], C.empty, 1);
  });

  it("segment widths always sum to 1", () => {
    const cases: CardProgressInput[] = [
      { status: "NEW" },
      { status: "DOING", estimate: 5, actual: 2 },
      { status: "DOING", estimate: 5, actual: 6 },
      { status: "DONE", estimate: 5, actual: 3 },
      { status: "DONE", estimate: 5, actual: 9 },
      { status: "BLOCKED", estimate: 5, actual: 2 },
      { status: "CLOSED", estimate: 5, actual: 3 },
    ];
    for (const c of cases) {
      const sum = deriveCardBar(c).segments.reduce((a, s) => a + s.width, 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it("never produces a negative or >1 segment width", () => {
    for (const actual of [0, 1, 5, 6, 50]) {
      for (const status of ["DOING", "DONE", "BLOCKED"] as const) {
        for (const s of deriveCardBar({ status, estimate: 5, actual }).segments) {
          expect(s.width).toBeGreaterThanOrEqual(0);
          expect(s.width).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("handles a missing/zero estimate without throwing or dividing by zero", () => {
    expect(() => deriveCardBar({ status: "DOING" })).not.toThrow();
    const { segments } = deriveCardBar({ status: "DOING", estimate: 0, actual: 3 });
    seg(segments[0], C.remainder, 1);
  });

  it("clamps a negative actual to no progress", () => {
    const { segments } = deriveCardBar({ status: "DOING", estimate: 5, actual: -2 });
    seg(segments[0], C.fillActive, 0);
    seg(segments[1], C.remainder, 1);
  });
});

describe("actualFromSegments", () => {
  it("an open segment runs to now", () => {
    expect(actualFromSegments([{ start: 0 }], 5)).toBe(5);
    expect(actualFromSegments([{ start: 2 }], 9)).toBe(7);
  });

  it("a closed segment is end − start, independent of now", () => {
    expect(actualFromSegments([{ start: 2, end: 5 }], 999)).toBe(3);
  });

  it("sums closed segments plus the open one — Σ(endᵢ−startᵢ) + (now−start)", () => {
    // a:[0,3]=3, b:[5,8]=3, c open from 10 with now=12 → 2  ⇒ 8
    const segs = [{ start: 0, end: 3 }, { start: 5, end: 8 }, { start: 10 }];
    expect(actualFromSegments(segs, 12)).toBe(8);
  });

  it("a not-yet-started span contributes 0 (no negatives)", () => {
    expect(actualFromSegments([{ start: 10 }], 5)).toBe(0);
    expect(actualFromSegments([{ start: 0, end: 4 }, { start: 20 }], 8)).toBe(4);
  });

  it("isRunning is true iff some segment is open", () => {
    expect(isRunning([{ start: 0 }])).toBe(true);
    expect(isRunning([{ start: 0, end: 3 }, { start: 5 }])).toBe(true);
    expect(isRunning([{ start: 0, end: 3 }])).toBe(false);
  });
});

describe("statusAccent", () => {
  it("DONE is green; active states are blue; new/closed are muted", () => {
    expect(statusAccent("DONE")).toBe(C.fillDone);
    expect(statusAccent("DOING")).toBe("#00d4ff");
    expect(statusAccent("BLOCKED")).toBe("#00d4ff");
    expect(statusAccent("QUESTION")).toBe("#00d4ff");
    expect(statusAccent("NEW")).toBe("rgba(255, 255, 255, 0.5)");
    expect(statusAccent("CLOSED")).toBe("rgba(255, 255, 255, 0.4)");
  });
});
