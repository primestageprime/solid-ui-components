import { describe, it, expect } from "vitest";
import { computeSplitLayout, computeEnterFrame } from "./layout";

/* The layout calc is total and pure, so exact-equality assertions hold.
 *
 * Model under test (content-driven top, remaining-space bottom):
 *  - top is 1..3 rows by content; 4+ caps at 3 and scrolls (newest at seam);
 *  - bottom gets the remainder and scrolls when overfull;
 *  - a short bottom shrinks to content and the top absorbs the freed slack.
 *
 * Fixtures: rowH = 40, headerH = 20, seam = 0, total = 480.
 * Pane height = headerH + rows*rowH, so paneFor(n) = 20 + 40n.
 */
const base = {
  rowHeight: 40,
  headerHeight: 20,
  seamHeight: 0,
  totalHeight: 480,
} as const;

const paneFor = (rows: number) => 20 + 40 * rows;

describe("computeSplitLayout — content-driven top (1-row floor, 3-row cap)", () => {
  it("0 categorized → top shows exactly 1 row of space (floor), not a big block", () => {
    const r = computeSplitLayout({ ...base, resolvedCount: 0, unresolvedCount: 20 });
    expect(r.topHeight).toBe(paneFor(1)); // 60 — one row + header, never empty block
  });

  it("1 categorized → top fits exactly 1 row", () => {
    const r = computeSplitLayout({ ...base, resolvedCount: 1, unresolvedCount: 20 });
    expect(r.topHeight).toBe(paneFor(1)); // 60
    expect(r.topVisibleRows).toBe(1);
    expect(r.topScrolls).toBe(false);
  });

  it("2 categorized → top expands to fit 2", () => {
    const r = computeSplitLayout({ ...base, resolvedCount: 2, unresolvedCount: 20 });
    expect(r.topHeight).toBe(paneFor(2)); // 100
    expect(r.topVisibleRows).toBe(2);
    expect(r.topScrolls).toBe(false);
  });

  it("3 categorized → top expands to fit 3 (the cap)", () => {
    const r = computeSplitLayout({ ...base, resolvedCount: 3, unresolvedCount: 20 });
    expect(r.topHeight).toBe(paneFor(3)); // 140
    expect(r.topVisibleRows).toBe(3);
    expect(r.topScrolls).toBe(false);
  });

  it("4+ categorized → top capped at 3 and scrolled to the seam (newest visible)", () => {
    const r = computeSplitLayout({ ...base, resolvedCount: 4, unresolvedCount: 20 });
    expect(r.topHeight).toBe(paneFor(3)); // still 140 — capped at 3
    expect(r.topVisibleRows).toBe(3);
    expect(r.topScrolls).toBe(true);
    expect(r.topScrollToBottom).toBe(true); // newest-at-seam
  });

  it("stays capped at 3 for large categorized counts", () => {
    const r = computeSplitLayout({ ...base, resolvedCount: 50, unresolvedCount: 20 });
    expect(r.topHeight).toBe(paneFor(3));
    expect(r.topScrollToBottom).toBe(true);
  });
});

describe("computeSplitLayout — bottom gets the remainder and scrolls", () => {
  it("bottom takes all space the capped top leaves, and scrolls when overfull", () => {
    const r = computeSplitLayout({ ...base, resolvedCount: 4, unresolvedCount: 20 });
    // top = 140 (capped), bottom = 480 - 140 = 340.
    expect(r.bottomHeight).toBe(340);
    expect(r.topHeight + r.bottomHeight).toBe(480);
    expect(r.bottomScrolls).toBe(true); // 20 rows can't fit in 340
  });

  it("with 0 categorized the bottom gets everything but the 1-row top floor", () => {
    const r = computeSplitLayout({ ...base, resolvedCount: 0, unresolvedCount: 20 });
    expect(r.topHeight).toBe(paneFor(1)); // 60
    expect(r.bottomHeight).toBe(480 - 60); // 420
  });
});

