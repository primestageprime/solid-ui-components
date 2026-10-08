import { type Component, For, createSignal, createUniqueId } from "solid-js";
import { Legend, type LegendItem } from "../../src/components/Legend";
import { ClusterRow, NarrowStack, TightStack } from "../../src/components/Layout";
import { TextSublabel, MutedBody } from "../../src/components/Text";
import { CollapsibleSection } from "../../src/components/Section";
import {
  BarSeries,
  Chart,
  LineSeries,
} from "../../src/components/Chart";
import { HatchPattern } from "../../src/components/SvgMarks";

// Chart series — the canonical "this color means this line" case. Generic
// across any chart library that hands you a deterministic palette.
const CHART_SERIES: LegendItem[] = [
  { color: "var(--sui-accent)", label: "Revenue" },
  { color: "#10b981", label: "Profit" },
  { color: "#f59e0b", label: "Costs" },
  { color: "var(--sui-danger)", label: "Tax" },
];

// Generic category encoding — fleet / portfolio / product line groupings.
const CATEGORY_BUCKETS: LegendItem[] = [
  { color: "var(--sui-accent)", label: "Tier 1" },
  { color: "var(--sui-success, #2a6)", label: "Tier 2" },
  { color: "var(--sui-warning, #d4a017)", label: "Tier 3" },
];

// Illustrative only — Legend is a general-purpose component. This example
// just demonstrates one use case (alarm severity); the component itself
// has no opinion about "status".
const ALARM_SEVERITY_EXAMPLE: LegendItem[] = [
  { color: "rgba(34, 197, 94, 0.8)", label: "OK" },
  { color: "rgba(251, 191, 36, 0.8)", label: "WARNING" },
  { color: "rgba(245, 158, 11, 0.8)", label: "ALARM" },
  { color: "rgba(220, 38, 127, 0.8)", label: "CRITICAL" },
];

const MANY_ITEMS: LegendItem[] = [
  { color: "var(--sui-accent)", label: "Engine" },
  { color: "#8b5cf6", label: "Pumps" },
  { color: "#ec4899", label: "Cooling" },
  { color: "#f59e0b", label: "Electrical" },
  { color: "#10b981", label: "Hydraulics" },
  { color: "var(--sui-danger)", label: "Auxiliary" },
  { color: "#06b6d4", label: "Navigation" },
  { color: "#a855f7", label: "Communications" },
];

const InteractiveLegendExample: Component = () => {
  const [hovered, setHovered] = createSignal<string | null>(null);
  return (
    <TightStack>
      <TextSublabel>
        Two-way binding: hover the Legend OR the colored boxes — both sides
        highlight the matching item via a shared <code>hovered</code> signal,
        wired through <code>highlightedLabel</code> and <code>onItemHover</code>
        .
      </TextSublabel>
      <Legend
        items={CHART_SERIES}
        highlightedLabel={hovered()}
        onItemHover={setHovered}
      />
      <ClusterRow class="legend-demo__swatch-row">
        <For each={CHART_SERIES}>
          {(item) => (
            <div
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}
              class="legend-demo__swatch"
              classList={{
                "legend-demo__swatch--hovered": hovered() === item.label,
              }}
              style={{ "background-color": item.color }}
            >
              {item.label}
            </div>
          )}
        </For>
      </ClusterRow>
      <MutedBody>
        Currently hovered: <code>{hovered() ?? "(none)"}</code>
      </MutedBody>
    </TightStack>
  );
};

type Mark = "outline" | "solid" | "hatched" | "missing";
const INK = "var(--sui-text-secondary)";
const MISSING = "var(--sui-danger)";
const NO_MARGIN = { top: 1, right: 1, bottom: 1, left: 1 };

const bar = (fill: string) => (
  <BarSeries
    data={[0]}
    x={() => 0.5}
    bandWidth={0.8}
    segments={() => [{ value: 0.9, fill, key: "s" }]}
  />
);

