// ============================================
// targetBarGeometry — pure geometry for TargetBarChart (ADR 0010: the maths is
// a plain function that prints as a table, so it is tested without a DOM).
//
// Per period, N series sit side by side. Each series' bar is a STACK of marks
// inside a hollow PROJECTION outline (Peter, 2026-10-07/08):
//
//   outline      projected
//   solid        invoiced
//   translucent  Confirmed, not yet invoiced
//   lighter      Planned
//   red X-hatch  missing (a past period's shortfall against the projection)
//   hatched      above the projection
//
// The stack is drawn bottom-up in exactly that order (`STACK_ORDER`), so the
// hatched excess always sits on top of the outline's lid.
// ============================================
import { filter, flatMap, map } from "../../fn";

/** One series' bar in one period. Every mark is a non-negative amount. */
export interface TargetBar {
  /** The period's x position (a month index, say). */
  readonly period: number;
  /** The projection: the outline's height. */
  readonly projected: number;
  /** Confirmed and invoiced — solid. */
  readonly invoiced: number;
  /** Confirmed, not yet invoiced — translucent. */
  readonly confirmed: number;
  /** Planned — lighter. */
  readonly planned: number;
  /** A past period's shortfall against the projection — red cross-hatch. */
  readonly missing: number;
  /** Booked beyond the projection — hatched, above the outline. */
  readonly above: number;
}

/** One series (a job type, say): its name and its bar per period. */
export interface TargetBarSeries {
  readonly id: string;
  readonly label: string;
  readonly bars: readonly TargetBar[];
  /** Keyboard step for the projection grip, in value units. */
  readonly step: number;
}

export type TargetBarMark =
  | "invoiced"
  | "confirmed"
  | "planned"
  | "missing"
  | "above";

/** Bottom-up stacking order of the marks. */
export const STACK_ORDER: readonly TargetBarMark[] = [
  "invoiced",
  "confirmed",
  "planned",
  "missing",
  "above",
];

/** One period's slot per series, in data units; the bar fills BAND of it. */
export const TARGET_BAR_STEP = 0.3;
export const TARGET_BAR_BAND = 0.86;
/** Half a bar's width, in data units. */
export const TARGET_BAR_HALF = (TARGET_BAR_STEP * TARGET_BAR_BAND) / 2;

/** Centre the group inside its period: 3 series at −1/0/+1 slots, 1 at 0. */
export const slotOffset = (i: number, n: number): number =>
  (i - (n - 1) / 2) * TARGET_BAR_STEP;

/** The stack's segments, bottom-up. Zero-valued marks stay (stable keys). */
export const stackOf = (
  bar: TargetBar,
): readonly { readonly mark: TargetBarMark; readonly value: number }[] =>
  map((mark: TargetBarMark) => ({ mark, value: bar[mark] }), STACK_ORDER);

/** The stack's total height. */
export const stackTotal = (bar: TargetBar): number =>
  bar.invoiced + bar.confirmed + bar.planned + bar.missing + bar.above;

export interface OutlinePoint {
  readonly x: number;
  readonly y: number;
}

const BREAK: OutlinePoint = { x: Number.NaN, y: Number.NaN };

/**
 * The projection as a HOLLOW OUTLINE: left side, lid, right side of each box,
 * NaN between boxes (a line series breaks there). A zero projection draws
 * nothing — there is no outline to hold.
 */
export const outlineOf = (
  bars: readonly TargetBar[],
  offset: number,
): readonly OutlinePoint[] =>
  flatMap(
    (b: TargetBar): OutlinePoint[] =>
      b.projected <= 0
        ? []
        : [
            { x: b.period + offset - TARGET_BAR_HALF, y: 0 },
            { x: b.period + offset - TARGET_BAR_HALF, y: b.projected },
            { x: b.period + offset + TARGET_BAR_HALF, y: b.projected },
            { x: b.period + offset + TARGET_BAR_HALF, y: 0 },
            BREAK,
          ],
    bars,
  );

/** The tallest thing drawn: a projection lid or a stack top. */
export const tallestOf = (series: readonly TargetBarSeries[]): number =>
  Math.max(
    0,
    ...flatMap(
      (s: TargetBarSeries) =>
        map((b: TargetBar) => Math.max(b.projected, stackTotal(b)), s.bars),
      series,
    ),
  );

/** 1, 2, 2.5 or 5 times a power of ten: the smallest such step ≥ `raw`. */
const niceStep = (raw: number): number => {
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit =
    filter((m: number) => m * power >= raw, [1, 2, 2.5, 5, 10])[0] ?? 10;
  return unit * power;
};

/**
 * The y axis: a round top a little above `value` and its ticks (about four
 * steps). A non-positive value gets a unit axis rather than a zero span.
 */
export const targetBarAxis = (
  value: number,
): { readonly top: number; readonly ticks: readonly number[] } => {
  const padded = value > 0 ? value * 1.08 : 1;
  const step = niceStep(padded / 4);
  const top = Math.ceil(padded / step) * step;
  const count = Math.round(top / step);
  return {
    top,
    ticks: Array.from({ length: count + 1 }, (_v, k) => k * step),
  };
};

/** The breakdown's closing line: how the bar stands against its projection. */
export type TargetBarStanding = "above" | "missing" | "remaining" | "on";

export interface TargetBarBreakdown {
  readonly projected: number;
  readonly invoiced: number;
  readonly confirmed: number;
  readonly planned: number;
  readonly standing: TargetBarStanding;
  /** What `standing` measures: the excess, the shortfall, or what is left. */
  readonly amount: number;
}

/** The tooltip's numbers for one bar (the component words and formats them). */
export const breakdownOf = (bar: TargetBar): TargetBarBreakdown => {
  const base = {
    projected: bar.projected,
    invoiced: bar.invoiced,
    confirmed: bar.confirmed,
    planned: bar.planned,
  };
  if (bar.above > 0) return { ...base, standing: "above", amount: bar.above };
  if (bar.missing > 0)
    return { ...base, standing: "missing", amount: bar.missing };
  const remaining =
    bar.projected - bar.invoiced - bar.confirmed - bar.planned - bar.missing;
  return remaining > 0
    ? { ...base, standing: "remaining", amount: remaining }
    : { ...base, standing: "on", amount: 0 };
};

/** A bar placed on the x axis, with its series. */
export interface PlacedBar {
  readonly seriesId: string;
  readonly seriesLabel: string;
  readonly seriesIndex: number;
  /** The bar's centre, in data units. */
  readonly x: number;
  readonly bar: TargetBar;
}

/** Every bar, placed: the hover tooltip's points and the headless table. */
export const placeBars = (
  series: readonly TargetBarSeries[],
): readonly PlacedBar[] =>
  flatMap(
    (s: TargetBarSeries, i: number) =>
      map(
        (bar: TargetBar) => ({
          seriesId: s.id,
          seriesLabel: s.label,
          seriesIndex: i,
          x: bar.period + slotOffset(i, series.length),
          bar,
        }),
        s.bars,
      ),
    series,
  );

/** Headless observation: one row per bar, the numbers the chart draws. */
export const targetBarRows = (
  series: readonly TargetBarSeries[],
): readonly Record<string, string | number>[] =>
  map(
    (p: PlacedBar) => ({
      series: p.seriesLabel,
      period: p.bar.period,
      x: Math.round(p.x * 1000) / 1000,
      projected: p.bar.projected,
      stack: stackTotal(p.bar),
      standing: breakdownOf(p.bar).standing,
      amount: breakdownOf(p.bar).amount,
    }),
    placeBars(series),
  );
