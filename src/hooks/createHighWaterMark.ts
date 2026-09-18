import { type Accessor, createMemo, createSignal } from "solid-js";
import { createApproachTween } from "../internal/animation/approachTween";
import {
  DEFAULT_Y_FIT_TRANSITION_MS,
  approachFraction,
} from "../components/ScrubChart/yDomainTween";
import { useMediaQuery } from "./useMediaQuery";

/**
 * A HIGH-WATER MARK for an axis ceiling: it rises with the data and never falls
 * on its own.
 *
 * An axis that re-fits on every edit jitters — drag a value down and the whole
 * chart rescales under the pointer, so the line appears to stand still while
 * the gridlines move. The mark holds the ceiling at the highest peak seen, so a
 * rise still makes room at once and a fall moves only the data. `reset()`
 * drops the mark back to the CURRENT peak, and that one fall EASES rather than
 * jumps, because it is the one move the reader asked to watch.
 *
 * The hook is unit-free: `peak` is whatever the caller's axis is in, and the
 * returned `ceiling` is in the same unit — cents for `CashflowScrubChart`'s
 * `yMax`, hours for a `Chart`'s `yDomain`.
 */
export interface HighWaterMarkOptions {
  /**
   * Time the eased fall takes, in ms. `false` snaps. Default: the same
   * duration `ScrubChart` gives its own fitted y-domain, so the two read as
   * one motion. A reader who asks for reduced motion always gets a snap.
   */
  transitionMs?: number | false;
}

export interface HighWaterMark {
  /** The ceiling to DRAW — the mark, eased on the way down. */
  ceiling: Accessor<number>;
  /** The mark itself, with no easing. What `ceiling` is moving toward. */
  mark: Accessor<number>;
  /** Drop the mark to the current peak. */
  reset: () => void;
}

/**
 * The next mark: the old mark or the new peak, whichever is higher — or the
 * peak alone right after a reset.
 */
export const nextHighWater = (
  previous: { epoch: number; mark: number },
  epoch: number,
  peak: number,
): { epoch: number; mark: number } =>
  epoch === previous.epoch
    ? { epoch, mark: Math.max(previous.mark, peak) }
    : { epoch, mark: peak };

/** Near enough to stop easing: a thousandth of the target, and never under 1. */
export const isHighWaterSettled = (current: number, target: number): boolean =>
  Math.abs(current - target) <= Math.max(1, Math.abs(target) * 0.001);

/**
 * One frame of the drawn ceiling: a RISE snaps and a FALL eases.
 *
 * A rise comes from the data, and an eased rise would let the data poke out of
 * the top of the plot for the length of the tween. A fall comes only from
 * `reset()`.
 */
export const stepHighWater = (
  current: number,
  target: number,
  dtMs: number,
  transitionMs: number,
): number => {
  if (target >= current || isHighWaterSettled(current, target)) return target;
  return current + (target - current) * approachFraction(dtMs, transitionMs);
};

/**
 * Track a high-water mark over `peak`.
 *
 * @param peak The highest value the axis has to show RIGHT NOW. Reactive.
 * @param options See `HighWaterMarkOptions`.
 * @example
 *   const top = createHighWaterMark(() => peakOf(cells()));
 *   <CashflowScrubChart cells={cells()} yMax={top.ceiling()} />
 *   <IconOnlyButton onClick={top.reset} aria-label="Fit y-axis">…</IconOnlyButton>
 */
export function createHighWaterMark(
  peak: Accessor<number>,
  options: HighWaterMarkOptions = {},
): HighWaterMark {
  const [epoch, setEpoch] = createSignal(0);
  const state = createMemo(
    (previous: { epoch: number; mark: number }) =>
      nextHighWater(previous, epoch(), peak()),
    { epoch: 0, mark: Number.NEGATIVE_INFINITY },
  );
  const mark = () => state().mark;
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const drawn = createApproachTween<number>({
    target: mark,
    transitionMs: () => options.transitionMs ?? DEFAULT_Y_FIT_TRANSITION_MS,
    reducedMotion,
    step: stepHighWater,
    settled: isHighWaterSettled,
  });
  return {
    ceiling: () => drawn() ?? mark(),
    mark,
    reset: () => setEpoch((current) => current + 1),
  };
}
