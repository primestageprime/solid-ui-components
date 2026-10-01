// Static example data for the Projection Forms bench. Shapes mirror
// thorcasting's configure detail editor (thorcasting-ui: configFormShapes,
// interpretationPicker, roleField); the figures are chosen to agree with
// Peter's two reference screenshots. No stores, no network.
import { map } from "../../../src/fn";

export type Option = { id: string; label: string };

export const SIDE_OPTIONS: Option[] = [
  { id: "expense", label: "Expense" },
  { id: "revenue", label: "Revenue" },
];

export const REVENUE_CATEGORIES: string[] = [
  "License",
  "Contract",
  "T&M",
  "Support",
  "Units",
  "Product",
  "Subscription",
  "Grant",
  "Other",
];

export const EXPENSE_CATEGORIES: string[] = [
  "Salary",
  "Hourly",
  "Subscription",
  "Office",
  "Tax",
  "Insurance",
  "Benefits",
  "Contractor",
  "Other",
];

/** The fifteen types of the Type chip row, in thorcasting's order. */
export const CONFIG_TYPES: string[] = [
  "Weekly fixed",
  "Terminal recurring",
  "Weekly variable",
  "Daily fixed",
  "One-time payment",
  "Contract payment (net terms)",
  "Punch-card package",
  "Monthly fixed",
  "Deferred recurring",
  "Monthly variable",
  "Bi-weekly salary (anchored)",
  "Bi-weekly (reference date)",
  "Quarterly (reference date)",
  "Annual",
  "Payroll tax (this register)",
];

export const ROLE_OPTIONS: Option[] = [
  { id: "none", label: "No role" },
  { id: "architect", label: "Architect" },
];
export const ROLE_HELP =
  "The rates and tiers builders count the payroll lines marked Architect. A line with no role adds no capacity.";

export const DEFINITION_OPTIONS: Option[] = [
  { id: "config", label: "Saved" },
  { id: "suggestion", label: "Suggested" },
];
export const DEFINITION_HELP =
  "This item has a saved config and a matching import suggestion. Pick which definition to keep — saving reconciles the other.";

/** Whole cents per paycheck: annual / 26, rounded half-even. */
export const perPaycheckCents = (annualDollars: number): number => {
  const exact = (annualDollars * 100) / 26;
  const floor = Math.floor(exact);
  const diff = exact - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
};

export const formatCents = (cents: number): string =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

export type ScenarioLine = { id: string; label: string; total: string; series: number[] };

// ── Reference 1: Revenue, Monthly fixed ─────────────────────────────────────
const MONTHLY_AMOUNT = 10000;
const cumulative = (perMonth: number): number[] =>
  map((i) => perMonth * (i + 1), range(12));

export const MONTHLY_FIXED = {
  name: "RTH Contracts",
  side: "revenue",
  category: "Contract",
  type: "Monthly fixed",
  amount: MONTHLY_AMOUNT,
  day: 1 as number | "last",
  scenarios: [
    { id: "baseline", label: "Baseline", total: "$120,000", series: cumulative(MONTHLY_AMOUNT) },
    {
      id: "lose-rth",
      label: "Lose RTH in June",
      total: "$50,000",
      series: map((v, i) => (i < 5 ? v : 50000), cumulative(MONTHLY_AMOUNT)),
    },
  ] as ScenarioLine[],
};

// ── Reference 2: Expense, Bi-weekly (reference date) ────────────────────────
const ANNUAL = 102891.1;
const PAYCHECK = perPaycheckCents(ANNUAL);

export type SourceTxn = { id: string; date: string; amount: string };
const isoPlusDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export type Candidate = {
  id: string;
  star: boolean;
  title: string;
  kind: string;
  why: string;
  band: string;
};

const CANDIDATES: Candidate[] = [
  {
    id: "biweekly-reference",
    star: true,
    title: "Bi-weekly (reference date)",
    kind: "Salary",
    why: "constant recurring amount",
    band: "$2,795 /2wk",
  },
  {
    id: "manual",
    star: false,
    title: "None of these are right",
    kind: "Different amount or cadence",
    why: "Edit manually →",
    band: "",
  },
];

