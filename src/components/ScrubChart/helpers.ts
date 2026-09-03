// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChart — pure helpers + module constants (no Solid reactivity).
//
// Everything the component needs that is a plain function of its inputs lives
// here, so ScrubChart.tsx can stay focused on reactive wiring + markup:
//
//   • DEFAULT_* / DEFAULT_X_MAX_TICKS  — the fallback sizing + tick numbers a
//     prop defaults to when the consumer leaves it unset.
//   • Y_LABEL_GAP / Y_LABEL_FONT       — y-axis label-column measurement knobs.
//   • Y_LABEL_HALF_HEIGHT              — half a tick label's line box.
//   • X_LABEL_* / Y_FIT_*              — origin-corner geometry: where the x
//     tick labels centre, and how big the y-fit button is and where it hangs.
//   • yLabelFloor(...)                 — the lowest y a tick label may reach.
//   • clampLabelBaseline(y, floor)     — hold a centred tick label between the
//     frame's top edge and that floor, so nothing clips it and nothing
//     covers it.
//   • measureLabelWidth(text)          — canvas text measurement, memoising a
//     single offscreen 2D context and degrading to a per-char estimate when
//     canvas is unavailable (SSR / jsdom). The ONLY impure edge here: it reads
//     `document` and lazily caches the context in a module-local. Output is a
//     deterministic width for a given environment.
//   • defaultFormatY / defaultFormatX  — the built-in tick-label formatters.
//   • matchesCadence(date, cadence)    — does a cell's UTC start anchor a tick
//     at the given cadence (Monday / 1st / quarter-start / Jan 1)?
//   • CADENCE_LADDER                   — the week→year escalation order the
//     `"auto"` cadence walks until candidate count fits under the tick cap.
//
// Extracted verbatim from ScrubChart.tsx — no behaviour change.
// ============================================

import { formatGroupedNumber } from "../../internal/format/number";
import { clamp } from "../../internal/math/clamp";
import type { Cell } from "../DateAxis";
import type { ResolvedXTickCadence } from "./types";

export const DEFAULT_CHART_WIDTH = 1200;
export const DEFAULT_CHART_HEIGHT = 200;
export const DEFAULT_CELL_WIDTH = 40;
export const DEFAULT_X_AXIS_HEIGHT = 22;
export const DEFAULT_Y_TICK_COUNT = 5;
export const DEFAULT_X_MAX_TICKS = 12;
export const Y_LABEL_GAP = 8; // px between the longest label and the axis line
export const Y_LABEL_FONT = "10px system-ui, -apple-system, sans-serif";
// Half the height of a tick label's line box, in px. A y-tick label is
// CENTRED on its gridline (`dominant-baseline: central`), so this number is
// the distance from the gridline down to the label's bottom edge and up to
// its top edge. Keep it in step with the `font-size` of
// `.sui-scrub-chart__label` in ScrubChart.css.
export const Y_LABEL_HALF_HEIGHT = 6;

// ── Origin-corner geometry ───────────────────────────────────────────────
// The x tick labels and the y-fit button share the corner below
// `plotBottom`. These numbers place both, so one edit moves them together.

/** Pixel gap from `plotBottom` down to an x tick label's `y`. Keep it in step
 *  with <ScrubChartAxes>, which draws the label at that y. */
export const X_LABEL_BASELINE_GAP = 6;

/** Pixel drop from an x tick label's top edge to its `hanging` baseline. A
 *  hanging baseline hangs from the ASCENDER, not from the top of the line
 *  box, so the box starts this far above the `y` the label draws at. Measured
 *  at the 10px `font-size` of `.sui-scrub-chart__label`. */
export const X_LABEL_HANGING_RISE = 2;

/** Pixel drop from `plotBottom` to the CENTRE line of the x tick labels. */
export const X_LABEL_CENTRE_OFFSET =
  X_LABEL_BASELINE_GAP - X_LABEL_HANGING_RISE + Y_LABEL_HALF_HEIGHT;

