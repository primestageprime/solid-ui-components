// ============================================
// labelPlacement — Depth 0, pure. Where every chart label sits.
//
// Two functions, called at two different times. The split is forced by the
// geometry, not by taste: the right gutter feeds the x scale and the below
// rows feed the y scale, so a gutter can never be sized from the ladder's
// own output — the ladder needs the very scales the gutter would change.
//
//   1. reserveLabelSpace(labels)  — BEFORE any scale exists. A function of the
//      label descriptors alone. It answers "how much space do I buy?".
//   2. placeLabels(...)           — AFTER the scales exist, inside the frame
//      step 1 bought. It answers "where does each label go?".
//
// The rule that breaks the circle: an EXPLICIT preference reserves space; an
// "auto" label never reserves any. An "auto" label may still USE a gutter or a
// row that another label bought. A label that reaches the bottom of the ladder
// with no room is dropped in SILENCE — nothing is logged. That is the
// specified behaviour, not an oversight.
//
// The ladder, walked from the label's preferred rung downward:
//   body  — beside its own line, inside the plot. It fits only when its box
//           touches no placed box AND no drawn series. A caption that crosses
//           a polyline is unreadable even though no text collides.
//   right — past plotRight, at the series' final y. Colliding labels stack
//           into lanes, one text row apart.
//   below — under the x-axis tick labels, centred on its x and clamped into
//           the plot. Colliding labels take a second row.
//
// No DOM, no SolidJS, no measurement: the caller measures its own text with
// `measureLabelWidth` from ScrubChart/helpers and hands the width in. Same
// inputs → same output. Tested with identity scales, like deviationBand.ts.
//
// `laneOf` from internal/geometry/labelLayout is the seam that serves both the
// right zone and the below zone. They are two CALLS with different packings,
// not two algorithms. `laneOf` shares its outermost lane past the cap, which
// permits an overlap this spec forbids, so each rung filters the survivors and
// sends the rest down the ladder.
// ============================================
import { map, some } from "../../fn";
import {
  boxInsidePlot,
  boxesTouch,
  crossesAnySeries,
  type Box,
  type PlotRect,
  type Polyline,
} from "./labelBoxes";
import type { CashflowLabelZone } from "./types";
import {
  anchoredSpan,
  fitAnchor,
  laneOf,
  type LabelAnchor,
  type LaneBox,
} from "../../internal/geometry/labelLayout";

// `CashflowLabelZone` is PUBLIC API, so it is declared in `types.ts` with the
// rest of the prop vocabulary and re-exported here for the callers that only
// import the ladder.
export type { CashflowLabelZone } from "./types";

/** The zone a label actually got. "auto" is a preference and never an answer. */
export type ResolvedLabelZone = "body" | "right" | "below";

// ── Constants ───────────────────────────────────────────────────────────────

/** Clear space between the plot's right edge and the gutter text. */
export const LABEL_GUTTER_GAP = 6;
/** Height of one label text row. */
export const LABEL_ROW_HEIGHT = 11;
/** Clear space demanded between two labels sharing a lane or a row. */
export const LABEL_ROW_GAP = 2;
/** Clear space between a point and the caption beside it, in the body zone. */
export const BODY_LABEL_GAP = 6;
/** Height added to the x-axis per reserved below row. */
export const BELOW_ROW_HEIGHT = 12;
/** Below rows never exceed this, however many labels ask for one. */
export const MAX_BELOW_ROWS = 2;
/** Lane cap in the right gutter. */
export const RIGHT_MAX_LANES = 4;
/** Drop from the plot's bottom edge to the first below row, clearing the tick
 *  text that ScrubChartAxes hangs at `plotBottom + 6`. */
export const BELOW_ZONE_TOP_GAP = 18;

// ── Inputs ──────────────────────────────────────────────────────────────────

/**
 * All `reserveLabelSpace` gets: a measured width and a stated preference. No
 * x, no y, no scale — none of them exist yet when this runs.
 */
export interface LabelReservation {
  /** Measured text width in px, from `measureLabelWidth`. */
  readonly width: number;
  /** The caller's stated zone. "auto" reserves nothing. */
  readonly placement: CashflowLabelZone;
}

