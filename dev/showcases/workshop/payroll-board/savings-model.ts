// Payroll board — the SAVINGS GOAL and RUNWAY readings (Element 5, Peter
// 2026-09-24). Pure; the bench's two MetricCards render these, and
// `savings-model.test.ts` prints both status tables.
//
// ── SAVINGS GOAL ────────────────────────────────────────────────────────────
// "How long until the savings goal is hit", from a target amount, what is
// already saved toward it, and the scenario's monthly gain — the same figure
// the Gain/Loss Slope gauge's solid needle reads.
//
//   • NOW when the goal is already met — met beats never, whatever the slope.
//   • NEVER when an unmet goal has a zero or negative gain.
//   • Otherwise the days until it is met, rounded UP (2.1 days is not done at
//     day 2), spoken in ONE unit — days / weeks / months / years — at
//     thorcasting's runway thresholds (see `WEEKS_FROM`), whole units only.
//
// Tone (MetricCard's own tones):
//   • NOW → success.
//   • a date INSIDE the projection horizon → default.
//   • a date BEYOND the horizon → warning (orange): the chart cannot show it.
//   • NEVER → warning too: it is beyond every horizon, and it is a slope the
//     gauge already paints red — a second red here would say the same thing
//     twice, louder. (Stated so Peter can overturn it.)
//
// `saved` is an input the spec did not name: without it "already met" has
// nothing to compare against. Currency is a hard-coded "$" (Peter; i18n later).
//
// ── RUNWAY ──────────────────────────────────────────────────────────────────
// Thorcasting's `runwayStatus` (src/lib/runway/runwayStatus.ts), in order:
//   (a) balance at or under the floor on day one → BANKRUPT;
//   (b) the balance reaches the floor inside the window → the time until it
//       does, in the same unit scale;
//   (c) otherwise the window's slope: ≥ 0 → SOLVENT; < 0 → "Beyond <window>".
// Peter's rule on top (2026-09-24): RED when the runway is shorter than the
// fixture's minimum runway. Thorcasting paints every (b) red; here a crossing
// at or past the minimum is orange (warning) — it still runs out inside the
// window, but not yet dangerously.

/** Days per unit — thorcasting's calendar-average figures, so a date checked
 *  against a calendar does not drift. */
const DAYS_PER = { days: 1, weeks: 7, months: 30.436875, years: 365.2425 } as const;
export type DurationUnit = keyof typeof DAYS_PER;

/**
 * THE UNIT THRESHOLDS — thorcasting's, exactly as Peter stated them for the
 * runway (2026-09-22): "> 2 weeks → weeks, > 2 months → months, > 2 years →
 * years". In days: 15, 61 and 731. The savings card uses the same scale so
 * the two cards under one gauge speak one language.
 */
export const WEEKS_FROM = 15;
export const MONTHS_FROM = 61;
export const YEARS_FROM = 731;

export const unitForDays = (days: number): DurationUnit => {
  if (days >= YEARS_FROM) return "years";
  if (days >= MONTHS_FROM) return "months";
  if (days >= WEEKS_FROM) return "weeks";
  return "days";
};

/** Whole units, never a decimal, and never "0 weeks" for a few days. */
export const valueForDays = (days: number, unit: DurationUnit): number =>
  unit === "days" ? days : Math.max(1, Math.round(days / DAYS_PER[unit]));

/** "3 weeks", "1 day", "5 months". */
export const formatDays = (days: number): string => {
  const unit = unitForDays(days);
  const value = valueForDays(days, unit);
  return `${value} ${value === 1 ? unit.slice(0, -1) : unit}`;
};

export type Tone = "default" | "success" | "warning" | "danger";

// ── savings ─────────────────────────────────────────────────────────────────

/** What the savings card is computed from, in whole dollars. */
export interface SavingsGoalInput {
  /** The amount the goal is for. */
  readonly target: number;
  /** Already put aside toward it. */
  readonly saved: number;
  /** The scenario's net gain per month — the gauge's `value`. */
  readonly monthlyGain: number;
}

export type SavingsGoalReading =
  | { readonly kind: "now" }
  | { readonly kind: "never" }
  | { readonly kind: "days"; readonly days: number };

export const timeToSavingsGoal = (input: SavingsGoalInput): SavingsGoalReading => {
  const remaining = input.target - input.saved;
  if (remaining <= 0) return { kind: "now" };
  if (input.monthlyGain <= 0) return { kind: "never" };
  return { kind: "days", days: Math.ceil((remaining / input.monthlyGain) * DAYS_PER.months) };
};

export const formatSavingsGoal = (reading: SavingsGoalReading): string => {
  if (reading.kind === "now") return "Now";
  if (reading.kind === "never") return "Never";
  return formatDays(reading.days);
};

/** The card's tint, against the projection horizon in days. */
export const savingsGoalColor = (reading: SavingsGoalReading, horizonDays: number): Tone => {
  if (reading.kind === "now") return "success";
  if (reading.kind === "never") return "warning";
  return reading.days > horizonDays ? "warning" : "default";
};

// ── runway ──────────────────────────────────────────────────────────────────

export interface RunwayInput {
  /** The balance on the window's first day. */
  readonly startBalance: number;
  /** The floor the balance must stay above; 0 when none is set. */
  readonly floor: number;
  /** Days until the balance reaches the floor inside the window, or null. */
  readonly crossingDays: number | null;
  /** The window's average slope per month: the gauge's figure. */
  readonly slopePerMonth: number;
  /** The horizon's label ("6m"). */
  readonly windowLabel: string;
}

export type RunwayKind = "bankrupt" | "crossing" | "solvent" | "beyond";

export interface RunwayReading {
  readonly kind: RunwayKind;
  readonly label: string;
  readonly color: Tone;
}

export const runwayReading = (input: RunwayInput, minRunwayDays: number): RunwayReading => {
  if (input.startBalance <= input.floor) {
    return { kind: "bankrupt", label: "Bankrupt", color: "danger" };
  }
  if (input.crossingDays !== null) {
    const days = Math.max(0, Math.round(input.crossingDays));
    return {
      kind: "crossing",
      label: formatDays(days),
      color: days < minRunwayDays ? "danger" : "warning",
    };
  }
  if (input.slopePerMonth >= 0) return { kind: "solvent", label: "Solvent", color: "success" };
  return { kind: "beyond", label: `Beyond ${input.windowLabel}`, color: "warning" };
};

/** "$100,000" — the hard-coded currency. */
export const dollars = (amount: number): string =>
  `$${Math.round(Math.abs(amount)).toLocaleString("en-US")}`;
