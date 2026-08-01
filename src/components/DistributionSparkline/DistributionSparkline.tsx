// ============================================
// DistributionSparkline — Atomic (Depth 1)
// Owns CSS (DistributionSparkline.css), no component imports.
//
// A sparkline that says what the series DID as well as where it went. Where
// TrendSparkline draws a line in a trend colour, this draws:
//
//   solid box       the series' min..max, filled with the direction shading
//   dashed rules    the series' percentile band, top and bottom, full width —
//                   always inside the box, since a percentile cannot escape
//                   the values it came from
//   hairline        the mean
//   the line        the series itself, clipped to the plot
//
// Reach for it when the UX has to justify a number: how wide the spread is,
// where the series usually sits, how far the tails reach. For "a number and
// which way it is going", TrendSparkline is smaller and says less on purpose.
//
// `yDomain` is REQUIRED and is DATA, not visual config. Auto-scaled, every
// range box fills its rect and the encoding says nothing — the picture only
// means something when a whole set of sparklines shares one domain. What
// counts as "the set" is the caller's modelling problem; `p95DomainOf` in
// ./domain is the rule we reach for most, not the only one.
//
//   const axis = p95DomainOf(map(prop("series"), sources));
//   <P95Sparkline values={source.series} yDomain={axis} />
//
// RESPONSIVE: it fills its container in both axes and stretches — no aspect
// ratio to honour — so it absorbs height from its row and width from its
// column. Strokes are non-scaling, so a wide short cell does not produce fat
// horizontals and hairline verticals. Below 100px wide the percentile rules
// hide themselves (container query): four horizontal marks in that space is
// mud, and the range box plus the line are the two that still read.
// ============================================
import { type Component, type JSX, Show, createUniqueId, splitProps } from "solid-js";
import { join, length, map, mean } from "../../fn";
import { percentileOf } from "./domain";
import "./DistributionSparkline.css";

export type DistributionTrend = "up" | "down" | "flat";

/** The direction rule: last above first → up, below → down, equal → flat. */
export const distributionTrendOf = (
  initial: number,
  final: number,
): DistributionTrend => (final > initial ? "up" : final < initial ? "down" : "flat");

/** Which marks a variant draws. Every one is compile-time config, never a
 *  call-site prop — the call site passes data and nothing else. */
export interface DistributionMarks {
  /** The min..max box. */
  range?: boolean;
  /** The percentile rules. */
  typical?: boolean;
  /** The mean hairline. */
  mean?: boolean;
}

export interface DistributionSparklineProps
  extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The series, oldest first. */
  values: number[];
  /** The shared value range every sparkline in the set is drawn against.
   *  Required: see the header — auto-scaling makes the encoding meaningless.
   *  Values outside it are CLIPPED, never allowed to rescale the plot. */
  yDomain: [number, number];
  /** The percentile pair the dashed rules span. Default [0.05, 0.95]. */
  band?: [number, number];
  /** Which marks to draw. Default: all three. */
  marks?: DistributionMarks;
  /** Max points rendered — longer series are evenly DOWNSAMPLED. Default 80. */
  capacity?: number;
}

// The internal coordinate space. Arbitrary — the viewBox stretches to whatever
// box the container gives it — but fixed, so every geometry calculation below
// is in one system.
const VIEW_W = 100;
const VIEW_H = 100;
const INSET = 2;

const DEFAULT_BAND: [number, number] = [0.05, 0.95];
const DEFAULT_MARKS: Required<DistributionMarks> = {
  range: true,
  typical: true,
  mean: true,
};

