import { describe, it, expect } from "vitest";
import { chartYDomain, chartYDomainMode } from "./helpers";

// One test per row of the table on `CashflowScrubChartProps.yMax`, because the
// three y-domain props do not compose and the prop docs drifted from the code
// once already: `yMin`'s doc said tight-domain mode beat `yMax`, the code says
// `yMax` beats tight mode, and a consumer blocked real work on the constraint
// the wrong doc invented (sui #41055). A doc can drift again; these cannot.

const VALUES = [100, 500, 900];

describe("chartYDomainMode", () => {
  it("row 1: a yMax picks fixed-range, even alongside yPadFraction", () => {
    expect(chartYDomainMode({ yMax: 1000, yPadFraction: 0.1 }, true)).toBe(
      "fixed",
    );
  });

  it("row 2: yPadFraction picks tight only when no yMax is set", () => {
    expect(chartYDomainMode({ yPadFraction: 0.1 }, true)).toBe("tight");
    // A yMin does NOT hold tight mode off — only a yMax does.
    expect(chartYDomainMode({ yMin: 0, yPadFraction: 0.1 }, true)).toBe(
      "tight",
    );
  });

  it("row 3: neither prop is auto", () => {
    expect(chartYDomainMode({}, true)).toBe("auto");
    expect(chartYDomainMode({ yMin: -500 }, true)).toBe("auto");
  });

  it("falls back to auto when tight mode has no values to pad", () => {
    expect(chartYDomainMode({ yPadFraction: 0.1 }, false)).toBe("auto");
  });
});

describe("chartYDomain", () => {
  it("floors the auto domain at zero so the zero-line stays visible", () => {
    expect(chartYDomain(VALUES, {})).toEqual([0, 900]);
    // A negative run keeps zero inside the domain from the other side.
    expect(chartYDomain([-400, -100], {})).toEqual([-400, 0]);
  });

  it("pins the bound that is stated and derives the one that is not", () => {
    expect(chartYDomain(VALUES, { yMax: 2000 })).toEqual([0, 2000]);
    expect(chartYDomain(VALUES, { yMin: -300 })).toEqual([-300, 900]);
    expect(chartYDomain(VALUES, { yMin: -300, yMax: 2000 })).toEqual([
      -300, 2000,
    ]);
  });

  it("applies BOTH stated bounds when yPadFraction is also set", () => {
    // The case the wrong doc denied. A yMax selects fixed-range, and yMin
    // applies there — the padding is ignored, not the bounds.
    expect(
      chartYDomain(VALUES, { yMin: -300, yMax: 2000, yPadFraction: 0.5 }),
    ).toEqual([-300, 2000]);
  });

  it("ignores yMin in tight mode, where both bounds come from the extent", () => {
    // spread = 800, pad = 80.
    expect(chartYDomain(VALUES, { yPadFraction: 0.1 })).toEqual([20, 980]);
    expect(chartYDomain(VALUES, { yMin: -5000, yPadFraction: 0.1 })).toEqual([
      20, 980,
    ]);
  });

  it("leaves a flat series some height to draw in", () => {
    // spread is 0, so the pad comes off the value's own magnitude.
    expect(chartYDomain([400, 400], { yPadFraction: 0.1 })).toEqual([360, 440]);
    // …and off ±1 when the value itself is zero.
    expect(chartYDomain([0, 0], { yPadFraction: 0.1 })).toEqual([-0.1, 0.1]);
  });
});
