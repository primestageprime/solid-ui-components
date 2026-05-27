import { Component, createSignal, For } from "solid-js";
import {
  DnDHierarchySortBar,
  DnDHierarchySortBarItem,
} from "../../src/components/DnDHierarchySortBar";

// ── Sample data ───────────────────────────────────────────────────────────

const INITIAL_ITEMS: DnDHierarchySortBarItem[] = [
  { id: "region", label: "Region" },
  { id: "product", label: "Product" },
  { id: "quarter", label: "Quarter" },
  { id: "channel", label: "Channel" },
];

const DEMO_B_ITEMS: DnDHierarchySortBarItem[] = [
  { id: "team", label: "Team" },
  { id: "sprint", label: "Sprint" },
  { id: "priority", label: "Priority" },
];

// ── Helpers ───────────────────────────────────────────────────────────────

const applyReorder = (
  items: DnDHierarchySortBarItem[],
  nextIds: string[],
): DnDHierarchySortBarItem[] => {
  const lookup = new Map(items.map((item) => [item.id, item]));
  return nextIds.flatMap((id) => {
    const item = lookup.get(id);
    return item ? [item] : [];
  });
};

// ── Sub-components ────────────────────────────────────────────────────────

/** Order readout rendered beneath the sort bar. */
const OrderReadout: Component<{ items: DnDHierarchySortBarItem[] }> = (props) => (
  <div
    style={{
      display: "flex",
      "flex-direction": "column",
      gap: "6px",
    }}
  >
    <span
      style={{
        "font-size": "10px",
        "text-transform": "uppercase",
        "letter-spacing": "0.08em",
        color: "var(--sui-text-muted)",
      }}
    >
      Current order
    </span>
    <div
      style={{
        display: "flex",
        gap: "6px",
        "align-items": "center",
        "flex-wrap": "wrap",
      }}
    >
      <For each={props.items}>
        {(item, idx) => (
          <>
            <span
              style={{
                "font-size": "11px",
                color: "var(--sui-text-primary)",
                "font-family": "monospace",
              }}
            >
              {idx() + 1}. {item.label}
            </span>
            {idx() < props.items.length - 1 && (
              <span
                style={{
                  color: "var(--sui-text-muted)",
                  "font-size": "11px",
                }}
              >
                →
              </span>
            )}
          </>
        )}
      </For>
    </div>
  </div>
);

/** Isolated demo with its own independent order signal. */
const CustomLabelDemo: Component = () => {
  const [items, setItems] = createSignal<DnDHierarchySortBarItem[]>(DEMO_B_ITEMS);

  return (
    <div
      style={{
        padding: "20px 24px",
        background: "var(--sui-bg-elevated)",
        border: "1px solid var(--sui-border)",
        "border-radius": "var(--sui-radius-md)",
        "max-width": "600px",
      }}
    >
      <DnDHierarchySortBar
        items={items()}
        onReorder={(nextIds) => setItems(applyReorder(items(), nextIds))}
        label="group by"
      />
    </div>
  );
};

// ── Main showcase ─────────────────────────────────────────────────────────

export const DnDHierarchySortBarShowcase: Component = () => {
  const [items, setItems] = createSignal<DnDHierarchySortBarItem[]>(INITIAL_ITEMS);

  return (
    <div class="component-section">
      <h2>DnDHierarchySortBar — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Owns CSS (<code>DnDHierarchySortBar.css</code>), no component imports. A
        controlled N-pill drag-to-reorder row for tag/dimension hierarchies. Uses
        native HTML drag-and-drop with INSERT semantics: the dragged pill moves to
        the target index and the others shift to fill — matching dside's{" "}
        <code>reorder()</code>. The caller owns the order via{" "}
        <code>items</code> + <code>onReorder</code>.
      </p>
      <p class="text-meta">
        No curried variant — intentional. Every prop is data or a callback (
        <code>items</code> / <code>onReorder</code> / <code>label</code>); there
        are no presentational props to freeze. The base component is already
        zero-config at the call site. See STYLE_GUIDE.md "Variant Surface: keep
        it minimal".
      </p>

      <div class="example-group">
        <h3>Drag to reorder</h3>
        <p class="text-meta">
          Drag any pill onto another to insert it at that position (the others
          shift to fill). The live order readout below updates immediately on drop.
        </p>
        <div
          style={{
            padding: "20px 24px",
            background: "var(--sui-bg-elevated)",
            border: "1px solid var(--sui-border)",
            "border-radius": "var(--sui-radius-md)",
            display: "flex",
            "flex-direction": "column",
            gap: "20px",
            "max-width": "600px",
          }}
        >
          <DnDHierarchySortBar
            items={items()}
            onReorder={(nextIds) => setItems(applyReorder(items(), nextIds))}
          />
          <OrderReadout items={items()} />
        </div>
        <div class="text-meta">
          Call site: <code>{"<DnDHierarchySortBar items={items()} onReorder={handleReorder} />"}</code>
        </div>
      </div>

      <div class="example-group">
        <h3>Custom label prop</h3>
        <p class="text-meta">
          The <code>label</code> prop overrides the default "nest by" text. This
          instance uses its own independent order signal.
        </p>
        <CustomLabelDemo />
        <div class="text-meta">
          Call site: <code>{"<DnDHierarchySortBar items={items()} onReorder={fn} label=\"group by\" />"}</code>
        </div>
      </div>
    </div>
  );
};
