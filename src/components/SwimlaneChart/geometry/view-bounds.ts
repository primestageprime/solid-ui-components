/* SwimlaneChart geometry — content bounding box.
 *
 * Aggregates node rects and boundary/bottom badge extents into the chart's
 * content bounding box (extended vertically by an edge gutter) that drives the
 * SVG viewBox / centering transform. */
import type { NodePos } from "./shared";

export interface ViewBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface ViewBoundsInput {
  positions: ReadonlyMap<string, NodePos>;
  /** Rendered boundary badges (contributes their pill extents to the bounds). */
  boundaryBadges: { badgeX: number; pillTopY: number; pillBottomY: number }[];
  /** Rendered bottom overflow badges (contributes their extents to the bounds). */
  bottomBadges: { x: number; y: number }[];
  badgeRadius: number;
  /** Vertical padding so corridor routes above/below the content have room. */
  edgeGutter: number;
}

/**
 * The content bounding box of the whole chart (node rects + boundary/bottom
 * badges), extended vertically by `edgeGutter`. Drives the SVG viewBox / centering
 * transform. Pure aggregation — returns a zeroed box when there are no nodes.
 */
export function computeViewBounds(input: ViewBoundsInput): ViewBounds {
  const { positions, boundaryBadges, bottomBadges, badgeRadius, edgeGutter } =
    input;
  if (positions.size === 0) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      centerX: 0,
      centerY: 0,
      width: 0,
      height: 0,
    };
  }
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of positions.values()) {
    minX = Math.min(minX, p.x - p.width / 2);
    maxX = Math.max(maxX, p.x + p.width / 2);
    minY = Math.min(minY, p.y - p.height / 2);
    maxY = Math.max(maxY, p.y + p.height / 2);
  }
  for (const b of boundaryBadges) {
    minX = Math.min(minX, b.badgeX - badgeRadius);
    maxX = Math.max(maxX, b.badgeX + badgeRadius);
    minY = Math.min(minY, b.pillTopY);
    maxY = Math.max(maxY, b.pillBottomY);
  }
  for (const b of bottomBadges) {
    minX = Math.min(minX, b.x - badgeRadius);
    maxX = Math.max(maxX, b.x + badgeRadius);
    maxY = Math.max(maxY, b.y + badgeRadius);
  }
  // Extend vertically so corridor routes above/below have room.
  minY -= edgeGutter;
  maxY += edgeGutter;
  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}
