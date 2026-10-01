// The four strips every simple projection form is built from, and the forms
// that stack them. Pure: no stores, no network.
//
//   LABEL    the line's name
//   AMOUNT   Single (per payment | per year) | Range | Units x price
//   CADENCE  Annual | Quarterly | Monthly | Semi-monthly | Bi-weekly | Weekly
//            | Daily | Once, each carrying only its anchor
//   WINDOW   optional start and/or end
//
// Money in or out is the Direction split above the strips, not a strip.
// Counterparties and accounts are placeholder labels in the JSON.
//
// Key names are the engine's (thorcasting-engine/model/src/config/):
//   schedule.rs  the schedule shapes, `{"recurring":{shape,...}}`, `{"once":{date}}`
//   amount.rs    `amount_cents`, `band {min_cents,max_cents}`, `amount {annual|per_unit}`
//   fixed_txn.rs `{effect:"fixed_txn", params:{schedule, leg, start?, until?}}`
//   line/{license,hourly_service,salary}.rs  the ADR 0029 kind lines
// semi_monthly is on branch feat/semi-monthly-schedule, not yet on main.
import { map } from "../../../src/fn";
import { perPaycheckCents } from "./projection-forms.fixtures";

export type Json = Record<string, unknown>;
export type Side = "revenue" | "expense";

// ── Cadence ─────────────────────────────────────────────────────────────────
export type CadenceId =
  | "annual"
  | "quarterly"
  | "monthly"
  | "semimonthly"
  | "biweekly"
  | "weekly"
  | "daily"
  | "once";

export const CADENCES: { id: CadenceId; label: string; anchor: string }[] = [
  { id: "annual", label: "Annual", anchor: "month + day" },
  { id: "quarterly", label: "Quarterly", anchor: "reference date" },
  { id: "monthly", label: "Monthly", anchor: "day of month or last" },
  { id: "semimonthly", label: "Semi-monthly", anchor: "none (1st and 15th)" },
  { id: "biweekly", label: "Bi-weekly", anchor: "reference payday" },
  { id: "weekly", label: "Weekly", anchor: "weekday" },
  { id: "daily", label: "Daily", anchor: "none" },
  { id: "once", label: "Once", anchor: "date" },
];

/** Fires a year, which a per-year amount divides by. */
export const PERIODS: Record<CadenceId, number> = {
  annual: 1,
  quarterly: 4,
  monthly: 12,
  semimonthly: 24,
  biweekly: 26,
  weekly: 52,
  daily: 365,
  once: 1,
};

/** A flat superset: each cadence reads only its own anchor. */
export interface CadenceValue {
  id: CadenceId;
  month: number;
  day: number;
  last: boolean;
  ref: string;
  dow: number;
  date: string;
}

export const CADENCE_SAMPLE: CadenceValue = {
  id: "monthly",
  month: 1,
  day: 15,
  last: false,
  ref: "2026-08-28",
  dow: 1,
  date: "2026-11-01",
};

const recurring = (shape: string, extra: Json = {}): Json => ({ recurring: { shape, ...extra } });

export const scheduleOf = (c: CadenceValue): Json => {
  switch (c.id) {
    case "annual":
      return recurring("annual_on", { month: c.month, day: c.day });
    case "quarterly":
      return recurring("quarterly_from", { referenceDate: c.ref });
    case "monthly":
      return recurring("day_of_month", { day: c.last ? "last" : c.day });
    case "semimonthly":
      return recurring("semi_monthly");
    case "biweekly":
      return recurring("biweekly_from", { referenceDate: c.ref });
    case "weekly":
      return recurring("day_of_week", { dow: c.dow });
    case "daily":
      return recurring("daily");
    case "once":
      return { once: { date: c.date } };
  }
};

// ── Amount ──────────────────────────────────────────────────────────────────
export type AmountId = "single" | "range" | "units";
export type UnitKind = "seats" | "hours";

/** Single's precision: the step of the input, and so how precise a figure is. */
export type Precision = "cents" | "dollars" | "thousands";
export const STEP: Record<Precision, number> = { cents: 0.01, dollars: 1, thousands: 1000 };

export interface AmountValue {
  id: AmountId;
  precision: Precision;
  /** The largest figure expected: sizes each money input to its value. */
  scale: number;
  dollars: number;
  per: "payment" | "year";
  min: number;
  typical: number;
  max: number;
  count: number;
  net: number;
  price: number;
  unit: UnitKind;
}

export const AMOUNT_SAMPLE: AmountValue = {
  id: "single",
  precision: "dollars",
  scale: 1_000_000,
  dollars: 10000,
  per: "payment",
  min: 8000,
  typical: 10000,
  max: 12000,
  count: 10,
  net: 2,
  price: 50,
  unit: "seats",
};

