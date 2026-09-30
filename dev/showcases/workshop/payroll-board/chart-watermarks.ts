// Payroll board — a BENCH SHIM for `createAxisWaterMarks`.
//
// DEPRECATED ON ARRIVAL — delete this file when event-flags lands
// `src/hooks/createAxisWaterMarks.ts` (branch feat/levels-timeline-flags) and
// import `createAxisWaterMarks` / `holdFitDomain` from `src/hooks` instead.
// Until then the main checkout has only `createHighWaterMark`, so this shim
// builds the SAME two marks from it (one on the ceiling, one on the negated
// floor) behind the SAME signature, `(fitted, options?) → { domain, reset }`.
// Nothing here is new behaviour: it is that hook's body, pending its merge.
import type { Accessor } from "solid-js";
import {
  type HighWaterMarkOptions,
  createHighWaterMark,
  nextHighWater,
} from "../../../../src/hooks/createHighWaterMark";
import type { HoldStep, YDomain } from "./chart-strategy";

/** createAxisWaterMarks' input: a fitted y extent. */
export interface FitDomain {
  readonly min: number;
  readonly max: number;
}

/** createAxisWaterMarks' output. */
export interface AxisWaterMarks {
  readonly domain: Accessor<[number, number] | null>;
  readonly reset: () => void;
}

/** Shim of `createAxisWaterMarks` — same signature, same two marks. */
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

interface Held {
  readonly epoch: number;
  readonly high: number;
  readonly low: number;
}

/** Shim of `holdFitDomain` as a `HoldStep`, for the headless observation. */
export const WATER_MARK_HOLD: HoldStep<Held> = {
  initial: {
    epoch: 0,
    high: Number.NEGATIVE_INFINITY,
    low: Number.POSITIVE_INFINITY,
  },
  step: (held, epoch, fitted) => {
    if (fitted === null) return epoch === held.epoch ? held : { ...WATER_MARK_HOLD.initial, epoch };
    const high = nextHighWater({ epoch: held.epoch, mark: held.high }, epoch, fitted[1]);
    const low = nextHighWater({ epoch: held.epoch, mark: -held.low }, epoch, -fitted[0]);
    return { epoch, high: high.mark, low: -low.mark };
  },
  domainOf: (held): YDomain | null =>
    Number.isFinite(held.high) && Number.isFinite(held.low)
      ? [held.low, held.high]
      : null,
};
