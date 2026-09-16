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
  ARROW_HALF,
  type Domain,
  type Entity,
  TRACK_BOTTOM,
  TRACK_TOP,
  TRACK_X,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  DELTA_X,
  MINUS,
  arrowPath,
  bandFor,
  deltaLabelOf,
  deltaOf,
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

describe("the CSS mirrors the canvas", () => {
  // The dial's SVG overlay covers the Kobalte root exactly, and the Kobalte
  // TRACK is inset inside it by TRACK_TOP — that inset is what makes a thumb
  // at `bottom: 0%` land on the same y this file calls TRACK_BOTTOM. The two
  // numbers live in two languages, so this test pins them together rather
  // than leaving a comment nobody re-reads.
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(join(here, "MutationSliders.css"), "utf8");

  it("declares the dial height this file draws into", () => {
    expect(css).toContain(`--sui-mutation-dial-height: ${VIEW_HEIGHT}px`);
  });

  it("declares the track inset this file maps the domain onto", () => {
    expect(css).toContain(`--sui-mutation-track-inset: ${TRACK_TOP}px`);
    expect(VIEW_HEIGHT - TRACK_BOTTOM).toBe(TRACK_TOP);
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
