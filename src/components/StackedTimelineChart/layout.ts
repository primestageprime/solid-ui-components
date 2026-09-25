// ============================================
// StackedTimelineChart's size-responsive chrome — pure (Depth 0). No DOM.
//
// Peter, 2026-09-25: "responsive, space-economical charts" (G17). The chart
// measures its own box; this decides what that box can afford, the way
// LevelsTimeline's compact chrome does under ~195px:
//
//   • SHORT (height < STACKED_TIMELINE_SHORT_BELOW): 3 y ticks — the fixed
//     domain's ends and middle — not the scale's 5, and a
//     tighter inset — five labels in a 150px plot stack into each other, and
//     the default 8/28px top/bottom margins are a quarter of it.
//   • NARROW (width < STACKED_TIMELINE_NARROW_BELOW): every OTHER x label, and
//     3 scale ticks instead of 5 — a year of month labels at 390px overlap.
//
// A caller's curried `margin` still wins, field by field: it was stated on
// purpose for a screen, and the compact inset only replaces the DEFAULT.
// ============================================
import type { Margin } from "../Chart/context";

/** Below this box height the chrome goes compact. */
export const STACKED_TIMELINE_SHORT_BELOW = 200;
/** Below this box width the x labels thin out. */
export const STACKED_TIMELINE_NARROW_BELOW = 400;

/** Chart's own default inset — what a full-size chart draws with. */
const FULL_MARGIN: Margin = { top: 8, right: 8, bottom: 28, left: 36 };
/** The short chart's inset: just clear of the tick labels. */
const SHORT_MARGIN: Margin = { top: 4, right: 4, bottom: 20, left: 32 };

export interface StackedTimelineLayout {
  /** Height is under the threshold. */
  short: boolean;
  /** Width is under the threshold. */
  narrow: boolean;
  /** Explicit y ticks, or `undefined` for the scale's own 5. Explicit
   *  because a tick COUNT is only a hint: d3 rounds to nice steps, so asking
   *  for 3 over [0, 80] yields 5 (step 20) and asking for 2 yields 2 (step
   *  50). The domain is fixed (bands stay comparable), so its ends and middle
   *  are exact, stable ticks. */
  yTickValues: number[] | undefined;
  /** X ticks the axis asks the scale for, when the caller gives no values. */
  xTickCount: number;
  /** Keep every Nth of the caller's x tick values (1 = all). */
  xLabelStep: number;
  /** The plot inset, after the caller's own margin. */
  margin: Margin;
}

/** What a box of this size can afford. */
export function stackedTimelineLayout(
  box: { width: number; height: number },
  yDomain: readonly [number, number],
  callerMargin: Partial<Margin> = {},
): StackedTimelineLayout {
  const [lo, hi] = yDomain;
  const short = box.height < STACKED_TIMELINE_SHORT_BELOW;
  const narrow = box.width < STACKED_TIMELINE_NARROW_BELOW;
  return {
    short,
    narrow,
    yTickValues: short ? [lo, (lo + hi) / 2, hi] : undefined,
    xTickCount: narrow ? 3 : 5,
    xLabelStep: narrow ? 2 : 1,
    margin: { ...(short ? SHORT_MARGIN : FULL_MARGIN), ...callerMargin },
  };
}

/** The caller's tick values, thinned to every `step`th (always keeping the first). */
export const thinTicks = (
  values: readonly number[],
  step: number,
): number[] => {
  const kept: number[] = [];
  for (let i = 0; i < values.length; i += Math.max(1, step)) kept.push(values[i]);
  return kept;
};
