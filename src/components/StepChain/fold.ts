// ============================================
// StepChain fold — the pure rule (no DOM, no Solid).
//
// A chain is `amount arrow amount arrow … amount tail`. Given measured widths,
// decide how it is laid out:
//
//   one   the head (name + tag) and the whole chain fit on one line
//   two   head on line one, the whole chain on line two
//   fold  the chain overflows a line of its own: first two steps, an ellipsis
//         carrying "N more", then the last step (N = steps - 3)
//
// "Measured, not counted": the fold applies only when line two overflows. A
// chain of three or fewer steps has nothing to omit, so it stays `two` and the
// component clips rather than wrapping mid-step.
// ============================================
import { sum } from "../../fn";

export type FoldMode = "one" | "two" | "fold";

export interface ChainMeasure {
  /** Width the chain may use (the container's content width). */
  available: number;
  /** Width of the head: the name and its tag. */
  head: number;
  /** Gap between the head and the chain when they share a line, and between chain items. */
  gap: number;
  /** Width of each step's amount, in order. */
  amounts: readonly number[];
  /** Width of the connector after each step: an arrow with its duration slot, the last one the tail. */
  arrows: readonly number[];
  /** Width of the ellipsis element as it would render for the omitted count. */
  more: number;
}

export interface ChainFold {
  mode: FoldMode;
  /** Indices of the steps drawn inline, ascending. */
  shown: number[];
  /** How many steps the ellipsis stands for. 0 unless `mode` is "fold". */
  omitted: number;
}

/** Steps needed before an ellipsis is allowed: first two, one omitted, the last. */
export const MIN_FOLD_STEPS = 4;

/** Steps shown before the ellipsis. */
export const LEAD_STEPS = 2;


/** Width of the whole chain inline: 2n items, 2n-1 gaps. */
export function fullChainWidth(m: ChainMeasure): number {
  const items = m.amounts.length + m.arrows.length;
  return sum(m.amounts) + sum(m.arrows) + Math.max(0, items - 1) * m.gap;
}

/** Width of the folded chain: a0 r0 a1 r1 MORE r(n-2) a(n-1) r(n-1). */
export function foldedChainWidth(m: ChainMeasure): number {
  const n = m.amounts.length;
  if (n < MIN_FOLD_STEPS) return fullChainWidth(m);
  const widths = [
    m.amounts[0], m.arrows[0], m.amounts[1], m.arrows[1],
    m.more,
    m.arrows[n - 2], m.amounts[n - 1], m.arrows[n - 1],
  ];
  return sum(widths) + (widths.length - 1) * m.gap;
}

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

export function foldChain(m: ChainMeasure): ChainFold {
  const n = m.amounts.length;
  const all = range(n);
  const full = fullChainWidth(m);
  if (m.head + m.gap + full <= m.available) return { mode: "one", shown: all, omitted: 0 };
  if (full <= m.available || n < MIN_FOLD_STEPS) return { mode: "two", shown: all, omitted: 0 };
  return { mode: "fold", shown: [0, 1, n - 1], omitted: n - LEAD_STEPS - 1 };
}
