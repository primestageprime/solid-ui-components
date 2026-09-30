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
