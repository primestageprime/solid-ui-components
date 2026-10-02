// GrowthStrip — the engine-neutral VALUE and its pure rules. How a count of
// units (seats, customers, volume) changes each period. No Solid, no DOM, no
// engine vocabulary: a consumer maps it to its own wire shape.

/** How the units change each period, plus optional churn and a ceiling. */
export type GrowthValue = (
  | { kind: "none" }
  | { kind: "units"; perPeriod: number }
  | { kind: "percent"; pctPerPeriod: number }
) & {
  /** Percent of units lost each period (0..100). Absent: none lost. */
  churnPct?: number;
  /** The most units there can be. Absent: unbounded. */
  ceiling?: number;
};

export type GrowthKind = GrowthValue["kind"];

export const GROWTH_KINDS: readonly { kind: GrowthKind; label: string }[] = [
  { kind: "none", label: "None" },
  { kind: "units", label: "+ units" },
  { kind: "percent", label: "% growth" },
];

const clamp = (n: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, n));

/** Churn is a percentage: 0..100. */
export const clampChurnPct = (pct: number): number =>
  Number.isFinite(pct) ? clamp(pct, 0, 100) : 0;

/** The ceiling never sits below the units you start with. */
export const clampCeiling = (ceiling: number, startUnits: number): number =>
  Math.max(Math.round(ceiling), Math.round(startUnits));

/** Set churn: clamped to 0..100; an absent churn clears it. */
export const setGrowthChurn = (
  growth: GrowthValue,
  churnPct: number | undefined,
): GrowthValue => {
  const { churnPct: _drop, ...rest } = growth;
  return churnPct === undefined
    ? (rest as GrowthValue)
    : ({ ...rest, churnPct: clampChurnPct(churnPct) } as GrowthValue);
};

/** Set the ceiling: never below the starting units; an absent ceiling clears it. */
export const setGrowthCeiling = (
  growth: GrowthValue,
  ceiling: number | undefined,
  startUnits: number,
): GrowthValue => {
  const { ceiling: _drop, ...rest } = growth;
  return ceiling === undefined
    ? (rest as GrowthValue)
    : ({ ...rest, ceiling: clampCeiling(ceiling, startUnits) } as GrowthValue);
};

/** Change the kind, keeping churn and ceiling and starting the rate at zero. */
export const growthOfKind = (kind: GrowthKind, previous?: GrowthValue): GrowthValue => {
  const keep = {
    ...(previous?.churnPct !== undefined ? { churnPct: previous.churnPct } : {}),
    ...(previous?.ceiling !== undefined ? { ceiling: previous.ceiling } : {}),
  };
  if (kind === "units") return { kind, perPeriod: 0, ...keep };
  if (kind === "percent") return { kind, pctPerPeriod: 0, ...keep };
  return { kind, ...keep };
};

/** Force a growth value into range for these starting units: churn 0..100,
 *  ceiling at least the start, a percent not below -100. */
export const normalizeGrowth = (growth: GrowthValue, startUnits: number): GrowthValue => {
  const base: GrowthValue =
    growth.kind === "percent"
      ? { kind: "percent", pctPerPeriod: Math.max(-100, growth.pctPerPeriod) }
      : growth;
  const withChurn =
    growth.churnPct === undefined ? base : setGrowthChurn(base, growth.churnPct);
  return growth.ceiling === undefined
    ? withChurn
    : setGrowthCeiling(withChurn, growth.ceiling, startUnits);
};

/** Units gained in one period from `units` (before churn and ceiling). */
export const grossAdded = (units: number, growth: GrowthValue): number =>
  growth.kind === "units"
    ? growth.perPeriod
    : growth.kind === "percent"
      ? Math.round((units * growth.pctPerPeriod) / 100)
      : 0;

/** Units after one period: lose `floor(units x churn)`, admit the gross added
 *  up to the room the ceiling leaves, never below zero. */
export const nextUnits = (units: number, growth: GrowthValue): number => {
  const lost = Math.floor((units * (growth.churnPct ?? 0)) / 100);
  const kept = units - lost;
  const room = growth.ceiling === undefined ? Infinity : Math.max(0, growth.ceiling - kept);
  const added = growth.kind === "none" ? 0 : clamp(grossAdded(units, growth), -kept, room);
  return Math.max(0, kept + added);
};

/** The units at the start of each of `periods` periods, starting with
 *  `startUnits` (so `periods + 1` figures). */
export const projectUnits = (
  startUnits: number,
  growth: GrowthValue,
  periods: number,
): number[] => {
  const out = [Math.max(0, Math.round(startUnits))];
  for (let i = 0; i < periods; i += 1) {
    out.push(nextUnits(out[out.length - 1], growth));
  }
  return out;
};

/** Basis points of a percentage: 3.5 is 350. */
export const percentToBp = (pct: number): number => Math.round(pct * 100);
