/**
 * Pure horizontal-fit math shared by AnimatedSwimlaneChart and the
 * workshop. Moved here from dev/showcases/animation-experiments.tsx
 * so the library can own the breakpoint contract.
 */

export interface LaneLayoutConfig {
  /** Card width in px. */
  cardWidth: number;
  /** Gap between adjacent card EDGES (not centers). */
  cardGap: number;
  /** Lozenge bar width in px. */
  lozengeWidth: number;
  /** Gap between outer card and lozenge in px. */
  lozengeGap: number;
  /** Outer padding each side of the stage in px. */
  padding: number;
}

export interface Breakpoint {
  /** 0, 1, 2, … */
  depth: number;
  /** 2·depth + 1 → 1, 3, 5, 7, 9 … */
  visibleCols: number;
  /** Smallest stageWidth where this depth fits with the configured padding. */
  minWidth: number;
}

export const DEFAULT_LANE_LAYOUT_CONFIG: LaneLayoutConfig = {
  cardWidth: 250,
  cardGap: 60,
  lozengeWidth: 16,
  lozengeGap: 32,
  padding: 32,
};

export function computeBreakpoints(
  config: LaneLayoutConfig,
  maxDepth: number,
): Breakpoint[] {
  const colCenterGap = config.cardWidth + config.cardGap;
  const baseContent =
    2 * (config.cardWidth / 2 + config.lozengeGap + config.lozengeWidth);
  const rows: Breakpoint[] = [];
  for (let d = 0; d <= maxDepth; d++) {
    rows.push({
      depth: d,
      visibleCols: 2 * d + 1,
      minWidth: baseContent + 2 * d * colCenterGap + 2 * config.padding,
    });
  }
  return rows;
}

export function maxDepthForWidth(
  stageWidth: number,
  config: LaneLayoutConfig = DEFAULT_LANE_LAYOUT_CONFIG,
): number {
  const colCenterGap = config.cardWidth + config.cardGap;
  const baseContent =
    2 * (config.cardWidth / 2 + config.lozengeGap + config.lozengeWidth);
  const step = 2 * colCenterGap;
  const usable = stageWidth - baseContent - 2 * config.padding;
  if (usable < 0) return 0;
  return Math.floor(usable / step);
}