/** A 22x14 Chart drawing the real mark; the legend's `swatch` slot takes it. */
const MarkSwatch: Component<{ readonly mark: Mark }> = (props) => {
  const uid = createUniqueId();
  const hatch = `lg-hatch-${uid}`;
  const a = `lg-miss-a-${uid}`;
  const b = `lg-miss-b-${uid}`;
  const body = () => {
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
            stroke={INK}
            strokeWidth={1.5}
          />
        );
      case "solid":
        return bar(INK);
      case "hatched":
        return bar(`url(#${hatch})`);
      case "missing":
        return (
          <>
            {bar(`url(#${a})`)}
            {bar(`url(#${b})`)}
          </>
        );
    }
  };
  return (
    <Chart width={22} height={14} xDomain={[0, 1]} yDomain={[0, 1]} margin={NO_MARGIN}>
      <defs>
        <HatchPattern id={hatch} color={INK} groundOpacity={0.15} stripeOpacity={0.9} />
        <HatchPattern id={a} color={MISSING} angle={45} groundOpacity={0.1} stripeOpacity={0.8} />
        <HatchPattern id={b} color={MISSING} angle={-45} groundOpacity={0} stripeOpacity={0.8} />
      </defs>
      {body()}
    </Chart>
  );
};

const PATTERN_ITEMS: LegendItem[] = [
  { label: "Outline = projected", swatch: <MarkSwatch mark="outline" /> },
  { label: "Solid = invoiced", swatch: <MarkSwatch mark="solid" /> },
  { label: "Hatched = above projection", swatch: <MarkSwatch mark="hatched" /> },
  { label: "Red cross-hatch = missing", swatch: <MarkSwatch mark="missing" /> },
];

/** The fold is CONTROLLED: SUI keeps no preference, the caller stores it. */
const CollapsiblePatternLegend: Component = () => {
  const [collapsed, setCollapsed] = createSignal(false);
  return (
    <CollapsibleSection
      title="Legend"
      collapsed={collapsed()}
      onToggleCollapse={() => setCollapsed((c) => !c)}
    >
      <Legend items={PATTERN_ITEMS} />
    </CollapsibleSection>
  );
};

export const LegendShowcase: Component = () => (
  <div class="component-section">
    <h2>Legend — Primitive (Depth 0)</h2>
    <p class="text-meta">
      Data-driven row (or column) of color-swatch + label pairs. Use to explain
      a color encoding in a chart, heatmap, or any other visualisation. Each
      item is a <code>{"{ color, label }"}</code> pair —<code>color</code> is
      any valid CSS color, applied as the swatch's background. The component is
      domain-agnostic; the alarm-severity example below is purely illustrative.
    </p>

    <div class="example-group">
      <h3>Chart series — horizontal (default)</h3>
      <TightStack>
        <TextSublabel>
          The canonical "this color means this line" legend — the everyday case
          for any chart library.
        </TextSublabel>
        <Legend items={CHART_SERIES} />
        <MutedBody>
          Zero-config: pass only <code>items</code>.
        </MutedBody>
      </TightStack>
    </div>

    <div class="example-group">
      <h3>Generic categories — vertical</h3>
      <TightStack>
        <TextSublabel>
          <code>orientation="vertical"</code> stacks items in a column. Tier /
          bucket / category labels — no status concept.
        </TextSublabel>
        <Legend items={CATEGORY_BUCKETS} orientation="vertical" />
      </TightStack>
    </div>

    <div class="example-group">
      <h3>Larger swatches</h3>
      <TightStack>
        <TextSublabel>
          <code>swatchSize={"{20}"}</code> — number is treated as px.
        </TextSublabel>
        <Legend items={CHART_SERIES} swatchSize={20} />
      </TightStack>
    </div>

    <div class="example-group">
      <h3>Many items — wraps on overflow</h3>
      <NarrowStack>
        <TextSublabel>
          Horizontal orientation uses <code>flex-wrap</code>, so long legends
          break onto multiple rows in narrow containers.
        </TextSublabel>
        <div class="legend-demo__wrap">
          <Legend items={MANY_ITEMS} />
        </div>
      </NarrowStack>
    </div>

    <div class="example-group">
      <h3>Interactive — two-way hover binding</h3>
      <InteractiveLegendExample />
    </div>

    <div class="example-group">
      <h3>Pattern swatches in a collapsible legend</h3>
      <TightStack>
        <TextSublabel>
          <code>swatch</code> draws any element in place of the colour box:
          here a tiny Chart per mark (outline, solid, hatched, cross-hatch).
          The fold is a <code>CollapsibleSection</code> driven by <code>collapsed</code>{" "}
          and <code>onToggleCollapse</code>; the app stores the preference.
        </TextSublabel>
        <CollapsiblePatternLegend />
      </TightStack>
    </div>

    <div class="example-group">
      <h3>Illustrative — alarm severity (just one use case)</h3>
      <TightStack>
        <TextSublabel>
          Legend has no notion of "status" — this is just one possible color
          encoding a caller might supply.
        </TextSublabel>
        <Legend items={ALARM_SEVERITY_EXAMPLE} />
      </TightStack>
    </div>
  </div>
);