export const BIWEEKLY_REFERENCE = {
  name: "Michael A Arnold",
  side: "expense",
  category: "Salary",
  type: "Bi-weekly (reference date)",
  role: "architect",
  pick: "config",
  annual: ANNUAL,
  referenceDate: "2026-05-22",
  candidates: CANDIDATES,
  perPaycheck: formatCents(PAYCHECK),
  // The reference date is chosen so 2027 holds 27 paydays: 26 x paycheck
  // vs 27 x paycheck.
  note: `= ${formatCents(PAYCHECK)}/paycheck (annual ÷ 26, round half-even) · 2027 has 27 paydays for this schedule → actual 2027 cost ${formatCents(PAYCHECK * 27)}`,
  scenarios: [
    {
      id: "baseline",
      label: "Baseline",
      total: formatCents(PAYCHECK * 26),
      series: map((i) => PAYCHECK * (i + 1), range(26)),
    },
  ] as ScenarioLine[],
  sourceTxns: map(
    (i): SourceTxn => ({
      id: `txn-${i + 1}`,
      date: isoPlusDays("2025-05-23", i * 14),
      amount: "$2,795.00",
    }),
    range(26),
  ),
  sourceStats: "26 transactions · $2,795.00 each · every 14 days",
};

// ── Cascade defaults (auto-filled form values) ──────────────────────────────
// Plausible values for a software company selling seats; the license figures
// match the engine's own license_tests.rs example (Pro / Acme / $50 a seat).
import type { HourlyValues, LicenseValues } from "./projection-forms.lines";

export const LICENSE_DEFAULTS: LicenseValues = {
  product: "Pro",
  customer: "Acme",
  paidTo: "Columbia Bank Checking",
  billing: "monthly",
  day: 1,
  month: 1,
  start: "2026-10-01",
  until: "",
  seats: 10,
  netPerPeriod: 2,
  priceDollars: 50,
  annualDiscountPct: 25,
  costPerSeatDollars: 4,
  costHost: "AWS",
};

export const HOURLY_DEFAULTS: HourlyValues = {
  service: "Design",
  customer: "Acme",
  paidTo: "Columbia Bank Checking",
  dow: 1,
  rateDollars: 90,
  hours: 20,
  start: "2026-10-05",
  until: "",
};

// ── Historicals: past payments the Minimal license view defaults from ───────
// The ledger carries a date, an amount and a memo; it has no seat count, so the
// memo is where "10 seats" comes from (thorcasting's Import does the same
// reading for a License card: defaults, editable).
export interface Payment {
  date: string;
  cents: number;
  memo: string;
}

export const LICENSE_HISTORY: Payment[] = [
  { date: "2026-04-01", cents: 50000, memo: "Pro x 10 seats" },
  { date: "2026-05-01", cents: 50000, memo: "Pro x 10 seats" },
  { date: "2026-06-01", cents: 50000, memo: "Pro x 10 seats" },
  { date: "2026-07-01", cents: 50000, memo: "Pro x 10 seats" },
  { date: "2026-08-01", cents: 50000, memo: "Pro x 10 seats" },
  { date: "2026-09-01", cents: 50000, memo: "Pro x 10 seats" },
];

export interface HistoryDefault<T> {
  value: T;
  /** Where the default came from, in a line. */
  caption: string;
}

const memoOf = (rows: Payment[]): { product: string; seats: number } => {
  const found = /^(.+) x (\d+) seats?$/.exec(rows[rows.length - 1]?.memo ?? "");
  return { product: found?.[1] ?? "License", seats: Number(found?.[2] ?? 1) };
};

/** The interesting license fields, read off past payments. */
export const defaultsFromHistory = (rows: Payment[]) => {
  const { product, seats } = memoOf(rows);
  const last = rows[rows.length - 1];
  const day = Number(last?.date.slice(8, 10) ?? 1);
  const sameDay = rows.filter((r) => Number(r.date.slice(8, 10)) === day).length;
  const price = (last?.cents ?? 0) / 100 / Math.max(1, seats);
  return {
    product: { value: product, caption: `from the memo on the last payment ("${last?.memo}")` },
    seats: { value: seats, caption: `from the memo: ${seats} seats` },
    priceDollars: {
      value: price,
      caption: `$${((last?.cents ?? 0) / 100).toFixed(2)} last payment ÷ ${seats} seats`,
    },
    day: { value: day, caption: `${sameDay} of ${rows.length} payments landed on day ${day}` },
  };
};

