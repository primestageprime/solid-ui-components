// @vitest-environment node
/**
 * Tabs' fold decision: which tabs stay in the strip and which spill into the
 * kebab, given the strip's width, each tab's natural width and the active tab.
 *
 * A printed table pins the cases a reader can check by eye; seeded property
 * runs pin the rules over thousands of random strips.
 */
import { describe, expect, it } from "vitest";
import { join, map } from "../../fn";
import { type TabsFoldInput, tabsFold } from "./fold";

const GAP = 4;
const KEBAB = 40;
// Thorcasting's settings dialog, roughly: Forecast … Admin, 8 tabs.
const SETTINGS = [96, 100, 104, 122, 74, 76, 86, 76];

const row = (
  containerWidth: number,
  tabWidths: readonly number[],
  activeIndex: number,
): string => {
  const fold = tabsFold({
    containerWidth,
    tabWidths,
    gapPx: GAP,
    kebabReservePx: KEBAB,
    activeIndex,
  });
  const shown =
    fold === null
      ? "no layout — keep"
      : `inline [${join(",", map(String, fold.inline))}]  kebab [${join(",", map(String, fold.overflow))}]`;
  return join("  ", [
    String(containerWidth).padStart(5),
    String(activeIndex).padStart(6),
    shown,
  ]);
};

describe("tabsFold — table", () => {
  it("prints the fold table", () => {
    const table = join("\n", [
      "width  active  decision",
      row(1200, SETTINGS, 0),
      row(762, SETTINGS, 0),
      row(761, SETTINGS, 0),
      row(600, SETTINGS, 0),
      row(600, SETTINGS, 4),
      row(600, SETTINGS, 7),
      row(300, SETTINGS, 4),
      row(150, SETTINGS, 4),
      row(60, SETTINGS, 4),
      row(0, SETTINGS, 4),
      row(0, SETTINGS, -1),
      row(400, [0, 0, 0], 1),
      row(400, [], -1),
      row(400, SETTINGS, 99),
    ]);
    expect(table).toMatchInlineSnapshot(`
      "width  active  decision
       1200       0  inline [0,1,2,3,4,5,6,7]  kebab []
        762       0  inline [0,1,2,3,4,5,6,7]  kebab []
        761       0  inline [0,1,2,3,4,5,6]  kebab [7]
        600       0  inline [0,1,2,3,4]  kebab [5,6,7]
        600       4  inline [0,1,2,3,4]  kebab [5,6,7]
        600       7  inline [0,1,2,3,7]  kebab [4,5,6]
        300       4  inline [0,4]  kebab [1,2,3,5,6,7]
        150       4  inline [4]  kebab [0,1,2,3,5,6,7]
         60       4  inline [4]  kebab [0,1,2,3,5,6,7]
          0       4  inline [4]  kebab [0,1,2,3,5,6,7]
          0      -1  inline []  kebab [0,1,2,3,4,5,6,7]
        400       1  no layout — keep
        400      -1  inline []  kebab []
        400      99  inline [0,1,2]  kebab [3,4,5,6,7]"
    `);
  });
});

// ---- Properties -------------------------------------------------------

/** mulberry32 — a tiny seeded PRNG, so a failing case replays exactly. */
const rng = (seed: number) => {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const int = (next: () => number, lo: number, hi: number): number =>
  lo + Math.floor(next() * (hi - lo + 1));

const RUNS = 2000;

/** A random strip. Some tabs measure 0 (never measured while folded). */
const arbitrary = (seed: number): TabsFoldInput => {
  const next = rng(seed);
  const n = int(next, 0, 12);
  const tabWidths = Array.from({ length: n }, () =>
    next() < 0.1 ? 0 : int(next, 20, 220),
  );
  return {
    containerWidth: int(next, 0, 1600),
    tabWidths,
    gapPx: int(next, 0, 12),
    kebabReservePx: int(next, 24, 56),
    activeIndex: int(next, -1, n - 1),
  };
};

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

const span = (input: TabsFoldInput, indices: readonly number[]): number =>
  indices.reduce((acc, i) => acc + input.tabWidths[i], 0) +
  Math.max(0, indices.length - 1) * input.gapPx;

const ascending = (xs: readonly number[]): boolean =>
  xs.every((x, i) => i === 0 || xs[i - 1] < x);

const forAll = (check: (input: TabsFoldInput, seed: number) => void) => {
  for (let seed = 1; seed <= RUNS; seed++) check(arbitrary(seed), seed);
};

describe("tabsFold — properties", () => {
  it("is null only when every tab measures 0 (no layout to decide on)", () => {
    forAll((input) => {
      const noLayout =
        input.tabWidths.length > 0 && input.tabWidths.every((w) => w <= 0);
      expect(tabsFold(input) === null).toBe(noLayout);
    });
  });

  it("splits the tabs into two lists, each in the original order", () => {
    forAll((input) => {
      const fold = tabsFold(input);
      if (!fold) return;
      expect(ascending(fold.inline)).toBe(true);
      expect(ascending(fold.overflow)).toBe(true);
      expect([...fold.inline, ...fold.overflow].sort((a, b) => a - b)).toEqual(
        range(input.tabWidths.length),
      );
    });
  });

  it("always keeps the active tab in the strip", () => {
    forAll((input) => {
      const fold = tabsFold(input);
      if (!fold || input.activeIndex < 0) return;
      expect(fold.inline).toContain(input.activeIndex);
    });
  });

  it("shows no kebab only when every tab fits (or the lone tab is the active one)", () => {
    forAll((input) => {
      const fold = tabsFold(input);
      if (!fold || fold.overflow.length > 0) return;
      const loneActive =
        fold.inline.length === 1 && fold.inline[0] === input.activeIndex;
      if (loneActive) return;
      expect(span(input, fold.inline)).toBeLessThanOrEqual(
        input.containerWidth,
      );
    });
  });

  it("with a kebab, the strip fits beside it (unless it holds only the active tab)", () => {
    forAll((input) => {
      const fold = tabsFold(input);
      if (!fold || fold.overflow.length === 0) return;
      const onlyActive =
        fold.inline.length === 1 && fold.inline[0] === input.activeIndex;
      if (onlyActive || fold.inline.length === 0) return;
      expect(span(input, fold.inline)).toBeLessThanOrEqual(
        input.containerWidth - input.kebabReservePx,
      );
    });
  });

  it("keeps the leading tabs: the inactive ones in the strip are a prefix", () => {
    forAll((input) => {
      const fold = tabsFold(input);
      if (!fold) return;
      const others = fold.inline.filter((i) => i !== input.activeIndex);
      const prefix = range(input.tabWidths.length)
        .filter((i) => i !== input.activeIndex)
        .slice(0, others.length);
      expect(others).toEqual(prefix);
    });
  });

  it("fills the strip: the next tab in line would not fit beside the kebab", () => {
    forAll((input) => {
      const fold = tabsFold(input);
      if (!fold) return;
      const nextInLine = fold.overflow.find((i) => i !== input.activeIndex);
      if (nextInLine === undefined) return;
      const grown = [...fold.inline, nextInLine];
      expect(span(input, grown)).toBeGreaterThan(
        input.containerWidth - input.kebabReservePx,
      );
    });
  });

  it("never drops a tab from the strip when the strip gets wider", () => {
    forAll((input, seed) => {
      const wider = {
        ...input,
        containerWidth: input.containerWidth + int(rng(seed * 7), 1, 400),
      };
      const before = tabsFold(input);
      const after = tabsFold(wider);
      if (!before || !after) return;
      for (const i of before.inline) expect(after.inline).toContain(i);
    });
  });
});
