// ============================================
// Matchmaking bench — seeded randomness (pure, no domain knowledge)
//
// mulberry32. Deterministic so facet counts are stable across reloads and
// assertable in tests. Knows nothing about outings, people, or fixtures — it
// is the only source of nondeterminism in the generator, and it is injected.
// ============================================

export interface Rng {
  /** Uniform in [0, 1). */
  next: () => number;
  /** Uniform integer in [min, max]. */
  int: (min: number, max: number) => number;
  /** Uniform element. */
  pick: <T>(items: readonly T[]) => T;
  /** Element chosen proportional to `weightOf`. */
  weighted: <T>(items: readonly T[], weightOf: (item: T) => number) => T;
  /** True with probability `p`. */
  chance: (p: number) => boolean;
  /** A fresh shuffled copy. */
  shuffle: <T>(items: readonly T[]) => T[];
}

export const createRng = (seed: number): Rng => {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min + 1));

  const pick = <T,>(items: readonly T[]): T => items[int(0, items.length - 1)];

  const weighted = <T,>(
    items: readonly T[],
    weightOf: (item: T) => number,
  ): T => {
    let total = 0;
    for (const item of items) total += Math.max(0, weightOf(item));
    if (total <= 0) return pick(items);

    let roll = next() * total;
    for (const item of items) {
      roll -= Math.max(0, weightOf(item));
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  };

  const chance = (p: number): boolean => next() < p;

  const shuffle = <T,>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  return { next, int, pick, weighted, chance, shuffle };
};
