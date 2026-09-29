// ============================================
// spanLanes — the pure core of the `SpanLanes` slot (ADR 0010: a core returns
// DATA, not JSX). No Solid, no DOM, no chart context: the adapter hands in the
// x mapping and the row geometry and draws what comes back.
//
// A SPAN is one thing over time made of SEGMENTS — a job and its phases, a
// ticket and its states — each segment a `[start, end)` in data x and a
// `kind` the adapter's `paint` turns into a fill. Spans are PACKED into the
// fewest rows: a span takes the first row whose last span has ended by the
// time it starts (end is exclusive, so touching spans share a row).
// ============================================
import { findIndex, flatMap, map, sortBy } from "../../fn";
import type { SegmentSpec, SvgBox } from "../SvgMarks/geometry";

export interface SpanSegment {
  /** Data x where the segment starts (epoch ms on a time axis). */
  readonly start: number;
  /** Data x where it ends — exclusive. */
  readonly end: number;
  /** What the segment is; the slot's `paint` turns it into a fill. */
  readonly kind: string;
}

export interface SpanDatum {
  readonly id: string | number;
  readonly segments: readonly SpanSegment[];
}

export interface Extent {
  readonly start: number;
  readonly end: number;
}

/** Earliest segment start to latest segment end, or `null` for a span with no segments. */
export const spanExtent = (span: SpanDatum): Extent | null =>
  span.segments.length
    ? {
        start: Math.min(...map((s) => s.start, span.segments)),
        end: Math.max(...map((s) => s.end, span.segments)),
      }
    : null;

export interface PackedSpan<T extends SpanDatum> extends Extent {
  readonly datum: T;
  readonly row: number;
}

/** Fewest rows, ordered by start then end. Spans with no segments are skipped. */
export const packSpans = <T extends SpanDatum>(
  data: readonly T[],
): readonly PackedSpan<T>[] => {
  const withExtent = flatMap((datum: T): (Extent & { datum: T })[] => {
    const e = spanExtent(datum);
    return e ? [{ datum, ...e }] : [];
  }, data);
  // Stable: sort by end, then by start, so start ties are broken by end.
  const byStart = (s: Extent) => s.start;
  const byEnd = (s: Extent) => s.end;
  const sorted = sortBy(byStart, sortBy(byEnd, withExtent));
  // The one register: each row's last end. Local to this call, so the
  // function stays pure.
  const ends: number[] = [];
  return map((s) => {
    const free = findIndex((end: number) => end <= s.start, ends);
    const row = free < 0 ? ends.length : free;
    ends[row] = s.end;
    return { ...s, row };
  }, sorted);
};

/** How many rows the packing needs — at least one, so an empty chart keeps its height. */
export const spanRowCount = (data: readonly SpanDatum[]): number =>
  Math.max(1, ...map((p) => p.row + 1, packSpans(data)));

export interface LaidSegment extends Omit<SegmentSpec, "fill"> {
  readonly segment: SpanSegment;
}

export interface LaidSpan<T extends SpanDatum> {
  readonly datum: T;
  readonly row: number;
  readonly box: SvgBox;
  readonly segments: readonly LaidSegment[];
}

export interface RowGeometry {
  /** Height of one row in px. */
  readonly rowHeight: number;
  /** The bar's share of its row's height, 0–1. */
  readonly barHeight: number;
}

/**
 * Each packed span as a box on its row, with its segments as FRACTIONS of that
 * box — exactly what `SegmentBar` draws. `x` maps data x to plot px.
 */
export const layoutSpans = <T extends SpanDatum>(
  packed: readonly PackedSpan<T>[],
  x: (v: number) => number,
  geo: RowGeometry,
): readonly LaidSpan<T>[] =>
  map((p) => {
    const x0 = x(p.start);
    const span = p.end - p.start;
    const h = geo.rowHeight * geo.barHeight;
    return {
      datum: p.datum,
      row: p.row,
      box: {
        x: x0,
        y: p.row * geo.rowHeight + (geo.rowHeight - h) / 2,
        width: Math.max(1, x(p.end) - x0),
        height: h,
      },
      segments: map(
        (segment) => ({
          segment,
          from: span > 0 ? (segment.start - p.start) / span : 0,
          to: span > 0 ? (segment.end - p.start) / span : 1,
        }),
        p.datum.segments,
      ),
    };
  }, packed);
