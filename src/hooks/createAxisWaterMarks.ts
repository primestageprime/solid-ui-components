import { type Accessor, createSignal } from "solid-js";
import { map } from "../fn";
import {
  type HighWaterMarkOptions,
  createHighWaterMark,
  nextHighWater,
} from "./createHighWaterMark";

/**
 * AXIS WATER MARKS — a held y-domain: it EXPANDS with the data at once and
 * never shrinks on its own; one `reset()` fits it back to the current data
 * (Peter, 2026-09-18 and 2026-09-24: the pay-levels chart "ships with the
 * manual shrink (and auto expand) behavior").
 *
 * The ceiling is a HIGH-water mark; the floor is the same rule mirrored, a
 * LOW-water mark that only deepens. A drag that shrinks the data moves the
 * line and leaves the axis alone, so the plot never rescales under the
 * pointer. The one fall is the reset, and it EASES, because it is the one
 * move the reader asked to watch.
 *
 * Promoted from thorcasting's `~/lib/axisWaterMarks` (add/deprecate/delete:
 * it can now delete its copy). Built on `createHighWaterMark` — once for the
 * ceiling, once for the NEGATED floor — so the ratchet and the eased fall are
 * that hook's, not a second implementation.
 *
 * Unit-free: whatever the chart's y is in. A consumer composes it with its
 * chart's own y-domain prop and a shrink control:
 *
 *   const axis = createAxisWaterMarks(() => levelsValueFit(levels()));
 *   <IconOnlyButton onClick={axis.reset} aria-label="Fit y-axis to current values">…
 *   <PayTimeline valueDomain={axis.domain() ?? undefined} … />
 */

/** A fitted y extent, in the chart's own unit. */
export interface FitDomain {
  readonly min: number;
  readonly max: number;
}

/** The two marks, and the epoch they were taken in. */
export interface HeldDomain {
  readonly epoch: number;
  /** The highest `max` seen this epoch. */
  readonly high: number;
  /** The lowest `min` seen this epoch. */
  readonly low: number;
}

/** No mark yet: the first fit sets both. */
export const NO_HELD_DOMAIN: HeldDomain = {
  epoch: 0,
  high: Number.NEGATIVE_INFINITY,
  low: Number.POSITIVE_INFINITY,
};

/**
 * The next held domain — THE PURE STEP. The ceiling rises to `fitted.max`
 * and holds, the floor deepens to `fitted.min` and holds; a new `epoch` (a
 * reset) drops both to the fit. A null fit (nothing drawn) keeps the marks.
 *
 * The floor reuses the ceiling ratchet on the negated minimum: a low that
 * only deepens is a high on `-min` that only rises.
 */
export const holdFitDomain = (
  previous: HeldDomain,
  epoch: number,
  fitted: FitDomain | null,
): HeldDomain => {
  if (fitted === null) {
    return epoch === previous.epoch ? previous : { ...NO_HELD_DOMAIN, epoch };
  }
  const high = nextHighWater(
    { epoch: previous.epoch, mark: previous.high },
    epoch,
    fitted.max,
  );
  const low = nextHighWater(
    { epoch: previous.epoch, mark: -previous.low },
    epoch,
    -fitted.min,
  );
  return { epoch, high: high.mark, low: -low.mark };
};

/** The `[min, max]` pair to draw, or null while nothing has been held. */
export const heldDomainOf = (held: HeldDomain): [number, number] | null =>
  Number.isFinite(held.high) && Number.isFinite(held.low)
    ? [held.low, held.high]
    : null;

/** The reactive marks over a fitted domain. */
export interface AxisWaterMarks {
  /** The domain to DRAW: held ceiling and floor, eased on the way in. */
  readonly domain: Accessor<[number, number] | null>;
  /** Drop both marks to the current fit. */
  readonly reset: () => void;
}

/**
 * Hold `fitted` — expand at once, shrink only on `reset()`. The domain is
 * null until a fit has been seen, so a consumer falls back to its chart's own
 * derived range for the first frame.
 */
export function createAxisWaterMarks(
  fitted: Accessor<FitDomain | null>,
  options: HighWaterMarkOptions = {},
): AxisWaterMarks {
  const top = createHighWaterMark(
    () => fitted()?.max ?? Number.NEGATIVE_INFINITY,
    options,
  );
  const bottom = createHighWaterMark(
    () => -(fitted()?.min ?? Number.POSITIVE_INFINITY),
    options,
  );
  return {
    domain: () => {
      const high = top.ceiling();
      const low = -bottom.ceiling();
      return Number.isFinite(high) && Number.isFinite(low) ? [low, high] : null;
    },
    reset: () => {
      top.reset();
      bottom.reset();
    },
  };
}

/**
 * The same hold for a fit computed INSIDE someone else's memo, where no
 * signal may be written: `hold` keeps the previous marks in a plain variable
 * and reads an epoch signal, so `reset` re-runs the memo that calls it.
 */
export interface HeldFit {
  readonly hold: (fitted: FitDomain | null) => [number, number] | null;
  readonly reset: () => void;
}

export function createHeldFit(): HeldFit {
  const [epoch, setEpoch] = createSignal(0);
  let held = NO_HELD_DOMAIN;
  return {
    hold: (fitted) => {
      held = holdFitDomain(held, epoch(), fitted);
      return heldDomainOf(held);
    },
    reset: () => setEpoch((current) => current + 1),
  };
}

// ── The headless observation ────────────────────────────────────────────────

/** One frame of input: a fit, and whether the reader clicked shrink first. */
export interface WaterMarkFrame {
  readonly fitted: FitDomain | null;
  readonly reset?: boolean;
}

/** One printed row: what the fit said, and what the axis held. */
export interface WaterMarkRow {
  readonly frame: number;
  readonly reset: boolean;
  readonly fittedMin: number | null;
  readonly fittedMax: number | null;
  readonly heldMin: number | null;
  readonly heldMax: number | null;
}

/**
 * Run frames through `holdFitDomain` and tabulate them, so an agent can read
 * twenty frames of an axis without a browser.
 */
export function observeAxisWaterMarks(
  frames: readonly WaterMarkFrame[],
): readonly WaterMarkRow[] {
  let held = NO_HELD_DOMAIN;
  let epoch = 0;
  return map((frame: WaterMarkFrame, index: number): WaterMarkRow => {
    if (frame.reset === true) epoch += 1;
    held = holdFitDomain(held, epoch, frame.fitted);
    const domain = heldDomainOf(held);
    return {
      frame: index,
      reset: frame.reset === true,
      fittedMin: frame.fitted?.min ?? null,
      fittedMax: frame.fitted?.max ?? null,
      heldMin: domain?.[0] ?? null,
      heldMax: domain?.[1] ?? null,
    };
  }, frames);
}
