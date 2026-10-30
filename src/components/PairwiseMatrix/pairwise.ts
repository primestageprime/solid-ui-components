// ============================================
// pairwise — pure head-to-head (Condorcet) tallies. No Solid, no DOM.
// The headless half of PairwiseMatrix.
// ============================================

/** pairwise[a][b] = how many voters preferred a over b. Ties count for neither. */
export type PairwiseTally = Record<string, Record<string, number>>;

/** A ranked ballot: tiers best-first; items in one tier are tied. */
export type TieredBallot = readonly (readonly string[])[];

/** Head-to-head counts from tiered ballots. A candidate a ballot leaves out ranks below every one it includes. */
export function pairwiseMatrix(
  candidates: readonly string[],
  ballots: readonly TieredBallot[],
): PairwiseTally {
  const p: PairwiseTally = {};
  for (const a of candidates) {
    p[a] = {};
    for (const b of candidates) p[a][b] = 0;
  }
  for (const ballot of ballots) {
    const tier = new Map<string, number>();
    for (const [i, t] of ballot.entries()) for (const id of t) tier.set(id, i);
    for (const a of candidates) {
      for (const b of candidates) {
        if (a !== b && (tier.get(a) ?? Infinity) < (tier.get(b) ?? Infinity))
          p[a][b] += 1;
      }
    }
  }
  return p;
}

export type PairwiseOutcome = "win" | "loss" | "tie";

/** How row candidate `a` fares against column candidate `b`; null on the diagonal. */
export function pairwiseOutcome(
  p: PairwiseTally,
  a: string,
  b: string,
): PairwiseOutcome | null {
  if (a === b) return null;
  const ab = p[a]?.[b] ?? 0;
  const ba = p[b]?.[a] ?? 0;
  return ab > ba ? "win" : ab < ba ? "loss" : "tie";
}
