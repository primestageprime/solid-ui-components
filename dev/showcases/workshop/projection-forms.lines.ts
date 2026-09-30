// The ADR 0029 lines the cascade's two forms emit, mirrored from thorcasting
// (paths relative to ~/Documents/clients/PrimeStage/thorcasting). Pure: no
// stores, no network. The bench prints what the form WOULD save.
//
//  LicenseLine, HourlyServiceLine  thorcasting-engine/model/src/config/line/
//                                  kindTypes.generated.ts (generated from the
//                                  Rust; the UI reads these types).
//  lowerLicense                    .../line/license.rs `License::lower`
//                                  -> a `seat_subscription` config.
//  lowerHourly                     .../line/hourly_service.rs
//                                  `HourlyService::lower` -> a `fixed_txn`
//                                  config with one `per_unit` leg.
//  landsIn                         the builder lenses choose lines by kind:
//                                  thorcasting-ui lib/lineKind.ts `statesKind`;
//                                  Licenses lib/seatSubscription/lines.ts
//                                  `isSeatSubscriptionLine`; Hourly
//                                  lib/hourlyBoard/lines.ts `isServiceLine`.
//
// Facts the engine parse enforces that this mirror respects: a license bills
// MONTHLY or ANNUALLY only (seat_subscription cadence_of_schedule); `start` is
// required on a license; an annual discount applies to an annual plan only;
// an hourly_service schedule is recurring; parties are tagged
// `account:<name>` / `counterparty:<name>`, and lower to their bare names.
import { map } from "../../../src/fn";

export type Json = Record<string, unknown>;

export type AccountRef = `account:${string}`;
export type CounterpartyRef = `counterparty:${string}`;
export type ScheduleJson = Record<string, unknown>;

export interface LicenseCost {
  paid_from: AccountRef;
  host: CounterpartyRef;
  per_seat_cents: number;
}

/** kindTypes.generated.ts `LicenseLine`. */
export interface LicenseLine {
  kind: "license";
  product: string;
  customer: CounterpartyRef;
  paid_to: AccountRef;
  schedule: ScheduleJson;
  start: string;
  until?: string;
  seed_seats: number;
  net_per_period: number;
  price_cents: number;
  annual_discount_bp?: number;
  cost?: LicenseCost;
  label?: string;
}

/** kindTypes.generated.ts `HourlyServiceLine`. */
export interface HourlyServiceLine {
  kind: "hourly_service";
  service: string;
  customer: CounterpartyRef;
  paid_to: AccountRef;
  schedule: ScheduleJson;
  rate_cents: number;
  units_x100: number;
  label?: string;
  start?: string;
  until?: string;
}

export type StoredKindLine = LicenseLine | HourlyServiceLine;

/** The config the fold reads: `{effect, params, meta?}`. */
export interface LoweredConfig {
  effect: "seat_subscription" | "fixed_txn";
  params: Json;
}

const toCents = (dollars: number): number => Math.round(dollars * 100);
const account = (name: string): AccountRef => `account:${name}`;
const counterparty = (name: string): CounterpartyRef => `counterparty:${name}`;
const nonEmpty = (text: string): boolean => text.trim() !== "";

// ── License ─────────────────────────────────────────────────────────────────

export type Billing = "monthly" | "annual";

/** What the license form holds: display units (dollars, percent), not cents. */
export interface LicenseValues {
  product: string;
  customer: string;
  paidTo: string;
  billing: Billing;
  day: number;
  month: number;
  start: string;
  until: string;
  seats: number;
  netPerPeriod: number;
  priceDollars: number;
  annualDiscountPct: number;
  costPerSeatDollars: number;
  costHost: string;
}

export const licenseSchedule = (v: LicenseValues): ScheduleJson => ({
  recurring:
    v.billing === "annual"
      ? { shape: "annual_on", month: v.month, day: v.day }
      : { shape: "day_of_month", day: v.day },
});

export const buildLicenseLine = (v: LicenseValues): LicenseLine => {
  const line: LicenseLine = {
    kind: "license",
    product: v.product,
    customer: counterparty(v.customer),
    paid_to: account(v.paidTo),
    schedule: licenseSchedule(v),
    start: v.start,
    seed_seats: v.seats,
    net_per_period: v.netPerPeriod,
    price_cents: toCents(v.priceDollars),
  };
  if (nonEmpty(v.until)) line.until = v.until;
  // A monthly plan ignores the discount, so the line does not state one.
  if (v.billing === "annual" && v.annualDiscountPct > 0) {
    line.annual_discount_bp = Math.round(v.annualDiscountPct * 100);
  }
  if (v.costPerSeatDollars > 0 && nonEmpty(v.costHost)) {
    line.cost = {
      paid_from: account(v.paidTo),
      host: counterparty(v.costHost),
      per_seat_cents: toCents(v.costPerSeatDollars),
    };
  }
  return line;
};

