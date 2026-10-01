// Strips — the engine-neutral VALUES the four strips edit, and the pure rules
// they enforce. No Solid, no DOM, no engine vocabulary: a consumer (dside,
// jtf, thorcasting) maps these values to its own wire shape. Money is integer
// cents; dates are ISO `YYYY-MM-DD` strings.

import { filter } from "../../fn";

/** An ISO date, `YYYY-MM-DD`. */
export type IsoDate = string;

// ── Amount ──────────────────────────────────────────────────────────────────

/** How much, per payment. One of three shapes. */
export type AmountValue =
  | {
      kind: "single";
      cents: number;
      /** Whether `cents` is the amount of one payment or of a whole year. */
      per: "payment" | "year";
    }
  | { kind: "range"; min: number; typical: number; max: number }
  | {
      kind: "units";
      /** How many units at the start (seats, hours). */
      units: number;
      /** Price of one unit, in cents. */
      unitPrice: number;
      /** Units added each period (negative removes). */
      perPeriod: number;
    };

export type AmountKind = AmountValue["kind"];
export type AmountRangeField = "min" | "typical" | "max";

/** Annual cents divided into `periods` payments, rounded half-even (banker's)
 *  to whole cents. */
export const perPaymentCents = (annualCents: number, periods: number): number => {
  if (periods <= 0) return annualCents;
  const whole = Math.floor(annualCents / periods);
  const rest = annualCents - whole * periods;
  const twice = rest * 2;
  if (twice > periods) return whole + 1;
  if (twice < periods) return whole;
  return whole % 2 === 0 ? whole : whole + 1;
};

/** What one payment of a single amount is. */
export const paymentCents = (
  value: Extract<AmountValue, { kind: "single" }>,
  periodsPerYear: number,
): number =>
  value.per === "year" ? perPaymentCents(value.cents, periodsPerYear) : value.cents;

/** One period's billing for a units amount: units x price. */
export const unitsTotalCents = (
  value: Extract<AmountValue, { kind: "units" }>,
): number => value.units * value.unitPrice;

/** Set one field of a range and keep `min <= typical <= max`: the edited field
 *  wins and pushes the others it would cross. Never negative. */
export const setAmountRangeField = (
  range: Extract<AmountValue, { kind: "range" }>,
  field: AmountRangeField,
  cents: number,
): Extract<AmountValue, { kind: "range" }> => {
  const next = Math.max(0, Math.round(cents));
  if (field === "min") {
    return {
      kind: "range",
      min: next,
      typical: Math.max(range.typical, next),
      max: Math.max(range.max, next),
    };
  }
  if (field === "max") {
    return {
      kind: "range",
      min: Math.min(range.min, next),
      typical: Math.min(range.typical, next),
      max: next,
    };
  }
  return {
    kind: "range",
    min: Math.min(range.min, next),
    typical: next,
    max: Math.max(range.max, next),
  };
};

/** True when a range is ordered. */
export const isOrderedRange = (
  range: Extract<AmountValue, { kind: "range" }>,
): boolean => range.min <= range.typical && range.typical <= range.max;

// ── Cadence ─────────────────────────────────────────────────────────────────

export type CadenceShape =
  | "annual"
  | "quarterly"
  | "monthly"
  | "semimonthly"
  | "biweekly"
  | "weekly"
  | "daily"
  | "once";

/** When it pays. Each shape carries only its own anchor. */
export type CadenceValue =
  | { shape: "annual"; anchor: { month: number; day: number } }
  | { shape: "quarterly"; anchor: IsoDate }
  | { shape: "monthly"; anchor: number | "last" }
  | { shape: "semimonthly" }
  | { shape: "biweekly"; anchor: IsoDate }
  | { shape: "weekly"; anchor: number }
  | { shape: "daily" }
  | { shape: "once"; anchor: IsoDate };

export const CADENCE_SHAPES: readonly {
  shape: CadenceShape;
  label: string;
  anchor: string;
}[] = [
  { shape: "annual", label: "Annual", anchor: "month and day" },
  { shape: "quarterly", label: "Quarterly", anchor: "reference date" },
  { shape: "monthly", label: "Monthly", anchor: "day of month, or last" },
  { shape: "semimonthly", label: "Semi-monthly", anchor: "none (1st and 15th)" },
  { shape: "biweekly", label: "Bi-weekly", anchor: "reference payday" },
  { shape: "weekly", label: "Weekly", anchor: "weekday" },
  { shape: "daily", label: "Daily", anchor: "none" },
  { shape: "once", label: "Once", anchor: "date" },
];

/** Payments a year, which a per-year amount divides by. */
export const PERIODS_PER_YEAR: Record<CadenceShape, number> = {
  annual: 1,
  quarterly: 4,
  monthly: 12,
  semimonthly: 24,
  biweekly: 26,
  weekly: 52,
  daily: 365,
  once: 1,
};