/** Size of the y-fit button's HIT TARGET, in px. The button is square. Keep
 *  it in step with `.sui-scrub-chart__y-fit-btn` in ScrubChart.css. The
 *  border the button draws on hover is smaller than this: a pseudo-element
 *  carries it, so the target stays this size. */
export const Y_FIT_BUTTON_SIZE = 26;

/** How far the hover border sits inside the hit target, on each side, in px.
 *  Keep it in step with the `inset` of `.sui-scrub-chart__y-fit-btn::after`
 *  in ScrubChart.css. The border therefore measures `Y_FIT_BUTTON_SIZE - 2 *
 *  Y_FIT_HOVER_INSET` and hugs the glyph. */
export const Y_FIT_HOVER_INSET = 3;

/** Gap between the y-fit button and the frame edge, in px. Keep it in step
 *  with the insets of `.sui-scrub-chart__y-fit` in ScrubChart.css. */
export const Y_FIT_INSET = 2;

/**
 * Pixel drop from `plotBottom` to the y-fit button's TOP edge.
 *
 * The button centres on the x tick labels, so its top edge sits half a
 * diameter above their centre line. The number is NEGATIVE: the button is
 * taller than twice that drop, so it starts ABOVE `plotBottom` and reaches
 * into the y-axis label column. `yLabelFloor` hands it that room.
 */
export const Y_FIT_LEVEL_OFFSET = X_LABEL_CENTRE_OFFSET - Y_FIT_BUTTON_SIZE / 2;

/**
 * The room the y-fit control asks of the axis chrome, in px.
 *
 * ScrubChart applies the number twice. The DEFAULT y-axis column grows to it,
 * where it is exact: the button plus the one inset on the frame's left edge.
 * The x-axis row grows to it as well. The row needs less, because the level
 * shift lifts the button — it reaches `Y_FIT_BUTTON_SIZE +
 * Y_FIT_LEVEL_OFFSET + Y_FIT_INSET` below `plotBottom` — so this one number
 * covers both bounds and leaves the row a little room to spare. An explicit
 * `yAxisWidth` still wins as given.
 */
export const Y_FIT_FOOTPRINT = Y_FIT_BUTTON_SIZE + Y_FIT_INSET;

/** Extra width the y-axis column takes for the y-fit control, in px.
 *
 * The button hangs on the frame's left edge, and the frame CLIPS overflow, so
 * the button cannot move left of that edge. The column moves instead: this
 * gutter widens it, which pushes `plotLeft` and every y tick label right by
 * the same amount. The button then reads as far left of the labels, and it
 * stays whole. */
export const Y_FIT_GUTTER = 10;

/**
 * The width the y-fit control asks of the DEFAULT y-axis column, in px.
 *
 * It is the footprint plus the gutter. The column takes the gutter and the
 * x-axis ROW does not: the gutter moves the button sideways, so adding it to
 * the row would only cost the plot height. An explicit `yAxisWidth` still
 * wins as given.
 */
export const Y_FIT_COLUMN = Y_FIT_FOOTPRINT + Y_FIT_GUTTER;

/**
 * The lowest pixel y a y-tick label's box may reach.
 *
 * Without the y-fit control the bound is the FRAME, not the plot: a label
 * beside the x-axis row uses the room that row gives it. With the control the
 * origin corner belongs to the button, so the bound rises to the button's top
 * edge. Only the LOWEST tick reaches this floor — it sits on `plotBottom`,
 * and a label centred there straddles the edge and loses its lower half
 * behind the button. One floor for every label therefore moves that one label
 * and no other.
 *
 * @param frameHeight The chart frame's height in px.
 * @param plotBottom The plot region's bottom edge in px.
 * @param yFitCorner Does the y-fit control hold the origin corner?
 * @returns The pixel y a label's box may reach down to.
 */
