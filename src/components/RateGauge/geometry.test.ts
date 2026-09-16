// ============================================
// RateGauge geometry — the headless observation.
//
// Every number the SVG paints is decided here, so the shape can be read as a
// table without a browser. The tests PRINT that table as well as asserting on
// it: a gauge is one of those things where a wrong sign looks plausible in
// isolation and obviously wrong beside its neighbours.
// ============================================
import { describe, expect, it } from "vitest";
import {
  angleFor,
  bracketPath,
  clampedValue,
  gaugeGeometry,
  labelOrder,
  needleEndpoint,
  pointAt,
  ringArcPath,
  wedgePath,
  zoneOf,
} from "./geometry";

const DOMAIN: readonly [number, number] = [-30000, 30000];

/** Round to 3dp so a table prints without float noise. */
const round = (n: number) => Math.round(n * 1000) / 1000;

describe("angleFor", () => {
  it("puts the domain ends at the poles and the midpoint at 3 o'clock", () => {
    expect(angleFor(DOMAIN, 30000)).toBe(90);
    expect(angleFor(DOMAIN, -30000)).toBe(-90);
    expect(angleFor(DOMAIN, 0)).toBe(0);
  });

  it("is linear across the domain", () => {
    expect(angleFor(DOMAIN, 15000)).toBe(45);
    expect(angleFor(DOMAIN, -7500)).toBe(-22.5);
  });

  it("clamps beyond either end rather than sweeping past the poles", () => {
    expect(angleFor(DOMAIN, 999999)).toBe(90);
    expect(angleFor(DOMAIN, -999999)).toBe(-90);
  });

  it("reads a zero-width domain as the centre instead of NaN", () => {
    expect(angleFor([5, 5], 5)).toBe(0);
    expect(angleFor([5, 5], 9)).toBe(0);
  });

  it("does not assume the domain is symmetric", () => {
    // [-10000, 30000]: zero sits a quarter of the way up, not at 3 o'clock.
    expect(angleFor([-10000, 30000], 0)).toBe(-45);
    expect(angleFor([-10000, 30000], 30000)).toBe(90);
  });
});

describe("clampedValue", () => {
  it("reports the value the gauge actually drew", () => {
    expect(clampedValue(DOMAIN, 999999)).toBe(30000);
    expect(clampedValue(DOMAIN, -999999)).toBe(-30000);
    expect(clampedValue(DOMAIN, 1234)).toBe(1234);
  });
});

describe("pointAt", () => {
  it("inverts y exactly once — +90 degrees is UP the screen", () => {
    expect(pointAt({ cx: 10, cy: 50 }, 20, 0)).toEqual({ x: 30, y: 50 });
    const top = pointAt({ cx: 10, cy: 50 }, 20, 90);
    expect(round(top.x)).toBe(10);
    expect(round(top.y)).toBe(30);
    const bottom = pointAt({ cx: 10, cy: 50 }, 20, -90);
    expect(round(bottom.x)).toBe(10);
    expect(round(bottom.y)).toBe(70);
  });
});

describe("zoneOf", () => {
  it("splits at the ZERO angle, not at the horizontal", () => {
    expect(zoneOf(DOMAIN, 1)).toBe("positive");
    expect(zoneOf(DOMAIN, -1)).toBe("negative");
    // Exactly zero reads as positive — the zero line is the floor of the
    // upper zone, so a gauge parked at zero lights green rather than flickering.
    expect(zoneOf(DOMAIN, 0)).toBe("positive");
    // An asymmetric domain moves the split with the zero line.
    expect(zoneOf([-10000, 30000], -5000)).toBe("negative");
    expect(zoneOf([-10000, 30000], 5000)).toBe("positive");
  });
});

describe("ringArcPath", () => {
  it("draws each zone as an annular band between the two radii", () => {
    const upper = ringArcPath({ cx: 0, cy: 0 }, 40, 50, 0, 90);
    expect(upper.startsWith("M ")).toBe(true);
    expect(upper.endsWith("Z")).toBe(true);
    expect(upper).not.toMatch(/NaN/);
  });

  it("emits nothing for a zero-length sweep", () => {
    expect(ringArcPath({ cx: 0, cy: 0 }, 40, 50, 30, 30)).toBe("");
  });
});

describe("needleEndpoint", () => {
  it("runs from the pivot out to the given radius at the value's angle", () => {
    const tip = needleEndpoint({ cx: 20, cy: 60 }, 40, DOMAIN, 0);
    expect(round(tip.x)).toBe(60);
    expect(round(tip.y)).toBe(60);
  });

  it("gives the tip cap a segment perpendicular to the needle", () => {
    const cap = needleEndpoint({ cx: 0, cy: 0 }, 40, DOMAIN, 0).cap;
    // At 3 o'clock the needle is horizontal, so its cap is vertical.
    expect(round(cap.x1)).toBe(round(cap.x2));
    expect(round(cap.y1)).not.toBe(round(cap.y2));
  });
});

