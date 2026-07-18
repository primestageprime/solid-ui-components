/* Alarm-overlay pipeline as composable pure functions.
 *
 * The shape, in order:
 *
 *   raw points  ─detectRanges─▶  alarm ranges
 *   alarm ranges ─padRanges───▶  padded ranges
 *   padded ranges ─findHotZones─▶  hot zones (block treatment)
 *   ranges, zones  ─subtractZones / clampRanges─▶  render-ready data
 *
 * Each function is total, deterministic, and free of rendering concerns.
 * Renderers (`AlarmBands`, `AlarmHotZones`, `AlarmOverlay`) consume these
 * shapes directly. Mix and match per series, or call `alarmPipeline` for
 * the canonical composition.
 *
 * Thresholds:
 *   - `padFraction` in [0, 1]: extend each range by a fraction of the
 *     chart's x-domain width. Used to merge narrow chatter bands so they
 *     visually overlap.
 *   - `depthThreshold`: absolute concurrent-range count above which a
 *     region collapses to a block. Independent of total alarm count so
 *     "barcode only at >N concurrent" doesn't drift with dataset size.
 */

import { pipe, filter, map } from "../../fn";

export type Pt = { readonly x: number; readonly y: number };
export type Range = { readonly start: number; readonly end: number };
export type HotZone = Range & { readonly count: number };

/* Contiguous x-ranges where data crosses at or above `yThreshold`. Each
 * range is closed on both ends — first sample above to last sample above
 * inclusive. */
export function detectRanges(data: readonly Pt[], yThreshold: number): Range[] {
  const out: Range[] = [];
  let openStart: number | null = null;
  let lastAboveX = 0;
  for (const p of data) {
    if (p.y >= yThreshold) {
      if (openStart === null) openStart = p.x;
      lastAboveX = p.x;
    } else if (openStart !== null) {
      out.push({ start: openStart, end: lastAboveX });
      openStart = null;
    }
  }
  if (openStart !== null) out.push({ start: openStart, end: lastAboveX });
  return out;
}

/* Widen every range by `padFraction × xDomainWidth` on each side. Used to
 * make adjacent narrow ranges overlap visually. Pad of 0 returns the
 * ranges unchanged. */
export function padRanges(
  ranges: readonly Range[],
  padFraction: number,
  xDomainWidth: number,
): Range[] {
  if (padFraction <= 0) return map((r) => ({ ...r }), ranges);
  const pad = padFraction * xDomainWidth;
  return map((r) => ({ start: r.start - pad, end: r.end + pad }), ranges);
}

/* Sweep-line detection of "hot zones" — contiguous x-regions in which
 * the count of concurrent ranges exceeds `depthThreshold` (zone forms
 * when depth > threshold).
 *
 * Returns one entry per hot zone with the bounding x-range and the count
 * of original ranges that intersect the zone (used for the `×N` badge). */
export function findHotZones(
  ranges: readonly Range[],
  depthThreshold: number,
): HotZone[] {
  if (ranges.length === 0) return [];
  const threshold = Math.max(0, depthThreshold);
  const events: { x: number; d: 1 | -1 }[] = [];
  for (const r of ranges) {
    events.push({ x: r.start, d: 1 });
    events.push({ x: r.end, d: -1 });
  }
  // Tie-break: opens before closes at the same x.
  events.sort((a, b) => a.x - b.x || b.d - a.d);
  const zones: { start: number; end: number; count: number }[] = [];
  let active = 0;
  let hotStart: number | null = null;
  for (const e of events) {
    const prev = active;
    active += e.d;
    if (prev <= threshold && active > threshold) hotStart = e.x;
    if (prev > threshold && active <= threshold && hotStart !== null) {
      zones.push({ start: hotStart, end: e.x, count: 0 });
      hotStart = null;
    }
  }
  // Drop zero-width zones and tally source-range count per zone.
  return pipe(
    zones,
    filter((z: { start: number; end: number; count: number }) => z.end > z.start),
    map((z: { start: number; end: number; count: number }) => ({
      ...z,
      count: filter((r) => r.start < z.end && r.end > z.start, ranges).length,
    })),
  );
}

/* Filter out ranges that intersect any zone (the block has replaced them
 * in the rendering). Half-open intersection so touch-edges survive. */
export function subtractZones(
  ranges: readonly Range[],
  zones: readonly Range[],
): Range[] {
  if (zones.length === 0) return map((r) => ({ ...r }), ranges);
  return filter(
    (r) => !zones.some((z) => r.start < z.end && r.end > z.start),
    ranges,
  );
}

/* Clamp ranges to a visible domain. Preserves extra fields (e.g.
 * HotZone.count). Drops fully-outside; trims partial overhang. */
export function clampRanges<T extends Range>(
  ranges: readonly T[],
  xMin: number,
  xMax: number,
): T[] {
  return pipe(
    ranges,
    map((r: T) => ({
      ...r,
      start: Math.max(xMin, r.start),
      end: Math.min(xMax, r.end),
    })),
    filter((r: T) => r.end > r.start),
  );
}

/* Full per-series pipeline in one call. Returns the render-ready
 * `visibleRanges` (bands to draw smooth) and `visibleHotZones` (blocks
 * to draw striped) for a single series. */
export function alarmPipeline(
  data: readonly Pt[],
  opts: {
    yThreshold: number;
    /** Pad as a fraction of `xDomainWidth`. */
    padFraction?: number;
    /** Width of the chart x domain (xMax - xMin). */
    xDomainWidth: number;
    /** Min of the chart x domain — used for clamping output. */
    xMin?: number;
    /** Absolute concurrent-overlap count above which a hot zone forms. */
    depthThreshold?: number;
  },
): {
  ranges: Range[];
  padded: Range[];
  hotZones: HotZone[];
  visibleRanges: Range[];
  visibleHotZones: HotZone[];
} {
  const xMin = opts.xMin ?? 0;
  const xMax = xMin + opts.xDomainWidth;
  const ranges = detectRanges(data, opts.yThreshold);
  const padded = padRanges(ranges, opts.padFraction ?? 0, opts.xDomainWidth);
  const hotZones = findHotZones(padded, opts.depthThreshold ?? 0);
  const visibleRanges = clampRanges(
    subtractZones(padded, hotZones),
    xMin,
    xMax,
  );
  const visibleHotZones = clampRanges(hotZones, xMin, xMax);
  return { ranges, padded, hotZones, visibleRanges, visibleHotZones };
}
