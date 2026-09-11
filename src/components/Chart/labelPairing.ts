// ============================================
// labelPairing — Depth 0, pure. Pairs a placement with the text to draw.
//
// Split out of labelPlacement.ts by concern, and to hold that module under
// the 500-line guidance — the same reason labelBoxes.ts and gutterPacking.ts
// stand apart from the ladder.
//
// `placeLabels` (labelPlacement.ts) answers WHERE. A caller that wants to
// DRAW the result still needs the label's own TEXT back, and needs the
// dropped labels gone. Both adapters (`Chart`'s Labels slot and
// `ScrubChart`'s `ScrubChartLabels`) do this same pairing before they paint,
// so it lives here rather than being written twice — this is still
// geometry-and-text, not JSX, so it stays in a core module per the ADR.
// ============================================
import { filter, map } from "../../fn";
import type {
  LabelCandidate,
  LabelPlacementResult,
  PlacedLabel,
} from "./labelPlacement";

/** One label candidate, with the text an adapter draws once it is placed. */
export interface ChartLabel extends LabelCandidate {
  readonly text: string;
}

/** A label the ladder placed, paired back with the text and box to draw. */
export interface DrawnLabel {
  readonly placed: PlacedLabel;
  readonly text: string;
  /** Measured text width in px — an adapter's hit box spans it. */
  readonly width: number;
  /** Text row height in px — an adapter's hit box spans it. */
  readonly height: number;
}

/**
 * Pair each result with its candidate and drop the ones the ladder refused.
 *
 * A dropped label draws nothing. Silence is the specified behaviour of
 * `placeLabels`: a caller cannot see the container width or the theme's
 * font, so a drop is the ladder doing its job, not a fault to report.
 *
 * @param labels  The candidates `placeLabels` was called with, same order.
 * @param results `placeLabels`'s result, one per candidate, same order.
 */
export const drawnLabels = (
  labels: readonly ChartLabel[],
  results: readonly LabelPlacementResult[],
): readonly DrawnLabel[] =>
  filter(
    (d): d is DrawnLabel => d !== null,
    map(
      (result: LabelPlacementResult, i: number) =>
        result.kind === "placed"
          ? {
              placed: result,
              text: labels[i].text,
              width: labels[i].width,
              height: labels[i].height,
            }
          : null,
      results,
    ),
  );
