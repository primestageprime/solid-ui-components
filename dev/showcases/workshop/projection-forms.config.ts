// What the two reference forms EMIT, mirrored from thorcasting. Pure functions,
// no stores, no network. Every shape below is copied from a thorcasting source
// file (paths relative to ~/Documents/clients/PrimeStage/thorcasting) so the
// bench prints the REAL projection config, not an invention.
//
//  1. LegacyRow   - what a form's `build()` returns today and what Save sends
//                   (reducer args). Source: thorcasting-ui/src/lib/
//                   configFormShapes/{formBuilders.ts `row`/`txnEffect`,
//                   recurringForms.ts monthly-fixed, anchoredForms.ts
//                   biweekly-reference}.
//  2. WireConfig  - the stored `config_json {effect, params, meta}` the fold
//                   reads; minted from the legacy row by the store-boundary
//                   shim. Source: thorcasting-ui/src/lib/configEffectShim.ts
//                   `configJsonFromLegacy` (createTxn -> fixed_txn, schedule
//                   carried as `{shape, ...args}`, legs renamed from/to).
//                   Consumed by thorcasting-engine/model/src/config/
//                   fixed_txn.rs `FixedTxnParams::parse` -> rules/recur.rs
//                   `Recur`; schedule by `Schedule::from_predicate`.
//  3. landsIn     - which builder tab picks the line up. Mirrors today's
//                   hand-written lens tests (ADR 0029 will replace them with the
//                   line `kind`): payrollRoster.ts:64, hourlyBoard/lines.ts:85,
//                   contractRoster.ts contractRoster(), productRoster.ts:113.
import { perPaycheckCents } from "./projection-forms.fixtures";

export type Json = Record<string, unknown>;

/** thorcasting-ui/src/lib/configFormShapes/classify.ts FormContext. */
export interface FormContext {
  side: "revenue" | "expense";
  bucketId: string;
  mineAccount: string;
  counterparty: string;
}

/** thorcasting-ui/src/lib/configFormShapes/classify.ts contextAccounts. */
const accountsOf = (ctx: FormContext): { fromAccount: string; toAccount: string } =>
  ctx.side === "expense"
    ? { fromAccount: ctx.mineAccount, toAccount: ctx.counterparty }
    : { fromAccount: ctx.counterparty, toAccount: ctx.mineAccount };

/** The reducer args a Save writes (SavedRowFields, configFormAdapter/save.ts)
 *  plus the row identity the Configure pane holds (StoredRow in
 *  screens/configure/configCardTypes.ts). */
export interface LegacyRow {
  name: string;
  side: string;
  bucketId: string;
  tags: string[];
  predicateId: string;
  predicateArgs: Json;
  effects: { createTxn: Json[] };
}

/** thorcasting-engine/model/src/config/fixed_txn.rs params, as the shim writes. */
export interface WireConfig {
  effect: "fixed_txn";
  params: { schedule: Json; legs: Json[]; start?: string; until?: string; shift_days?: number };
  meta?: Json;
}

const toCents = (dollars: number): number => Math.round(dollars * 100);

/** formBuilders.ts `row` + `txnEffect`. */
const rowOf = (
  name: string,
  ctx: FormContext,
  tags: string[],
  predicateId: string,
  predicateArgs: Json,
  amountCents: number,
): LegacyRow => ({
  name,
  side: ctx.side,
  bucketId: ctx.bucketId,
  tags,
  predicateId,
  predicateArgs,
  effects: { createTxn: [{ amount_cents: amountCents, ...accountsOf(ctx) }] },
});

// ── the two forms' build() ──────────────────────────────────────────────────

/** recurringForms.ts `monthly-fixed`: isDayOfMonth{day} + createTxn. */
export const buildMonthlyFixed = (
  v: { name: string; amount: number | undefined; day: number | "last" },
  ctx: FormContext,
): LegacyRow =>
  rowOf(v.name, ctx, [], "isDayOfMonth", { day: v.day }, toCents(v.amount ?? 0));

/** anchoredForms.ts `biweekly-reference`: isBiweeklyFrom{referenceDate} +
 *  createTxn{amount = annual / 26, round half-even (payMath.ts
 *  perPaycheckFromAnnual)}. The payroll role is a TAG (roleField.tsx:
 *  `role:architect`), merged into tags_json, never a form field. */
