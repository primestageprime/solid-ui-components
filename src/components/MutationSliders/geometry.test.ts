// ============================================
// MutationSliders geometry — the headless observation.
//
// Every number the dial's SVG paints is decided in geometry.ts, so a whole row
// of mutations reads as a TABLE without a browser. These tests print that
// table as well as asserting on it: an old-vs-new dial is one of those shapes
// where an inverted axis or an unclamped value looks perfectly plausible until
// you see two rows disagree about which way "up" is.
// ============================================
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { map } from "../../fn";
import {
  ARROW_GAP,
  ARROW_HALF,
  ARROW_LENGTH,
  type Domain,
  type Entity,
  TRACK_BOTTOM,
  TRACK_TOP,
  TRACK_X,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  DELTA_X,
  MINUS,
  ADD_SLOT,
  ARROW_SLOT,
  DIAL_SLOT,
  arrowPath,
  bandFor,
  moveTogether,
  pinTo,
  rowLayout,
  visibleWindow,
  windowLabel,
  MIN_DIAL_HEIGHT,
  deltaLabelOf,
  deltaOf,
  dialHeightFor,
  dragStep,
  settle,
  snapTo,
  trackBottomOf,
  trackPath,
  niceStep,
  trackDomainOf,
  changeLineFor,
  clampToRange,
  dialGeometry,
  mutationGeometry,
  rangeOf,
  toneOf,
  yFor,
} from "./geometry";

/** The shared track: every dial's line runs the whole of this. */
const DOMAIN: Domain = [0, 200_000];

/**
 * The sketch as data, in salary. Each person carries their ROLE's pay band;
 * the dial's shaded box is that band, not the size of the change.
 */
const FIXTURE: readonly Entity[] = [
  // Raised inside a senior band.
  {
    id: "peter",
    label: "Peter",
    old: 90_000,
    value: 104_000,
    range: [70_000, 110_000],
  },
  // Raised inside a junior band.
  {
    id: "adlai",
    label: "Adlai",
    old: 44_000,
    value: 52_000,
    range: [40_000, 60_000],
  },
  // Raised to the very top of a mid band.
  {
    id: "elaina",
    label: "Elaina",
    old: 62_000,
    value: 80_000,
    range: [55_000, 80_000],
  },
  // Cut, hard, inside a senior band.
  {
    id: "reilly",
    label: "Reilly",
    old: 105_000,
    value: 74_000,
    range: [70_000, 110_000],
  },
  // Cut to the floor of a mid band.
  {
    id: "flynn",
    label: "Flynn",
    old: 78_000,
    value: 55_000,
    range: [55_000, 80_000],
  },
  // Removed in the new scenario: no future amount at all.
  {
    id: "joe",
    label: "Joe",
    old: 48_000,
    value: null,
    range: [40_000, 60_000],
  },
  // A NEW HIRE: no prior amount at all. The mirror image of Joe.
  {
    id: "nadia",
    label: "Nadia",
    old: null,
    value: 45_000,
    range: [40_000, 60_000],
  },
];

/** Every `x y` pair in a path, so a test reads points rather than substrings. */
const pointsOf = (d: string): readonly [number, number][] =>
  map(
    (pair) => [Number(pair[1]), Number(pair[2])] as [number, number],
    [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)],
  );

describe("yFor", () => {
  it("puts the domain MAX at the top of the track and the MIN at the bottom", () => {
    // The screen's y grows downward while the domain grows upward, so the
    // inversion lives here and nowhere else.
    expect(yFor(DOMAIN, 200_000)).toBe(TRACK_TOP);
    expect(yFor(DOMAIN, 0)).toBe(TRACK_BOTTOM);
  });

  it("is linear between the ends", () => {
    expect(yFor(DOMAIN, 100_000)).toBe((TRACK_TOP + TRACK_BOTTOM) / 2);
  });

  it("clamps outside the domain rather than drawing off the track", () => {
    expect(yFor(DOMAIN, 9_999_999)).toBe(TRACK_TOP);
    expect(yFor(DOMAIN, -9_999_999)).toBe(TRACK_BOTTOM);
  });

  it("reads a zero-width domain as the middle instead of NaN", () => {
    expect(yFor([5, 5], 5)).toBe((TRACK_TOP + TRACK_BOTTOM) / 2);
    expect(yFor([5, 5], 9)).toBe((TRACK_TOP + TRACK_BOTTOM) / 2);
  });

  it("does not assume the domain starts at zero", () => {
    expect(yFor([100, 200], 200)).toBe(TRACK_TOP);
    expect(yFor([100, 200], 150)).toBe((TRACK_TOP + TRACK_BOTTOM) / 2);
  });
});

describe("rangeOf", () => {
  it("is the entity's own role band when it carries one", () => {
    expect(rangeOf(DOMAIN, FIXTURE[0])).toEqual([70_000, 110_000]);
  });

  it("clamps a band that overflows the domain, so no box draws off-track", () => {
    expect(
      rangeOf(DOMAIN, {
        id: "x",
        label: "X",
        old: 1,
        value: 2,
        range: [-50_000, 900_000],
      }),
    ).toEqual(DOMAIN);
  });

  it("orders a band given backwards rather than drawing a negative box", () => {
    expect(
      rangeOf(DOMAIN, {
        id: "x",
        label: "X",
        old: 1,
        value: 2,
        range: [90_000, 40_000],
      }),
    ).toEqual([40_000, 90_000]);
  });
});

