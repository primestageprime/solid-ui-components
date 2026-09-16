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
  bandAt,
  bandRanges,
  yellowDegrees,
  BASELINE_NEEDLE_RADIUS,
  BRACKET_RADIUS,
  CAP_ARC_HALF_SPAN,
  CAP_STROKE_HALF,
  dotsCollide,
  RING_INNER,
  VALUE_NEEDLE_RADIUS,
  VIEW_HEIGHT,
  bracePath,
  braceCusp,
  braceRegime,
  BRACE_CUSP_DEPTH,
  BRACE_END_CURL,
  CALLOUT_PITCH,
  CENTER as CENTER_FOR_TEST,
  type Center,
  LABEL_X,
  capArc,
  clampedValue,
  gaugeGeometry,
  needleEndpoint,
  type Point,
  pointAt,
  ringArcPath,
  SECTOR_RADIUS,
  sectorPath,
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

  // Peter's rule, 2026-09-16: break-even is ALWAYS the horizontal. The two
  // halves therefore carry different scales on an asymmetric domain, which is
  // the honest trade — one linear scale across the whole domain would put
  // break-even at an angle and make a tilted needle mean nothing in particular.
  it("puts zero at the horizontal on an asymmetric domain too", () => {
    expect(angleFor([-10000, 30000], 0)).toBe(0);
    expect(angleFor([-10000, 30000], 30000)).toBe(90);
    expect(angleFor([-10000, 30000], -10000)).toBe(-90);
  });

  it("gives each half its own scale", () => {
    // Half of the maximum is 45° whatever the minimum is...
    expect(angleFor([-10000, 30000], 15000)).toBe(45);
    expect(angleFor([-90000, 30000], 15000)).toBe(45);
    // ...and half of the minimum is −45° whatever the maximum is.
    expect(angleFor([-10000, 30000], -5000)).toBe(-45);
    expect(angleFor([-10000, 90000], -5000)).toBe(-45);
  });

  // The two halves are independent: the maximum alone scales the gain half and
  // the minimum alone scales the loss half. A domain that does not cross zero
  // therefore has one real half and one that nothing can reach.
  it("treats a missing half as zero-length rather than as a scale", () => {
    // Entirely above zero: nothing can be a loss, so nothing points down —
    // while the gain half is still scaled by the maximum, minimum or no.
    expect(angleFor([1000, 30000], -500)).toBe(0);
    expect(angleFor([1000, 30000], 15000)).toBe(45);
    expect(angleFor([1000, 30000], 30000)).toBe(90);
    // Entirely below zero: the mirror.
    expect(angleFor([-30000, -1000], 500)).toBe(0);
    expect(angleFor([-30000, -1000], -15000)).toBe(-45);
    expect(angleFor([-30000, -1000], -30000)).toBe(-90);
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

describe("bandRanges", () => {
  it("splits the ring in two at zero when no comfortable gain is named", () => {
    const ranges = bandRanges(DOMAIN);
    expect(ranges.map((r) => r.tone)).toEqual(["danger", "success"]);
    expect(ranges[0].from).toBe(-90);
    expect(ranges[1].to).toBe(90);
    expect(ranges[0].to).toBe(ranges[1].from);
  });

  it("splits the gain half again at the comfortable gain", () => {
    const ranges = bandRanges(DOMAIN, 12000);
    expect(ranges.map((r) => r.tone)).toEqual(["danger", "warning", "success"]);
    expect(ranges[1].from).toBe(angleFor(DOMAIN, 0));
    expect(ranges[1].to).toBe(angleFor(DOMAIN, 12000));
    expect(ranges[2].from).toBe(angleFor(DOMAIN, 12000));
  });

  it("leaves no gaps and no overlaps, whatever the threshold", () => {
    for (const comfortable of [undefined, 1, 12000, 29999, 30000, 99999]) {
      const ranges = bandRanges(DOMAIN, comfortable);
      expect(ranges[0].from).toBe(-90);
      expect(ranges[ranges.length - 1].to).toBe(90);
      for (let i = 1; i < ranges.length; i += 1) {
        expect(ranges[i].from).toBe(ranges[i - 1].to);
      }
    }
  });

  it("ignores a comfortable gain that is not a gain", () => {
    expect(bandRanges(DOMAIN, 0).map((r) => r.tone)).toEqual([
      "danger",
      "success",
    ]);
    expect(bandRanges(DOMAIN, -5000).map((r) => r.tone)).toEqual([
      "danger",
      "success",
    ]);
  });

  // A threshold past the top of the scale paints the whole gain half yellow
  // rather than emitting a green band nobody can reach.
  it("clamps a threshold past the domain and drops the empty band", () => {
    expect(bandRanges(DOMAIN, 99999).map((r) => r.tone)).toEqual([
      "danger",
      "warning",
    ]);
    expect(bandRanges(DOMAIN, 30000).map((r) => r.tone)).toEqual([
      "danger",
      "warning",
    ]);
  });
});

// A comfortable gain is often a SMALL one — 5% of a baseline of +$5,000/mo is
// +$250/mo, which on a ±$30k dial is three quarters of a degree. The band is
// drawn at whatever width it truly is: widening a thin one to make it visible
// would misreport the threshold, which is the one number this band exists to
// show.
describe("a thin comfortable band", () => {
  const THIN = 250;

  it("gets exactly the angle it is owed, with no minimum", () => {
    const ranges = bandRanges(DOMAIN, THIN);
    const sliver = ranges[1];
    expect(sliver.tone).toBe("warning");
    expect(sliver.to - sliver.from).toBeCloseTo(0.75, 6);
    expect(sliver.to).toBe(angleFor(DOMAIN, THIN));
  });

  it("still closes exactly onto the green above it", () => {
    const ranges = bandRanges(DOMAIN, THIN);
    expect(ranges[1].to).toBe(ranges[2].from);
    expect(ranges[2].to).toBe(90);
  });

  it("paints as a real sector rather than a degenerate path", () => {
    const g = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: 150, comfortable: THIN });
    const sliver = g.bands.find((b) => b.tone === "warning");
    expect(sliver?.path).not.toBe("");
    expect(sliver?.path).not.toMatch(/NaN/);
    // Four corners and a close: a sliver is the same shape as a wide band.
    expect(sliver?.path).toMatch(/^M .* A .* L .* A .* Z$/);
  });

  it("lights when the needle is parked inside it", () => {
    const g = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: 150, comfortable: THIN });
    expect(g.tone).toBe("warning");
    expect(g.bands.filter((b) => b.lit).map((b) => b.tone)).toEqual(["warning"]);
    // ...and only just: a hair above the threshold is already the green.
    const past = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: 251, comfortable: THIN });
    expect(past.tone).toBe("success");
  });
});

