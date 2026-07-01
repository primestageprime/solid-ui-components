// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
import { type Component, For } from "solid-js";
import { useChart } from "../Chart/context";
import { AlarmBands } from "./AlarmBands";
import { AlarmHotZones } from "./AlarmHotZones";
import { AlarmStripeDefs } from "./AlarmStripeDefs";
import {
  detectRanges,
  padRanges,
  findHotZones,
  subtractZones,
  clampRanges,
  type Pt,
} from "./alarm";

/**
 * Curried, one-call alarm overlay. Takes raw chart points and emits the
 * full alarm-overlay layer for a `<Chart>` — bands for smooth alarms,
 * striped blocks for dense clusters, lane subdivision when multiple
 * series share the panel, and the SVG defs that the stripe needs.
 *
 * Use when you don't need fine control over the pipeline. For custom
 * compositions (e.g. only showing hot zones, or skipping padding for
 * one series), reach for the base components and the pure helpers:
 *
 *   import { AlarmBands, AlarmHotZones, detectRanges, padRanges,
 *            findHotZones, subtractZones, clampRanges } from "solid-ui-components";
 *
 * Hot-zone detection is per-series: two bar codes in the same panel get
 * their own striped blocks in their own lanes, instead of merging.
 *
 * @example
 *   <Chart width={480} height={220} xDomain={[0, 199]} yDomain={[0, 100]}>
 *     <AlarmOverlay
 *       series={[
 *         { data: pointsA, threshold: 60 },
 *         { data: pointsB, threshold: 40 },
 *       ]}
 *       padFraction={0.12}
 *       depthThreshold={5}
 *     />
 *     <Grid /><XAxis /><YAxis />
 *     <LineSeries data={pointsA} x={(d) => d.x} y={(d) => d.y} stroke="#ff8080" />
 *   </Chart>
 */
export interface AlarmSeries {
  /** Raw points. */
  data: readonly Pt[];
  /** Y value at and above which the series is in alarm. */
  threshold: number;
}

export interface AlarmOverlayProps {
  /** One entry per alarm channel. Each gets its own lane in the chart. */
  series: readonly AlarmSeries[];
  /**
   * Fraction of the chart's x-domain to widen each detected alarm range
   * on each side. Pads adjacent narrow ranges into one continuous
   * overlap region (the input the hot-zone detector wants). Default `0`.
   */
  padFraction?: number;
  /**
   * Absolute concurrent-range count above which a region collapses to a
   * striped block (the "bar code" treatment). Independent of total
   * alarm count so the rule stays stable across dataset sizes. Default `5`.
   */
  depthThreshold?: number;
  /** Pattern id for the stripe fill (must be unique per page). */
  patternId?: string;
}

export const AlarmOverlay: Component<AlarmOverlayProps> = (props) => {
  const ctx = useChart();
  /* Read the chart domain from context so the overlay clips correctly
   * even if the caller hasn't tracked it themselves. */
  const xDomain = () => {
    const s = ctx.xScale();
    return s.domain as [number, number];
  };

  const perSeries = () => {
    const [xMin, xMax] = xDomain();
    const width = xMax - xMin;
    const padFrac = props.padFraction ?? 0;
    const depth = props.depthThreshold ?? 5;
    return props.series.map((s) => {
      const padded = padRanges(detectRanges(s.data, s.threshold), padFrac, width);
      const rawZones = findHotZones(padded, depth);
      return {
        bands: clampRanges(subtractZones(padded, rawZones), xMin, xMax),
        zones: clampRanges(rawZones, xMin, xMax),
      };
    });
  };

  return (
    <>
      <AlarmStripeDefs patternId={props.patternId} />
      {/* SVG paints in document order — bands first so the striped
       *  hot-zone blocks sit on top of any band that survived in the
       *  same lane (visually rare but possible at boundaries). */}
      <For each={perSeries()}>
        {(s, i) => (
          <AlarmBands ranges={s.bands} laneIndex={i()} laneCount={props.series.length} />
        )}
      </For>
      <For each={perSeries()}>
        {(s, i) => (
          <AlarmHotZones
            zones={s.zones}
            laneIndex={i()}
            laneCount={props.series.length}
            patternId={props.patternId}
          />
        )}
      </For>
    </>
  );
};
