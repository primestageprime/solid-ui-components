import { type Component, createSignal, For } from "solid-js";
import {
  DnDHierarchySortBar,
  type DnDHierarchySortBarItem,
} from "../../src/components/DnDHierarchySortBar";
import { NarrowStack, WrappedClusterRow } from "../../src/components/Layout";
import { TextSublabel } from "../../src/components/Text";

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
const OrderReadout: Component<{ items: DnDHierarchySortBarItem[] }> = (
  props,
) => (
  <NarrowStack>
    <span class="demo-state-readout__label">Current order</span>
    <WrappedClusterRow>
      <For each={props.items}>
        {(item, idx) => (
          <>
            <span class="demo-state-readout__tag">
              {idx() + 1}. {item.label}
            </span>
            {idx() < props.items.length - 1 && <TextSublabel>→</TextSublabel>}
          </>
        )}
      </For>
    </WrappedClusterRow>
  </NarrowStack>
);

/** Isolated demo with its own independent order signal. */
const CustomLabelDemo: Component = () => {
  const [items, setItems] =
    createSignal<DnDHierarchySortBarItem[]>(DEMO_B_ITEMS);

  return (
    <div class="dnd-hierarchy-demo__panel">
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
  const [items, setItems] =
    createSignal<DnDHierarchySortBarItem[]>(INITIAL_ITEMS);

  return (
    <div class="component-section">
      <h2>DnDHierarchySortBar — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (<code>DnDHierarchySortBar.css</code>), no component imports. A
        controlled N-pill drag-to-reorder row for tag/dimension hierarchies.
        Built on the headless <code>createDnDReorder</code> hook (axis{" "}
        <code>"x"</code>): as you drag, an explicit placeholder opens a gap in
        the slot the pill will land in and the whole row reflows live to preview
        the reordered state; the drop commits it. The floating pill under the
        cursor is the browser's native drag image. The caller owns the order via{" "}
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
          Drag a pill across the row: a dashed placeholder opens a gap where it
          will land and the other pills reflow live around it (the placeholder
          reserves the dragged pill's width). Release to commit — the live order
          readout below updates on drop.
        </p>
        <div class="dnd-hierarchy-demo__panel dnd-hierarchy-demo__panel--flex">
          <DnDHierarchySortBar
            items={items()}
            onReorder={(nextIds) => setItems(applyReorder(items(), nextIds))}
          />
          <OrderReadout items={items()} />
        </div>
        <div class="text-meta">
          Call site:{" "}
          <code>
            {
              "<DnDHierarchySortBar items={items()} onReorder={handleReorder} />"
            }
          </code>
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
          Call site:{" "}
          <code>
            {
              '<DnDHierarchySortBar items={items()} onReorder={fn} label="group by" />'
            }
          </code>
        </div>
      </div>
    </div>
  );
};