const toCents = (d: number): number => Math.round(d * 100);

/** What one payment is, for a per-year single amount. */
export const perPaymentCents = (annualDollars: number, cadence: CadenceId): number =>
  perPaycheckCents(annualDollars, PERIODS[cadence]);

// ── Window ──────────────────────────────────────────────────────────────────
export interface WindowValue {
  start: string;
  end: string;
}

export const windowKeys = (w: WindowValue): Json => ({
  ...(w.start !== "" ? { start: w.start } : {}),
  ...(w.end !== "" ? { until: w.end } : {}),
});

// ── Forms ───────────────────────────────────────────────────────────────────
export type Kind = "plain" | "license" | "hourly_service" | "salary";
export type WindowMode = "any" | "start" | "end";

export interface FormDef {
  id: string;
  name: string;
  /** Recipe: Amount + Cadence + Window. */
  recipe: string;
  kind: Kind;
  amount: AmountId;
  unit?: UnitKind;
  /** The cadences the form's kind or recipe allows (the kind narrows these). */
  cadences: CadenceId[];
  window: WindowMode;
  /** Direction is fixed by the kind, or follows the gallery split. */
  side: Side | "split";
  start: StripsState;
  note?: string;
}

export interface StripsState {
  label: string;
  amount: AmountValue;
  cadence: CadenceValue;
  window: WindowValue;
}

const NO_WINDOW: WindowValue = { start: "", end: "" };
const cad = (id: CadenceId, extra: Partial<CadenceValue> = {}): CadenceValue => ({
  ...CADENCE_SAMPLE,
  id,
  ...extra,
});
const amt = (extra: Partial<AmountValue>): AmountValue => ({ ...AMOUNT_SAMPLE, ...extra });
const ALL: CadenceId[] = CADENCES.map((c) => c.id);

const form = (
  id: string,
  name: string,
  recipe: string,
  start: StripsState,
  rest: Partial<FormDef> = {},
): FormDef => ({
  id,
  name,
  recipe,
  kind: "plain",
  amount: start.amount.id,
  cadences: [start.cadence.id],
  window: "any",
  side: "split",
  start,
  ...rest,
});

export const FORMS: FormDef[] = [
  form("monthly-fixed", "Monthly fixed", "Single + Monthly + —", {
    label: "RTH Contracts",
    amount: amt({}),
    cadence: cad("monthly", { day: 1 }),
    window: NO_WINDOW,
  }),
  form("monthly-variable", "Monthly variable", "Range + Monthly + —", {
    label: "Groceries",
    amount: amt({ id: "range", min: 300, typical: 450, max: 700 }),
    cadence: cad("monthly", { day: 1 }),
    window: NO_WINDOW,
  }),
  form("weekly-fixed", "Weekly fixed", "Single + Weekly + —", {
    label: "Cursor",
    amount: amt({ dollars: 8.02, precision: "cents" }),
    cadence: cad("weekly"),
    window: NO_WINDOW,
  }),
  form("weekly-variable", "Weekly variable", "Range + Weekly + —", {
    label: "Support hours",
    amount: amt({ id: "range", min: 2000, typical: 5000, max: 40000 }),
    cadence: cad("weekly", { dow: 5 }),
    window: NO_WINDOW,
  }),
  form("daily-fixed", "Daily fixed", "Single + Daily + —", {
    label: "Daily sales",
    amount: amt({ dollars: 125 }),
    cadence: cad("daily"),
    window: NO_WINDOW,
  }),
  form("quarterly", "Quarterly", "Single + Quarterly + —", {
    label: "Bank fee",
    amount: amt({ dollars: 35 }),
    cadence: cad("quarterly", { ref: "2025-12-15" }),
    window: NO_WINDOW,
  }),
  form("annual", "Annual", "Single + Annual + —", {
    label: "Registration",
    amount: amt({ dollars: 1900 }),
    cadence: cad("annual", { month: 4, day: 1 }),
    window: NO_WINDOW,
  }),
  form("one-time", "One-time", "Single + Once + —", {
    label: "Logo design",
    amount: amt({ dollars: 500 }),
    cadence: cad("once", { date: "2026-11-25" }),
    window: NO_WINDOW,
  }),
  form("terminal", "Terminal recurring", "Single + Monthly + end", {
    label: "Tranche 1",
    amount: amt({ dollars: 11200 }),
    cadence: cad("monthly", { day: 9 }),
    window: { start: "", end: "2027-06-30" },
  }, { window: "end" }),
  form("deferred", "Deferred recurring", "Single + Monthly + start", {
    label: "Office 309",
    amount: amt({ dollars: 1389 }),
    cadence: cad("monthly", { day: 5 }),
    window: { start: "2027-01-01", end: "" },
  }, { window: "start" }),
  form("retainer", "Retainer", "Single + Monthly + — (preset)", {
    label: "Acme retainer",
    amount: amt({ dollars: 6000 }),
    cadence: cad("monthly", { day: 1 }),
    window: NO_WINDOW,
  }, {
    side: "revenue",
    note: "A preset of Monthly fixed in the Support category; thorcasting has no retainer type.",
  }),
  form("license", "License", "Units x price + Monthly|Annual + start", {
    label: "Pro licenses",
    amount: amt({ id: "units", unit: "seats", count: 10, net: 2, price: 50 }),
    cadence: cad("monthly", { day: 1 }),
    window: { start: "2026-10-01", end: "" },
  }, {
    kind: "license",
    side: "revenue",
    cadences: ["monthly", "annual"],
    window: "any",
    unit: "seats",
    note: "Kind license: a seat plan bills monthly or annually only, and needs a start.",
  }),
  form("hourly", "Hourly service", "Units x price + recurring + —", {
    label: "Design support",
    amount: amt({ id: "units", unit: "hours", count: 20, price: 90 }),
    cadence: cad("weekly"),
    window: { start: "2026-10-05", end: "" },
  }, {
    kind: "hourly_service",
    side: "revenue",
    cadences: ["weekly", "biweekly", "semimonthly", "monthly", "daily"],
    unit: "hours",
    note: "Kind hourly_service: recurring schedules only (no Once, no Quarterly or Annual).",
  }),
  form("salary", "Salary", "Single per year + Bi-weekly|Semi-monthly|Monthly + —", {
    label: "Michael A Arnold",
    amount: amt({ dollars: 102891.1, per: "year", precision: "cents" }),
    cadence: cad("biweekly", { ref: "2026-09-04" }),
    window: NO_WINDOW,
  }, {
    kind: "salary",
    side: "expense",
    cadences: ["biweekly", "semimonthly", "monthly"],
    note: "Kind salary: recurring pay on a bi-weekly, semi-monthly or monthly schedule.",
  }),
];