describe("yellowDegrees", () => {
  // The figure Peter asked to be able to set directly: a comfortable gain of
  // domainMax × 10/90 puts exactly ten degrees of ring in the warning tone.
  it("reads exactly ten degrees for the ten-degree fixture", () => {
    const tenDegrees = (DOMAIN[1] * 10) / 90;
    expect(yellowDegrees(DOMAIN, tenDegrees)).toBeCloseTo(10, 9);
  });

  it("is zero when there is no comfortable band", () => {
    expect(yellowDegrees(DOMAIN)).toBe(0);
    expect(yellowDegrees(DOMAIN, 0)).toBe(0);
    expect(yellowDegrees(DOMAIN, -100)).toBe(0);
  });

  it("scales with the DOMAIN, not with the rate", () => {
    // The same rate is a hairline on a wide dial and a slab on a narrow one,
    // which is the whole reason this question is worth asking in degrees.
    expect(yellowDegrees([-30000, 30000], 250)).toBeCloseTo(0.75, 9);
    expect(yellowDegrees([-1000, 1000], 250)).toBeCloseTo(22.5, 9);
  });

  it("tops out at the whole gain half", () => {
    expect(yellowDegrees(DOMAIN, 99999)).toBe(90);
  });
});

describe("bandAt", () => {
  it("reads the band the needle stands in", () => {
    expect(bandAt(DOMAIN, 4000, 12000)).toBe("warning");
    expect(bandAt(DOMAIN, 20000, 12000)).toBe("success");
    expect(bandAt(DOMAIN, -1, 12000)).toBe("danger");
  });

  it("is half-open upward: exactly comfortable IS comfortable", () => {
    expect(bandAt(DOMAIN, 12000, 12000)).toBe("success");
    expect(bandAt(DOMAIN, 0, 12000)).toBe("warning");
    expect(bandAt(DOMAIN, 0)).toBe("success");
  });

  it("catches both poles", () => {
    expect(bandAt(DOMAIN, 999999, 12000)).toBe("success");
    expect(bandAt(DOMAIN, -999999, 12000)).toBe("danger");
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

  // The cap is narrow, and at small sizes it will read as a straight tip mark.
  // What matters is that the GEOMETRY is a real arc — its sagitta is nonzero,
  // so the same gauge blown up shows the curvature instead of having to be
  // re-cut later. A chord would have a sagitta of exactly zero at every size.
  it("is a real arc, however straight it looks small", () => {
    const tip = needleEndpoint({ cx: 0, cy: 0 }, VALUE_NEEDLE_RADIUS, DOMAIN, 0);
    const sagitta =
      VALUE_NEEDLE_RADIUS *
      (1 - Math.cos((CAP_ARC_HALF_SPAN * Math.PI) / 180));
    expect(sagitta).toBeGreaterThan(0);
    expect(tip.capArc).toMatch(/ A /);
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

describe("clearance between the needle and the ring", () => {
  // A clock hand that touches its own dial reads as stuck to it. The cap lives
  // INSIDE that clearance rather than hugging the band — clearance wins.
  it("leaves a visible gap between the cap's outer edge and the ring", () => {
    const capOuterEdge = VALUE_NEEDLE_RADIUS + CAP_STROKE_HALF;
    expect(RING_INNER - capOuterEdge).toBeGreaterThan(3);
  });

  it("keeps the whole cap arc off the ring — it is concentric, so it cannot drift", () => {
    // Every point of the cap is at one radius, which is what makes the
    // clearance a single subtraction rather than a per-angle check.
    expect(VALUE_NEEDLE_RADIUS + CAP_STROKE_HALF).toBeLessThan(RING_INNER);
  });
});

describe("terminal dots", () => {
  const dots = (baseline: number, value: number) =>
    Object.fromEntries(
      gaugeGeometry({ domain: DOMAIN, baseline, value }).callouts.map((c) => [
        c.id,
        c.showDot,
      ]),
    );

  // The needle callouts are anchored on the ring's OUTER EDGE, which they do
  // not name — a dot there reads as a blemish on the band.
  it("drops the dots that sit on the ring band", () => {
    expect(dots(5000, 23000).value).toBe(false);
    expect(dots(5000, 23000).baseline).toBe(false);
    expect(dots(5000, -8833).value).toBe(false);
  });

  // The delta's anchor IS the middle of the bracket, so its dot is that
  // bracket's terminal rather than damage to it.
  // The delta's dot went when the bracket became a brace: a brace's CUSP is
  // already a terminal, so a dot on it is a second terminal on one leader.
  it("drops the delta's dot too — the brace's cusp is its terminal", () => {
    expect(dots(5000, 23000).delta).toBe(false);
    expect(dots(5000, -8833).delta).toBe(false);
  });

  it("anchors the delta's leader on the cusp's tip", () => {
    const g = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: 23000 });
    const delta = g.callouts.find((c) => c.id === "delta");
    const apex = pointAt(
      CENTER_FOR_TEST,
      BRACKET_RADIUS + BRACE_CUSP_DEPTH,
      (g.baselineAngle + g.valueAngle) / 2,
    );
    expect(delta?.anchor).toEqual(apex);
    expect(g.brace).toContain(`${apex.x} ${apex.y}`);
  });

  it("drops a dot that would land on another callout's dot", () => {
    const a = { x: 100, y: 100 };
    expect(dotsCollide(a, { x: 102, y: 100 })).toBe(true);
    expect(dotsCollide(a, { x: 106, y: 100 })).toBe(false);
  });

  it("drops the collapsed row's dot too — it is on the ring like the others", () => {
    expect(dots(5000, 5000).valueAndBaseline).toBe(false);
  });
});

describe("the cap clears the baseline needle", () => {
  // A cap wide enough to look curved spans far more than the angle between two
  // nearly-equal needles, so it cannot be kept off the baseline by narrowing
  // it. The baseline needle stops short of the cap's circle instead.
  it("keeps the baseline needle inside the circle the cap occupies", () => {
    expect(BASELINE_NEEDLE_RADIUS).toBeLessThan(
      VALUE_NEEDLE_RADIUS - CAP_STROKE_HALF,
    );
  });

  it("cannot reach the brace either — they live at different radii", () => {
    const near = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: 5500 });
    // Every cap point is at the value needle's radius; the brace is outside
    // the ring. The two can never meet, whatever the delta.
    expect(VALUE_NEEDLE_RADIUS).toBeLessThan(BRACKET_RADIUS);
    expect(near.valueTip.capArc).not.toBe("");
  });
});

describe("sectorPath", () => {
  it("fills the sector from the pivot between the two given angles", () => {
    const sector = sectorPath({ cx: 0, cy: 0 }, 30, 0, 45);
    expect(sector).toMatch(/^M 0 0 L/);
    expect(sector.endsWith("Z")).toBe(true);
  });

  it("emits nothing for a zero-width sector", () => {
    expect(sectorPath({ cx: 0, cy: 0 }, 30, 0, 0)).toBe("");
  });
});

describe("the delta sector", () => {
  const sectorOf = (baseline: number, value: number) =>
    gaugeGeometry({ domain: DOMAIN, baseline, value }).deltaSector;

  // It shades the same angular range the bracket spans — it IS the delta,
  // drawn as an area instead of as a line outside the ring.
  it("spans baseline to value, not zero to baseline", () => {
    const g = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: 23000 });
    const start = pointAt(CENTER_FOR_TEST, SECTOR_RADIUS, g.baselineAngle);
    const end = pointAt(CENTER_FOR_TEST, SECTOR_RADIUS, g.valueAngle);
    expect(g.deltaSector).toContain(`L ${start.x} ${start.y}`);
    expect(g.deltaSector).toContain(`${end.x} ${end.y}`);
  });

  it("is present below the baseline too, sweeping the other way", () => {
    expect(sectorOf(5000, -8833)).not.toBe("");
  });

  it("has zero width when the value sits on the baseline", () => {
    expect(sectorOf(5000, 5000)).toBe("");
  });

  it("does not care where zero is — a baseline AT zero still shades a delta", () => {
    expect(sectorOf(0, 12000)).not.toBe("");
  });
});

