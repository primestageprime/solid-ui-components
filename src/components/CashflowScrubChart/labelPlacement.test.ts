import { afterEach, describe, expect, it, vi } from "vitest";
import { measureLabelWidth } from "../ScrubChart/helpers";
import {
  BELOW_ROW_HEIGHT,
  BELOW_ZONE_TOP_GAP,
  LABEL_GUTTER_GAP,
  LABEL_ROW_GAP,
  LABEL_ROW_HEIGHT,
  belowExtraHeight,
  placeLabels,
  reserveLabelSpace,
  type LabelCandidate,
  type LabelPlacementResult,
  type PlotRect,
  type Polyline,
  type ReservedSpace,
} from "./labelPlacement";

// A 200x100 plot with round edges keeps every expected coordinate readable.
// It stands in for the pixel rectangle the scales produce; the module never
// sees a scale, so an explicit rectangle is the whole world it needs.
const PLOT: PlotRect = { left: 0, top: 0, right: 200, bottom: 100 };

const NO_SERIES: readonly Polyline[] = [];
const NO_SPACE: ReservedSpace = { rightGutter: 0, belowRows: 0 };

/** One text row, the height every label in this suite uses. */
const ROW = 11;

/**
 * Deterministic under test, but NOT by the route the spec names. The spec says
 * jsdom has no canvas and `measureLabelWidth` falls back to `text.length * 6.5`.
 * `src/test-setup.ts` installs a stub 2D context on purpose, so the real canvas
 * path runs and the estimate is that stub's `text.length * 7`.
 */
const w = (text: string) => measureLabelWidth(text);

/** Two characters — 14px under the stub metric. */
const NARROW = w("AB");

const label = (
  id: string,
  over: Partial<LabelCandidate> = {},
): LabelCandidate => ({
  id,
  width: NARROW,
  height: ROW,
  placement: "auto",
  x: 50,
  y: 50,
  endY: 50,
  ...over,
});

/** A horizontal series that runs the full plot width at `y`. */
const ruleAt = (y: number): Polyline => [
  { x: PLOT.left, y },
  { x: PLOT.right, y },
];

const byId = (results: readonly LabelPlacementResult[], id: string) => {
  const hit = results.find((r) => r.id === id);
  if (hit === undefined) throw new Error(`no result for ${id}`);
  return hit;
};

const zoneOf = (results: readonly LabelPlacementResult[], id: string) => {
  const hit = byId(results, id);
  return hit.kind === "placed" ? hit.zone : "dropped";
};

describe("measureLabelWidth under jsdom", () => {
  it("reports the test-setup stub metric, so every width below is exact", () => {
    expect(w("AB")).toBe(2 * 7);
    expect(w("Runway")).toBe(6 * 7);
  });

  it("returns the same width for the same text every call", () => {
    expect(w("Runway")).toBe(w("Runway"));
  });
});

describe("reserveLabelSpace", () => {
  it("buys no right gutter when zero labels prefer right", () => {
    expect(reserveLabelSpace([]).rightGutter).toBe(0);
    expect(
      reserveLabelSpace([
        { width: w("Runway"), placement: "auto" },
        { width: w("Floor"), placement: "body" },
        { width: w("Today"), placement: "below" },
      ]).rightGutter,
    ).toBe(0);
  });

  it("buys no below row when zero labels prefer below", () => {
    expect(reserveLabelSpace([]).belowRows).toBe(0);
    expect(
      reserveLabelSpace([
        { width: w("Runway"), placement: "auto" },
        { width: w("Floor"), placement: "body" },
        { width: w("Cap"), placement: "right" },
      ]).belowRows,
    ).toBe(0);
  });

  it("sizes the gutter from the widest right-preferring label", () => {
    expect(
      reserveLabelSpace([
        { width: w("AB"), placement: "right" },
        { width: w("Runway"), placement: "right" },
      ]).rightGutter,
    ).toBe(w("Runway") + LABEL_GUTTER_GAP);
  });

  it("does NOT widen the gutter for an auto label", () => {
    const wide = {
      width: w("a much wider caption"),
      placement: "auto",
    } as const;
    const narrow = { width: w("AB"), placement: "right" } as const;
    expect(reserveLabelSpace([wide]).rightGutter).toBe(0);
    expect(reserveLabelSpace([wide, narrow]).rightGutter).toBe(
      NARROW + LABEL_GUTTER_GAP,
    );
  });

  it("buys one row per below-preferring label, capped at two", () => {
    const below = { width: NARROW, placement: "below" } as const;
    expect(reserveLabelSpace([below]).belowRows).toBe(1);
    expect(reserveLabelSpace([below, below]).belowRows).toBe(2);
    expect(reserveLabelSpace([below, below, below, below]).belowRows).toBe(2);
  });

  it("prices a reserved row in x-axis height", () => {
    expect(belowExtraHeight(0)).toBe(0);
    expect(belowExtraHeight(2)).toBe(2 * BELOW_ROW_HEIGHT);
  });
});

