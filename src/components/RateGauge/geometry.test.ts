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
  VIEW_HEIGHT,
  bracketPath,
  CALLOUT_PITCH,
  capArc,
  clampedValue,
  gaugeGeometry,
  needleEndpoint,
  type Point,
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

  it("caps the tip with an arc concentric with the ring, not a straight line", () => {
    const tip = needleEndpoint({ cx: 0, cy: 0 }, 40, DOMAIN, 0);
    // The cap is an arc command at the needle's own radius.
    expect(tip.capArc).toMatch(/^M .* A 40 40 /);
  });
});

describe("capArc", () => {
  it("spans halfSpan degrees either side of the needle's angle, on the circle", () => {
    const center = { cx: 0, cy: 0 };
    const path = capArc(center, 40, 0, 6);
    const start = pointAt(center, 40, 6);
    const end = pointAt(center, 40, -6);
    // Starts at the counter-clockwise end and sweeps clockwise to the other.
    expect(path).toContain(`M ${start.x} ${start.y}`);
    expect(path).toContain(`${end.x} ${end.y}`);
    // Both endpoints are ON the circle of that radius.
    expect(round(Math.hypot(start.x, start.y))).toBe(40);
    expect(round(Math.hypot(end.x, end.y))).toBe(40);
  });

  it("sweeps the short way round, in the screen-clockwise direction", () => {
    // arcFlags: large-arc 0, sweep 1 (decreasing angle = clockwise on screen).
    expect(capArc({ cx: 0, cy: 0 }, 40, 0, 6)).toMatch(/A 40 40 0 0 1 /);
  });

  it("emits nothing for a zero span", () => {
    expect(capArc({ cx: 0, cy: 0 }, 40, 0, 0)).toBe("");
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

/** Do two segments [a,b] and [c,d] properly cross? */
const segmentsCross = (a: Point, b: Point, c: Point, d: Point): boolean => {
  const side = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = side(a, b, c);
  const d2 = side(a, b, d);
  const d3 = side(c, d, a);
  const d4 = side(c, d, b);
  return d1 * d2 < 0 && d3 * d4 < 0;
};

/** Every segment of every leader, paired against every other leader's. */
const anyLeadersCross = (
  leaders: readonly (readonly Point[])[],
): boolean => {
  for (let i = 0; i < leaders.length; i += 1) {
    for (let j = i + 1; j < leaders.length; j += 1) {
      for (let m = 0; m + 1 < leaders[i].length; m += 1) {
        for (let n = 0; n + 1 < leaders[j].length; n += 1) {
          const crossed = segmentsCross(
            leaders[i][m],
            leaders[i][m + 1],
            leaders[j][n],
            leaders[j][n + 1],
          );
          if (crossed) return true;
        }
      }
    }
  }
  return false;
};

describe("callout placement", () => {
  const place = (baseline: number, value: number) =>
    gaugeGeometry({ domain: DOMAIN, baseline, value }).callouts;

  it("orders the rows by their anchors, top to bottom", () => {
    expect(place(5000, 23000).map((c) => c.id)).toEqual([
      "value",
      "delta",
      "baseline",
    ]);
    expect(place(5000, -8833).map((c) => c.id)).toEqual([
      "baseline",
      "delta",
      "value",
    ]);
  });

  it("keeps every pair of rows at least one pitch apart", () => {
    // Needles a whisker apart: the anchors nearly coincide, the rows must not.
    const rows = place(5000, 5400);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i].y - rows[i - 1].y).toBeGreaterThanOrEqual(
        CALLOUT_PITCH - 0.001,
      );
    }
  });

  it("never lets two leaders cross, however close the needles are", () => {
    const situations: readonly (readonly [number, number])[] = [
      [5000, 23000],
      [5000, -8833],
      [5000, 5400],
      [5000, 4600],
      [5000, 30000],
      [5000, -30000],
      [0, 12000],
      [-20000, 25000],
    ];
    for (const [baseline, value] of situations) {
      const leaders = place(baseline, value).map((c) => c.points);
      expect(anyLeadersCross(leaders)).toBe(false);
    }
  });

  it("stays centred on its anchors — the mean displacement is ~0", () => {
    const rows = place(5000, 23000);
    const displacement = rows.reduce((sum, c) => sum + (c.y - c.naturalY), 0);
    expect(Math.abs(displacement / rows.length)).toBeLessThan(0.001);
  });

  it("keeps every row inside the viewBox even when the anchors are extreme", () => {
    for (const rows of [place(5000, 30000), place(5000, -30000)]) {
      for (const row of rows) {
        expect(row.y).toBeGreaterThan(0);
        expect(row.y).toBeLessThan(VIEW_HEIGHT);
      }
    }
  });

  // The crowding relief this replaced (lengthening one stub when two anchors
  // nearly coincide) separated the elbows but let a long stub cut across a
  // neighbour's leader. A common turn circle separates them by construction:
  // every leader stops being radial at the same radius, so the turn points
  // keep the anchors' angular order however close the needles get.
  it("turns every leader on ONE circle, so the stub varies with the anchor", () => {
    const rows = place(5000, 5400);
    const turnRadii = rows.map((row) => {
      const turn = row.points[1];
      return Math.round(Math.hypot(turn.x - 66, turn.y - 95) * 1000) / 1000;
    });
    expect(new Set(turnRadii).size).toBe(1);
    // The bracket's anchor is further out than the needle tips, so its stub is
    // the short one — the lengths differ because the anchors do.
    const delta = rows.find((row) => row.id === "delta");
    const value = rows.find((row) => row.id === "value");
    expect(delta?.stub).toBeLessThan(value?.stub ?? 0);
  });

  it("keeps the turn points in the anchors' own angular order", () => {
    const rows = place(5000, 23000);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i].angle).toBeLessThan(rows[i - 1].angle);
    }
  });

  it("collapses to ONE row naming both when the value sits on the baseline", () => {
    const rows = place(5000, 5000);
    expect(rows.map((c) => c.id)).toEqual(["valueAndBaseline"]);
  });

  it("runs every leader out to the same label column", () => {
    for (const row of place(5000, 23000)) {
      expect(row.labelX).toBe(place(5000, 23000)[0].labelX);
      const last = row.points[row.points.length - 1];
      expect(last.y).toBe(row.y);
    }
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
        labels: g.callouts.map((c) => `${c.id}@${round(c.y)}`).join(" > "),
        stubs: g.callouts.map((c) => round(c.stub)).join(","),
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
    expect(above.callouts.map((c) => c.id)).toEqual([
      "value",
      "delta",
      "baseline",
    ]);
    expect(above.bracket).not.toBe("");
    expect(above.wedge).not.toBe("");

    const below = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: -8833 });
    expect(below.zone).toBe("negative");
    expect(below.delta).toBe(-13833);
    expect(below.valueAngle).toBeLessThan(below.baselineAngle);
    expect(below.callouts.map((c) => c.id)).toEqual([
      "baseline",
      "delta",
      "value",
    ]);
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
    expect(flat.callouts.map((c) => c.id)).toEqual(["valueAndBaseline"]);
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
