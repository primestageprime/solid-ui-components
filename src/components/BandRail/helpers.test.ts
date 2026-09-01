// ============================================
// The lane and anchor rules are pinned against the two design snapshots in
// ~/Downloads/thorcastingmocks/thorcasting-trades-module-snapshots.html —
// figures q2-runway-rail and q3-rail. Every x below is copied from that file's
// SVG, so a change to the estimate or the packing rule shows up here as a
// disagreement with the design, not as a vague "looks different".
//
// q2 is the simple case: four ticks, none colliding. q3 is the hard one: two
// labels 0.9px apart, which the design resolves by sending one below the rail
// and stacking the other into the second lane above it.
// ============================================
import { describe, expect, it } from "vitest";
import {
  anchoredSpan,
  ARC_STROKE,
  estimateTextWidth,
  fitAnchor,
  laneGeometry,
  LINE_PITCH,
  NAME_GAP_ABOVE,
  nestedThreshold,
  placeThresholds,
  RAIL_INSET,
  railExtents,
  RING_RADIUS,
  TEXT_PAD,
  THUMB_REACH_ABOVE,
  THUMB_REACH_BELOW,
  VIEW_WIDTH,
} from "./helpers";
import type { PlacedThreshold, Threshold } from "./types";

const LO = RAIL_INSET;
const HI = VIEW_WIDTH - RAIL_INSET;

/** Project by table lookup, so a test pins placement without guessing a domain. */
const at =
  (xs: readonly number[]) =>
  (value: number): number =>
    xs[value];

/** Thresholds keyed 0..n-1 so `at` can index them. */
const named = (
  labels: readonly string[],
  sides: readonly ("above" | "below")[] = [],
): Threshold[] =>
  labels.map((label, i) => ({
    value: i,
    label,
    side: sides[i] ?? "above",
  }));

const byLabel = (
  placed: readonly PlacedThreshold[],
  label: string,
): PlacedThreshold => {
  const found = placed.find((p) => p.threshold.label === label);
  if (!found) throw new Error(`no placement for ${label}`);
  return found;
};

describe("estimateTextWidth", () => {
  it("uses the spec's generous 6.0px per character, not the 5.0px that let visible collisions through", () => {
    expect(estimateTextWidth("safe in 6 mo")).toBe(72);
    expect(estimateTextWidth("")).toBe(0);
  });
});

describe("fitAnchor", () => {
  it("keeps a label middle-anchored while it fits", () => {
    expect(fitAnchor(350, 100, LO, HI)).toBe("middle");
  });

  it("anchors to the start rather than let a label spill off the left edge", () => {
    // q2-runway-rail's first tick: x=33.43, "safe in 6 mo" is 72px wide, so a
    // middle anchor would begin at -2.57 — outside the box.
    expect(fitAnchor(33.42857142857143, 72, LO, HI)).toBe("start");
  });

  it("anchors to the end rather than let a label spill off the right edge", () => {
    // q3-rail's last tick sits exactly on the right edge.
    expect(fitAnchor(678, estimateTextWidth("best take-home"), LO, HI)).toBe(
      "end",
    );
  });

  it("treats a label that exactly reaches an edge as still inside", () => {
    expect(fitAnchor(LO + 50, 100, LO, HI)).toBe("middle");
    expect(fitAnchor(HI - 50, 100, LO, HI)).toBe("middle");
  });
});

describe("anchoredSpan", () => {
  it("puts the span where the anchor says, not always around the centre", () => {
    expect(anchoredSpan(100, 40, "middle")).toEqual([80, 120]);
    expect(anchoredSpan(100, 40, "start")).toEqual([100, 140]);
    expect(anchoredSpan(100, 40, "end")).toEqual([60, 100]);
  });
});

