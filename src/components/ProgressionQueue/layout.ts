// ProgressionQueue — the sizing model (pure, testable).
// A weighted water-fill (ruled 2026-07-22): populated sections shrink-wrap when
// they fit; when the populated sections' content overflows the available height
// they share it by weight, each CAPPED at its content, with the surplus from
// any section that shrinks under its share redistributed to the ones still
// short. Empty sections are fixed at their summary-line (natural) height.

export interface AllocateInput {
  /** Content height per section — header-only for an empty section. */
  natural: number[];
  /** Item count per section; 0 collapses the section to its summary line. */
  counts: number[];
  /** Relative overflow share per section (only used when content overflows). */
  weights: number[];
  /** Total height the bar fills. */
  available: number;
  /** Gap between sections, px. */
  gap: number;
}

import { filter, map, sum } from "../../fn";

export const allocateHeights = ({
  natural,
  counts,
  weights,
  available,
  gap,
}: AllocateInput): number[] => {
  const out = [...natural];
  const weightOf = (i: number): number => weights[i] || 1;
  let pool = available - gap * Math.max(0, natural.length - 1);
  const active: number[] = [];
  for (let i = 0; i < natural.length; i++) {
    if (counts[i] === 0) pool -= natural[i]; // empty: fixed at its summary line
    else {
      out[i] = 0;
      active.push(i);
    }
  }
  let remaining = active;
  while (remaining.length && pool > 0.5) {
    const wSum = sum(map(weightOf, remaining));
    let capped = -1;
    for (const i of remaining) {
      const share = (pool * weightOf(i)) / wSum;
      if (share >= natural[i] - out[i] - 0.5) {
        capped = i;
        break;
      }
    }
    if (capped >= 0) {
      const room = natural[capped] - out[capped];
      out[capped] += room;
      pool -= room;
      remaining = filter((i: number) => i !== capped, remaining);
    } else {
      for (const i of remaining) out[i] += (pool * weightOf(i)) / wSum;
      pool = 0;
    }
  }
  return out;
};
