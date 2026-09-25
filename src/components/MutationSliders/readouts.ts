// ============================================
// MutationSliders readouts — pure, headless, no Solid, no DOM.
//
// Which FIGURES one dial prints, and where, in each readout mode. The column
// (dial.tsx) places four strings; this file decides them, so every mode prints
// as a table (readouts.test.ts) without a browser.
//
//   • `stacked` — the original, unchanged: the future amount under the dial,
//     `was <prior>` muted beneath it, and the signed delta beside the change
//     line.
//   • `beside`  — Peter's payroll board, 2026-09-24: the OLD amount beside the
//     prior arrowhead, the new amount under the dial, and the difference as a
//     raw amount AND a percentage RIGHT of the bar, on two lines — `+$5K` over
//     `(4%)` (option B). Equal arrows print the amount once and nothing else.
//     Both side labels run past the canvas into the gap between dials, so the
//     row takes the 24px gutter in this mode (rows.ts, GUTTER_GAP).
// ============================================
import {
  type DialGeometry,
  MINUS,
  deltaLabelOf,
} from "../MarkedSlider/geometry";
import type { ResolvedLabels } from "./labels";

/** Where a dial prints its figures. See the file header. */
export type ReadoutMode = "stacked" | "beside";

/** The removed entity's readout: there is no future amount to print. */
export const NO_VALUE = "—";

/** Every figure one dial prints, already formatted. */
export interface DialReadouts {
  /** The line under the dial: the future amount. */
  readonly value: string;
  /** The muted line beneath it, or `""` when there is nothing to say. */
  readonly meta: string;
  /** The figure beside the prior arrowhead, or `null`. */
  readonly priorLabel: string | null;
  /** The figure beside the change line, or `null`. */
  readonly deltaLabel: string | null;
}

/**
 * The change as a raw amount and a share of where it started: `+$5K (4%)`.
 *
 * `null` when there is no change to name — no prior, no future, or no move.
 * The percentage is of the OLD amount, rounded to a whole percent; a real
 * change too small to round to 1% says `<1%` rather than a `0%` that reads as
 * no change at all. With a prior of zero there is no share to take, so the
 * raw amount stands alone.
 */
export const diffLabelOf = (
  format: (value: number) => string,
  old: number | null,
  value: number | null,
): string | null => {
  if (old === null || value === null || old === value) return null;
  const delta = value - old;
  const raw = `${delta > 0 ? "+" : MINUS}${format(Math.abs(delta))}`;
  if (old === 0) return raw;
  const percent = Math.round((Math.abs(delta) / Math.abs(old)) * 100);
  return `${raw} (${percent === 0 ? "<1" : percent}%)`;
};

/** The original readouts, exactly as dial.tsx printed them before the modes. */
const stacked = (
  dial: DialGeometry,
  format: (value: number) => string,
  labels: ResolvedLabels,
): DialReadouts => {
  const value = dial.clampedValue === null ? NO_VALUE : format(dial.clampedValue);
  const meta = dial.isNew
    ? labels.new
    : dial.clampedOld === null || dial.clampedOld === dial.clampedValue
      ? ""
      : `was ${format(dial.clampedOld)}`;
  return {
    value,
    meta,
    priorLabel: null,
    deltaLabel: deltaLabelOf(format, dial.delta),
  };
};

/**
 * The beside-mode change figure on TWO lines, for the right of the bar:
 * `+$5K` over `(4%)` (Peter's option B, 2026-09-24). One line when there is
 * no share to take (a prior of zero); `null` when there is no change.
 */
export const diffLinesOf = (
  format: (value: number) => string,
  old: number | null,
  value: number | null,
): string | null => {
  const label = diffLabelOf(format, old, value);
  return label === null ? null : label.replace(" (", "\n(");
};

/** Peter's payroll-board readouts. See the file header. */
const beside = (
  dial: DialGeometry,
  format: (value: number) => string,
  labels: ResolvedLabels,
): DialReadouts => {
  const diverged =
    dial.clampedOld !== null && dial.clampedOld !== dial.clampedValue;
  return {
    value: dial.clampedValue === null ? NO_VALUE : format(dial.clampedValue),
    meta: dial.isNew ? labels.new : "",
    priorLabel:
      diverged && dial.clampedOld !== null ? format(dial.clampedOld) : null,
    deltaLabel: diffLinesOf(format, dial.clampedOld, dial.clampedValue),
  };
};

/** Every figure one dial prints, in the given mode. */
export const readoutsOf = (
  mode: ReadoutMode,
  dial: DialGeometry,
  format: (value: number) => string,
  labels: ResolvedLabels,
): DialReadouts =>
  mode === "beside"
    ? beside(dial, format, labels)
    : stacked(dial, format, labels);
