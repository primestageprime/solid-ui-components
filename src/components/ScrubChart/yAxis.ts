// lastReviewedAt: 2026-09-02
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChart — y-axis scales, ticks and column width.
//
// One factory holds every y-axis derivation ScrubChart used to inline, plus
// the tween that yDomainTween.ts drives. It keeps TWO scales, and the split
// is the whole point:
//
//   • the TARGET scale answers the domain the chart moves toward. It fixes
//     the tick VALUES and the label-column width, so neither changes while
//     the tween runs. Ticks recomputed each frame would run the labels
//     through 17.3, 22.8, 31.6 on the way, and the column would resize on
//     every frame.
//   • the SCREEN scale answers the domain on screen right now. It POSITIONS
//     those ticks, and ScrubChart maps `yToPlot` through it, so the caller's
//     series moves with the axis instead of jumping ahead of it.
//
// At rest the two scales hold the same domain, so a chart with no tween
// behaves exactly as before.
//
// `nice()` applies to the `yDomain` prop only. A fitted domain arrives padded
// and snapped, and a pinned end must render exactly; nice() moves such an end.
// ============================================

import { type Accessor, createMemo } from "solid-js";
import { type ScaleLinear, scaleLinear } from "d3-scale";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { filter, map } from "../../fn";
import type { ScrubChartYTick } from "./ScrubChartAxes";
import { Y_LABEL_GAP, measureLabelWidth } from "./helpers";
import { type YDomain, createYDomainTween, domainHolds } from "./yDomainTween";

type YScale = ScaleLinear<number, number> | null;

/** What `createYAxisScales` reads. Every field is an accessor. */
export interface YAxisScalesOptions {
  /** The fitted domain, or `null` when `yFitDomain` gives none. */
  fittedDomain: Accessor<YDomain | null>;
  /** The `yDomain` prop — the fallback when there is no fitted domain. */
  staticDomain: Accessor<YDomain | undefined>;
  /** Top of the plot region, in px. */
  plotTop: Accessor<number>;
  /** Bottom of the plot region, in px. */
  plotBottom: Accessor<number>;
  /** The tick count the axis asks d3 for. */
  tickCount: Accessor<number>;
  /** Formats a tick value for the label column. */
  formatLabel: Accessor<(value: number) => string>;
  /** The `yAxisWidth` prop. Set, it wins over the measured width. */
  axisWidth: Accessor<number | undefined>;
  /** The narrowest column the DEFAULT width may report, in px. ScrubChart
   *  asks for the y-fit control's footprint here, so the control fits left of
   *  the plot. An explicit `axisWidth` ignores this number. */
  minWidth: Accessor<number>;
  /** Time a new fitted domain takes to reach the screen. `false` snaps. */
  transitionMs: Accessor<number | false>;
}

/** What ScrubChart renders the y-axis from. */
export interface YAxisScales {
  /** The scale on screen. `null` means the chart draws no y-axis. */
  scale: Accessor<YScale>;
  /** The ticks to draw: a target VALUE at an on-screen POSITION. */
  ticks: Accessor<ScrubChartYTick[]>;
  /** Width of the label column, in px. 0 without a y-axis. */
  width: Accessor<number>;
}

/**
 * Build the y-axis scales, ticks and column width.
 *
 * @param options See `YAxisScalesOptions`.
 * @returns The accessors ScrubChart renders from.
 */
export const createYAxisScales = (options: YAxisScalesOptions): YAxisScales => {
  // The reader's motion preference is READ REACTIVELY, so a change during the
  // session takes effect at once. `useMediaQuery` answers false without
  // `matchMedia` (SSR), which turns the tween on — the loop then simply never
  // runs, because there is no browser to run it in.
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );

  const renderedDomain = createYDomainTween({
    target: options.fittedDomain,
    transitionMs: options.transitionMs,
    reducedMotion: prefersReducedMotion,
  });

  const buildScale = (
    domain: YDomain | null | undefined,
    fitted: boolean,
  ): YScale => {
    if (!domain) return null;
    const built = scaleLinear()
      .domain(domain)
      .range([options.plotBottom(), options.plotTop()]);
    return fitted ? built : built.nice();
  };

  const targetScale = createMemo<YScale>(() => {
    const fitted = options.fittedDomain();
    return buildScale(fitted ?? options.staticDomain(), fitted != null);
  });

  const scale = createMemo<YScale>(() => {
    const shown = renderedDomain();
    return buildScale(shown ?? options.staticDomain(), shown != null);
  });

  // The tick VALUES — from the TARGET domain. See the module header.
  const tickValues = createMemo<number[]>(() => {
    const s = targetScale();
    return s ? s.ticks(options.tickCount()) : [];
  });

  const ticks = createMemo<ScrubChartYTick[]>(() => {
    const s = scale();
    if (!s) return [];
    // A target tick can sit outside the domain on screen while the tween
    // runs. Drop it until it enters the plot, so no label piles up on an edge
    // and no gridline crosses the axis chrome.
    //
    // The test reads the domain the SCREEN scale holds, in DATA units.
    // `domainHolds` owns it, so the axis drops a tick exactly while the tween
    // calls the domain unsettled. A pixel test cannot state that: it asks
    // whether the tick LANDS on the plot edge, which the range interpolation
    // answers a fraction of a pixel out, and the size of that fraction moves
    // with the plot height.
    const shown = s.domain() as YDomain;
    return map(
      (value: number) => ({ value, y: s(value) }),
      filter((value: number) => domainHolds(shown, value), tickValues()),
    );
  });

  // The width the LABELS ask for. It is measured from the TARGET labels, so
  // it holds still while the tween runs. 0 without a y-axis.
  const measuredWidth = (): number => {
    if (!targetScale()) return 0;
    const values = tickValues();
    if (values.length === 0) return 0;
    const format = options.formatLabel();
    const widest = values.reduce(
      (max, value) => Math.max(max, measureLabelWidth(format(value))),
      0,
    );
    return Math.ceil(widest + Y_LABEL_GAP);
  };

  // `minWidth` raises the MEASURED width only. Short labels ("0", "1") measure
  // narrower than the y-fit control, and the control would then overflow the
  // frame or reach into the plot. An explicit `axisWidth` still wins as given:
  // a caller who asks for a narrow column gets one, and clips the control.
  const width = createMemo<number>(() => {
    const override = options.axisWidth();
    return override != null
      ? Math.max(0, override)
      : Math.max(measuredWidth(), options.minWidth());
  });

  return { scale, ticks, width };
};