describe("bracePath", () => {
  const center = { cx: 0, cy: 0 };

  it("is ONE stroke: curl, arc, cusp, arc, curl", () => {
    const brace = bracePath(center, 60, 10, 40, BRACE_CUSP_DEPTH);
    expect(brace).not.toMatch(/NaN/);
    // One move-to — a brace is a single continuous stroke, unlike the bracket
    // it replaced, which was an arc plus two detached end caps.
    expect((brace.match(/M /g) ?? []).length).toBe(1);
    // Two arcs either side of two cubics that meet at the cusp.
    expect((brace.match(/ A /g) ?? []).length).toBe(2);
    expect((brace.match(/ C /g) ?? []).length).toBe(2);
  });

  it("puts the cusp's apex one cusp-depth beyond the radius, at the midpoint", () => {
    const brace = bracePath(center, 60, 10, 40, BRACE_CUSP_DEPTH);
    const apex = pointAt(center, 60 + BRACE_CUSP_DEPTH, 25);
    expect(brace).toContain(`${apex.x} ${apex.y}`);
    expect(round(Math.hypot(apex.x, apex.y))).toBe(60 + BRACE_CUSP_DEPTH);
  });

  // Tight quarter-turns, the serifs of a typographic brace — not radial ticks.
  it("starts and ends on curls that carry past the arm and hook inside it", () => {
    const brace = bracePath(center, 60, 10, 40, BRACE_CUSP_DEPTH);
    const [, startX, startY] = /^M (\S+) (\S+)/.exec(brace) ?? [];
    const tipRadius = Math.hypot(Number(startX), Number(startY));
    // The tip finishes INSIDE the brace circle, by about the curl's diameter.
    expect(tipRadius).toBeLessThan(60);
    expect(60 - tipRadius).toBeGreaterThan(BRACE_END_CURL);
    expect(60 - tipRadius).toBeLessThan(BRACE_END_CURL * 2.5);
    // A curl is a curve, so each end is a quadratic rather than a line.
    expect((brace.match(/ Q /g) ?? []).length).toBe(2);
    expect(brace).not.toMatch(/ L /);
  });

  // A lone cusp at this width is a chevron, not a brace — it was tried and read
  // as a mark of its own. Below the arms' floor there is simply no brace.
  it("draws nothing at all when the delta is too tiny for arms", () => {
    expect(bracePath(center, 60, 24.4, 25.6, BRACE_CUSP_DEPTH)).toBe("");
  });

  it("sweeps the other way below the baseline without inverting the cusp", () => {
    const brace = bracePath(center, 60, 40, 10, BRACE_CUSP_DEPTH);
    const apex = pointAt(center, 60 + BRACE_CUSP_DEPTH, 25);
    expect(brace).toContain(`${apex.x} ${apex.y}`);
  });

  it("emits nothing when the two needles coincide", () => {
    expect(bracePath(center, 60, 25, 25, BRACE_CUSP_DEPTH)).toBe("");
  });
});