export const ALL_CADENCES = ALL;

// ── Assembly: strips -> the engine JSON ─────────────────────────────────────

const amountKeys = (a: AmountValue): Json => {
  if (a.id === "range") {
    return {
      amount_cents: toCents(a.typical),
      band: { min_cents: toCents(a.min), max_cents: toCents(a.max) },
    };
  }
  if (a.per === "year") return { amount: { annual: { cents: toCents(a.dollars) } } };
  return { amount_cents: toCents(a.dollars) };
};

/** The JSON a form's strips assemble to, in the engine's own shape. */
export const assemble = (def: FormDef, s: StripsState, gallerySide: Side): Json => {
  const side = def.side === "split" ? gallerySide : def.side;
  const schedule = scheduleOf(s.cadence);
  const window = windowKeys(s.window);
  switch (def.kind) {
    case "license":
      return {
        kind: "license",
        product: s.label,
        customer: "counterparty:Customer",
        paid_to: "account:Checking",
        schedule,
        start: s.window.start !== "" ? s.window.start : "2026-10-01",
        ...(s.window.end !== "" ? { until: s.window.end } : {}),
        seed_seats: s.amount.count,
        net_per_period: s.amount.net,
        price_cents: toCents(s.amount.price),
      };
    case "hourly_service":
      return {
        kind: "hourly_service",
        service: s.label,
        customer: "counterparty:Customer",
        paid_to: "account:Checking",
        schedule,
        rate_cents: toCents(s.amount.price),
        units_x100: Math.round(s.amount.count * 100),
        ...window,
      };
    case "salary":
      return {
        kind: "salary",
        person: "person:per-0123456789abcdef0123456789abcdef",
        paid_from: "account:Checking",
        schedule,
        ...amountKeys(s.amount),
        label: s.label,
        ...window,
      };
    case "plain":
      return {
        effect: "fixed_txn",
        params: {
          schedule,
          leg: {
            from: side === "revenue" ? "Customer" : "Checking",
            to: side === "revenue" ? "Checking" : "Vendor",
            label: s.label,
            ...amountKeys(s.amount),
          },
          ...window,
        },
      };
  }
};

export const prettyJson = (value: unknown): string => JSON.stringify(value, null, 2);

/** The one-line "= $X per payment" a per-year amount shows. */
export const derivedPerPayment = (a: AmountValue, cadence: CadenceId): string => {
  const cents = perPaymentCents(a.dollars, cadence);
  return `= $${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} per payment (annual ÷ ${PERIODS[cadence]})`;
};