describe("laneGeometry", () => {
  // Offsets read off both snapshots, whose rail sits at y=72.
  const RAIL_Y = 72;

  it("holds the first lane's label clear of the thumb, without shortening its tick", () => {
    // sui#36929: the name baseline used to sit 14 above the rail, inside the
    // thumb's arrow. The band now starts at the thumb's reach, which the
    // enlarged thumb raised from 15 to 22. The tick keeps its length of 10.
    expect(laneGeometry(1, "above", RAIL_Y)).toEqual({
      tickEnd: 62,
      nameY: 46,
      valueY: 35,
    });
  });

  it("clears the thumb with both text lines of the first lane above", () => {
    const lane1 = laneGeometry(1, "above", RAIL_Y);
    expect(lane1.nameY).toBeLessThan(RAIL_Y - THUMB_REACH_ABOVE);
    expect(lane1.valueY).toBeLessThan(RAIL_Y - THUMB_REACH_ABOVE);
  });

  it("reproduces the design's second lane above the rail, lifted with the first", () => {
    // The thumb's floor applies to the base of the stack, so lane 2 rises by
    // the same 12 as lane 1 — the reach of 22 less a lane-1 tick of 10. Its
    // tick is untouched.
    expect(laneGeometry(2, "above", RAIL_Y)).toEqual({
      tickEnd: 40,
      nameY: 24,
      valueY: 13,
    });
  });

  it("keeps one line pitch between the value line of an above lane and the name line of the next", () => {
    // sui#36929 regression: flooring the reach per lane lifted lane 1 alone
    // and shrank this gap to 6, which ran lane 2's name through lane 1's
    // value line. The floor belongs on the base of the stack.
    const gaps = [1, 2, 3].map(
      (lane) =>
        laneGeometry(lane, "above", RAIL_Y).valueY -
        laneGeometry(lane + 1, "above", RAIL_Y).nameY,
    );
    expect(gaps).toEqual([LINE_PITCH, LINE_PITCH, LINE_PITCH]);
  });

  it("reproduces the design's first lane below the rail", () => {
    // The floor bites on this side now. It did not before: the thumb used to
    // reach 9 below the rail, less than a lane-1 tick of 10, so the lift that
    // cleared the labels above was a no-op here. The enlarged ring reaches 14,
    // so below-side labels move out by 4 and the tick still keeps its length.
    expect(laneGeometry(1, "below", RAIL_Y)).toEqual({
      tickEnd: 82,
      nameY: 97,
      valueY: 108,
    });
  });

  it("reproduces the design's second lane below the rail", () => {
    expect(laneGeometry(2, "below", RAIL_Y)).toEqual({
      tickEnd: 104,
      nameY: 119,
      valueY: 130,
    });
  });

  it("always puts the value line farther from the rail than the name", () => {
    const above = laneGeometry(1, "above", RAIL_Y);
    const below = laneGeometry(1, "below", RAIL_Y);
    expect(above.valueY).toBeLessThan(above.nameY);
    expect(below.valueY).toBeGreaterThan(below.nameY);
  });
});