describe("clampToRange", () => {
  it("pulls a value onto the band from either side", () => {
    expect(clampToRange([40_000, 60_000], 15_000)).toBe(40_000);
    expect(clampToRange([40_000, 60_000], 99_000)).toBe(60_000);
  });

  it("leaves a value already inside the band alone", () => {
    expect(clampToRange([40_000, 60_000], 52_000)).toBe(52_000);
  });
});

describe("bandFor", () => {
  it("spans the role's min→max on the track", () => {
    const band = bandFor(DOMAIN, [70_000, 110_000]);
    expect(band.y).toBe(yFor(DOMAIN, 110_000));
    expect(band.height).toBe(yFor(DOMAIN, 70_000) - yFor(DOMAIN, 110_000));
  });

  it("is the role's band, NOT the size of the change", () => {
    // Two people on the same band draw the same box however far each moved.
    expect(bandFor(DOMAIN, rangeOf(DOMAIN, FIXTURE[0]))).toEqual(
      bandFor(DOMAIN, rangeOf(DOMAIN, FIXTURE[3])),
    );
  });

  it("is a wide band for a wide role and a narrow one for a narrow role", () => {
    expect(bandFor(DOMAIN, [40_000, 60_000]).height).toBeLessThan(
      bandFor(DOMAIN, [70_000, 110_000]).height,
    );
  });
});

describe("toneOf", () => {
  it("names a raise, a cut, and no move at all", () => {
    expect(toneOf(50_000, 60_000)).toBe("raise");
    expect(toneOf(60_000, 50_000)).toBe("cut");
    expect(toneOf(50_000, 50_000)).toBe("none");
  });

  it("reads a removed entity as no tone, not as a cut to nothing", () => {
    expect(toneOf(50_000, null)).toBe("none");
  });
});

describe("changeLineFor", () => {
  it("runs between the two arrows, whichever way round they are", () => {
    const up = changeLineFor(DOMAIN, 50_000, 70_000);
    const down = changeLineFor(DOMAIN, 70_000, 50_000);
    expect(up).toEqual(down);
    expect(up?.y).toBe(yFor(DOMAIN, 70_000));
    expect(up?.height).toBe(yFor(DOMAIN, 50_000) - yFor(DOMAIN, 70_000));
  });

  it("is null when nothing moved, so no zero-height line is drawn", () => {
    expect(changeLineFor(DOMAIN, 50_000, 50_000)).toBeNull();
  });

  it("is null for a removed entity", () => {
    expect(changeLineFor(DOMAIN, 50_000, null)).toBeNull();
  });
});