/** The space the frame must buy before it builds its scales. */
export interface ReservedSpace {
  /** Width past the plot's right edge. Zero when nothing prefers "right". */
  readonly rightGutter: number;
  /** Rows under the x-axis text. Zero when nothing prefers "below". */
  readonly belowRows: number;
}

// The pixel vocabulary lives in labelBoxes.ts, next to the maths that reads
// it. Re-exported here so a caller needs one import, not two.
export type { LabelPoint, Polyline, PlotRect } from "./labelBoxes";

/** One label, with enough geometry to place it. */
export interface LabelCandidate {
  /** Stable identity. The result carries it back. */
  readonly id: string;
  /** Measured text width in px. */
  readonly width: number;
  /** Text row height in px. */
  readonly height: number;
  /** The caller's stated zone. */
  readonly placement: CashflowLabelZone;
  /** Pixel x of the point this label names. */
  readonly x: number;
  /** Pixel y of the point this label names. */
  readonly y: number;
  /** Pixel y at the series' last point — where the right zone parks the text.
   *  A label with no series of its own passes its own `y`. */
  readonly endY: number;
}

// ── Output ──────────────────────────────────────────────────────────────────

/** A label the ladder found room for. */
export interface PlacedLabel {
  readonly kind: "placed";
  readonly id: string;
  /** The rung that took it. */
  readonly zone: ResolvedLabelZone;
  /** Pixel x to draw the text at, paired with `anchor`. */
  readonly x: number;
  /** Pixel y of the text baseline row's centre. */
  readonly y: number;
  /** SVG `text-anchor` that keeps the text where `x` says it is. */
  readonly anchor: LabelAnchor;
  /** 1-based lane or row within the zone. Body is always 1. */
  readonly lane: number;
}

/** A label the ladder found no room for. Nothing is logged. */
export interface DroppedLabel {
  readonly kind: "dropped";
  readonly id: string;
}

/** One result per input label, in input order. */
export type LabelPlacementResult = PlacedLabel | DroppedLabel;

// ── reserveLabelSpace ───────────────────────────────────────────────────────

/** The widest explicit "right" label, or 0 when none asks. */
const widestRightLabel = (labels: readonly LabelReservation[]): number => {
  let widest = 0;
  for (const label of labels) {
    if (label.placement === "right" && label.width > widest)
      widest = label.width;
  }
  return widest;
};

/** How many labels state an explicit "below" preference. */
const belowRequestCount = (labels: readonly LabelReservation[]): number => {
  let count = 0;
  for (const label of labels) {
    if (label.placement === "below") count += 1;
  }
  return count;
};

/**
 * Decide the space to buy, from the label descriptors ALONE. This runs before
 * any geometry exists, so it can read nothing but the width and the stated
 * preference.
 *
 * Only an EXPLICIT preference buys space. An "auto" label reserves nothing —
 * it later uses whatever another label bought, or it drops. That is what keeps
 * a chart with no labels, or with only "auto" labels, pixel-identical to the
 * chart before this feature existed.
 *
 * @param labels One descriptor per label the chart will draw.
 * @returns The right gutter width and the below row count.
 */
export const reserveLabelSpace = (
  labels: readonly LabelReservation[],
): ReservedSpace => {
  const widest = widestRightLabel(labels);
  return {
    rightGutter: widest === 0 ? 0 : widest + LABEL_GUTTER_GAP,
    belowRows: Math.min(belowRequestCount(labels), MAX_BELOW_ROWS),
  };
};

/** The extra x-axis height that `belowRows` costs — feeds `xAxisExtraHeight`. */
export const belowExtraHeight = (rows: number): number =>
  rows * BELOW_ROW_HEIGHT;

// ── The ladder ──────────────────────────────────────────────────────────────

/** What one rung hands on: what it placed, and what falls to the next rung. */
interface RungResult {
  readonly placed: readonly PlacedLabel[];
  readonly deferred: readonly LabelCandidate[];
}

/** A label enters the ladder at its preferred rung and never climbs back up. */
const startsAt = (zone: CashflowLabelZone, rung: ResolvedLabelZone): boolean =>
  zone === "auto" || zone === "body"
    ? true
    : zone === "right"
      ? rung !== "body"
      : rung === "below";