export const buildBiweeklyReference = (
  v: { name: string; annual: number | undefined; referenceDate: string; role: string },
  ctx: FormContext,
): LegacyRow =>
  rowOf(
    v.name,
    ctx,
    v.role === "architect" ? ["role:architect"] : [],
    "isBiweeklyFrom",
    { referenceDate: v.referenceDate },
    perPaycheckCents(v.annual ?? 0),
  );

// ── legacy -> wire (configEffectShim.ts configJsonFromLegacy, createTxn path) ─

const SHAPE_BY_PREDICATE: Record<string, string> = {
  isDayOfMonth: "day_of_month",
  isDayOfWeek: "day_of_week",
  isBiweekly: "biweekly",
  isBiweeklyFrom: "biweekly_from",
  isOnDate: "on_date",
  isAnnualOn: "annual_on",
  isQuarterlyFrom: "quarterly_from",
  isDaily: "daily",
};

/** Keys sorted at every depth, as the shim's canonicalJson writes them. */
const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Json)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  }
  return value;
};

export const wireFromLegacy = (row: LegacyRow): WireConfig => {
  const args = row.predicateArgs;
  const schedule = { ...args, shape: SHAPE_BY_PREDICATE[row.predicateId] ?? row.predicateId };
  const legs = row.effects.createTxn.map((leg) => ({
    from: leg.fromAccount,
    to: leg.toAccount,
    amount_cents: leg.amount_cents,
  }));
  return sortKeys({ effect: "fixed_txn", params: { schedule, legs } }) as WireConfig;
};

// ── the pretty text the panes print ─────────────────────────────────────────

export const legacyText = (row: LegacyRow): string =>
  JSON.stringify(
    {
      name: row.name,
      side: row.side,
      bucketId: row.bucketId,
      tags: row.tags,
      predicateId: row.predicateId,
      predicateArgs: row.predicateArgs,
      effects: row.effects,
    },
    null,
    2,
  );

export const wireText = (config: WireConfig): string => JSON.stringify(config, null, 2);

// ── which builder tab picks the line up ─────────────────────────────────────

export interface Landing {
  /** The builder tab, or "none". */
  builder: string;
  /** The rule that decided it, with its source. */
  rule: string;
  /** Builders that read this line's effect on someone else's card. */
  also: string[];
  /** false when no lens claims the line today. */
  claimed: boolean;
}

/** One line in, the lens that claims it out. Mirrors the hand-written lens
 *  tests listed at the top of this file (today's rule; ADR 0029 replaces them
 *  with the line's `kind`). */
export const landsIn = (row: LegacyRow): Landing => {
  const legCount = row.effects.createTxn.length;
  if (row.bucketId === "exp-salary" && row.predicateId !== "isOnDate") {
    const architect = row.tags.includes("role:architect");
    return {
      builder: "Payroll",
      rule: "bucket exp-salary and not a one-time payment (payrollRoster.ts:64)",
      also: architect ? ["Rates", "Tiers (counted as an architect: role:architect)"] : [],
      claimed: true,
    };
  }
  if (row.bucketId === "rev-support" && row.predicateId === "isDayOfWeek" && legCount === 1) {
    return {
      builder: "Hourly",
      rule: "bucket rev-support, weekly (isDayOfWeek), exactly one leg (hourlyBoard/lines.ts:85)",
      also: [],
      claimed: true,
    };
  }
  if (row.bucketId === "rev-contract" && legCount > 0) {
    return {
      builder: "Contracts",
      rule: "bucket rev-contract with a createTxn leg; grouped by the contract: tag (contractRoster.ts)",
      also: ["Rates", "Tiers (price the contract's phases)"],
      claimed: true,
    };
  }
  if (row.bucketId === "rev-license") {
    return {
      builder: "none yet (Licenses)",
      rule: "Licenses lens is not built (licenseBoard/fromConfigs.ts); planned: engine kind license (ADR 0029)",
      also: [],
      claimed: false,
    };
  }
  return {
    builder: "none (Configure and Import only)",
    rule: "no builder lens claims this bucket and schedule",
    also: [],
    claimed: false,
  };
};