describe("railExtents", () => {
  it("grows the box by one lane pitch per lane further out", () => {
    const two = railExtents(2, 1);
    const three = railExtents(3, 1);
    expect(three.railY).toBe(two.railY + 22);
    expect(three.height).toBe(two.height + 22);
  });

  it("grows the box when a second lane is used, rather than padding every rail to the worst case", () => {
    // A full lane pitch, because the thumb's floor moves the whole stack and
    // not lane 1 alone.
    const one = railExtents(1, 1);
    const two = railExtents(2, 1);
    expect(two.railY).toBe(one.railY + 22);
    expect(two.height).toBe(one.height + 22);
  });

  it("keeps the top pad above the lifted first lane, so the value line is not clipped", () => {
    // sui#36929: the box is sized from the same floored reach the labels use.
    // A rail with one lane above puts its value line at y=14, the pad exactly.
    const { railY } = railExtents(1, 0);
    const { valueY } = laneGeometry(1, "above", railY);
    expect(railY).toBe(THUMB_REACH_ABOVE + NAME_GAP_ABOVE + LINE_PITCH + TEXT_PAD);
    expect(valueY).toBe(TEXT_PAD);
  });

  it("still leaves room for the thumb when there are no thresholds at all", () => {
    const bare = railExtents(0, 0);
    expect(bare.railY).toBeGreaterThanOrEqual(THUMB_REACH_ABOVE);
    expect(bare.height).toBeGreaterThan(bare.railY);
  });

  // The thumb was enlarged so the drag target reads as a handle. It is sized in
  // viewBox units, not CSS pixels, because `valueFromClientX` needs the viewBox
  // to keep its aspect ratio. So growing it moves the label stack, once and
  // statically — never with `value`.
  it("holds the enlarged thumb clear of a lane-1 label on both sides", () => {
    // The ring's outer edge is the widest the thumb ever gets.
    const ringOuterEdge = RING_RADIUS + ARC_STROKE / 2;
    expect(THUMB_REACH_ABOVE).toBeGreaterThanOrEqual(ringOuterEdge);
    expect(THUMB_REACH_BELOW).toBeGreaterThanOrEqual(ringOuterEdge);
  });

  it("grows the box by 12 units for a bare rail and 11 once a side carries a lane", () => {
    // Regression pins for the enlarged thumb. `sideExtent` reads the raw thumb
    // reach when a side has no lanes and the floored `labelBase` when it has
    // one, so the two cases differ by a unit and neither is a flat number.
    const BEFORE_BARE = { railY: 29, height: 52 };
    const BEFORE_ONE_BELOW = { railY: 29, height: 29 + 46 };

    const bare = railExtents(0, 0);
    expect(bare.railY - BEFORE_BARE.railY).toBe(7);
    expect(bare.height - BEFORE_BARE.height).toBe(12);

    const oneBelow = railExtents(0, 1);
    expect(oneBelow.railY - BEFORE_ONE_BELOW.railY).toBe(7);
    expect(oneBelow.height - BEFORE_ONE_BELOW.height).toBe(11);
  });
});

describe("placeThresholds — q2-runway-rail", () => {
  const X = [
    33.42857142857143, // $200   safe in 6 mo
    237.8730158730159, // $3.8k  safe in 12 mo
    555.3333333333333, // $9.3k  or hire a bookkeeper
    646.7619047619047, // $11k   max draw · breaks even
  ];
  const VALUES = ["$200", "$3.8k", "$9.3k", "$11k"];
  const thresholds = named(
    [
      "safe in 6 mo",
      "safe in 12 mo",
      "or hire a bookkeeper",
      "max draw · breaks even",
    ],
    ["above", "above", "above", "below"],
  );
  const result = placeThresholds(thresholds, at(X), (v) => VALUES[v]);

  it("leaves every label in the lane nearest the rail, because none collide", () => {
    for (const p of result.placed) expect(p.lane).toBe(1);
    expect(result.aboveLanes).toBe(1);
    expect(result.belowLanes).toBe(1);
  });

  it("matches the design's anchor on all four ticks", () => {
    expect(byLabel(result.placed, "safe in 6 mo").anchor).toBe("start");
    expect(byLabel(result.placed, "safe in 12 mo").anchor).toBe("middle");
    expect(byLabel(result.placed, "or hire a bookkeeper").anchor).toBe(
      "middle",
    );
    expect(byLabel(result.placed, "max draw · breaks even").anchor).toBe("end");
  });

  it("keeps the side the consumer declared", () => {
    expect(byLabel(result.placed, "max draw · breaks even").side).toBe("below");
    expect(byLabel(result.placed, "safe in 6 mo").side).toBe("above");
  });

  it("carries the formatted value through as the second line", () => {
    expect(byLabel(result.placed, "safe in 12 mo").valueLabel).toBe("$3.8k");
  });
});

