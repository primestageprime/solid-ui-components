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

export const defaultFormatY = (v: number): string =>
  v.toLocaleString("en-US", { maximumFractionDigits: 0 });

// Per-cadence default labels chosen to stay short enough to fit on a
// ~60-100px tick column without clipping.
export const defaultFormatX = <C extends Cell>(
  c: C,
  cadence: ResolvedXTickCadence,
): string => {
  const start = c.start;
  const yyShort = String(start.getUTCFullYear()).slice(-2);
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
