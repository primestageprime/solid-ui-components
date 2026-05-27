import { Component, createSignal, For } from "solid-js";
import { SectionTitle, SubsectionTitle } from "../../src/components/Text";
import { DragBar, DragBarItem } from "../../src/components/DragBar";

// ─── Workshop ────────────────────────────────────────────────────────────
// Scratch bench for in-progress components. Current occupant: DragBar.
// Prototype goal: a controlled N-pill drag-reorder row for tag hierarchies.

const INITIAL_ITEMS: DragBarItem[] = [
  { id: "region", label: "Region" },
  { id: "product", label: "Product" },
  { id: "quarter", label: "Quarter" },
  { id: "channel", label: "Channel" },
];

export const WorkshopShowcase: Component = () => {
  const [items, setItems] = createSignal<DragBarItem[]>(INITIAL_ITEMS);

  const handleReorder = (nextIds: string[]) => {
    const lookup = new Map(items().map((item) => [item.id, item]));
    const reordered = nextIds.flatMap((id) => {
      const item = lookup.get(id);
      return item ? [item] : [];
    });
    setItems(reordered);
  };

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop</SectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "8px 0 24px",
        }}
      >
        In-progress: <strong>DragBar</strong> — a controlled N-pill
        drag-reorder row for tag hierarchies. Drag the pills left or right to
        change nesting order. The current order is reflected live in the readout
        below.
      </p>

      {/* ── Live demo ────────────────────────────────────────────────── */}
      <SubsectionTitle>Drag to reorder</SubsectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "4px 0 16px",
        }}
      >
        Drag any pill onto another to insert it at that position (the others
        shift to fill). The order signal updates immediately on drop.
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
          "margin-bottom": "32px",
          "max-width": "600px",
        }}
      >
        <DragBar items={items()} onReorder={handleReorder} />

        {/* ── Live order readout ──────────────────────────────────── */}
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
            <For each={items()}>
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
                  {idx() < items().length - 1 && (
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
      </div>

      {/* ── Custom hint label ────────────────────────────────────────── */}
      <SubsectionTitle>Custom hint</SubsectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "4px 0 16px",
        }}
      >
        The <code>hint</code> prop overrides the default "nest by" label.
        This instance uses a separate, independent order signal.
      </p>

      <div
        style={{
          padding: "20px 24px",
          background: "var(--sui-bg-elevated)",
          border: "1px solid var(--sui-border)",
          "border-radius": "var(--sui-radius-md)",
          "margin-bottom": "32px",
          "max-width": "600px",
        }}
      >
        <IndependentDemo />
      </div>

      {/* ── Prop surface reference ────────────────────────────────────── */}
      <SubsectionTitle>Prop surface</SubsectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "4px 0 12px",
        }}
      >
        Minimal controlled surface for this prototype phase:
      </p>
      <table
        style={{
          "font-size": "12px",
          "border-collapse": "collapse",
          width: "100%",
          "max-width": "560px",
          "margin-bottom": "32px",
        }}
      >
        <thead>
          <tr>
            {(["Prop", "Type", "Notes"] as const).map((h) => (
              <th
                style={{
                  "text-align": "left",
                  padding: "4px 12px 4px 0",
                  "border-bottom": "1px solid var(--sui-border)",
                  color: "var(--sui-text-primary)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(
            [
              ["items", "DragBarItem[]", "Ordered list — {id, label} pairs"],
              [
                "onReorder",
                "(nextIds: string[]) => void",
                "Called with new id order after drop",
              ],
              ["hint", "string?", 'Label before pills (default "nest by")'],
            ] as const
          ).map(([prop, type, notes]) => (
            <tr>
              <td
                style={{
                  padding: "4px 12px 4px 0",
                  "border-bottom": "1px solid rgba(255,255,255,0.05)",
                  color: "var(--sui-accent, #00a8cc)",
                  "font-family": "monospace",
                }}
              >
                {prop}
              </td>
              <td
                style={{
                  padding: "4px 12px 4px 0",
                  "border-bottom": "1px solid rgba(255,255,255,0.05)",
                  color: "var(--sui-text-secondary)",
                  "font-family": "monospace",
                  "white-space": "nowrap",
                }}
              >
                {type}
              </td>
              <td
                style={{
                  padding: "4px 0",
                  "border-bottom": "1px solid rgba(255,255,255,0.05)",
                  color: "var(--sui-text-muted)",
                }}
              >
                {notes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Independent demo sub-component (avoids lifting state into parent) ─────

const DEMO_B_ITEMS: DragBarItem[] = [
  { id: "team", label: "Team" },
  { id: "sprint", label: "Sprint" },
  { id: "priority", label: "Priority" },
];

const IndependentDemo: Component = () => {
  const [items, setItems] = createSignal<DragBarItem[]>(DEMO_B_ITEMS);

  const handleReorder = (nextIds: string[]) => {
    const lookup = new Map(items().map((item) => [item.id, item]));
    const reordered = nextIds.flatMap((id) => {
      const item = lookup.get(id);
      return item ? [item] : [];
    });
    setItems(reordered);
  };

  return <DragBar items={items()} onReorder={handleReorder} hint="group by" />;
};