// ── Catalog fragments: the key(s) each variant writes ───────────────────────

export const cadenceFragment = (id: CadenceId): string =>
  prettyJson({ schedule: scheduleOf({ ...CADENCE_SAMPLE, id }) });

export const amountFragments: { title: string; value: AmountValue; fragment: Json }[] = [
  {
    title: "Single: cents (.00)",
    value: { ...AMOUNT_SAMPLE, id: "single", precision: "cents", dollars: 10000.5 },
    fragment: { amount_cents: 1000050 },
  },
  {
    title: "Single: whole dollars",
    value: { ...AMOUNT_SAMPLE, id: "single", precision: "dollars" },
    fragment: { amount_cents: 1000000 },
  },
  {
    title: "Single: nearest $1,000",
    value: { ...AMOUNT_SAMPLE, id: "single", precision: "thousands" },
    fragment: { amount_cents: 1000000 },
  },
  {
    title: "Single: per year (shows each payment)",
    value: { ...AMOUNT_SAMPLE, id: "single", per: "year", dollars: 102891.1, precision: "cents" },
    fragment: { amount: { annual: { cents: 10289110 } } },
  },
  {
    title: "Range at the minimum scale (8k / 10k / 12k)",
    value: { ...AMOUNT_SAMPLE, id: "range", scale: 100_000 },
    fragment: { amount_cents: 1000000, band: { min_cents: 800000, max_cents: 1200000 } },
  },
  {
    title: "Range at the maximum ($1,000,000,000)",
    value: {
      ...AMOUNT_SAMPLE,
      id: "range",
      scale: 1_000_000_000,
      min: 800_000_000,
      typical: 900_000_000,
      max: 1_000_000_000,
    },
    fragment: {
      amount_cents: 90000000000,
      band: { min_cents: 80000000000, max_cents: 100000000000 },
    },
  },
  {
    title: "Units x price: seats",
    value: { ...AMOUNT_SAMPLE, id: "units", unit: "seats" },
    fragment: { seed_seats: 10, net_per_period: 2, price_cents: 5000 },
  },
  {
    title: "Units x price: hours",
    value: { ...AMOUNT_SAMPLE, id: "units", unit: "hours", count: 20, price: 90 },
    fragment: { rate_cents: 9000, units_x100: 2000 },
  },
];

export const windowFragments: { title: string; value: WindowValue; fragment: Json }[] = [
  { title: "None", value: { start: "", end: "" }, fragment: {} },
  { title: "Start", value: { start: "2026-10-01", end: "" }, fragment: { start: "2026-10-01" } },
  { title: "End", value: { start: "", end: "2027-06-30" }, fragment: { until: "2027-06-30" } },
  {
    title: "Start and end",
    value: { start: "2026-10-01", end: "2027-06-30" },
    fragment: { start: "2026-10-01", until: "2027-06-30" },
  },
];

/** Which label key each kind writes. */
export const LABEL_KEYS: { kind: string; key: string }[] = [
  { kind: "plain fixed_txn", key: "params.leg.label" },
  { kind: "license", key: "product" },
  { kind: "hourly_service", key: "service" },
  { kind: "salary", key: "label" },
];

export const labelFragment = (kindKey: string, name: string): string =>
  kindKey.includes(".")
    ? prettyJson({ params: { leg: { label: name } } })
    : prettyJson({ [kindKey]: name });

/** Names for display. */
export const cadenceLabels = (ids: CadenceId[]): string =>
  map((id: CadenceId) => CADENCES.find((c) => c.id === id)?.label ?? id, ids).join(" | ");

export const EXCEPTIONS: { form: string; why: string }[] = [
  { form: "Payroll tax", why: "Its amount is a percentage of a salary register, not a figure." },
  { form: "Punch-card package", why: "A cohort of buyers: engine rule runs once, and the engine silently drops it when recurring." },
  { form: "Product sale growth models", why: "Companion rows: price and volume registers plus growth rows." },
  { form: "Subscription population", why: "New and churned customers each period, not a price times a count." },
  { form: "Contract payment", why: "Net terms shift the cash date from the invoice date." },
  { form: "Salary change", why: "Set, add or scale a register at a date; it edits a salary, it does not pay one." },
  { form: "Spend up to", why: "A budget cap, once only; the engine silently drops it when recurring." },
  { form: "Afford when", why: "The date comes from the balance, not a calendar." },
  { form: "Runway ladder", why: "Its money lives inside the schedule." },
  { form: "Hourly employee", why: "No line kind routes it to a builder." },
];
