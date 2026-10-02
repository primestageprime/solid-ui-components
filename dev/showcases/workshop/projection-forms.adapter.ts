// THE THORCASTING ADAPTER. The published Strips emit engine-neutral values
// (`AmountValue`, `CadenceValue`, `WindowValue`: integer cents, ISO dates).
// This file is what thorcasting writes: it maps those values to its stored
// line (ADR 0029 kinds license / salary / hourly_service) and to the plain
// `fixed_txn` config, using the engine's own key names
// (thorcasting-engine/model/src/config/: schedule.rs, amount.rs, fixed_txn.rs,
// line/{license,hourly_service,salary}.rs). SUI never sees any of it.
//
// In thorcasting the computed `{effect, params}` view must come from the
// engine's wasm `lower`, not a TypeScript copy (ADR 0029 section 2); the bench
// prints the stored line and the plain config only.
import {
  type AmountValue,
  type CadenceValue,
  type GrowthValue,
  type WindowValue,
  grossAdded,
  percentToBp,
} from "../../../src/components/Strips";

export type Json = Record<string, unknown>;
export type Side = "revenue" | "expense";
export type Kind = "plain" | "license" | "hourly_service" | "salary" | "product" | "subscription";

export interface StripValues {
  label: string;
  amount: AmountValue;
  cadence: CadenceValue;
  window: WindowValue;
  /** Present only for forms that compose a GrowthStrip. */
  growth?: GrowthValue;
}

// ── fragments: the key(s) each strip writes ─────────────────────────────────

/** schedule.rs: `{recurring:{shape,...}}` or `{once:{date}}`. */
export const scheduleOf = (c: CadenceValue): Json => {
  const recurring = (shape: string, extra: Json = {}): Json => ({
    recurring: { shape, ...extra },
  });
  switch (c.shape) {
    case "annual":
      return recurring("annual_on", { month: c.anchor.month, day: c.anchor.day });
    case "quarterly":
      return recurring("quarterly_from", { referenceDate: c.anchor });
    case "monthly":
      return recurring("day_of_month", { day: c.anchor });
    case "semimonthly":
      return recurring("semi_monthly");
    case "biweekly":
      return recurring("biweekly_from", { referenceDate: c.anchor });
    case "weekly":
      return recurring("day_of_week", { dow: c.anchor });
    case "daily":
      return recurring("daily");
    case "once":
      return { once: { date: c.anchor } };
  }
};

/** amount.rs leg keys for a single or range amount. */
export const amountKeys = (a: AmountValue): Json => {
  if (a.kind === "range") {
    return {
      amount_cents: a.typical,
      band: { min_cents: a.min, max_cents: a.max },
    };
  }
  if (a.kind === "single") {
    return a.per === "year"
      ? { amount: { annual: { cents: a.cents } } }
      : { amount_cents: a.cents };
  }
  return {};
};

/** The units keys a license (seats) or an hourly service (hours) writes. */
export const unitsKeys = (a: AmountValue, kind: Kind, growth?: GrowthValue): Json => {
  if (a.kind !== "units") return {};
  return kind === "license"
    ? {
        seed_seats: a.units,
        // a GrowthStrip, when the form has one, owns net new seats
        net_per_period: growth?.kind === "units" ? growth.perPeriod : a.perPeriod,
        price_cents: a.unitPrice,
      }
    : { rate_cents: a.unitPrice, units_x100: Math.round(a.units * 100) };
};

/** fixed_txn / kind-line window keys: `start`, `until`. */
export const windowKeys = (w: WindowValue): Json => ({
  ...(w.start !== undefined ? { start: w.start } : {}),
  ...(w.until !== undefined ? { until: w.until } : {}),
});

const slugOf = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "product";

/** subscription.rs leg keys for growth: `new_per_period`, `churn_bp`,
 *  `market_ceiling`. The engine has no percent growth: a percent becomes the
 *  first period's gross new units (units x pct), stated, not derived by the
 *  engine. A companion `adjust` row would be lost (it writes the register this
 *  rule also writes), so subscription growth lives only in these keys. */