describe("arrowPath", () => {
  it("draws the prior arrow left of the track and the future arrow right", () => {
    const prior = pointsOf(arrowPath(DOMAIN, 100_000, "prior"));
    const future = pointsOf(arrowPath(DOMAIN, 100_000, "future"));
    for (const [x] of prior) expect(x).toBeLessThan(TRACK_X);
    for (const [x] of future) expect(x).toBeGreaterThan(TRACK_X);
  });

  it("points BOTH arrowheads at the track, so the pair converges on it", () => {
    // The apex is the path's first point; on each side it is the point
    // nearest the centre line.
    const apexX = (side: "prior" | "future") =>
      pointsOf(arrowPath(DOMAIN, 100_000, side))[0][0];
    const nearest = (side: "prior" | "future") =>
      Math.min(
        ...map(
          ([x]) => Math.abs(x - TRACK_X),
          pointsOf(arrowPath(DOMAIN, 100_000, side)),
        ),
      );
    expect(Math.abs(apexX("prior") - TRACK_X)).toBe(nearest("prior"));
    expect(Math.abs(apexX("future") - TRACK_X)).toBe(nearest("future"));
  });

  it("is the SAME shape on both sides, mirrored — so the eye pairs them", () => {
    const mirror = map(
      ([x, y]) => [TRACK_X * 2 - x, y] as [number, number],
      pointsOf(arrowPath(DOMAIN, 100_000, "future")),
    );
    expect(mirror).toEqual(pointsOf(arrowPath(DOMAIN, 100_000, "prior")));
  });

  it("sits at the same height when prior and future are equal", () => {
    const at = (side: "prior" | "future") =>
      map(([, y]) => y, pointsOf(arrowPath(DOMAIN, 80_000, side)));
    expect(at("prior")).toEqual(at("future"));
  });

  it("stays inside the canvas at either end of the domain", () => {
    for (const value of [0, 200_000]) {
      for (const side of ["prior", "future"] as const) {
        for (const [x, y] of pointsOf(arrowPath(DOMAIN, value, side))) {
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(VIEW_HEIGHT);
          expect(x).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe("dialGeometry", () => {
  it("clamps BOTH amounts onto the role's band before placing them", () => {
    // Elaina's fixture value sits ON her ceiling; push it past and the dial
    // must draw at the ceiling and report the clamped figure, not the raw one.
    const over = dialGeometry(DOMAIN, {
      id: "over",
      label: "Over",
      old: 120_000,
      value: 150_000,
      range: [55_000, 80_000],
    });
    expect(over.clampedOld).toBe(80_000);
    expect(over.clampedValue).toBe(80_000);
    expect(over.valueY).toBe(yFor(DOMAIN, 80_000));
    // Clamped to the same place, so there is no change to colour.
    expect(over.changeTone).toBe("none");
    expect(over.changeLine).toBeNull();
  });

  it("clamps a value below the band up to the floor", () => {
    const under = dialGeometry(DOMAIN, {
      id: "under",
      label: "Under",
      old: 58_000,
      value: 10_000,
      range: [55_000, 80_000],
    });
    expect(under.clampedValue).toBe(55_000);
    expect(under.changeTone).toBe("cut");
  });

  it("keeps the raw amounts beside the clamped ones, so nothing is lost", () => {
    const over = dialGeometry(DOMAIN, {
      id: "over",
      label: "Over",
      old: 120_000,
      value: 150_000,
      range: [55_000, 80_000],
    });
    expect(over.old).toBe(120_000);
    expect(over.value).toBe(150_000);
  });

  it("keeps the band and the prior arrow for a removed entity", () => {
    const joe = dialGeometry(DOMAIN, FIXTURE[5]);
    expect(joe.removed).toBe(true);
    expect(joe.band).not.toBeNull();
    expect(joe.priorArrow).toBeTruthy();
    expect(joe.clampedValue).toBeNull();
    expect(joe.futureArrow).toBeNull();
    expect(joe.changeLine).toBeNull();
    expect(joe.changeTone).toBe("none");
  });

  it("draws both arrows and a coloured line for a changed entity", () => {
    const peter = dialGeometry(DOMAIN, FIXTURE[0]);
    expect(peter.priorArrow).toBeTruthy();
    expect(peter.futureArrow).toBeTruthy();
    expect(peter.changeTone).toBe("raise");
    expect(peter.changeLine).not.toBeNull();
  });
});

describe("mutationGeometry — the sketch as a table", () => {
  const rows = mutationGeometry(DOMAIN, FIXTURE);
  const asK = (n: number) => `$${Math.round(n / 100) / 10}k`;

  it("prints the whole row so it can be read without a browser", () => {
    console.log("trackDomain (derived):", trackDomainOf(FIXTURE));
    console.table(
      map(
        (row) => ({
          id: row.id,
          range: `${row.range[0]}–${row.range[1]}`,
          old: row.old ?? "—",
          clampedOld: row.clampedOld ?? "—",
          value: row.value ?? "—",
          clampedValue: row.clampedValue ?? "—",
          changeTone: row.changeTone,
          deltaLabel: deltaLabelOf(asK, row.delta) ?? "—",
          bandY: row.band.y,
          bandH: row.band.height,
          oldY: row.oldY ?? "—",
          valueY: row.valueY ?? "—",
          isNew: row.isNew,
          removed: row.removed,
        }),
        rows,
      ),
    );
    expect(rows).toHaveLength(7);
  });

  it("reads three raises, two cuts, one removal and one arrival", () => {
    expect(map((row) => row.changeTone, rows)).toEqual([
      "raise",
      "raise",
      "raise",
      "cut",
      "cut",
      "none",
      "none",
    ]);
  });

  it("gives the two people on one role the identical band box", () => {
    // Peter and Reilly are both senior. Their moves differ; their band does not.
    expect(rows[0].band).toEqual(rows[3].band);
  });

  it("keeps every arrow inside its own role band", () => {
    for (const row of rows) {
      const top = row.band.y;
      const bottom = row.band.y + row.band.height;
      if (row.oldY !== null) {
        expect(row.oldY).toBeGreaterThanOrEqual(top);
        expect(row.oldY).toBeLessThanOrEqual(bottom);
      }
      if (row.valueY !== null) {
        expect(row.valueY).toBeGreaterThanOrEqual(top);
        expect(row.valueY).toBeLessThanOrEqual(bottom);
      }
    }
  });

  it("keeps the row in the order it was given", () => {
    expect(map((row) => row.id, rows)).toEqual(map((e) => e.id, FIXTURE));
  });
});

describe("niceStep", () => {
  it("steps a salary scale by a thousand, not by a pound", () => {
    // The defect this replaced: a hardcoded step of 1 meant a hundred
    // thousand arrow presses to cross this domain.
    expect(niceStep([30_000, 130_000])).toBe(1_000);
  });

  it("crosses any domain in about a hundred presses", () => {
    for (const domain of [
      [0, 10],
      [30_000, 130_000],
      [0, 1_000_000],
      [-500, 500],
      [100, 200],
    ] as const) {
      const presses = Math.abs(domain[1] - domain[0]) / niceStep(domain);
      expect(presses).toBeLessThanOrEqual(100);
      expect(presses).toBeGreaterThanOrEqual(10);
    }
  });

  it("only ever lands on 1, 2 or 5 times a power of ten", () => {
    for (const domain of [
      [0, 3],
      [0, 37],
      [0, 370],
      [0, 3_700],
      [0, 88_000],
      [30_000, 130_000],
    ] as const) {
      const step = niceStep(domain);
      const mantissa = step / 10 ** Math.floor(Math.log10(step));
      expect([1, 2, 5]).toContain(Math.round(mantissa));
    }
  });

  // LOAD-BEARING for scenario-board, which confirmed it in the browser on
  // 2026-09-16: its domain is [0, 10] integer LEVELS and it keys rails BY
  // level, so a step of 0.1 would not merely round oddly — it would hand the
  // board level 6.3 and shatter one rail into a rail per fractional pay.
  it("never goes below 1 on a domain counted in whole numbers", () => {
    expect(niceStep([0, 10])).toBe(1);
    expect(niceStep([0, 5])).toBe(1);
  });

  it("keeps a fractional step on a domain whose ends are fractional", () => {
    // A ratio in [0, 1] genuinely wants a sub-unit step.
    expect(niceStep([0, 1.5])).toBeLessThan(1);
  });

  it("survives a zero-width domain rather than dividing by it", () => {
    expect(niceStep([5, 5])).toBe(1);
  });
});

describe("snapTo and settle", () => {
  it("rounds onto the grid, both ways", () => {
    expect(snapTo(90_400, 1_000)).toBe(90_000);
    expect(snapTo(90_600, 1_000)).toBe(91_000);
    expect(snapTo(90_500, 1_000)).toBe(91_000);
  });

  it("passes the value through when there is no grid", () => {
    expect(snapTo(90_437, undefined)).toBe(90_437);
    expect(snapTo(90_437, 0)).toBe(90_437);
    expect(snapTo(90_437, -5)).toBe(90_437);
    expect(snapTo(90_437, Number.NaN)).toBe(90_437);
  });

  it("snaps a settled value onto the grid inside the band", () => {
    expect(settle([70_000, 110_000], 90_437, 1_000)).toBe(90_000);
  });

  // The order matters, and this is the case that decides it.
  it("lets the BAND win at an edge that is not on the grid", () => {
    // A ceiling of 110_500 against a 1_000 grid snaps UP to 111_000 — above a
    // limit the component promises never to cross. The clamp comes second and
    // pulls it back to the ceiling exactly as it stands.
    expect(snapTo(110_500, 1_000)).toBe(111_000);
    expect(settle([70_000, 110_500], 110_500, 1_000)).toBe(110_500);
    // And the same at the floor: 70_200 snaps DOWN to 70_000, below it.
    expect(snapTo(70_200, 1_000)).toBe(70_000);
    expect(settle([70_200, 110_000], 70_200, 1_000)).toBe(70_200);
  });

  it("still clamps with no grid at all", () => {
    expect(settle([70_000, 110_000], 999_999)).toBe(110_000);
  });
});

describe("dragStep — the drag is continuous, the keyboard is not", () => {
  it("moves by ONE unit on a domain counted in whole numbers", () => {
    // Peter, 2026-09-16: "they appear to snap to things". They did — the
    // keyboard's step was governing the pointer too.
    expect(dragStep([30_000, 130_000])).toBe(1);
    expect(dragStep([0, 10])).toBe(1);
  });

  it("moves by a thousandth of a fractional span — finer than any readout", () => {
    expect(dragStep([0, 1.5])).toBeCloseTo(0.0015);
  });

  it("is FAR finer than the keyboard step it replaced on the drag path", () => {
    const domain: Domain = [40_000, 110_000];
    expect(dragStep(domain)).toBeLessThan(niceStep(domain));
    expect(niceStep(domain) / dragStep(domain)).toBeGreaterThan(100);
  });

  it("survives a zero-width domain rather than dividing by it", () => {
    expect(dragStep([5, 5])).toBe(1);
  });
});

describe("a new hire — no prior amount at all", () => {
  const HIRE: Entity = {
    id: "new",
    label: "New",
    old: null,
    value: 45_000,
    range: [40_000, 60_000],
  };

  it("draws the band and the future arrow and nothing else", () => {
    const dial = dialGeometry(DOMAIN, HIRE);
    expect(dial.isNew).toBe(true);
    expect(dial.band).not.toBeNull();
    expect(dial.futureArrow).toBeTruthy();
    expect(dial.priorArrow).toBeNull();
    expect(dial.oldY).toBeNull();
    expect(dial.clampedOld).toBeNull();
  });

  it("has no change to colour — an arrival is not a raise from zero", () => {
    const dial = dialGeometry(DOMAIN, HIRE);
    expect(dial.changeTone).toBe("none");
    expect(dial.changeLine).toBeNull();
  });

  it("still clamps its future amount onto the band", () => {
    const dial = dialGeometry(DOMAIN, { ...HIRE, value: 99_000 });
    expect(dial.clampedValue).toBe(60_000);
  });

  it("is not the same thing as an unchanged entity", () => {
    const still = dialGeometry(DOMAIN, {
      id: "s",
      label: "S",
      old: 45_000,
      value: 45_000,
      range: [40_000, 60_000],
    });
    expect(still.isNew).toBe(false);
    expect(still.priorArrow).toBeTruthy();
  });

  it("survives being removed as well — an arrival that never landed", () => {
    const dial = dialGeometry(DOMAIN, { ...HIRE, value: null });
    expect(dial.isNew).toBe(true);
    expect(dial.removed).toBe(true);
    expect(dial.priorArrow).toBeNull();
    expect(dial.futureArrow).toBeNull();
  });
});

describe("toneOf with a missing end", () => {
  it("reads a new hire as no tone", () => {
    expect(toneOf(null, 50_000)).toBe("none");
  });

  it("reads an entity that both arrived and left as no tone", () => {
    expect(toneOf(null, null)).toBe("none");
  });
});

describe("trackDomainOf", () => {
  it("runs from the lowest band floor to the highest band ceiling", () => {
    // Peter, 2026-09-16: "use the full vertical space — go from the lowest
    // min range to the highest high range".
    expect(trackDomainOf(FIXTURE)).toEqual([40_000, 110_000]);
  });

  it("makes the lowest floor the BOTTOM of the track and the highest the TOP", () => {
    const derived = trackDomainOf(FIXTURE);
    const bands = map(
      (e: Entity) => bandFor(derived, rangeOf(derived, e)),
      FIXTURE,
    );
    const tops = map((b: { y: number }) => b.y, bands);
    const bottoms = map(
      (b: { y: number; height: number }) => b.y + b.height,
      bands,
    );
    expect(Math.min(...tops)).toBe(TRACK_TOP);
    expect(Math.max(...bottoms)).toBe(TRACK_BOTTOM);
  });

  it("ignores where the amounts sit — only the BANDS bracket the track", () => {
    // Two people far inside their bands must not shrink the scale.
    const tight: readonly Entity[] = [
      {
        id: "a",
        label: "A",
        old: 50_000,
        value: 51_000,
        range: [40_000, 60_000],
      },
    ];
    expect(trackDomainOf(tight)).toEqual([40_000, 60_000]);
  });

  it("gives an empty row a unit domain rather than an infinite one", () => {
    expect(trackDomainOf([])).toEqual([0, 1]);
  });
});

describe("deltaOf and its label", () => {
  it("is signed: positive for a raise, negative for a cut", () => {
    expect(deltaOf(50_000, 52_500)).toBe(2_500);
    expect(deltaOf(50_000, 48_800)).toBe(-1_200);
  });

  it("is null when nothing moved, for a hire, and for a departure", () => {
    expect(deltaOf(50_000, 50_000)).toBeNull();
    expect(deltaOf(null, 50_000)).toBeNull();
    expect(deltaOf(50_000, null)).toBeNull();
  });

  it("labels the magnitude through the consumer's format, sign prefixed", () => {
    // Peter's own two examples, 2026-09-16.
    const asK = (n: number) => `$${n / 1000}k`;
    expect(deltaLabelOf(asK, 2_500)).toBe("+$2.5k");
    expect(deltaLabelOf(asK, -1_200)).toBe(`${MINUS}$1.2k`);
  });

  it("uses a REAL minus sign, not a hyphen", () => {
    const label = deltaLabelOf((n) => `${n}`, -5) as string;
    expect(label.startsWith(MINUS)).toBe(true);
    expect(label.startsWith("-")).toBe(false);
  });

  it("never asks the consumer's format to render a sign", () => {
    // The formatter only ever sees a positive magnitude, so a caller writing
    // one for amounts does not have to think about differences at all.
    const seen: number[] = [];
    deltaLabelOf((n) => {
      seen.push(n);
      return `${n}`;
    }, -1_200);
    expect(seen).toEqual([1_200]);
  });

  it("draws no label at all when there is nothing to name", () => {
    expect(deltaLabelOf(String, null)).toBeNull();
  });
});

describe("the delta label's place on the dial", () => {
  it("sits level with the middle of the line it names", () => {
    const peter = dialGeometry(trackDomainOf(FIXTURE), FIXTURE[0]);
    const line = peter.changeLine as { y: number; height: number };
    expect(peter.deltaY).toBe(line.y + line.height / 2);
  });

  it("has no place when there is no line", () => {
    const joe = dialGeometry(trackDomainOf(FIXTURE), FIXTURE[5]);
    expect(joe.delta).toBeNull();
    expect(joe.deltaY).toBeNull();
  });
});

describe("visibleWindow", () => {
  const ROOM_FOR_THREE = DIAL_SLOT * 3;

  it("shows as many WHOLE dials as fit", () => {
    expect(visibleWindow(ROOM_FOR_THREE, DIAL_SLOT, 9, 0)).toEqual({
      start: 0,
      end: 3,
    });
  });

  it("never shows a partial dial — the remainder is not a quarter of one", () => {
    expect(visibleWindow(DIAL_SLOT * 3.9, DIAL_SLOT, 9, 0)).toEqual({
      start: 0,
      end: 3,
    });
  });

  it("shows everything when everything fits, and never more", () => {
    expect(visibleWindow(DIAL_SLOT * 50, DIAL_SLOT, 4, 0)).toEqual({
      start: 0,
      end: 4,
    });
  });

  it("shows ONE dial when not even one fits, rather than nothing", () => {
    // Peter, 2026-09-16: "Minimum of 1 slider." A row that renders nothing
    // because its container is narrow looks broken; a clipped dial does not.
    expect(visibleWindow(10, DIAL_SLOT, 9, 0)).toEqual({ start: 0, end: 1 });
    expect(visibleWindow(0, DIAL_SLOT, 9, 0)).toEqual({ start: 0, end: 1 });
    expect(visibleWindow(-500, DIAL_SLOT, 9, 0)).toEqual({ start: 0, end: 1 });
  });

  it("pages by moving the window, keeping its size", () => {
    expect(visibleWindow(ROOM_FOR_THREE, DIAL_SLOT, 9, 4)).toEqual({
      start: 4,
      end: 7,
    });
  });

  it("clamps an offset past the end onto the LAST full window", () => {
    // The caller holds the offset in a signal and entities can be removed
    // underneath it; a stale offset must settle, not empty the row.
    expect(visibleWindow(ROOM_FOR_THREE, DIAL_SLOT, 9, 99)).toEqual({
      start: 6,
      end: 9,
    });
  });

  it("clamps a negative offset to the start", () => {
    expect(visibleWindow(ROOM_FOR_THREE, DIAL_SLOT, 9, -4)).toEqual({
      start: 0,
      end: 3,
    });
  });

  it("is empty for an empty row rather than showing a dial that is not there", () => {
    expect(visibleWindow(ROOM_FOR_THREE, DIAL_SLOT, 0, 0)).toEqual({
      start: 0,
      end: 0,
    });
  });

  it("survives a zero dial width instead of dividing by it", () => {
    expect(visibleWindow(500, 0, 9, 0)).toEqual({ start: 0, end: 1 });
  });
});

describe("rowLayout", () => {
  it("does not page, and reserves no arrows, when everything fits", () => {
    const layout = rowLayout(DIAL_SLOT * 9 + ADD_SLOT, 9, 0, true);
    expect(layout.paging).toBe(false);
    expect(layout).toMatchObject({ start: 0, end: 9, capacity: 9 });
  });

  it("pages, and takes the arrows' room, when it does not", () => {
    const layout = rowLayout(
      DIAL_SLOT * 3 + ADD_SLOT + 2 * ARROW_SLOT,
      9,
      0,
      true,
    );
    expect(layout.paging).toBe(true);
    expect(layout.capacity).toBe(3);
  });

  // The two-pass rule, stated as a case: a width that fits every dial EXACTLY
  // must not be spoiled by reserving arrows it then never draws.
  it("does not lose a dial to arrows that never appear", () => {
    const exact = DIAL_SLOT * 5 + ADD_SLOT;
    expect(rowLayout(exact, 5, 0, true)).toMatchObject({
      capacity: 5,
      paging: false,
    });
  });

  // ...and the converse: one dial too many, and the arrows' room comes out of
  // the dials, so the count can drop by more than the one that overflowed.
  it("pays for the arrows out of the dials once it must page", () => {
    const exact = DIAL_SLOT * 5 + ADD_SLOT;
    const layout = rowLayout(exact, 6, 0, true);
    expect(layout.paging).toBe(true);
    expect(layout.capacity).toBeLessThan(5);
  });

  it("reserves the + slot whether or not the row pages", () => {
    const width = DIAL_SLOT * 4;
    expect(rowLayout(width, 4, 0, true).capacity).toBeLessThan(
      rowLayout(width, 4, 0, false).capacity,
    );
  });

  it("still shows one dial in a container far too narrow for any", () => {
    expect(rowLayout(20, 9, 0, true)).toMatchObject({
      start: 0,
      end: 1,
      capacity: 1,
      paging: true,
    });
  });
});

describe("windowLabel", () => {
  it("names the window the way a reader counts, from one", () => {
    expect(windowLabel(2, 5, 7)).toBe("dials 3\u20135 of 7");
  });

  it("says `dial 3 of 7` for a single one, not `dials 3-3`", () => {
    expect(windowLabel(2, 3, 7)).toBe("dial 3 of 7");
  });

  it("has something to say about an empty row", () => {
    expect(windowLabel(0, 0, 0)).toBe("no dials");
  });
});

describe("filling the container's height", () => {
  it("draws at the fixed default when nothing was measured", () => {
    // Unknown is not short — the same rule as `rowLayout`'s width.
    expect(dialHeightFor(0)).toBe(VIEW_HEIGHT);
    expect(dialHeightFor(-50)).toBe(VIEW_HEIGHT);
    expect(dialHeightFor(Number.NaN)).toBe(VIEW_HEIGHT);
  });

  it("takes the height it was given when that is more", () => {
    expect(dialHeightFor(520)).toBe(520);
  });

  it("stops shrinking at the floor, where the labels would collide", () => {
    expect(dialHeightFor(90)).toBe(MIN_DIAL_HEIGHT);
    expect(dialHeightFor(MIN_DIAL_HEIGHT - 1)).toBe(MIN_DIAL_HEIGHT);
  });

  it("lengthens the TRACK with the height", () => {
    expect(trackBottomOf(260)).toBe(248);
    expect(trackBottomOf(600)).toBe(588);
    // The inset at each end is fixed, so the track grows by the whole gain.
    expect(trackBottomOf(600) - trackBottomOf(260)).toBe(340);
  });

  it("still puts the domain's ends at the ends of the longer track", () => {
    const tall = 600;
    expect(yFor(DOMAIN, DOMAIN[1], tall)).toBe(TRACK_TOP);
    expect(yFor(DOMAIN, DOMAIN[0], tall)).toBe(trackBottomOf(tall));
  });

  it("spreads the same band over more pixels, so close levels separate", () => {
    // This is the whole point of the change: "the levels are very close".
    const short = bandFor(DOMAIN, [55_000, 80_000], 260);
    const tall = bandFor(DOMAIN, [55_000, 80_000], 600);
    expect(tall.height).toBeGreaterThan(short.height * 2);
  });

  it("keeps the ARROWHEAD the same size at any height", () => {
    // The arrows and the labels must not scale — only the track lengthens.
    const heightOf = (h: number) => {
      const ys = map(
        ([, y]) => y,
        pointsOf(arrowPath(DOMAIN, 100_000, "prior", h)),
      );
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(heightOf(600)).toBe(heightOf(260));
    expect(heightOf(600)).toBe(ARROW_HALF * 2);
  });

  it("draws the end caps at the ends, whatever the height", () => {
    const d = trackPath(600);
    expect(d).toContain(`${TRACK_TOP}`);
    expect(d).toContain(`${trackBottomOf(600)}`);
  });

  it("defaults every y function to the fixed height, so old callers are untouched", () => {
    // ADDITIVE: `height` is a trailing optional on every one of them.
    expect(yFor(DOMAIN, 100_000)).toBe(yFor(DOMAIN, 100_000, VIEW_HEIGHT));
    expect(bandFor(DOMAIN, [55_000, 80_000])).toEqual(
      bandFor(DOMAIN, [55_000, 80_000], VIEW_HEIGHT),
    );
    expect(trackPath()).toBe(trackPath(VIEW_HEIGHT));
    expect(dialGeometry(DOMAIN, FIXTURE[0])).toEqual(
      dialGeometry(DOMAIN, FIXTURE[0], VIEW_HEIGHT),
    );
  });
});

describe("pinTo — a selection levels up", () => {
  const JUNIOR: readonly [number, number] = [40_000, 60_000];
  const MID: readonly [number, number] = [55_000, 80_000];
  const SENIOR: readonly [number, number] = [70_000, 110_000];
  const PEOPLE: readonly Entity[] = [
    { id: "a", label: "A", old: 44_000, value: 46_000, range: JUNIOR },
    { id: "b", label: "B", old: 60_000, value: 72_000, range: MID },
    { id: "c", label: "C", old: 90_000, value: 95_000, range: SENIOR },
    { id: "d", label: "D", old: 50_000, value: 52_000, range: JUNIOR },
    { id: "gone", label: "Gone", old: 50_000, value: null, range: JUNIOR },
  ];
  const valueOf = (
    moved: readonly { id: string; value: number }[],
    id: string,
  ) => moved.find((m) => m.id === id)?.value;

  it("snaps every selected entity to the HIGHEST among them", () => {
    // b is 72_000, a is 46_000 — a comes UP, b does not move.
    const moved = pinTo(PEOPLE, ["a", "b"]);
    expect(valueOf(moved, "a")).toBe(60_000);
    expect(valueOf(moved, "b")).toBeUndefined();
  });

  it("clamps each one to its OWN band rather than dropping it", () => {
    // Target is c's 95_000. A junior's ceiling is 60_000, so A follows as far
    // as a junior can and stays pinned at the top of their band.
    expect(valueOf(pinTo(PEOPLE, ["a", "c"]), "a")).toBe(60_000);
  });

  it("levels UP, never down — the expensive mistake is a mis-click that cuts", () => {
    const moved = pinTo(PEOPLE, ["b", "d"]);
    // d rises to b's 72_000, clamped to the junior ceiling of 60_000...
    expect(valueOf(moved, "d")).toBe(60_000);
    // ...and b, the highest, is untouched.
    expect(valueOf(moved, "b")).toBeUndefined();
  });

  it("skips a terminated entity entirely, in both directions", () => {
    const moved = pinTo(PEOPLE, ["a", "gone"]);
    // It contributes no maximum and receives no amount.
    expect(valueOf(moved, "gone")).toBeUndefined();
    expect(moved).toHaveLength(0);
  });

  it("leaves unselected entities alone", () => {
    const ids = map((m) => m.id, pinTo(PEOPLE, ["a", "b"]));
    expect(ids).not.toContain("c");
    expect(ids).not.toContain("d");
  });

  it("reports nothing when a lone entity is selected", () => {
    expect(pinTo(PEOPLE, ["a"])).toEqual([]);
    expect(pinTo(PEOPLE, [])).toEqual([]);
  });
});

describe("moveTogether — a pinned group drags as one", () => {
  const JUNIOR: readonly [number, number] = [40_000, 60_000];
  const SENIOR: readonly [number, number] = [70_000, 110_000];
  const PEOPLE: readonly Entity[] = [
    { id: "a", label: "A", old: 44_000, value: 50_000, range: JUNIOR },
    { id: "b", label: "B", old: 90_000, value: 90_000, range: SENIOR },
    { id: "gone", label: "Gone", old: 50_000, value: null, range: JUNIOR },
  ];
  const valueOf = (
    moved: readonly { id: string; value: number }[],
    id: string,
  ) => moved.find((m) => m.id === id)?.value;

  it("applies the SAME delta to every selected entity", () => {
    const moved = moveTogether(PEOPLE, ["a", "b"], 5_000);
    expect(valueOf(moved, "a")).toBe(55_000);
    expect(valueOf(moved, "b")).toBe(95_000);
  });

  it("clamps each to its own band, so one hitting a ceiling stops there", () => {
    const moved = moveTogether(PEOPLE, ["a", "b"], 30_000);
    expect(valueOf(moved, "a")).toBe(60_000); // junior ceiling
    expect(valueOf(moved, "b")).toBe(110_000); // senior ceiling
  });

  it("moves downward just as well", () => {
    expect(valueOf(moveTogether(PEOPLE, ["a", "b"], -5_000), "a")).toBe(45_000);
  });

  it("applies the delta to each OWN value, so a split group keeps its shape", () => {
    // If it applied the delta to a shared figure, these two would collapse
    // onto one another the moment the group was nudged.
    const moved = moveTogether(PEOPLE, ["a", "b"], 1_000);
    expect(
      (valueOf(moved, "b") as number) - (valueOf(moved, "a") as number),
    ).toBe(40_000);
  });

  it("never moves a terminated entity or an unselected one", () => {
    const moved = moveTogether(PEOPLE, ["a", "gone"], 1_000);
    expect(map((m) => m.id, moved)).toEqual(["a"]);
  });
});

describe("the CSS mirrors the canvas", () => {
  // The dial's SVG overlay covers the Kobalte root exactly, and the Kobalte
  // TRACK is inset inside it by TRACK_TOP — that inset is what makes a thumb
  // at `bottom: 0%` land on the same y this file calls TRACK_BOTTOM. The two
  // numbers live in two languages, so this test pins them together rather
  // than leaving a comment nobody re-reads.
  const here = dirname(fileURLToPath(import.meta.url));
  /**
   * The stylesheet with every COMMENT stripped.
   *
   * Asserting against the raw file is a trap I fell into twice: this file's
   * comments quote the very declarations they explain — "`height: 100%`
   * against a parent of INDEFINITE height..." — so a `toContain` matched the
   * PROSE and passed with the rule deleted. A test that cannot fail is worse
   * than no test, because it reads as a guarantee. Strip the commentary and
   * only the CSS is left to match.
   */
  const css = readFileSync(join(here, "MutationSliders.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );

  it("declares the dial height this file draws into", () => {
    expect(css).toContain(`--sui-mutation-dial-height: ${VIEW_HEIGHT}px`);
  });

  it("declares the track inset this file maps the domain onto", () => {
    expect(css).toContain(`--sui-mutation-track-inset: ${TRACK_TOP}px`);
    expect(VIEW_HEIGHT - TRACK_BOTTOM).toBe(TRACK_TOP);
  });

  // THE FILL CHAIN, asserted in CSS because nothing else can assert it.
  //
  // jsdom performs no layout, so no mounting test can tell whether the root
  // claims height from its parent — and the fill tests that DO exist hand the
  // row a height directly, so they pass either way. That blind spot shipped a
  // component whose root had no height rule at all for two commits, while a
  // commit message described the rule as present. These four lines are the
  // only thing standing between that and happening again.
  /**
   * THE POINTER INVARIANT, and the one that produced a real bug report.
   *
   * Kobalte maps pointer-y → value over the TRACK ELEMENT's box, which the
   * stylesheet insets from the dial by `--sui-mutation-track-inset`. The SVG
   * draws its track between `TRACK_TOP` and `trackBottomOf(height)` in viewBox
   * units that are 1:1 with px. If those two extents ever differ, the reader
   * aims at one line and drags along another — Peter, 2026-09-16: "my mouse
   * appears to be changing proportionate to the whole slider rather than
   * dragging the handle".
   *
   * They agree only while BOTH hold: the inset constant equals the CSS var,
   * and the viewBox height equals the dial's pixel height. The second is the
   * component's job (measure, then draw at what was measured); this pins the
   * first, at every height rather than at the one the dial happened to have.
   */
  it("draws the track exactly where the CSS puts the pointer's track", () => {
    const inset = Number(
      /--sui-mutation-track-inset:\s*(\d+)px/.exec(css)?.[1],
    );
    expect(inset).toBe(TRACK_TOP);
    for (const height of [MIN_DIAL_HEIGHT, 260, 600, 1000]) {
      // Where the drawing starts and ends...
      expect(TRACK_TOP).toBe(inset);
      expect(trackBottomOf(height)).toBe(height - inset);
      // ...and how long both therefore are.
      expect(trackBottomOf(height) - TRACK_TOP).toBe(height - 2 * inset);
    }
  });

  it("floors the drawing at the same height the CSS floors the box", () => {
    // If geometry stopped shrinking at a different height from the BOX, a
    // short dial would draw a track longer than the one the pointer uses —
    // the same mismatch from the other direction.
    const cssFloor = Number(
      /--sui-mutation-dial-min-height:\s*(\d+)px/.exec(css)?.[1],
    );
    expect(cssFloor).toBe(MIN_DIAL_HEIGHT);
    expect(dialHeightFor(50)).toBe(cssFloor);
  });

  it("makes the ROOT claim the height its parent gives it", () => {
    const root = css.slice(css.indexOf(".sui-mutation-sliders {"));
    const rootRule = root.slice(0, root.indexOf("}"));
    // Matched as DECLARATIONS — leading whitespace and trailing semicolon —
    // so nothing but a real rule can satisfy them.
    expect(rootRule).toMatch(/\n\s*height:\s*100%;/);
    expect(rootRule).toMatch(/\n\s*min-height:\s*0;/);
  });

  it("lets the DIAL take the leftover height inside its column", () => {
    expect(css).toContain("flex: 1 1 var(--sui-mutation-dial-height)");
  });

  // Peter, 2026-09-16: the name, the dial and the amount on ONE axis. The
  // column centres on the dial's BOX, so the track has to BE the box's centre
  // — otherwise the marks sit off the axis the text is centred on.
  it("puts the track on the canvas's centre line, so the column has one axis", () => {
    expect(TRACK_X).toBe(VIEW_WIDTH / 2);
  });

  it("still leaves the delta label clear of the future arrow", () => {
    // It runs past the canvas edge into the next column's empty left margin,
    // which is only empty because the canvas is symmetric.
    expect(DELTA_X).toBeGreaterThan(TRACK_X);
    expect(DELTA_X).toBeGreaterThanOrEqual(TRACK_X + ARROW_GAP + ARROW_LENGTH);
  });

  it("declares the floor that geometry stops shrinking at", () => {
    expect(css).toContain(
      `--sui-mutation-dial-min-height: ${MIN_DIAL_HEIGHT}px`,
    );
  });

  it("declares the dial width the canvas draws into", () => {
    expect(css).toContain(`--sui-mutation-dial-width: ${VIEW_WIDTH}px`);
  });

  it("declares where the track's centre line sits", () => {
    // The track is NOT the canvas centre: the delta label takes the right of
    // the dial, so the Kobalte track has to be told the same x this file uses.
    expect(css).toContain(`--sui-mutation-track-x: ${TRACK_X}px`);
  });

  it("leaves the delta label room to the right of the future arrow", () => {
    expect(DELTA_X).toBeGreaterThan(TRACK_X);
    expect(DELTA_X).toBeLessThan(VIEW_WIDTH);
  });

  it("leaves room above the top of the track for an arrowhead", () => {
    expect(TRACK_TOP).toBeGreaterThanOrEqual(ARROW_HALF);
  });

  it("paints the change line with the success and danger tokens", () => {
    // Peter asked for the colour explicitly (2026-09-16), superseding the
    // accent-only ruling. The arrows stay as the non-hue cue beside it.
    expect(css).toContain("--sui-success");
    expect(css).toContain("--sui-danger");
  });
});