// ── Salary defaults and past paychecks ──────────────────────────────────────
import type { SalaryValues } from "./projection-forms.lines";

/** People live in the tree; a salary line names one by id (ADR 0028/0029). */
export const PEOPLE: { id: string; name: string }[] = [
  { id: "per-0123456789abcdef0123456789abcdef", name: "Michael A Arnold" },
  { id: "per-fedcba9876543210fedcba9876543210", name: "Adlai Arnold" },
];

export const SALARY_DEFAULTS: SalaryValues = {
  personId: PEOPLE[0].id,
  paidFrom: "Columbia Bank Checking",
  annualDollars: 102891.1,
  cadence: "biweekly",
  referenceDate: "2026-09-04",
  day: 1,
  start: "2026-09-04",
  until: "",
};

export interface Paycheck {
  date: string;
  cents: number;
  payee: string;
}

export const PAYCHECK_HISTORY: Paycheck[] = [
  { date: "2026-07-24", cents: 395735, payee: "Michael A Arnold" },
  { date: "2026-08-07", cents: 395735, payee: "Michael A Arnold" },
  { date: "2026-08-21", cents: 395735, payee: "Michael A Arnold" },
  { date: "2026-09-04", cents: 395735, payee: "Michael A Arnold" },
];

const gapDays = (a: string, b: string): number =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** The interesting salary fields, read off past paychecks. */
export const defaultsFromPaychecks = (rows: Paycheck[]) => {
  const last = rows[rows.length - 1];
  const gaps = rows.slice(1).map((r, i) => gapDays(rows[i].date, r.date));
  const biweekly = gaps.length > 0 && gaps.every((g) => g === 14);
  const person = PEOPLE.find((p) => p.name === last.payee) ?? PEOPLE[0];
  return {
    person: { value: person, caption: `the payee on the last ${rows.length} paychecks` },
    annualDollars: {
      value: Math.round(last.cents * 26) / 100,
      caption: `$${(last.cents / 100).toFixed(2)} a paycheck × 26`,
    },
    cadence: {
      value: biweekly ? ("biweekly" as const) : ("monthly" as const),
      caption: biweekly
        ? `every paycheck landed 14 days after the one before (${gaps.length} gaps)`
        : "the paychecks are not 14 days apart",
    },
    referenceDate: { value: last.date, caption: "the most recent paycheck" },
  };
};

// ── Hourly defaults and past invoices ───────────────────────────────────────
export interface Invoice {
  date: string;
  cents: number;
  memo: string;
}

export const INVOICE_HISTORY: Invoice[] = [
  { date: "2026-09-07", cents: 180000, memo: "Design 20 h @ $90" },
  { date: "2026-09-14", cents: 180000, memo: "Design 20 h @ $90" },
  { date: "2026-09-21", cents: 180000, memo: "Design 20 h @ $90" },
  { date: "2026-09-28", cents: 180000, memo: "Design 20 h @ $90" },
];

/** The interesting hourly fields, read off past weekly invoices. */
export const defaultsFromInvoices = (rows: Invoice[]) => {
  const last = rows[rows.length - 1];
  const found = /^(.+) (\d+(?:\.\d+)?) h @ \$(\d+(?:\.\d+)?)$/.exec(last.memo);
  const dow = new Date(`${last.date}T00:00:00Z`).getUTCDay();
  const names = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  return {
    rateDollars: { value: Number(found?.[3] ?? 0), caption: `from the memo on the last invoice ("${last.memo}")` },
    hours: { value: Number(found?.[2] ?? 0), caption: `from the memo: ${found?.[2]} hours` },
    dow: { value: dow, caption: `${rows.length} of ${rows.length} invoices fell on ${names[dow]}` },
  };
};