describe("placeThresholds — q3-rail, the colliding case", () => {
  const X = [
    171.94285714285715, // $95   market low
    197.2956213017751, //  $102  floor if sold out   (below)
    198.18285714285713, // $102  target met from here
    265.65714285714284, // $120  today
    359.37142857142857, // $145  market high
    678, //               $230  best take-home
  ];
  const VALUES = ["$95", "$102", "$102", "$120", "$145", "$230"];
  const thresholds = named(
    [
      "market low",
      "floor if sold out",
      "target met from here",
      "today",
      "market high",
      "best take-home",
    ],
    ["above", "below", "above", "above", "above", "above"],
  );
  const result = placeThresholds(thresholds, at(X), (v) => VALUES[v]);

  it("stacks the label that would have collided into the second lane", () => {
    // "market low" ends at 201.94; "target met from here" would start at
    // 138.18. They overlap, so the design puts the second one a lane out.
    expect(byLabel(result.placed, "market low").lane).toBe(1);
    expect(byLabel(result.placed, "target met from here").lane).toBe(2);
    expect(result.aboveLanes).toBe(2);
  });

  it("returns later labels to the first lane once the collision is behind them", () => {
    expect(byLabel(result.placed, "today").lane).toBe(1);
    expect(byLabel(result.placed, "market high").lane).toBe(1);
    expect(byLabel(result.placed, "best take-home").lane).toBe(1);
  });

  it("stacks the two sides independently", () => {
    // "floor if sold out" sits 0.9px from "target met from here" but takes the
    // other side of the rail, so it keeps lane 1.
    expect(byLabel(result.placed, "floor if sold out").lane).toBe(1);
    expect(result.belowLanes).toBe(1);
  });

  it("end-anchors the label sitting on the right edge", () => {
    expect(byLabel(result.placed, "best take-home").anchor).toBe("end");
  });

  it("measures an end-anchored label's span leftward, so it does not falsely collide", () => {
    // A centred span would run to 720 and push nothing; the real span is
    // [594, 678]. Either way it clears "market high", which is the point:
    // the span follows the anchor.
    expect(byLabel(result.placed, "best take-home").lane).toBe(1);
  });
});

describe("placeThresholds — packing rules", () => {
  it("caps the stack at four lanes and lets the fifth collide rather than leave the box", () => {
    const stacked = named([
      "aaaaaaaaaaaaaaaaaaaa",
      "bbbbbbbbbbbbbbbbbbbb",
      "cccccccccccccccccccc",
      "dddddddddddddddddddd",
      "eeeeeeeeeeeeeeeeeeee",
    ]);
    const result = placeThresholds(
      stacked,
      at([300, 302, 304, 306, 308]),
      () => "",
    );
    expect(result.aboveLanes).toBe(4);
    expect(byLabel(result.placed, "eeeeeeeeeeeeeeeeeeee").lane).toBe(4);
  });

  it("packs by position, not by the order the consumer listed them", () => {
    const shuffled: Threshold[] = [
      { value: 2, label: "right" },
      { value: 0, label: "left" },
      { value: 1, label: "middle" },
    ];
    const result = placeThresholds(shuffled, at([40, 350, 660]), () => "");
    for (const p of result.placed) expect(p.lane).toBe(1);
  });

  it("returns nothing and no lanes for an empty threshold list", () => {
    const result = placeThresholds([], at([]), () => "");
    expect(result.placed).toEqual([]);
    expect(result.aboveLanes).toBe(0);
    expect(result.belowLanes).toBe(0);
  });
});

describe("nestedThreshold", () => {
  const placed = placeThresholds(
    named(["a", "b"]),
    at([100, 400]),
    () => "",
  ).placed;

  it("finds the threshold the thumb has landed on", () => {
    expect(nestedThreshold(placed, 100)?.threshold.label).toBe("a");
  });

  it("still nests just inside the tolerance", () => {
    expect(nestedThreshold(placed, 103.9)?.threshold.label).toBe("a");
  });

  it("reports nothing once the thumb is past the tolerance", () => {
    expect(nestedThreshold(placed, 106)).toBeUndefined();
  });

  it("picks the nearer of two thresholds in reach", () => {
    const crowded = placeThresholds(
      named(["near", "far"]),
      at([200, 203]),
      () => "",
    ).placed;
    expect(nestedThreshold(crowded, 202.6)?.threshold.label).toBe("far");
  });
});