describe("computeSplitLayout — short bottom: slack flows up to the top", () => {
  it("a short bottom shrinks to content and the top grows past the cap", () => {
    // 2 unresolved want paneFor(2)=100; 4 categorized would cap top at 140, which
    // leaves 340 for the bottom — far more than 100, so the bottom shrinks to 100
    // and the top absorbs the rest (480 - 100 = 380, well past the 140 cap).
    const r = computeSplitLayout({ ...base, resolvedCount: 4, unresolvedCount: 2 });
    expect(r.bottomHeight).toBe(paneFor(2)); // 100
    expect(r.topHeight).toBe(480 - 100); // 380
    expect(r.topAbsorbedSlack).toBe(true);
    expect(r.bottomScrolls).toBe(false);
  });

  it("does not absorb slack when the bottom is exactly full", () => {
    // Choose unresolved so paneFor(n) == remaining after a capped top (140) = 340
    // => 20 + 40n = 340 => n = 8.
    const r = computeSplitLayout({ ...base, resolvedCount: 4, unresolvedCount: 8 });
    expect(r.topHeight).toBe(paneFor(3)); // 140 — capped, no slack
    expect(r.bottomHeight).toBe(340);
    expect(r.topAbsorbedSlack).toBe(false);
    expect(r.bottomScrolls).toBe(false); // exactly fits
  });

  it("empty bottom (0 unresolved) leaves only its header; top takes the rest", () => {
    const r = computeSplitLayout({ ...base, resolvedCount: 4, unresolvedCount: 0 });
    expect(r.bottomHeight).toBe(paneFor(0)); // 20 — just the header
    expect(r.topHeight).toBe(480 - 20); // 460
    expect(r.topAbsorbedSlack).toBe(true);
  });

  it("does NOT absorb slack when categorized <= cap, even with a short bottom", () => {
    // The proportions bug: with 0–3 categorized the top has nothing hidden to
    // reveal, so it must stay at its content height (NOT balloon) and let the
    // bottom take the remainder, even though the bottom is short.
    for (const n of [0, 1, 2, 3]) {
      const r = computeSplitLayout({ ...base, resolvedCount: n, unresolvedCount: 2 });
      const wantRows = Math.max(1, Math.min(3, n)); // floor 1, cap 3
      expect(r.topHeight).toBe(paneFor(wantRows)); // content height only
      expect(r.topAbsorbedSlack).toBe(false);
      // Bottom gets all the rest and (with 2 short items at this height) fits.
      expect(r.bottomHeight).toBe(480 - paneFor(wantRows));
    }
  });

  it("0 categorized + 6 to-categorize → top = 1 row, bottom takes the rest", () => {
    // The exact Items=6 / 0-resolved repro from the bug report.
    const r = computeSplitLayout({ ...base, resolvedCount: 0, unresolvedCount: 6 });
    expect(r.topHeight).toBe(paneFor(1)); // 60 — one row, NOT a big empty box
    expect(r.bottomHeight).toBe(480 - 60); // 420 — items pinned top, space below
    expect(r.topAbsorbedSlack).toBe(false);
  });
});

describe("computeSplitLayout — last row never clips when not scrolling", () => {
  it("non-scrolling panes are whole rows + header (no fractional row)", () => {
    for (const n of [1, 2, 3]) {
      const r = computeSplitLayout({ ...base, resolvedCount: n, unresolvedCount: 1 });
      // top sized to whole rows: (topHeight - header) is an exact multiple of rowH
      expect((r.topHeight - 20) % 40).toBe(0);
      expect(r.topScrolls).toBe(false);
      // bottom holds its single row + header fully
      expect(r.bottomHeight).toBeGreaterThanOrEqual(paneFor(1));
      expect(r.bottomScrolls).toBe(false);
    }
  });
});