describe("placeLabels — the body rung", () => {
  it("places a lone label beside its own point, inside the plot", () => {
    const results = placeLabels([label("a")], PLOT, NO_SERIES, NO_SPACE);
    const only = byId(results, "a");
    expect(only.kind).toBe("placed");
    expect(only.kind === "placed" && only.zone).toBe("body");
    expect(only.kind === "placed" && only.anchor).toBe("start");
  });

  it("flips a label to the left of its point when the right side leaves the plot", () => {
    const hugRight = label("a", { x: PLOT.right - 2 });
    const results = placeLabels([hugRight], PLOT, NO_SERIES, NO_SPACE);
    const only = byId(results, "a");
    expect(only.kind === "placed" && only.zone).toBe("body");
    expect(only.kind === "placed" && only.anchor).toBe("end");
  });

  it("moves the second of two overlapping body labels to the next rung", () => {
    // Both sit at the plot's left edge, so the left side is off-plot too and
    // the loser has nowhere else in the body to go.
    const at = { x: 3, y: 50, endY: 50 } as const;
    const space: ReservedSpace = {
      rightGutter: NARROW + LABEL_GUTTER_GAP,
      belowRows: 0,
    };
    const results = placeLabels(
      [label("first", at), label("second", at)],
      PLOT,
      NO_SERIES,
      space,
    );
    expect(zoneOf(results, "first")).toBe("body");
    expect(zoneOf(results, "second")).toBe("right");
  });

  it("does not keep a label in the body when its box crosses a drawn series", () => {
    const space: ReservedSpace = {
      rightGutter: NARROW + LABEL_GUTTER_GAP,
      belowRows: 0,
    };
    // Control: with no series drawn, the very same label stays in the body.
    expect(zoneOf(placeLabels([label("a")], PLOT, NO_SERIES, space), "a")).toBe(
      "body",
    );
    // A rule straight through the label's row blocks both sides of the point.
    expect(
      zoneOf(placeLabels([label("a")], PLOT, [ruleAt(50)], space), "a"),
    ).toBe("right");
  });

  it("keeps a label in the body when the series clears its box", () => {
    const clear = [ruleAt(95)];
    expect(zoneOf(placeLabels([label("a")], PLOT, clear, NO_SPACE), "a")).toBe(
      "body",
    );
  });
});

describe("placeLabels — the right rung", () => {
  const space: ReservedSpace = {
    rightGutter: NARROW + LABEL_GUTTER_GAP,
    belowRows: 0,
  };

  it("gives two right-zone labels at the same y separate lanes", () => {
    const results = placeLabels(
      [
        label("a", { placement: "right", endY: 50 }),
        label("b", { placement: "right", endY: 50 }),
      ],
      PLOT,
      NO_SERIES,
      space,
    );
    const a = byId(results, "a");
    const b = byId(results, "b");
    expect(a.kind === "placed" && a.lane).toBe(1);
    expect(b.kind === "placed" && b.lane).toBe(2);
    expect(a.kind === "placed" && a.y).toBe(50);
    expect(b.kind === "placed" && b.y).toBe(
      50 + LABEL_ROW_HEIGHT + LABEL_ROW_GAP,
    );
  });

  it("keeps two right-zone labels a row apart in lane 1 when their ys clear", () => {
    const results = placeLabels(
      [
        label("a", { placement: "right", endY: 20 }),
        label("b", { placement: "right", endY: 60 }),
      ],
      PLOT,
      NO_SERIES,
      space,
    );
    const a = byId(results, "a");
    const b = byId(results, "b");
    expect(a.kind === "placed" && a.lane).toBe(1);
    expect(b.kind === "placed" && b.lane).toBe(1);
  });

  it("parks the text past the plot's right edge", () => {
    const results = placeLabels(
      [label("a", { placement: "right" })],
      PLOT,
      NO_SERIES,
      space,
    );
    const only = byId(results, "a");
    expect(only.kind === "placed" && only.x).toBe(
      PLOT.right + LABEL_GUTTER_GAP,
    );
    expect(only.kind === "placed" && only.anchor).toBe("start");
  });

  it("drops a right-preferring label the bought gutter cannot hold", () => {
    const tooWide = label("a", {
      placement: "right",
      width: w("far too wide"),
    });
    expect(zoneOf(placeLabels([tooWide], PLOT, NO_SERIES, space), "a")).toBe(
      "dropped",
    );
  });

  it("lets an auto label use a gutter another label bought", () => {
    const bought = reserveLabelSpace([
      { width: NARROW, placement: "right" },
      { width: NARROW, placement: "auto" },
    ]);
    // The auto label's body box is blocked, so the ladder must reach the
    // gutter it never paid for.
    const results = placeLabels([label("auto")], PLOT, [ruleAt(50)], bought);
    expect(zoneOf(results, "auto")).toBe("right");
  });
});

