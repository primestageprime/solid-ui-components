// ============================================
// One axis of a chart's plot region: inset a total extent by a leading and a
// trailing amount, yielding the span's edges and its non-negative size.
//
// Every chart-family component recomputed this identity by hand — Chart's
// `innerWidth`/`innerHeight` from margins, ScrubChart's plotLeft/plotRight/
// plotWidth (and the top/bottom/height triple), CashflowChart's scale ranges
// from PAD. This is the single source of truth for the arithmetic.
//
// Deliberately 1D, not a width×height×margin bundle: ScrubChart resolves its
// vertical span first, measures y-axis labels against it, and only then knows
// the leading inset of its horizontal span — a 2D helper can't be called at
// either point. Two calls compose the 2D case (see Chart.tsx).
//
// `start` and `end` are the raw inset edges (end can fall left of start when
// the insets exceed the total — callers pass them through as-is today);
// only `size` clamps at zero.
// ============================================

export interface InsetSpan {
  start: number;
  end: number;
  size: number;
}

export const insetSpan = (
  total: number,
  before: number,
  after: number,
): InsetSpan => {
  const end = total - after;
  return { start: before, end, size: Math.max(0, end - before) };
};