/** The day grid never offers more than this. "Last" is a separate choice, and
 *  only monthly has it. */
export const MAX_GRID_DAY = 28;

const clamp = (n: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, Math.round(n)));

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;
export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const DEFAULT_DATE: IsoDate = "2026-01-01";

/** The date a previous cadence anchored on, when it had one. */
const dateOf = (previous: CadenceValue | undefined): IsoDate =>
  previous !== undefined &&
  (previous.shape === "quarterly" ||
    previous.shape === "biweekly" ||
    previous.shape === "once")
    ? previous.anchor
    : DEFAULT_DATE;

/** A valid cadence of `shape`, keeping a date from `previous` when both carry
 *  one. */
export const cadenceOfShape = (
  shape: CadenceShape,
  previous?: CadenceValue,
): CadenceValue => {
  switch (shape) {
    case "annual":
      return { shape, anchor: { month: 1, day: 1 } };
    case "quarterly":
    case "biweekly":
    case "once":
      return { shape, anchor: dateOf(previous) };
    case "monthly":
      return { shape, anchor: 1 };
    case "weekly":
      return { shape, anchor: 1 };
    case "semimonthly":
    case "daily":
      return { shape };
  }
};

/** Force a cadence into what the strip offers: days 1..28, months 1..12,
 *  weekdays 0..6. */
export const normalizeCadence = (value: CadenceValue): CadenceValue => {
  switch (value.shape) {
    case "annual":
      return {
        shape: "annual",
        anchor: {
          month: clamp(value.anchor.month, 1, 12),
          day: clamp(value.anchor.day, 1, MAX_GRID_DAY),
        },
      };
    case "monthly":
      return value.anchor === "last"
        ? value
        : { shape: "monthly", anchor: clamp(value.anchor, 1, MAX_GRID_DAY) };
    case "weekly":
      return { shape: "weekly", anchor: clamp(value.anchor, 0, 6) };
    default:
      return value;
  }
};

/** The compact text an anchor shows: "Mar 15", "Day 15", "Last day", "Mon". */
export const anchorText = (value: CadenceValue): string => {
  switch (value.shape) {
    case "annual":
      return `${MONTH_NAMES[value.anchor.month - 1]} ${value.anchor.day}`;
    case "monthly":
      return value.anchor === "last" ? "Last day" : `Day ${value.anchor}`;
    case "weekly":
      return WEEKDAY_NAMES[value.anchor] ?? "";
    case "quarterly":
    case "biweekly":
    case "once":
      return value.anchor;
    case "semimonthly":
      return "1st and 15th";
    case "daily":
      return "Every day";
  }
};

/** The shapes among `allowed` that exist, in the strip's own order; an empty
 *  or unknown list falls back to every shape. */
export const offeredShapes = (
  allowed: readonly CadenceShape[] | undefined,
): readonly (typeof CADENCE_SHAPES)[number][] => {
  const wanted = filter((c) => allowed?.includes(c.shape) === true, CADENCE_SHAPES);
  return wanted.length > 0 ? wanted : CADENCE_SHAPES;
};

// ── Window ──────────────────────────────────────────────────────────────────

/** Start (inclusive) and until (exclusive), each optional: an absent side is
 *  open, so neither is the whole line and one is a ray. */
export interface WindowValue {
  start?: IsoDate;
  until?: IsoDate;
}

const nonEmpty = (d: IsoDate | undefined): IsoDate | undefined =>
  d === undefined || d === "" ? undefined : d;

/** Set the start; if it passes the end, the end moves up to it. An empty date
 *  opens that side. */
export const setWindowStart = (
  window: WindowValue,
  start: IsoDate | undefined,
): WindowValue => {
  const s = nonEmpty(start);
  const u = nonEmpty(window.until);
  return {
    ...(s !== undefined ? { start: s } : {}),
    ...(u !== undefined ? { until: s !== undefined && u < s ? s : u } : {}),
  };
};

/** Set the end; if it passes before the start, the start moves back to it. */
export const setWindowUntil = (
  window: WindowValue,
  until: IsoDate | undefined,
): WindowValue => {
  const u = nonEmpty(until);
  const s = nonEmpty(window.start);
  return {
    ...(s !== undefined ? { start: u !== undefined && u < s ? u : s } : {}),
    ...(u !== undefined ? { until: u } : {}),
  };
};

export const isValidWindow = (window: WindowValue): boolean =>
  window.start === undefined ||
  window.until === undefined ||
  window.start <= window.until;

/** The text one side shows. */
export const OPEN_START_TEXT = "beginning of time";
export const OPEN_END_TEXT = "end of time";
