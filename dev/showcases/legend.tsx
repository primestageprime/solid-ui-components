import { type Component, For, createSignal } from "solid-js";
import { Legend, type LegendItem } from "../../src/components/Legend";
import { NarrowStack, TightStack } from "../../src/components/Layout";
import { TextSublabel, MutedBody } from "../../src/components/Text";

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
      <div style={{ display: "flex", gap: "8px", "margin-top": "8px" }}>
        <For each={CHART_SERIES}>
          {(item) => (
            <div
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: "64px",
                height: "48px",
                "border-radius": "4px",
                "background-color": item.color,
                outline:
                  hovered() === item.label
                    ? "2px solid var(--sui-text-primary)"
                    : "1px solid var(--sui-border-bright)",
                "outline-offset": "2px",
                filter: hovered() === item.label ? "brightness(1.2)" : "none",
                display: "flex",
                "align-items": "center",
                "justify-content": "center",
                color: "var(--sui-text-primary)",
                "font-size": "11px",
                "font-weight": "600",
                cursor: "default",
                "text-shadow": "0 1px 2px rgba(0,0,0,0.5)",
              }}
            >
              {item.label}
            </div>
          )}
        </For>
      </div>
      <MutedBody>
        Currently hovered: <code>{hovered() ?? "(none)"}</code>
      </MutedBody>
    </TightStack>
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
        <div
          style={{
            "max-width": "320px",
            border: "1px dashed var(--sui-border)",
            padding: "8px",
          }}
        >
          <Legend items={MANY_ITEMS} />
        </div>
      </NarrowStack>
    </div>

    <div class="example-group">
      <h3>Interactive — two-way hover binding</h3>
      <InteractiveLegendExample />
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
