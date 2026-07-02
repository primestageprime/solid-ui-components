// ─── timing ─────────────────────────────────────────────────────────────────
//
// The trajectory is parameterised on a `LaneTimingConfig` so callers
// (the workshop in particular) can tune animation speeds without
// rebuilding the module. The exported `MS_*` constants below are kept
// as the DEFAULT values and the matching phase fractions for callers
// that just want the pre-knob defaults — they're equivalent to
// `phasesFor(DEFAULT_TIMING)` with `arrowSettleMs = 0`.

export interface LaneTimingConfig {
  /** ms spent in the slurp morph (in OR out). */
  slurpMs: number;
  /** ms spent moving visible cards between columns. */
  moveMs: number;
  /**
   * NEW: ms spent in the "arrow settle" window between move-end and
   * slurp-out. During this slice cards stay at rest at their next
   * column but arrow endpoints ease from their move-end anchor toward
   * their final attach point (the card's rest edge). Set to 0 to
   * preserve the pre-knob behaviour where arrows snap at move-end.
   *
   * Mechanically: when > 0, the arriving-card anchor lerps from
   * `loz` (its anchor just before move-end) to `nextRect` (its
   * resting anchor) across the settle window, then stays fixed at
   * `nextRect` for the rest of the tick — including throughout the
   * slurp-out morph. This means the visible card emerges from the
   * lozenge but the arrow no longer chases the morph's leading edge.
   */
  arrowSettleMs: number;
  /**
   * CSS `transition: d` duration on rendered arrow paths. NOT used
   * by the trajectory math — purely a render-layer hint, so optional.
   * Smooths the orthogonal router's topology changes (e.g. Z-shape ↔
   * U-shape when an obstacle threshold flips just as a card stops
   * moving) by letting the browser interpolate path commands between
   * successive `d` values. Defaults to 0 (legacy snap behaviour).
   */
  arrowPathMs?: number;
  /**
   * CSS `transition: transform` duration (ms) for a whole lane sliding to a
   * new vertical position when lanes are re-sorted by status band (DOING
   * top → TODO → DONE bottom). NOT used by the trajectory math — purely a
   * render-layer hint on the lane `<g>`. Defaults to 420.
   */
  laneSlideMs?: number;
  /**
   * How long (ms) a lane holds its current vertical position before sliding
   * DOWN to a less-active band (e.g. into DONE on completion), so a finishing
   * item can be appreciated in place before it re-sorts away. Moves UP (work
   * becoming active) are not held — they re-sort promptly. Defaults to 10000.
   */
  reorderHoldMs?: number;
  /**
   * Debounce (ms) before a lane SHRINKS to fit fewer visible cards. Any node
   * movement in the lane resets it, so the lane only tightens after this long
   * with no movement — a card always finishes moving before the resize, and a
   * burst of moves collapses into a single resize. Growth is immediate (a new
   * card needs room). Defaults to 3000.
   */
  laneResizeSettleMs?: number;
}

/**
 * Default timing for callers that don't pass a `timing` arg. Matches
 * the pre-knob constants exactly so all existing consumers (tests,
 * AnimatedSwimlaneChart, etc.) keep their old behaviour. `arrowSettleMs`
 * defaults to 0 so the regression invariant holds.
 */
export const DEFAULT_TIMING: LaneTimingConfig = {
  slurpMs: 600,
  moveMs: 450,
  arrowSettleMs: 0,
  arrowPathMs: 0,
  laneSlideMs: 420,
  reorderHoldMs: 10000,
  laneResizeSettleMs: 3000,
};

/** Resolved phase boundaries derived from a `LaneTimingConfig`. */
export interface LanePhases {
  /** Total duration in ms — sum of slurp + move + arrowSettle + slurp. */
  total: number;
  /** Fraction of total at which the leave-slurp window ends. */
  leaveEnd: number;
  /** Fraction of total at which the card-move window ends. */
  moveEnd: number;
  /** Fraction of total at which the arrow-settle window ends. */
  settleEnd: number;
}

/** Compute phase fractions for a timing config. */
export function phasesFor(timing: LaneTimingConfig): LanePhases {
  const total =
    timing.slurpMs + timing.moveMs + timing.arrowSettleMs + timing.slurpMs;
  return {
    total,
    leaveEnd: timing.slurpMs / total,
    moveEnd: (timing.slurpMs + timing.moveMs) / total,
    settleEnd: (timing.slurpMs + timing.moveMs + timing.arrowSettleMs) / total,
  };
}

// Back-compat exports: pre-knob constants for callers that don't take
// a timing arg. These mirror the defaults exactly.
export const MS_SLURP_MS = DEFAULT_TIMING.slurpMs;
export const MS_MOVE_MS = DEFAULT_TIMING.moveMs;
export const MS_PHASE_TOTAL =
  DEFAULT_TIMING.slurpMs +
  DEFAULT_TIMING.moveMs +
  DEFAULT_TIMING.arrowSettleMs +
  DEFAULT_TIMING.slurpMs;
export const PHASE_LEAVE_END = DEFAULT_TIMING.slurpMs / MS_PHASE_TOTAL;
export const PHASE_MOVE_END =
  (DEFAULT_TIMING.slurpMs + DEFAULT_TIMING.moveMs) / MS_PHASE_TOTAL;
