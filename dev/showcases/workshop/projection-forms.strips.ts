// The forms of the gallery: each stacks the four published strips. Values are
// the strips' own engine-neutral values; the adapter file maps them to JSON.
import {
  CADENCE_SHAPES,
  type AmountValue,
  type CadenceShape,
  type CadenceValue,
  type WindowValue,
} from "../../../src/components/Strips";
import type { Kind, Side, StripValues } from "./projection-forms.adapter";

export type WindowMode = "both" | "start" | "end";
export type AmountVariant = "amount" | "small" | "large" | "seats" | "hours";

export interface FormDef {
  id: string;
  name: string;
  /** Recipe: Amount + Cadence + Window. */
  recipe: string;
  kind: Kind;
  /** Direction is fixed by the kind, or follows the gallery split. */
  side: Side | "split";
  amountVariant: AmountVariant;
  /** The cadences the form's kind or recipe allows (the kind narrows these). */
  cadences: CadenceShape[];
  window: WindowMode;
  start: StripValues;
  note?: string;
}

const single = (cents: number, per: "payment" | "year" = "payment"): AmountValue => ({
  kind: "single",
  cents,
  per,
});
const range = (min: number, typical: number, max: number): AmountValue => ({
  kind: "range",
  min,
  typical,
  max,
});
const none: WindowValue = {};

const form = (
  id: string,
  name: string,
  recipe: string,
  start: StripValues,
  rest: Partial<FormDef> = {},
): FormDef => ({
  id,
  name,
  recipe,
  kind: "plain",
  side: "split",
  amountVariant: start.amount.kind === "range" && start.amount.max <= 999_999 ? "small" : "amount",
  cadences: [start.cadence.shape],
  window: "both",
  start,
  ...rest,
});

const monthly = (day: number | "last"): CadenceValue => ({ shape: "monthly", anchor: day });

export const FORMS: FormDef[] = [
  form("monthly-fixed", "Monthly fixed", "Single + Monthly + —", {
    label: "RTH Contracts", amount: single(1_000_000), cadence: monthly(1), window: none,
  }),
  form("monthly-variable", "Monthly variable", "Range + Monthly + —", {
    label: "Groceries", amount: range(30_000, 45_000, 70_000), cadence: monthly(1), window: none,
  }),
  form("weekly-fixed", "Weekly fixed", "Single + Weekly + —", {
    label: "Cursor", amount: single(802), cadence: { shape: "weekly", anchor: 1 }, window: none,
  }, { amountVariant: "small" }),
  form("weekly-variable", "Weekly variable", "Range + Weekly + —", {
    label: "Support hours", amount: range(200_000, 500_000, 4_000_000), cadence: { shape: "weekly", anchor: 5 }, window: none,
  }),
  form("daily-fixed", "Daily fixed", "Single + Daily + —", {
    label: "Daily sales", amount: single(12_500), cadence: { shape: "daily" }, window: none,
  }, { amountVariant: "small" }),
  form("quarterly", "Quarterly", "Single + Quarterly + —", {
    label: "Bank fee", amount: single(3_500), cadence: { shape: "quarterly", anchor: "2025-12-15" }, window: none,
  }, { amountVariant: "small" }),
  form("annual", "Annual", "Single + Annual + —", {
    label: "Registration", amount: single(190_000), cadence: { shape: "annual", anchor: { month: 4, day: 1 } }, window: none,
  }),
  form("one-time", "One-time", "Single + Once + —", {
    label: "Logo design", amount: single(50_000), cadence: { shape: "once", anchor: "2026-11-25" }, window: none,
  }, { window: "both" }),
  form("terminal", "Terminal recurring", "Single + Monthly + end", {
    label: "Tranche 1", amount: single(1_120_000), cadence: monthly(9), window: { until: "2027-06-30" },
  }, { window: "end" }),
  form("deferred", "Deferred recurring", "Single + Monthly + start", {
    label: "Office 309", amount: single(138_900), cadence: monthly(5), window: { start: "2027-01-01" },
  }, { window: "start" }),
  form("retainer", "Retainer", "Single + Monthly + — (preset)", {
    label: "Acme retainer", amount: single(600_000), cadence: monthly(1), window: none,
  }, {
    side: "revenue",
    note: "A preset of Monthly fixed in the Support category; thorcasting has no retainer type.",
  }),
  form("license", "License", "Units x price + Monthly|Annual + start", {
    label: "Pro licenses",
    amount: { kind: "units", units: 10, unitPrice: 5_000, perPeriod: 2 },
    cadence: monthly(1),
    window: { start: "2026-10-01" },
  }, {
    kind: "license",
    side: "revenue",
    amountVariant: "seats",
    cadences: ["monthly", "annual"],
    note: "Kind license: a seat plan bills monthly or annually only, and needs a start.",
  }),
  form("hourly", "Hourly service", "Units x price + recurring + —", {
    label: "Design support",
    amount: { kind: "units", units: 20, unitPrice: 9_000, perPeriod: 0 },
    cadence: { shape: "weekly", anchor: 1 },
    window: { start: "2026-10-05" },
  }, {
    kind: "hourly_service",
    side: "revenue",
    amountVariant: "hours",
    cadences: ["weekly", "biweekly", "semimonthly", "monthly", "daily"],
    note: "Kind hourly_service: recurring schedules only (no Once, no Quarterly or Annual).",
  }),
  form("salary", "Salary", "Single per year + Bi-weekly|Semi-monthly|Monthly + —", {
    label: "Michael A Arnold",
    amount: single(10_289_110, "year"),
    cadence: { shape: "biweekly", anchor: "2026-09-04" },
    window: none,
  }, {
    kind: "salary",
    side: "expense",
    cadences: ["biweekly", "semimonthly", "monthly"],
    note: "Kind salary: recurring pay on a bi-weekly, semi-monthly or monthly schedule.",
  }),
];

export const ALL_CADENCE_COUNT = CADENCE_SHAPES.length;

/** Names for display. */
export const cadenceLabels = (ids: CadenceShape[]): string =>
  ids
    .map((id) => CADENCE_SHAPES.find((c) => c.shape === id)?.label ?? id)
    .join(" | ");

export const EXCEPTIONS: { form: string; why: string }[] = [
  { form: "Punch-card package", why: "A cohort of buyers: engine rule runs once, and the engine silently drops it when recurring." },
  { form: "Product sale growth models", why: "Companion rows: price and volume registers plus growth rows." },
  { form: "Subscription population", why: "New and churned customers each period, not a price times a count." },
  { form: "Contract payment", why: "Net terms shift the cash date from the invoice date." },
  { form: "Salary change", why: "Set, add or scale a register at a date; it edits a salary, it does not pay one." },
  { form: "Spend up to", why: "A budget cap, once only; the engine silently drops it when recurring." },
  { form: "Afford when", why: "The date comes from the balance, not a calendar." },
  { form: "Runway ladder", why: "Its money lives inside the schedule." },
];