// Every point the brace draws has to lie BETWEEN the two needles. The curls
// used to poke out past them, which read as the brace belonging to something
// wider than the delta it measures. The budget is spent from the outside in:
// curls first to go, then arms, and the cusp last — without it there is no
// brace at all.
describe("the brace stays inside the needles", () => {
  const center = { cx: 0, cy: 0 };
  const RADIUS = 60;

  /**
   * Every point a path command lands on or is steered by, as an angle in math
   * degrees. Parsed per command rather than by scraping number pairs: an arc's
   * `A rx ry rot large sweep x y` would otherwise read its two RADII as a
   * coordinate, which is how this test first "failed" against a correct path.
   */
  const anglesOf = (d: string, about: Center = { cx: 0, cy: 0 }): number[] => {
    const out: number[] = [];
    const push = (x: number, y: number) =>
      out.push((Math.atan2(-(y - about.cy), x - about.cx) * 180) / Math.PI);
    for (const part of d.matchAll(/([MLQCA])((?:\s+-?[\d.e-]+)+)/g)) {
      const nums = part[2].trim().split(/\s+/).map(Number);
      if (part[1] === "A") push(nums[5], nums[6]);
      else for (let i = 0; i + 1 < nums.length; i += 2) push(nums[i], nums[i + 1]);
    }
    return out;
  };

  const staysInside = (from: number, to: number) => {
    const low = Math.min(from, to);
    const high = Math.max(from, to);
    for (const angle of anglesOf(bracePath(center, RADIUS, from, to, BRACE_CUSP_DEPTH))) {
      expect(angle).toBeGreaterThanOrEqual(low - 0.001);
      expect(angle).toBeLessThanOrEqual(high + 0.001);
    }
  };

  it("picks the full brace when the span can pay for curls, arms and cusp", () => {
    expect(braceRegime(RADIUS, 10, 64)).toBe("full");
    staysInside(10, 64);
    staysInside(64, 10);
  });

  it("drops the curls first when the span cannot pay for them", () => {
    // 16° of span: arms and cusp fit, curls do not.
    expect(braceRegime(RADIUS, 17, 33)).toBe("arms");
    const brace = bracePath(center, RADIUS, 17, 33, BRACE_CUSP_DEPTH);
    expect(brace).not.toMatch(/ Q /);
    expect((brace.match(/ A /g) ?? []).length).toBe(2);
    staysInside(17, 33);
    staysInside(33, 17);
  });

  it("draws no brace at all when there is no arm left either", () => {
    expect(braceRegime(RADIUS, 24.4, 25.6)).toBe("none");
    expect(bracePath(center, RADIUS, 24.4, 25.6, BRACE_CUSP_DEPTH)).toBe("");
  });

  // The delta still has its callout — only the brace goes. The leader starts
  // on the brace circle instead of on a cusp tip, and routes as it always does.
  it("keeps the delta's leader when the brace is dropped, starting on the circle", () => {
    const g = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: 5500 });
    expect(g.brace).toBe("");
    const delta = g.callouts.find((c) => c.id === "delta");
    expect(delta).toBeDefined();
    const onCircle = pointAt(
      CENTER_FOR_TEST,
      BRACKET_RADIUS,
      (g.baselineAngle + g.valueAngle) / 2,
    );
    expect(delta?.anchor).toEqual(onCircle);
    // Still a full leader: out, across, and into the shared label column.
    expect(delta?.points.length).toBeGreaterThanOrEqual(3);
    expect(delta?.labelX).toBe(LABEL_X);
  });

  it("puts the delta's leader back on the cusp as soon as a brace is drawn", () => {
    const g = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value: 23000 });
    const delta = g.callouts.find((c) => c.id === "delta");
    const apex = pointAt(
      CENTER_FOR_TEST,
      BRACKET_RADIUS + BRACE_CUSP_DEPTH,
      (g.baselineAngle + g.valueAngle) / 2,
    );
    expect(delta?.anchor).toEqual(apex);
  });

  it("spends the budget from the outside in as the span closes", () => {
    const regimes = [54, 22, 16, 12, 1.2].map((span) =>
      braceRegime(RADIUS, 25 - span / 2, 25 + span / 2),
    );
    expect(regimes).toEqual(["full", "full", "arms", "none", "none"]);
  });

  it("holds for the real dial, above and below the baseline", () => {
    for (const value of [23000, -8833, 9000]) {
      const g = gaugeGeometry({ domain: DOMAIN, baseline: 5000, value });
      const low = Math.min(g.baselineAngle, g.valueAngle);
      const high = Math.max(g.baselineAngle, g.valueAngle);
      for (const angle of anglesOf(g.brace, CENTER_FOR_TEST)) {
        expect(angle).toBeGreaterThanOrEqual(low - 0.001);
        expect(angle).toBeLessThanOrEqual(high + 0.001);
      }
    }
  });

  // The sharpness, measured rather than eyeballed. Each half has to arrive at
  // the tip travelling nearly straight out along the apex's own radial line —
  // from opposite sides — or the meeting point is a rounded lobe instead of a
  // spike. This is the assertion that would fail if the control points drifted
  // back out toward the apex's shoulders.
  it("arrives at the apex within a few degrees of radial, from both sides", () => {
    const cusp = braceCusp(center, 60, 10, 40, BRACE_CUSP_DEPTH);
    const outward = pointAt(center, 1, cusp.mid);
    const angleTo = (from: Point) => {
      const dx = cusp.apex.x - from.x;
      const dy = cusp.apex.y - from.y;
      const dot = (dx * outward.x + dy * outward.y) / Math.hypot(dx, dy);
      return (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI;
    };
    // Not zero: a control exactly on the midline would give a needle with
    // straight flanks. A small angle keeps the flanks concave and the tip
    // sharp — the two tangents close on roughly a 25° V.
    expect(angleTo(cusp.liftA)).toBeLessThan(20);
    expect(angleTo(cusp.liftB)).toBeLessThan(20);
    expect(angleTo(cusp.liftA) + angleTo(cusp.liftB)).toBeLessThan(30);
    // ...and from OPPOSITE sides, so the tangents nearly reverse at the tip.
    const sideOf = (p: Point) =>
      Math.sign((cusp.apex.x - p.x) * outward.y - (cusp.apex.y - p.y) * outward.x);
    expect(sideOf(cusp.liftA)).not.toBe(sideOf(cusp.liftB));
  });

  it("keeps the controls inside the apex, so the flanks stay concave", () => {
    const cusp = braceCusp(center, 60, 10, 40, BRACE_CUSP_DEPTH);
    const liftRadius = Math.hypot(cusp.liftA.x, cusp.liftA.y);
    expect(liftRadius).toBeGreaterThan(60);
    expect(liftRadius).toBeLessThan(60 + BRACE_CUSP_DEPTH * 0.7);
  });

  // Concavity, measured: each flank's midpoint has to fall on the ARC side of
  // the straight line from its shoulder to the apex. A flank that bulged the
  // other way would be the rounded lobe this shape exists not to be.
  it("bows each flank toward the arc rather than away from it", () => {
    const cusp = braceCusp(center, 60, 10, 40, BRACE_CUSP_DEPTH);
    const midOfCubic = (p0: Point, p1: Point, p2: Point, p3: Point) => ({
      x: (p0.x + 3 * p1.x + 3 * p2.x + p3.x) / 8,
      y: (p0.y + 3 * p1.y + 3 * p2.y + p3.y) / 8,
    });
    for (const flank of [
      [cusp.baseA, cusp.shoulderA, cusp.liftA, cusp.apex],
      [cusp.baseB, cusp.shoulderB, cusp.liftB, cusp.apex],
    ] as const) {
      const belly = midOfCubic(flank[0], flank[1], flank[2], flank[3]);
      const chordMid = {
        x: (flank[0].x + flank[3].x) / 2,
        y: (flank[0].y + flank[3].y) / 2,
      };
      // Closer to the centre than the straight chord would be = bowed inward.
      expect(Math.hypot(belly.x, belly.y)).toBeLessThan(
        Math.hypot(chordMid.x, chordMid.y),
      );
    }
  });

  it("keeps the cusp narrow against the arms it joins", () => {
    const cusp = braceCusp(center, 60, 10, 40, BRACE_CUSP_DEPTH);
    // The arms sweep 15 degrees each; the cusp takes a third of one.
    expect(cusp.halfSpan).toBeLessThan(15 / 2);
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
    // A spread that does not hit the viewBox's edges: the group is shifted
    // back by exactly the mean push, so it sits on the marks it names. The
    // clamped case is the next test's business, not this one's.
    const rows = place(5000, 12000);
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
      return (
        Math.round(
          Math.hypot(
            turn.x - CENTER_FOR_TEST.cx,
            turn.y - CENTER_FOR_TEST.cy,
          ) * 1000,
        ) / 1000
      );
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

describe("the canvas", () => {
  const read = (box?: { width: number; height: number }) =>
    gaugeGeometry({
      domain: DOMAIN,
      baseline: 5000,
      value: 23000,
      labels: ["SCENARIO A", "+$18,000/MO", "BASELINE"],
      box,
    });

  it("cuts tight to the content when nothing imposes a size", () => {
    const g = read();
    // Left edge: the pivot is the D's leftmost point, so only the margin.
    expect(g.metrics.center.cx).toBe(4);
    // Vertically the dial is centred on its own extent, top and bottom equal.
    expect(g.metrics.center.cy).toBe(g.metrics.outerExtent + 4);
    expect(g.metrics.viewHeight).toBe((g.metrics.outerExtent + 4) * 2);
    // Right edge: the label column, its text, and the margin. Nothing spare.
    expect(g.metrics.viewWidth).toBe(
      g.metrics.textX + g.metrics.labelWidth + 4,
    );
    expect(g.metrics.ringOuter).toBe(64);
  });

  it("takes the box it is given, at one unit per pixel", () => {
    const g = read({ width: 540, height: 850 });
    expect(g.viewBox).toBe("0 0 540 850");
    expect(g.metrics.viewWidth).toBe(540);
    expect(g.metrics.viewHeight).toBe(850);
  });

  // The point of the exercise: a 540×850 card should draw a BIG dial, not a
  // default-sized one floating in the middle of a scaled-up canvas.
  it("grows the dial to the box's limiting dimension", () => {
    const g = read({ width: 540, height: 850 });
    expect(g.metrics.ringOuter).toBeGreaterThan(64 * 3);
    // Whichever budget bound it, the content still fits inside the box.
    expect(g.metrics.center.cy + g.metrics.outerExtent).toBeLessThanOrEqual(850);
    expect(g.metrics.textX + g.metrics.labelWidth).toBeLessThanOrEqual(540);
  });

  // The dial is sized first and the column takes the slack, so a box with
  // width to spare spends it on words rather than on dead space — but only
  // when the words actually want it. A column wider than its text is just
  // dead space under another name.
  it("widens the label column into width the dial did not need", () => {
    const long = (box?: { width: number; height: number }) =>
      gaugeGeometry({
        domain: DOMAIN,
        baseline: 5000,
        value: 23000,
        labels: ["BOOKKEEPING RETAINER · NORTHERN", "+$18,000/MO", "BASELINE"],
        box,
      });
    // Unmeasured, the column is capped so a long name cannot squeeze the dial.
    expect(long().metrics.labelWidth).toBe(124);
    // Measured and height-bound, the leftover width goes to the name.
    const tall = long({ width: 540, height: 400 });
    expect(tall.metrics.labelWidth).toBeGreaterThan(124);
    expect(tall.metrics.textX + tall.metrics.labelWidth).toBeLessThanOrEqual(540);
  });

  it("does not make the column wider than its own text wants", () => {
    const tall = read({ width: 900, height: 400 });
    // The longest label is 11 characters; the column stops there rather than
    // running on to the edge.
    expect(tall.metrics.labelWidth).toBeLessThan(120);
  });

  it("never widens the column at the dial's expense", () => {
    const withShortLabels = gaugeGeometry({
      domain: DOMAIN,
      baseline: 5000,
      value: 23000,
      labels: ["A", "B", "C"],
      box: { width: 540, height: 850 },
    });
    const withLongLabels = read({ width: 540, height: 850 });
    // Both are bound by the same budget, so the dial is the same size
    // whatever the words are — the column absorbs the difference.
    expect(withShortLabels.metrics.ringOuter).toBeCloseTo(
      withLongLabels.metrics.ringOuter,
      9,
    );
  });

  it("keeps the ANNOTATION fixed while the dial grows", () => {
    const small = read();
    const large = read({ width: 540, height: 850 });
    // The gap from the outermost mark to the label column, and the column's
    // own width, are the same number of units at both sizes — so at one unit
    // per pixel they are the same size on screen.
    expect(large.metrics.labelX - large.metrics.outerExtent).toBe(
      small.metrics.labelX - small.metrics.outerExtent,
    );
    expect(large.metrics.labelWidth).toBe(small.metrics.labelWidth);
    expect(large.metrics.textX - large.metrics.labelX).toBe(
      small.metrics.textX - small.metrics.labelX,
    );
    // The stub a leader runs out along is fixed too.
    expect(large.metrics.turn - large.metrics.brace).toBe(
      small.metrics.turn - small.metrics.brace,
    );
  });

  it("keeps the dial's own proportions while it grows", () => {
    const small = read();
    const large = read({ width: 540, height: 850 });
    const ratio = (m: typeof small.metrics) => m.ringInner / m.ringOuter;
    expect(ratio(large.metrics)).toBeCloseTo(ratio(small.metrics), 9);
  });

  it("lets a narrow box bind on width and a short one on height", () => {
    const wide = read({ width: 1200, height: 300 });
    const tall = read({ width: 300, height: 1200 });
    expect(wide.metrics.center.cy + wide.metrics.outerExtent).toBeLessThanOrEqual(300);
    expect(tall.metrics.textX + tall.metrics.labelWidth).toBeLessThanOrEqual(300);
  });

  it("never lets a label run past the right edge", () => {
    for (const box of [undefined, { width: 540, height: 850 }, { width: 300, height: 300 }]) {
      const g = read(box);
      for (const callout of g.callouts) {
        expect(callout.textX + g.metrics.labelWidth).toBeLessThanOrEqual(
          g.metrics.viewWidth,
        );
      }
    }
  });

  it("still routes all three brace regimes inside a measured box", () => {
    const box = { width: 540, height: 850 };
    const at = (value: number) =>
      gaugeGeometry({ domain: DOMAIN, baseline: 5000, value, box });
    expect(at(23000).brace).not.toBe("");
    expect(at(5500).brace).toBe("");
    expect(at(5000).callouts.map((c) => c.id)).toEqual(["valueAndBaseline"]);
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
    expect(above.brace).not.toBe("");
    expect(above.deltaSector).not.toBe("");

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
    expect(flat.brace).toBe("");
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