/** The body box on the chosen side of the point. */
const bodyBox = (label: LabelCandidate, side: "left" | "right"): Box => {
  const half = label.height / 2;
  const [x0, x1] =
    side === "right"
      ? [label.x + BODY_LABEL_GAP, label.x + BODY_LABEL_GAP + label.width]
      : [label.x - BODY_LABEL_GAP - label.width, label.x - BODY_LABEL_GAP];
  return { x0, x1, y0: label.y - half, y1: label.y + half };
};

const bodyFits = (
  box: Box,
  plot: PlotRect,
  polylines: readonly Polyline[],
  taken: readonly Box[],
): boolean =>
  boxInsidePlot(box, plot) &&
  !crossesAnySeries(box, polylines) &&
  !some((other: Box) => boxesTouch(box, other, LABEL_ROW_GAP), taken);

/**
 * Rung 1 — beside its own line, inside the plot. The loop carries the boxes
 * already taken, because each label's verdict depends on every earlier one.
 */
const runBodyRung = (
  labels: readonly LabelCandidate[],
  plot: PlotRect,
  polylines: readonly Polyline[],
): RungResult => {
  const placed: PlacedLabel[] = [];
  const deferred: LabelCandidate[] = [];
  const taken: Box[] = [];
  for (const label of labels) {
    if (!startsAt(label.placement, "body")) {
      deferred.push(label);
      continue;
    }
    const right = bodyBox(label, "right");
    const left = bodyBox(label, "left");
    const side = bodyFits(right, plot, polylines, taken)
      ? "right"
      : bodyFits(left, plot, polylines, taken)
        ? "left"
        : null;
    if (side === null) {
      deferred.push(label);
      continue;
    }
    const box = side === "right" ? right : left;
    taken.push(box);
    placed.push({
      kind: "placed",
      id: label.id,
      zone: "body",
      x: side === "right" ? label.x + BODY_LABEL_GAP : label.x - BODY_LABEL_GAP,
      y: label.y,
      anchor: side === "right" ? "start" : "end",
      lane: 1,
    });
  }
  return { placed, deferred };
};

/** What the lane pass is handed: a span, plus the candidate it came from. */
type LaneInput = LaneBox & { readonly label: LabelCandidate };

/** A row `laneOf` placed, plus the candidate it came from. */
type LanedRow = LaneInput & { readonly lane: number };

/**
 * `laneOf` shares its outermost lane past the cap, so the survivors are the
 * rows that clear every earlier row in the SAME lane by `gutter`. The rest
 * fall down the ladder rather than overlapping.
 */
const splitLaneOverflow = (
  rows: readonly LanedRow[],
  gutter: number,
): {
  readonly kept: readonly LanedRow[];
  readonly spilled: readonly LabelCandidate[];
} => {
  const lastEnd: number[] = [];
  const kept: LanedRow[] = [];
  const spilled: LabelCandidate[] = [];
  for (const row of rows) {
    const end = lastEnd[row.lane];
    if (end !== undefined && row.span[0] < end + gutter) {
      spilled.push(row.label);
      continue;
    }
    lastEnd[row.lane] = row.span[1];
    kept.push(row);
  }
  return { kept, spilled };
};

/**
 * Rung 2 — past `plotRight`, at the series' final y. The lane axis here is Y,
 * not X: two labels at the same y collide, and lane 2 sits one text row below.
 * Stacking sideways instead would need a gutter twice as wide as the one
 * `reserveLabelSpace` bought.
 */
