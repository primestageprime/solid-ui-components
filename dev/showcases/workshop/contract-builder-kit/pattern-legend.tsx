// ============================================
// PatternLegend — what each MARK means. SUI's `Legend` takes an optional
// `swatch` per item, so each swatch here is a tiny `Chart` drawing the real
// mark (the same parts the charts use) in a neutral grey so it reads as a
// pattern rather than a job type. The legend folds in `CollapsibleSection`,
// CONTROLLED: the caller owns `collapsed` (thorcasting stores it as a sticky
// user preference; the bench just keeps a signal).
// ============================================
import { type Component, type JSX, createSignal, createUniqueId } from "solid-js";
import {
  AreaSeries,
  BarSeries,
  Chart,
  HatchPattern,
  LineSeries,
  CollapsibleSection,
  Legend,
  type LegendItem,
  ReferenceLine,
  fn,
} from "../../../../src";
const MISSING_COLOR = "var(--sui-danger)";

const NEUTRAL = "var(--sui-text-secondary)";
const W = 22;
const H = 14;
const NO_MARGIN = { top: 1, right: 1, bottom: 1, left: 1 };
const ONE = [0];

type Mark =
  | "outline"
  | "solid"
  | "translucent"
  | "lighter"
  | "hatched"
  | "missing"
  | "now"
  | "ahead"
  | "behind"
  | "outlook"
  | "line"
  | "dashed";

/** One bar filling most of the swatch, painted `fill`. */
const Block: Component<{ readonly fill: string }> = (props) => (
  <BarSeries
    data={ONE}
    x={() => 0.5}
    bandWidth={0.8}
    segments={() => [{ value: 0.9, fill: props.fill, key: "s" }]}
  />
);

/** A rising wedge of area, for the running-divergence chart's marks. */
const SWELL = [
  { x: 0, y: 0.15 },
  { x: 1, y: 0.9 },
];
const Swell: Component<{ readonly fill: string; readonly opacity: number }> = (props) => (
  <AreaSeries
    data={SWELL}
    x={(p) => p.x}
    y={(p) => p.y}
    baseline={0}
    fill={props.fill}
    fillOpacity={props.opacity}
  />
);

const Swatch: Component<{ readonly mark: Mark }> = (props) => {
  const uid = createUniqueId();
  const id = (k: string) => `cb-legend-${k}-${uid}`;
  const body = (): JSX.Element => {
    switch (props.mark) {
      case "outline":
        return (
          <LineSeries
            data={[
              { x: 0.1, y: 0 },
              { x: 0.1, y: 0.9 },
              { x: 0.9, y: 0.9 },
              { x: 0.9, y: 0 },
            ]}
            x={(p) => p.x}
            y={(p) => p.y}
            stroke={NEUTRAL}
            strokeWidth={1.5}
          />
        );
      case "solid":
        return <Block fill={NEUTRAL} />;
      case "translucent":
        return <Block fill={`url(#${id("tint")})`} />;
      case "lighter":
        return <Block fill={`url(#${id("light")})`} />;
      case "hatched":
        return <Block fill={`url(#${id("hatch")})`} />;
      case "missing":
        return (
          <>
            <Block fill={`url(#${id("miss-a")})`} />
            <Block fill={`url(#${id("miss-b")})`} />
          </>
        );
      case "ahead":
        return <Swell fill="var(--sui-success)" opacity={0.55} />;
      case "behind":
        return <Swell fill="var(--sui-danger)" opacity={0.55} />;
      case "outlook":
        return <Swell fill={NEUTRAL} opacity={0.2} />;
      case "now":
        return (
          <ReferenceLine
            orientation="vertical"
            value={0.5}
            stroke="var(--sui-text-primary)"
            strokeDasharray="3 2"
          />
        );
      case "line":
      case "dashed":
        return (
          <LineSeries
            data={[
              { x: 0, y: 0.5 },
              { x: 1, y: 0.5 },
            ]}
            x={(p) => p.x}
            y={(p) => p.y}
            stroke="var(--sui-text-primary)"
            strokeWidth={1.5}
            strokeDasharray={props.mark === "dashed" ? "3 2" : undefined}
          />
        );
    }
  };
  return (
    <Chart width={W} height={H} xDomain={[0, 1]} yDomain={[0, 1]} margin={NO_MARGIN}>
      <HatchPattern id={id("tint")} color={NEUTRAL} groundOpacity={0.4} stripeOpacity={0} />
      <HatchPattern id={id("light")} color={NEUTRAL} groundOpacity={0.14} stripeOpacity={0} />
      <HatchPattern id={id("hatch")} color={NEUTRAL} groundOpacity={0.15} stripeOpacity={0.9} />
      <HatchPattern id={id("miss-a")} color={MISSING_COLOR} angle={45} groundOpacity={0.1} stripeOpacity={0.8} />
      <HatchPattern id={id("miss-b")} color={MISSING_COLOR} angle={-45} groundOpacity={0} stripeOpacity={0.8} />
      {body()}
    </Chart>
  );
};

export interface PatternItem {
  readonly mark: Mark;
  readonly label: string;
}

const legendItemsOf = (items: readonly PatternItem[]): LegendItem[] =>
  fn.map((item: PatternItem): LegendItem => ({ label: item.label, swatch: <Swatch mark={item.mark} /> }), items);

export const PatternLegend: Component<{
  readonly items: readonly PatternItem[];
  readonly title?: string;
}> = (props) => {
  const [collapsed, setCollapsed] = createSignal(false);
  return (
    <CollapsibleSection
      title={props.title ?? "Legend"}
      collapsed={collapsed()}
      onToggleCollapse={() => setCollapsed((c) => !c)}
    >
      <Legend items={legendItemsOf(props.items)} />
    </CollapsibleSection>
  );
};

/** The per-month bars' marks: all six, plus the NOW rule. */
export const BAR_MARKS: readonly PatternItem[] = [
  { mark: "outline", label: "Outline = projected" },
  { mark: "solid", label: "Solid = invoiced" },
  { mark: "translucent", label: "Translucent = Confirmed, not yet invoiced" },
  { mark: "lighter", label: "Lighter = Planned" },
  { mark: "hatched", label: "Hatched = above the projection" },
  { mark: "missing", label: "Red cross-hatch = missing (past shortfall)" },
  { mark: "now", label: "Dashed rule = NOW" },
];

/** The running-divergence chart's marks. */
export const CUMULATIVE_MARKS: readonly PatternItem[] = [
  { mark: "ahead", label: "Green = ahead of the total projection" },
  { mark: "behind", label: "Red = behind the total projection" },
  { mark: "outlook", label: "Lighter = from NOW on: only work beyond the projection" },
  { mark: "line", label: "Solid line = actual running total" },
  { mark: "dashed", label: "Dashed line = outlook after NOW" },
  { mark: "now", label: "Dashed rule = NOW" },
];
