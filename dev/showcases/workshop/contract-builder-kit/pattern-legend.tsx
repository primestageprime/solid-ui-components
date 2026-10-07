// ============================================
// PatternLegend — what each MARK means, beside the type-colour Legend. SUI's
// `Legend` paints a swatch with `background-color` only, so it cannot show a
// hatch, an outline or a dash (step 7, Peter: "Add in a legend for the
// different patterns"). Each swatch here is a tiny `Chart` drawing the real
// mark with the same parts the charts use, in a neutral grey so it reads as a
// pattern rather than a job type. COMPOSED from SUI, no CSS of its own:
//
//   Chart (fixed 22×14, no margin) per swatch
//   BarSeries + HatchPattern   solid / translucent / hatched / cross-hatch
//   LineSeries                 the projection outline; the running line
//   ReferenceLine              the dashed NOW rule
//   LooseWrapRow / TightClusterRow + TextSublabel   the layout and labels
//
// The SUI-level fix (an optional `swatch` element per Legend item) is held
// until promotion.
// ============================================
import { type Component, For, type JSX, createUniqueId } from "solid-js";
import {
  BarSeries,
  Chart,
  HatchPattern,
  LineSeries,
  LooseWrapRow,
  ReferenceLine,
  TextSublabel,
  TightClusterRow,
} from "../../../../src";
import { MISSING_COLOR } from "./period-bars";

const NEUTRAL = "var(--sui-text-secondary)";
const W = 22;
const H = 14;
const NO_MARGIN = { top: 1, right: 1, bottom: 1, left: 1 };
const ONE = [0];

type Mark =
  | "outline"
  | "solid"
  | "translucent"
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
        return <Block fill="var(--sui-success)" />;
      case "behind":
        return <Block fill="var(--sui-danger)" />;
      case "outlook":
        return <Block fill={`url(#${id("tint")})`} />;
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
      <defs>
        <HatchPattern id={id("tint")} color={NEUTRAL} groundOpacity={0.4} stripeOpacity={0} />
        <HatchPattern id={id("hatch")} color={NEUTRAL} groundOpacity={0.15} stripeOpacity={0.9} />
        <HatchPattern id={id("miss-a")} color={MISSING_COLOR} angle={45} groundOpacity={0.1} stripeOpacity={0.8} />
        <HatchPattern id={id("miss-b")} color={MISSING_COLOR} angle={-45} groundOpacity={0} stripeOpacity={0.8} />
      </defs>
      {body()}
    </Chart>
  );
};

export interface PatternItem {
  readonly mark: Mark;
  readonly label: string;
}

export const PatternLegend: Component<{ readonly items: readonly PatternItem[] }> = (
  props,
) => (
  <LooseWrapRow>
    <For each={props.items}>
      {(item) => (
        <TightClusterRow>
          <Swatch mark={item.mark} />
          <TextSublabel>{item.label}</TextSublabel>
        </TightClusterRow>
      )}
    </For>
  </LooseWrapRow>
);

/** The per-month bars' marks. */
export const BAR_MARKS: readonly PatternItem[] = [
  { mark: "outline", label: "Outline = hoped for (projected)" },
  { mark: "solid", label: "Solid = invoiced" },
  { mark: "translucent", label: "Translucent = signed, not yet invoiced" },
  { mark: "hatched", label: "Hatched = above the hope (unplanned win)" },
  { mark: "missing", label: "Red cross-hatch = missing (past shortfall)" },
  { mark: "now", label: "Dashed rule = NOW" },
];

/** The running-divergence chart's marks. */
export const CUMULATIVE_MARKS: readonly PatternItem[] = [
  { mark: "ahead", label: "Green = ahead of the total hope" },
  { mark: "behind", label: "Red = behind the total hope" },
  { mark: "outlook", label: "Translucent = from NOW on: signed work vs hope" },
  { mark: "line", label: "Solid line = actual running total" },
  { mark: "dashed", label: "Dashed line = outlook after NOW" },
  { mark: "now", label: "Dashed rule = NOW" },
];
