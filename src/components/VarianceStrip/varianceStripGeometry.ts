// varianceStripGeometry — pure geometry for VarianceStrip (ADR 0010: the maths is a
// plain function that prints as a table, so it is tested without a DOM).
// One bar per day: its x from the chart's x scale, its height from the
// strip's own scale, which is symmetric about zero and fitted to the largest
// bar so up and down read against one axis.
import { map } from "../../fn";

export type VarianceKind = "revenue" | "costs" | "other";

export interface VarianceBarInput {
  /** The bar's x in the chart's x-domain unit. */
  readonly x: number;
  /** + is better than forecast, − is worse. */
  readonly value: number;
  readonly kind: VarianceKind;
}

export interface VarianceBand {
  /** Top of the strip, plot-local px. */
  readonly top: number;
  /** Height of the strip, px. */
  readonly height: number;
}

export interface VarianceBar {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly kind: VarianceKind;
  readonly value: number;
}

export interface VarianceStripGeometry {
  /** The zero line's y, plot-local px. */
  readonly zeroY: number;
  /** The scale's extent: the largest |value|, at least `minExtent`. */
  readonly extent: number;
  readonly bars: readonly VarianceBar[];
}

/** Inset (px) kept between the largest bar and the strip's edge. */
const EDGE_PAD = 4;
/** Gap (px) between neighbouring bars. */
const BAR_GAP = 1.5;

/**
 * Lay the bars out.
 *
 * `xScale` is the chart's; `step` is one day in x-domain units, so a bar is
 * as wide as a day's slot less the gap. `minExtent` keeps a quiet month from
 * scaling a few dollars to the full height.
 */
export const varianceStripGeometry = (a: {
  readonly data: readonly VarianceBarInput[];
  readonly xScale: (x: number) => number;
  readonly step: number;
  readonly band: VarianceBand;
  readonly minExtent: number;
}): VarianceStripGeometry => {
  const extent = Math.max(a.minExtent, ...map((d: VarianceBarInput) => Math.abs(d.value), a.data));
  const half = a.band.height / 2;
  const zeroY = a.band.top + half;
  const yOf = (v: number): number => zeroY - (v / extent) * (half - EDGE_PAD);
  const bars = map((d: VarianceBarInput): VarianceBar => {
    const width = Math.max(1, Math.abs(a.xScale(d.x + a.step) - a.xScale(d.x)) - BAR_GAP);
    const y0 = yOf(0);
    const y1 = yOf(d.value);
    return {
      x: a.xScale(d.x) - width / 2,
      y: Math.min(y0, y1),
      width,
      height: Math.max(1, Math.abs(y1 - y0)),
      kind: d.kind,
      value: d.value,
    };
  }, a.data);
  return { zeroY, extent, bars };
};