describe("computeEnterFrame — full-component enter: top grows, panes sum to total", () => {
  // The full two-panel enter mirrors the topOnly panel-grow: the TOP pane height
  // lerps oldTop -> newTop over progress p, and the BOTTOM pane is DRIVEN as the
  // remainder so the two panes (+ seam) ALWAYS sum to totalHeight — the seam
  // descends smoothly with no one-row gap. The card is full-size and clipped.
  const frame = (p: number) =>
    computeEnterFrame({
      oldTop: 100,
      newTop: 140, // top grows by one 40px row on resolve
      totalHeight: 480,
      seamHeight: 0,
      progress: p,
    });

  it("at p=0 the top is at its OLD height (pre-resolve)", () => {
    expect(frame(0).topHeight).toBe(100);
  });

  it("at p=1 the top is at its NEW height (fully revealed)", () => {
    expect(frame(1).topHeight).toBe(140);
  });

  it("at p=0.5 the top is halfway (linear lerp of the height)", () => {
    expect(frame(0.5).topHeight).toBe(120); // 100 + (140-100)*0.5
  });

  it("panes + seam sum to total at EVERY frame (no gap, seam descends)", () => {
    for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const f = frame(p);
      expect(f.topHeight + f.bottomHeight).toBe(480); // seam 0 here
    }
  });

  it("the bottom is DRIVEN as the remainder, shrinking as the top grows", () => {
    expect(frame(0).bottomHeight).toBe(380); // 480 - 100
    expect(frame(1).bottomHeight).toBe(340); // 480 - 140 (one row less)
    // It only loses exactly the one row the top gained — no double-count.
    expect(frame(0).bottomHeight - frame(1).bottomHeight).toBe(40);
  });

  it("accounts for the seam: top + bottom + seam == total every frame", () => {
    const seamHeight = 8;
    for (const p of [0, 0.3, 0.6, 1]) {
      const f = computeEnterFrame({
        oldTop: 100,
        newTop: 140,
        totalHeight: 480,
        seamHeight,
        progress: p,
      });
      expect(f.topHeight + f.bottomHeight + seamHeight).toBe(480);
    }
  });

  it("clamps progress to [0,1] and never returns negative panes", () => {
    expect(computeEnterFrame({ oldTop: 100, newTop: 140, totalHeight: 480, progress: -1 }).topHeight).toBe(100);
    expect(computeEnterFrame({ oldTop: 100, newTop: 140, totalHeight: 480, progress: 2 }).topHeight).toBe(140);
    const tiny = computeEnterFrame({ oldTop: 100, newTop: 140, totalHeight: 50, progress: 1 });
    expect(tiny.bottomHeight).toBeGreaterThanOrEqual(0);
  });

  it("capped top (oldTop == newTop) holds height — no grow, bottom unchanged", () => {
    // 4+ resolved: top is already at its 3-row cap, so it can't grow; the reveal
    // happens via scroll (handled in the component), not a height tween.
    const f = computeEnterFrame({ oldTop: 140, newTop: 140, totalHeight: 480, progress: 0.5 });
    expect(f.topHeight).toBe(140);
    expect(f.bottomHeight).toBe(340);
  });
});

describe("computeSplitLayout — degenerate inputs", () => {
  it("never returns negative regions for a zero-height container", () => {
    const r = computeSplitLayout({ ...base, totalHeight: 0, resolvedCount: 3, unresolvedCount: 3 });
    expect(r.topHeight).toBeGreaterThanOrEqual(0);
    expect(r.bottomHeight).toBeGreaterThanOrEqual(0);
  });

  it("clamps the top to usable when the container is tiny", () => {
    const r = computeSplitLayout({ ...base, totalHeight: 40, resolvedCount: 5, unresolvedCount: 5 });
    expect(r.topHeight).toBeLessThanOrEqual(40);
    expect(r.topHeight + r.bottomHeight).toBeLessThanOrEqual(40 + 0.001);
  });

  it("respects custom cap/floor rows", () => {
    const r = computeSplitLayout({
      ...base,
      resolvedCount: 10,
      unresolvedCount: 20,
      topCapRows: 5,
      topFloorRows: 2,
    });
    expect(r.topHeight).toBe(paneFor(5)); // capped at 5 now
  });
});
