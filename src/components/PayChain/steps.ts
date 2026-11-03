// ============================================
// PayChain steps — the pure rules (no DOM, no Solid).
//
// Raw pay steps arrive as the engine produced them, gap artefacts included.
// `cleanSteps` makes them a chain a person reads; `toChainSteps` words them in
// the cadence's unit. Both are pure and unit tested.
// ============================================
import { filter, map } from "../../fn";

/** One stretch of pay: an amount per period, held for a number of months or weeks. */
export interface PayStep {
  amount_cents: number;
  months?: number;
  weeks?: number;
}

export type PayCadence = "monthly" | "biweekly" | (string & {});

export type DurationUnit = "mo" | "wk";

/** What a StepChain draws for one step. */
export interface ChainStep {
  /** The amount, e.g. "$6,250/mo". */
  label: string;
  /** The duration over the arrow after it, e.g. "6mo". Absent: a blank slot. */
  span?: string;
}

const norm = (cadence: string): string => cadence.toLowerCase().replace(/[\s_-]/g, "");

/** The unit durations are written in: months for monthly, weeks for weekly cadences. */
export function unitOf(cadence: PayCadence): DurationUnit | undefined {
  const c = norm(cadence);
  if (c === "monthly") return "mo";
  if (c === "biweekly" || c === "weekly") return "wk";
  return undefined;
}

/** "bi-weekly" for biweekly, otherwise the cadence as given. */
export function cadenceTag(cadence: PayCadence): string {
  return norm(cadence) === "biweekly" ? "bi-weekly" : cadence;
}

/** "/mo" or "/biwk" on the first amount; "" for a cadence with no short form. */
export function cadenceSuffix(cadence: PayCadence): string {
  const c = norm(cadence);
  if (c === "monthly") return "/mo";
  if (c === "biweekly") return "/biwk";
  if (c === "weekly") return "/wk";
  return "";
}

/** The step's length in the cadence's unit, falling back to the other field.
 *  Undefined for an open-ended step. */
export function stepLength(step: PayStep, cadence: PayCadence): { n: number; unit: DurationUnit } | undefined {
  const pref = unitOf(cadence) ?? (step.months !== undefined ? "mo" : "wk");
  const primary = pref === "mo" ? step.months : step.weeks;
  const other = pref === "mo" ? step.weeks : step.months;
  if (primary !== undefined) return { n: primary, unit: pref };
  if (other !== undefined) return { n: other, unit: pref === "mo" ? "wk" : "mo" };
  return undefined;
}

const addField = (a: number | undefined, b: number | undefined): number | undefined =>
  a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0);

/** Drop zero-length $0 gap steps, then merge equal consecutive amounts (durations add). */
export function cleanSteps(steps: readonly PayStep[], cadence: PayCadence = "monthly"): PayStep[] {
  const kept = filter((s: PayStep) => !(s.amount_cents === 0 && stepLength(s, cadence)?.n === 0), steps);
  const out: PayStep[] = [];
  for (const s of kept) {
    const prev = out[out.length - 1];
    if (prev && prev.amount_cents === s.amount_cents) {
      const open = stepLength(prev, cadence) === undefined || stepLength(s, cadence) === undefined;
      out[out.length - 1] = open
        ? { amount_cents: s.amount_cents }
        : {
            amount_cents: s.amount_cents,
            months: addField(prev.months, s.months),
            weeks: addField(prev.weeks, s.weeks),
          };
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

/** Whole dollars, thousands separated. */
export function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

/** Clean, then word each step: the first amount carries the cadence suffix, later ones are bare. */
export function toChainSteps(steps: readonly PayStep[], cadence: PayCadence): ChainStep[] {
  const suffix = cadenceSuffix(cadence);
  return map((s: PayStep, i: number): ChainStep => {
    const len = stepLength(s, cadence);
    return {
      label: dollars(s.amount_cents) + (i === 0 ? suffix : ""),
      span: len === undefined ? undefined : `${len.n}${len.unit}`,
    };
  }, cleanSteps(steps, cadence));
}