const runRightRung = (
  labels: readonly LabelCandidate[],
  plot: PlotRect,
  space: ReservedSpace,
): RungResult => {
  const eligible: LabelCandidate[] = [];
  const deferred: LabelCandidate[] = [];
  for (const label of labels) {
    const fits =
      startsAt(label.placement, "right") &&
      label.width + LABEL_GUTTER_GAP <= space.rightGutter;
    (fits ? eligible : deferred).push(label);
  }
  const rows: LaneInput[] = map(
    (label: LabelCandidate) => ({
      label,
      x: label.endY,
      span: [
        label.endY - label.height / 2,
        label.endY + label.height / 2,
      ] as const,
      lane: 1,
    }),
    eligible,
  );
  const laned = laneOf(rows, {
    maxLanes: RIGHT_MAX_LANES,
    gutter: LABEL_ROW_GAP,
  });
  const { kept, spilled } = splitLaneOverflow(laned, LABEL_ROW_GAP);
  const placed: PlacedLabel[] = [];
  for (const row of kept) {
    const y =
      row.label.endY + (row.lane - 1) * (LABEL_ROW_HEIGHT + LABEL_ROW_GAP);
    if (
      y - row.label.height / 2 < plot.top ||
      y + row.label.height / 2 > plot.bottom
    ) {
      deferred.push(row.label);
      continue;
    }
    placed.push({
      kind: "placed",
      id: row.label.id,
      zone: "right",
      x: plot.right + LABEL_GUTTER_GAP,
      y,
      anchor: "start",
      lane: row.lane,
    });
  }
  return { placed, deferred: [...deferred, ...spilled] };
};

/**
 * Rung 3 — under the x-axis tick text, centred on the label's own x and
 * clamped into the plot by `fitAnchor`. The lane axis here is X, and the lane
 * cap is the number of rows `reserveLabelSpace` bought. Zero rows bought means
 * no label reaches this rung, which is how an "auto"-only chart stays silent.
 */
const runBelowRung = (
  labels: readonly LabelCandidate[],
  plot: PlotRect,
  space: ReservedSpace,
): RungResult => {
  if (space.belowRows === 0) return { placed: [], deferred: labels };
  const eligible: LabelCandidate[] = [];
  const deferred: LabelCandidate[] = [];
  for (const label of labels) {
    (startsAt(label.placement, "below") ? eligible : deferred).push(label);
  }
  const rows: LaneInput[] = map(
    (label: LabelCandidate) => ({
      label,
      x: label.x,
      span: anchoredSpan(
        label.x,
        label.width,
        fitAnchor(label.x, label.width, plot.left, plot.right),
      ),
    }),
    eligible,
  );
  const laned = laneOf(rows, {
    maxLanes: space.belowRows,
    gutter: LABEL_ROW_GAP,
  });
  const { kept, spilled } = splitLaneOverflow(laned, LABEL_ROW_GAP);
  const placed: PlacedLabel[] = map(
    (row: LanedRow) => ({
      kind: "placed" as const,
      id: row.label.id,
      zone: "below" as const,
      x: row.label.x,
      y: plot.bottom + BELOW_ZONE_TOP_GAP + (row.lane - 1) * BELOW_ROW_HEIGHT,
      anchor: fitAnchor(row.label.x, row.label.width, plot.left, plot.right),
      lane: row.lane,
    }),
    kept,
  );
  return { placed, deferred: [...deferred, ...spilled] };
};

// ── placeLabels ─────────────────────────────────────────────────────────────

/**
 * Walk every label down the ladder and report where each one landed.
 *
 * This runs AFTER the scales exist, inside the frame `reserveLabelSpace`
 * bought. `space` is that same reservation: it gates the right and below
 * rungs, which is the whole mechanism by which an "auto" label uses a gutter
 * another label paid for but never creates one itself.
 *
 * A label that clears every rung is dropped. Nothing is written to the
 * console — silence is specified.
 *
 * @param labels    One candidate per label, with its measured box.
 * @param plot      The plot rectangle in pixel space.
 * @param polylines Every drawn series, as pixel polylines. A body label may
 *                  not cross one.
 * @param space     The reservation from `reserveLabelSpace`.
 * @returns One result per input label, in input order.
 */
export const placeLabels = (
  labels: readonly LabelCandidate[],
  plot: PlotRect,
  polylines: readonly Polyline[],
  space: ReservedSpace,
): readonly LabelPlacementResult[] => {
  const body = runBodyRung(labels, plot, polylines);
  const right = runRightRung(body.deferred, plot, space);
  const below = runBelowRung(right.deferred, plot, space);
  const byId = new Map(
    map(
      (p: PlacedLabel) => [p.id, p] as const,
      [...body.placed, ...right.placed, ...below.placed],
    ),
  );
  return map(
    (label: LabelCandidate) =>
      byId.get(label.id) ?? { kind: "dropped" as const, id: label.id },
    labels,
  );
};
