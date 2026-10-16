// ============================================
// Slider logic — pure, headless, no Solid, no DOM.
//
// What the ticks are and what a typed figure becomes are facts about the
// DOMAIN, not about the DOM, so they live here and print as tables
// (logic.test.ts). Slider.tsx only draws what these return. Lowercase
// filename on purpose: a PascalCase `.tsx` under src/components registers as
// a component owing a showcase (see MutationSliders/rows.ts).
// ============================================
import { filter } from "../../fn";
import { clamp } from "../../internal/math/clamp";

/** Kobalte's own default, repeated so the ticks and the thumb agree. */
export const DEFAULT_STEP = 1;

const NO_TICKS: readonly number[] = [];

/**
 * Every step from `min` to `max`, inclusive, and never one past `max`.
 *
 * A `step` that does not divide the domain evenly simply stops short: a domain
 * of `0..15` by `4` marks 0, 4, 8 and 12, because a notch at 16 would sit off
 * the track and a notch at 15 is not a step.
 */
export const ticksFromStep = (
  min: number,
  max: number,
  step: number,
): readonly number[] =>
  Array.from(
    { length: Math.floor((max - min) / step) + 1 },
    (_, index) => min + index * step,
  );

/** Whether a tick names a value the thumb can actually reach. */
const isInDomain =
  (min: number, max: number) =>
  (value: number): boolean =>
    value >= min && value <= max;

/** The notch values `ticks` asks for, in the consumer's own units. */
export const resolveTicks = (
  ticks: boolean | readonly number[] | undefined,
  min: number,
  max: number,
  step: number,
): readonly number[] =>
  ticks === true
    ? ticksFromStep(min, max, step)
    : // What is left is an array, `false` or nothing; the last two mark nothing.
      filter(
        isInDomain(min, max),
        typeof ticks === "object" ? ticks : NO_TICKS,
      );

/**
 * Pull a typed number onto the domain: clamped to `[min, max]`, then to the
 * nearest step counted FROM `min` — the same grid the thumb moves on, so a
 * typed value can never land where a drag cannot.
 *
 * `toFixed(10)` drops the float noise that `min + n * step` leaves behind on a
 * fractional step (0.1 + 3 * 0.1 is 0.4000000000000001).
 */
export const snapToDomain = (
  value: number,
  min: number,
  max: number,
  step: number,
): number => {
  const onGrid = min + Math.round((clamp(value, min, max) - min) / step) * step;
  return clamp(Number.parseFloat(onGrid.toFixed(10)), min, max);
};

/** The domain a typed figure is read against. */
export interface TypedDomain {
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  /** The value the slider already holds. Typing it again emits nothing. */
  readonly current: number;
}

/**
 * What the editable readout commits for the text `raw`: the figure snapped
 * onto the domain, or `null` when nothing should be emitted — text that is
 * not a number, or a figure that lands on the value already held. The field
 * hands back TEXT, not a number, so a half-typed "-" or "1." survives the
 * keystroke that produced it; it is this function that says it moves nothing.
 */
export const commitTyped = (
  raw: string,
  domain: TypedDomain,
): number | null => {
  const typed = Number.parseFloat(raw);
  if (!Number.isFinite(typed)) return null;
  const next = snapToDomain(
    typed,
    domain.min,
    domain.max,
    domain.step ?? DEFAULT_STEP,
  );
  return next === domain.current ? null : next;
};