export const DistributionSparkline: Component<DistributionSparklineProps> = (
  props,
) => {
  const [local, others] = splitProps(props, [
    "values",
    "yDomain",
    "band",
    "marks",
    "capacity",
    "class",
  ]);

  // Gradient ids must be unique per instance — several sparklines share a page.
  const uid = createUniqueId();
  const gradId = `sui-dist-grad-${uid}`;
  const clipId = `sui-dist-clip-${uid}`;

  const band = (): [number, number] => local.band ?? DEFAULT_BAND;
  const marks = (): Required<DistributionMarks> => ({
    ...DEFAULT_MARKS,
    ...local.marks,
  });

  // Even downsample keeping first + last, so the trend endpoints survive.
  const sampled = (): number[] => {
    const v = local.values ?? [];
    const cap = Math.max(2, local.capacity ?? 80);
    if (length(v) <= cap) return v;
    const step = (length(v) - 1) / (cap - 1);
    return Array.from({ length: cap }, (_, i) => v[Math.round(i * step)]);
  };

  const trend = (): DistributionTrend => {
    const v = local.values ?? [];
    return length(v) === 0
      ? "flat"
      : distributionTrendOf(v[0], v[length(v) - 1]);
  };

  const yOf = (value: number): number => {
    const [lo, hi] = local.yDomain;
    const span = hi - lo || 1;
    return INSET + (1 - (value - lo) / span) * (VIEW_H - INSET * 2);
  };

  const points = (): string => {
    const v = sampled();
    if (length(v) === 0) return "";
    if (length(v) === 1) return `0,${yOf(v[0])} ${VIEW_W},${yOf(v[0])}`;
    const at = (value: number, i: number): string =>
      `${((i / (length(v) - 1)) * VIEW_W).toFixed(2)},${yOf(value).toFixed(2)}`;
    return join(" ", map(at, v));
  };

  const rangeBox = (): { y: number; height: number } => {
    const v = local.values ?? [];
    if (length(v) === 0) return { y: 0, height: 0 };
    const top = yOf(Math.max(...v));
    return { y: top, height: Math.max(0.5, yOf(Math.min(...v)) - top) };
  };

  const rootClass = (): string =>
    `sui-distribution-sparkline sui-distribution-sparkline--${trend()}${
      local.class ? ` ${local.class}` : ""
    }`;

  const hasValues = (): boolean => length(local.values ?? []) > 0;

  return (
    <span class={rootClass()} {...others}>
      <svg
        class="sui-distribution-sparkline__svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={VIEW_W} height={VIEW_H} />
          </clipPath>
          {/* Shading: densest at the end the series finished on — up means
              strong at the top, down at the bottom, flat even throughout. */}
          <linearGradient
            id={gradId}
            x1="0"
            x2="0"
            y1={trend() === "up" ? "1" : "0"}
            y2={trend() === "up" ? "0" : "1"}
          >
            <stop class="sui-distribution-sparkline__stop-from" offset="0%" />
            <stop class="sui-distribution-sparkline__stop-to" offset="100%" />
          </linearGradient>
        </defs>

        {/* The plot area: the same box for every sparkline in a set, drawn so
            that constancy is visible rather than merely claimed. */}
        <rect
          class="sui-distribution-sparkline__plot"
          x={0}
          y={0}
          width={VIEW_W}
          height={VIEW_H}
        />

        <Show when={hasValues()}>
          <g clip-path={`url(#${clipId})`}>
            <Show when={marks().range}>
              <rect
                class="sui-distribution-sparkline__range"
                x={0}
                width={VIEW_W}
                y={rangeBox().y}
                height={rangeBox().height}
                fill={`url(#${gradId})`}
              />
            </Show>
            <Show when={marks().typical}>
              <line
                class="sui-distribution-sparkline__typical"
                x1={0}
                x2={VIEW_W}
                y1={yOf(percentileOf(band()[1], local.values))}
                y2={yOf(percentileOf(band()[1], local.values))}
              />
              <line
                class="sui-distribution-sparkline__typical"
                x1={0}
                x2={VIEW_W}
                y1={yOf(percentileOf(band()[0], local.values))}
                y2={yOf(percentileOf(band()[0], local.values))}
              />
            </Show>
            <Show when={marks().mean}>
              <line
                class="sui-distribution-sparkline__mean"
                x1={0}
                x2={VIEW_W}
                y1={yOf(mean(local.values))}
                y2={yOf(mean(local.values))}
              />
            </Show>
            <polyline
              class="sui-distribution-sparkline__line"
              points={points()}
            />
          </g>
        </Show>
      </svg>
    </span>
  );
};

/** Props a curried variant still exposes — data only. */
export type DistributionSparklineDataProps = Pick<
  DistributionSparklineProps,
  "values" | "yDomain" | "class"
>;

/** Bake the encoding (band, marks, capacity) into a named variant. */
export function createDistributionSparkline(
  defaults: Omit<
    DistributionSparklineProps,
    "values" | "yDomain" | "class" | "children"
  >,
): Component<DistributionSparklineDataProps> {
  return (props) => (
    <DistributionSparkline
      {...defaults}
      values={props.values}
      yDomain={props.yDomain}
      class={props.class}
    />
  );
}
