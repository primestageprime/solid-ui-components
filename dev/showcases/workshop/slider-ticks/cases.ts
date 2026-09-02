// ============================================
// PROTOTYPE support data for the slider-ticks bench.
// Throwaway. Do not promote. Do not import from `src/`.
//
// The cases are the five real sliders from the originating ticket, plus one
// stress case. Each variant renders the same list, so a reader compares the
// three tick treatments on identical data.
// ============================================

/** One live slider on the bench. */
export interface TickCase {
  /** Stable key for `For`. */
  readonly id: string;
  /** Caption on the label line. */
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** Values that get a tick, in the consumer's own units. */
  readonly ticks: readonly number[];
  /** Renders the value on the label line and on a tick. */
  readonly format: (value: number) => string;
  /** Start value for the local signal. */
  readonly initial: number;
  /** Extra line printed under the case title. Empty for the real sliders. */
  readonly note?: string;
}

/** Position of `value` on the track, as a percentage of the range. */
export const tickPercent = (value: number, min: number, max: number): number =>
  ((value - min) / (max - min)) * 100;

/** Inline `left` for a tick. A string keeps the showcase style rubric happy. */
export const leftPercent = (percent: number): string => `left: ${percent}%`;

/** Cents to dollars with cents, e.g. `2000` reads `$20.00`. */
const dollarsAndCents = (cents: number): string =>
  `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Cents to whole dollars, e.g. `5000000` reads `$50,000`. */
const wholeDollars = (cents: number): string =>
  `$${Math.round(cents / 100).toLocaleString()}`;

/** Every step from `min` to `max`, inclusive. Drives the stress case. */
const ticksFromStep = (
  min: number,
  max: number,
  step: number,
): readonly number[] =>
  Array.from(
    { length: Math.floor((max - min) / step) + 1 },
    (_, i) => min + i * step,
  );

/** The five real sliders, then the stress case that breaks a step-only rule. */
export const TICK_CASES: readonly TickCase[] = [
  {
    id: "new-customers",
    label: "New customers per week",
    min: 0,
    max: 50,
    step: 1,
    ticks: [0, 10, 20, 30, 40, 50],
    format: String,
    initial: 12,
  },
  {
    id: "revenue-per-customer",
    label: "Revenue per customer",
    min: 200,
    max: 5000,
    step: 50,
    ticks: [200, 1000, 2000, 3000, 4000, 5000],
    format: dollarsAndCents,
    initial: 2400,
  },
  {
    id: "annual-pay",
    label: "Annual pay",
    min: 0,
    max: 20_000_000,
    step: 200_000,
    ticks: [0, 5_000_000, 10_000_000, 15_000_000, 20_000_000],
    format: wholeDollars,
    initial: 8_000_000,
  },
  {
    id: "annual-raise",
    label: "Annual raise",
    min: 0,
    max: 15,
    step: 0.5,
    ticks: [0, 2.5, 5, 7.5, 10, 12.5, 15],
    format: (percent) => `${percent}%`,
    initial: 3.5,
  },
  {
    id: "months-to-sample",
    label: "Months to sample",
    min: 3,
    max: 24,
    step: 1,
    ticks: [3, 6, 12, 18, 24],
    format: (months) => `${months} mo`,
    initial: 6,
  },
  {
    id: "annual-pay-stress",
    label: "Annual pay",
    note: "stress: ticks from step (100 ticks)",
    min: 0,
    max: 20_000_000,
    step: 200_000,
    ticks: ticksFromStep(0, 20_000_000, 200_000),
    format: wholeDollars,
    initial: 8_000_000,
  },
];

/** What a variant panel needs to drive one live slider. */
export interface CaseEntry {
  readonly tickCase: TickCase;
  readonly value: () => number;
  readonly setValue: (value: number) => void;
}