describe("wedgePath", () => {
  it("fills the sector from the zero angle to the baseline", () => {
    const wedge = wedgePath({ cx: 0, cy: 0 }, 30, 0, 45);
    expect(wedge).toMatch(/^M 0 0 L/);
    expect(wedge.endsWith("Z")).toBe(true);
  });

  it("emits nothing when the baseline IS zero", () => {
    expect(wedgePath({ cx: 0, cy: 0 }, 30, 0, 0)).toBe("");
  });
});

describe("bracketPath", () => {
  it("spans the angular difference outside the ring with end caps", () => {
    const bracket = bracketPath({ cx: 0, cy: 0 }, 60, 10, 40);
    expect(bracket).not.toMatch(/NaN/);
    // Two radial end caps plus the arc between them.
    expect((bracket.match(/M /g) ?? []).length).toBe(3);
  });

  it("emits nothing when the two needles coincide", () => {
    expect(bracketPath({ cx: 0, cy: 0 }, 60, 25, 25)).toBe("");
  });
});

describe("labelOrder", () => {
  it("stacks name, delta, baseline downwards when the value is above", () => {
    expect(labelOrder(5000, 23000)).toEqual(["value", "delta", "baseline"]);
  });

  it("stacks baseline, delta, name downwards when the value is below", () => {
    expect(labelOrder(5000, -8833)).toEqual(["baseline", "delta", "value"]);
  });

  it("drops the delta row when the value sits on the baseline", () => {
    expect(labelOrder(5000, 5000)).toEqual(["value", "baseline"]);
  });
});

describe("gaugeGeometry — the printed table", () => {
  const cases = [
    { name: "above baseline (mockup 1)", baseline: 5000, value: 23000 },
    { name: "below baseline (mockup 2)", baseline: 5000, value: -8833 },
    { name: "at the upper clamp", baseline: 5000, value: 999999 },
    { name: "at the lower clamp", baseline: 5000, value: -999999 },
    { name: "equal to baseline", baseline: 5000, value: 5000 },
    { name: "baseline at zero", baseline: 0, value: 12000 },
  ] as const;

  it("prints one row per situation", () => {
    const rows = cases.map((c) => {
      const g = gaugeGeometry({
        domain: DOMAIN,
        baseline: c.baseline,
        value: c.value,
      });
      return {
        case: c.name,
        valueAngle: round(g.valueAngle),
        baselineAngle: round(g.baselineAngle),
        zeroAngle: round(g.zeroAngle),
        zone: g.zone,
        delta: g.delta,
        labels: g.labels.join(" > "),
      };
    });
    // eslint-disable-next-line no-console
    console.table(rows);
    expect(rows).toHaveLength(cases.length);
  });

  it("reads the two mockups exactly", () => {
    const above = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: 23000 });
    expect(above.zone).toBe("positive");
    expect(above.delta).toBe(18000);
    expect(above.valueAngle).toBeGreaterThan(above.baselineAngle);
    expect(above.labels).toEqual(["value", "delta", "baseline"]);
    expect(above.bracket).not.toBe("");
    expect(above.wedge).not.toBe("");

    const below = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: -8833 });
    expect(below.zone).toBe("negative");
    expect(below.delta).toBe(-13833);
    expect(below.valueAngle).toBeLessThan(below.baselineAngle);
    expect(below.labels).toEqual(["baseline", "delta", "value"]);
  });

  it("reports the delta against the value the gauge DREW, so a clamp cannot lie", () => {
    const clamped = gaugeGeometry({
      domain: DOMAIN,
      baseline: 5000,
      value: 999999,
    });
    expect(clamped.delta).toBe(25000);
    expect(clamped.valueAngle).toBe(90);
  });

  it("degenerates safely when the value sits on the baseline", () => {
    const flat = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: 5000 });
    expect(flat.delta).toBe(0);
    expect(flat.bracket).toBe("");
    expect(flat.labels).toEqual(["value", "baseline"]);
    expect(JSON.stringify(flat)).not.toMatch(/null|NaN/);
  });

  it("never emits NaN for any situation, including a zero-width domain", () => {
    const rows = cases.map((c) =>
      JSON.stringify(
        gaugeGeometry({ domain: DOMAIN, baseline: c.baseline, value: c.value }),
      ),
    );
    for (const row of rows) expect(row).not.toMatch(/NaN/);
    const degenerate = JSON.stringify(
      gaugeGeometry({ domain: [5, 5], baseline: 5, value: 5 }),
    );
    expect(degenerate).not.toMatch(/NaN/);
  });
});