export const yLabelFloor = (
  frameHeight: number,
  plotBottom: number,
  yFitCorner: boolean,
): number => (yFitCorner ? plotBottom + Y_FIT_LEVEL_OFFSET : frameHeight);

/**
 * The baseline y a tick label draws at, held between the frame's top edge and
 * `labelFloor`.
 *
 * A y-tick label is centred on its gridline. `nice()`, and a fitted domain,
 * both put a tick EXACTLY on the domain end, so the gridline lands on
 * `plotTop` or on `plotBottom`. The label's outer half then falls outside the
 * band it may use — the reader sees the lower half of "8,000" at the top
 * edge, or the y-fit button over the "0" at the bottom. This function moves
 * such a label in by the missing half, and leaves every other label where it
 * is. The GRIDLINE and the tick stub keep `tick.y`; only the text moves.
 *
 * The TWO bounds never fight. The top bound pushes a label down to
 * `Y_LABEL_HALF_HEIGHT`, and the floor pulls one up to `labelFloor -
 * Y_LABEL_HALF_HEIGHT`. They cross only when the floor drops under one whole
 * label height, and the function then centres the label in the band it has.
 *
 * @param y The pixel y of the tick the label names.
 * @param labelFloor The lowest y the label's box may reach — see
 *   `yLabelFloor`.
 * @returns The pixel y to draw the label at.
 */
export const clampLabelBaseline = (y: number, labelFloor: number): number =>
  labelFloor <= Y_LABEL_HALF_HEIGHT * 2
    ? labelFloor / 2
    : clamp(y, Y_LABEL_HALF_HEIGHT, labelFloor - Y_LABEL_HALF_HEIGHT);

// Reuse a single offscreen 2D context for label-width measurement. Falls
// back to a per-character estimate when canvas is unavailable (SSR / test
// stubs).
let _measureCtx: CanvasRenderingContext2D | null | undefined;
export const measureLabelWidth = (text: string): number => {
  if (_measureCtx === undefined) {
    _measureCtx = null;
    if (typeof document !== "undefined") {
      try {
        const c = document.createElement("canvas");
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.font = Y_LABEL_FONT;
          _measureCtx = ctx;
        }
      } catch {
        // jsdom etc. — canvas unavailable; fall through to the estimate.
      }
    }
  }
  if (_measureCtx) {
    const w = _measureCtx.measureText(text).width;
    if (w > 0) return w;
  }
  return text.length * 6.5; // sans-serif-ish digit estimate
};

export const defaultFormatY = (v: number): string => formatGroupedNumber(v);

// Per-cadence default labels chosen to stay short enough to fit on a
// ~60-100px tick column without clipping.
export const defaultFormatX = <C extends Cell>(
  c: C,
  cadence: ResolvedXTickCadence,
): string => {
  const start = c.start;
  const yearStr = String(start.getUTCFullYear());
  const yyShort = yearStr.slice(-2);
  if (cadence === "year") return String(start.getUTCFullYear());
  if (cadence === "quarter") {
    const q = Math.floor(start.getUTCMonth() / 3) + 1;
    return `Q${q} '${yyShort}`;
  }
  if (cadence === "month") {
    const mon = start.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    // January gets the year so the reader can pin down which year we're in
    // when the axis spans multiple years.
    return start.getUTCMonth() === 0 ? `${mon} '${yyShort}` : mon;
  }
  // week
  return start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

export const matchesCadence = (
  d: Date,
  cadence: ResolvedXTickCadence,
): boolean => {
  if (cadence === "week") return d.getUTCDay() === 1; // Monday
  const dom1 = d.getUTCDate() === 1;
  if (cadence === "month") return dom1;
  if (cadence === "quarter") return dom1 && d.getUTCMonth() % 3 === 0;
  return dom1 && d.getUTCMonth() === 0; // year
};

export const CADENCE_LADDER: ResolvedXTickCadence[] = [
  "week",
  "month",
  "quarter",
  "year",
];