describe("placeLabels — the below rung", () => {
  const oneRow: ReservedSpace = { rightGutter: 0, belowRows: 1 };
  const twoRows: ReservedSpace = { rightGutter: 0, belowRows: 2 };

  it("sits under the x-axis tick text, centred on its own x", () => {
    const results = placeLabels(
      [label("a", { placement: "below" })],
      PLOT,
      NO_SERIES,
      oneRow,
    );
    const only = byId(results, "a");
    expect(only.kind === "placed" && only.zone).toBe("below");
    expect(only.kind === "placed" && only.y).toBe(
      PLOT.bottom + BELOW_ZONE_TOP_GAP,
    );
    expect(only.kind === "placed" && only.anchor).toBe("middle");
  });

  it("clamps a label at the plot edge into the plot's width", () => {
    const results = placeLabels(
      [
        label("left", { placement: "below", x: 1 }),
        label("right", { placement: "below", x: PLOT.right - 1 }),
      ],
      PLOT,
      NO_SERIES,
      twoRows,
    );
    const left = byId(results, "left");
    const right = byId(results, "right");
    expect(left.kind === "placed" && left.anchor).toBe("start");
    expect(right.kind === "placed" && right.anchor).toBe("end");
  });

  it("moves an overlapping below label to the second row", () => {
    const results = placeLabels(
      [
        label("a", { placement: "below", x: 50 }),
        label("b", { placement: "below", x: 52 }),
      ],
      PLOT,
      NO_SERIES,
      twoRows,
    );
    const b = byId(results, "b");
    expect(b.kind === "placed" && b.lane).toBe(2);
    expect(b.kind === "placed" && b.y).toBe(
      PLOT.bottom + BELOW_ZONE_TOP_GAP + BELOW_ROW_HEIGHT,
    );
  });

  it("drops a third overlapping label rather than let it collide", () => {
    const results = placeLabels(
      [
        label("a", { placement: "below", x: 50 }),
        label("b", { placement: "below", x: 52 }),
        label("c", { placement: "below", x: 54 }),
      ],
      PLOT,
      NO_SERIES,
      twoRows,
    );
    expect(zoneOf(results, "c")).toBe("dropped");
  });

  it("drops a below-preferring label when no row was bought", () => {
    const results = placeLabels(
      [label("a", { placement: "below" })],
      PLOT,
      NO_SERIES,
      NO_SPACE,
    );
    expect(zoneOf(results, "a")).toBe("dropped");
  });
});

describe("placeLabels — dropping is silent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("drops a label that fits nowhere and writes nothing to the console", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const results = placeLabels(
      [label("a")],
      PLOT,
      [ruleAt(50)], // blocks the body
      NO_SPACE, // no gutter and no row were bought
    );
    expect(byId(results, "a")).toEqual({ kind: "dropped", id: "a" });
    expect(warn).toHaveBeenCalledTimes(0);
    expect(error).toHaveBeenCalledTimes(0);
  });
});

describe("placeLabels — the contract", () => {
  it("returns one result per input label, in input order", () => {
    const results = placeLabels(
      [label("a", { x: 3 }), label("b", { x: 3 }), label("c", { x: 120 })],
      PLOT,
      NO_SERIES,
      NO_SPACE,
    );
    expect(results.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("places nothing when given nothing", () => {
    expect(placeLabels([], PLOT, NO_SERIES, NO_SPACE)).toEqual([]);
  });

  it("mutates no input label", () => {
    const input = label("a");
    placeLabels([input], PLOT, NO_SERIES, NO_SPACE);
    expect(input).toEqual({
      id: "a",
      width: NARROW,
      height: ROW,
      placement: "auto",
      x: 50,
      y: 50,
      endY: 50,
    });
  });

  it("is deterministic — the same inputs give the same output", () => {
    const labels = [label("a", { x: 3 }), label("b", { x: 3 })];
    const space = reserveLabelSpace([{ width: NARROW, placement: "right" }]);
    expect(placeLabels(labels, PLOT, NO_SERIES, space)).toEqual(
      placeLabels(labels, PLOT, NO_SERIES, space),
    );
  });
});