/** license.rs `lower`: the seat leg names bare party keys. */
export const lowerLicense = (line: LicenseLine): LoweredConfig => {
  const bare = (wire: string): string => wire.slice(wire.indexOf(":") + 1);
  const leg: Json = {
    from: bare(line.customer),
    to: bare(line.paid_to),
    seed_seats: line.seed_seats,
    net_per_period: line.net_per_period,
    price_cents: line.price_cents,
  };
  if (line.annual_discount_bp !== undefined) leg.annual_discount_bp = line.annual_discount_bp;
  if (line.label !== undefined) leg.label = line.label;
  if (line.cost) {
    leg.cost = {
      from: bare(line.cost.paid_from),
      to: bare(line.cost.host),
      per_seat_cents: line.cost.per_seat_cents,
    };
  }
  const params: Json = { schedule: line.schedule, leg, start: line.start };
  if (line.until !== undefined) params.until = line.until;
  return { effect: "seat_subscription", params };
};

// ── Hourly service ──────────────────────────────────────────────────────────

export interface HourlyValues {
  service: string;
  customer: string;
  paidTo: string;
  dow: number;
  rateDollars: number;
  hours: number;
  start: string;
  until: string;
}

export const buildHourlyLine = (v: HourlyValues): HourlyServiceLine => {
  const line: HourlyServiceLine = {
    kind: "hourly_service",
    service: v.service,
    customer: counterparty(v.customer),
    paid_to: account(v.paidTo),
    schedule: { recurring: { shape: "day_of_week", dow: v.dow } },
    rate_cents: toCents(v.rateDollars),
    units_x100: Math.round(v.hours * 100),
  };
  if (nonEmpty(v.start)) line.start = v.start;
  if (nonEmpty(v.until)) line.until = v.until;
  return line;
};

/** hourly_service.rs `lower`: one per_unit leg from the customer. */
export const lowerHourly = (line: HourlyServiceLine): LoweredConfig => {
  const bare = (wire: string): string => wire.slice(wire.indexOf(":") + 1);
  const params: Json = {
    schedule: line.schedule,
    leg: {
      from: bare(line.customer),
      to: bare(line.paid_to),
      amount: { per_unit: { rate_cents: line.rate_cents, units_x100: line.units_x100 } },
    },
  };
  if (line.start !== undefined) params.start = line.start;
  if (line.until !== undefined) params.until = line.until;
  return { effect: "fixed_txn", params };
};

// ── Lands in ────────────────────────────────────────────────────────────────

export interface Landing {
  builder: string;
  href: string;
  rule: string;
}

export const landsIn = (line: StoredKindLine): Landing =>
  line.kind === "license"
    ? {
        builder: "Licenses",
        href: "/builder/licenses",
        rule: "the line states kind license (seatSubscription/lines.ts isSeatSubscriptionLine = statesKind)",
      }
    : {
        builder: "Hourly",
        href: "/builder/hourly",
        rule: "the line states kind hourly_service (hourlyBoard/lines.ts isServiceLine = statesKind)",
      };

// ── One call: form values -> line, lowering, landing ────────────────────────

export const licenseEmission = (values: LicenseValues) => {
  const line = buildLicenseLine(values);
  return { line, lowered: lowerLicense(line), landing: landsIn(line) };
};

export const hourlyEmission = (values: HourlyValues) => {
  const line = buildHourlyLine(values);
  return { line, lowered: lowerHourly(line), landing: landsIn(line) };
};

// ── Printing ────────────────────────────────────────────────────────────────

/** Keys sorted at every depth, as serde_json writes the lowered config. */
const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return map(sortKeys, value);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      map(
        ([k, v]): [string, unknown] => [k, sortKeys(v)],
        Object.entries(value as Json).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
  }
  return value;
};

export const lineText = (line: StoredKindLine): string => JSON.stringify(line, null, 2);
export const loweredText = (config: LoweredConfig): string =>
  JSON.stringify(sortKeys(config), null, 2);