export const subscriptionGrowthKeys = (units: number, g: GrowthValue | undefined): Json => ({
  new_per_period: g === undefined || g.kind === "none" ? 0 : grossAdded(units, g),
  churn_bp: percentToBp(g?.churnPct ?? 0),
  ...(g?.ceiling !== undefined ? { market_ceiling: g.ceiling } : {}),
});

/** A product's growth is a companion `adjust` config on its Volume register:
 *  percent is op scale (bp), units is op add (value). */
export const productGrowthConfig = (slug: string, g: GrowthValue | undefined): Json[] =>
  g === undefined || g.kind === "none"
    ? []
    : [
        {
          effect: "adjust",
          params: {
            schedule: { recurring: { shape: "day_of_month", day: 1 } },
            registers: [`Volume:${slug}`],
            ...(g.kind === "percent"
              ? { op: "scale", bp: percentToBp(g.pctPerPeriod) }
              : { op: "add", value: g.perPeriod }),
          },
        },
      ];

/** Which key carries the label in each shape. */
export const LABEL_KEYS: { kind: string; key: string }[] = [
  { kind: "plain fixed_txn", key: "params.leg.label" },
  { kind: "license", key: "product" },
  { kind: "hourly_service", key: "service" },
  { kind: "salary", key: "label" },
];

export const labelFragment = (key: string, name: string): Json =>
  key.includes(".") ? { params: { leg: { label: name } } } : { [key]: name };

// ── the stored line / plain config ──────────────────────────────────────────

/** The JSON a form's strips assemble to. Counterparties and accounts are
 *  placeholder labels: the strips do not ask for them. */
export const assemble = (kind: Kind, side: Side, v: StripValues): Json => {
  const schedule = scheduleOf(v.cadence);
  switch (kind) {
    case "license":
      return {
        kind: "license",
        product: v.label,
        customer: "counterparty:Customer",
        paid_to: "account:Checking",
        schedule,
        start: v.window.start ?? "2026-10-01",
        ...(v.window.until !== undefined ? { until: v.window.until } : {}),
        ...unitsKeys(v.amount, "license", v.growth),
      };
    case "hourly_service":
      return {
        kind: "hourly_service",
        service: v.label,
        customer: "counterparty:Customer",
        paid_to: "account:Checking",
        schedule,
        ...unitsKeys(v.amount, "hourly_service"),
        ...windowKeys(v.window),
      };
    case "salary":
      return {
        kind: "salary",
        person: "person:per-0123456789abcdef0123456789abcdef",
        paid_from: "account:Checking",
        schedule,
        ...amountKeys(v.amount),
        label: v.label,
        ...windowKeys(v.window),
      };
    case "product": {
      const slug = slugOf(v.label);
      const u = v.amount.kind === "units" ? v.amount : undefined;
      return {
        configs: [
          {
            effect: "product",
            params: {
              schedule,
              leg: {
                price_register: `Price:${slug}`,
                volume_register: `Volume:${slug}`,
                price_seed_cents: u?.unitPrice ?? 0,
                volume_seed: u?.units ?? 0,
                from: "Customers",
                to: "Checking",
                label: v.label,
              },
              ...windowKeys(v.window),
            },
          },
          ...productGrowthConfig(slug, v.growth),
        ],
      };
    }
    case "subscription": {
      const slug = slugOf(v.label);
      const u = v.amount.kind === "units" ? v.amount : undefined;
      return {
        effect: "subscription",
        params: {
          schedule,
          leg: {
            product: v.label,
            price_register: `Price:${slug}`,
            population_seed: u?.units ?? 0,
            price_seed_cents: u?.unitPrice ?? 0,
            ...subscriptionGrowthKeys(u?.units ?? 0, v.growth),
            from: "Subscribers",
            to: "Checking",
            label: v.label,
          },
          ...windowKeys(v.window),
        },
      };
    }
    case "plain":
      return {
        effect: "fixed_txn",
        params: {
          schedule,
          leg: {
            from: side === "revenue" ? "Customer" : "Checking",
            to: side === "revenue" ? "Checking" : "Vendor",
            label: v.label,
            ...amountKeys(v.amount),
          },
          ...windowKeys(v.window),
        },
      };
  }
};

export const prettyJson = (value: unknown): string => JSON.stringify(value, null, 2);
