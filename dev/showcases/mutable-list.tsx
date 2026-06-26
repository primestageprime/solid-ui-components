import { Component, createSignal, For } from "solid-js";
import { MutableList } from "../../src/components/MutableList";

// ── Sample data ───────────────────────────────────────────────────────────

interface Tag {
  id: string;
  name: string;
  count: number;
}

const INITIAL_TAGS: Tag[] = [
  { id: "urgent", name: "Urgent", count: 12 },
  { id: "design", name: "Design", count: 7 },
  { id: "backend", name: "Backend", count: 23 },
  { id: "research", name: "Research", count: 4 },
  { id: "chore", name: "Chore", count: 9 },
];

// ── Helpers ───────────────────────────────────────────────────────────────

const applyReorder = (tags: Tag[], nextIds: string[]): Tag[] => {
  const lookup = new Map(tags.map((t) => [t.id, t]));
  return nextIds.flatMap((id) => {
    const t = lookup.get(id);
    return t ? [t] : [];
  });
};

// ── State readout ───────────────────────────────────────────────────────────

const StateReadout: Component<{ tags: Tag[] }> = (props) => (
  <div style={{ display: "flex", "flex-direction": "column", gap: "6px" }}>
    <span
      style={{
        "font-size": "10px",
        "text-transform": "uppercase",
        "letter-spacing": "0.08em",
        color: "var(--sui-text-muted)",
      }}
    >
      Live state
    </span>
    <div style={{ display: "flex", gap: "8px", "align-items": "center", "flex-wrap": "wrap" }}>
      <For
        each={props.tags}
        fallback={
          <span style={{ "font-size": "11px", color: "var(--sui-text-muted)" }}>
            (list is empty)
          </span>
        }
      >
        {(t, idx) => (
          <>
            <span
              style={{
                "font-size": "11px",
                color: "var(--sui-text-primary)",
                "font-family": "monospace",
              }}
            >
              {idx() + 1}. {t.id}="{t.name}"
            </span>
            {idx() < props.tags.length - 1 && (
              <span style={{ color: "var(--sui-text-muted)", "font-size": "11px" }}>→</span>
            )}
          </>
        )}
      </For>
    </div>
  </div>
);

// ── Main showcase ─────────────────────────────────────────────────────────

export const MutableListShowcase: Component = () => {
  const [tags, setTags] = createSignal<Tag[]>(INITIAL_TAGS);

  const handleRename = (id: string, name: string) =>
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));

  const handleDelete = (id: string) => setTags((prev) => prev.filter((t) => t.id !== id));

  return (
    <div class="component-section">
      <h2>MutableList — Composite (Depth 3)</h2>
      <p class="text-meta">
        Owns CSS (<code>MutableList.css</code>). A <code>SortableList</code> specialized
        into editable, deletable cards: it COMPOSES <code>SortableList</code> and supplies
        a <code>renderItem</code> whose card shows an inline-editable NAME on the left and a
        DELETE button (curried <code>IconOnlyButton</code>) on the right that is hidden until
        you hover the row. All drag-reorder mechanics — grip, placeholder gap, live reflow —
        are inherited from <code>SortableList</code> (the headless <code>createDnDReorder</code>{" "}
        hook). Click a name to rename inline (Enter / blur commits, Escape reverts); the
        delete button fires <code>onDelete</code> directly — the consumer owns any
        confirmation.
      </p>
      <p class="text-meta">
        No curried variant — intentional. Every prop is data or a callback (<code>items</code> /{" "}
        <code>getId</code> / <code>getName</code> / <code>onReorder</code> /{" "}
        <code>onRename</code> / <code>onDelete</code> / <code>label</code> /{" "}
        <code>renderDetail</code>); there are no presentational props to freeze, exactly like{" "}
        <code>SortableList</code>. See STYLE_GUIDE.md "Variant Surface: keep it minimal".
      </p>

      <div class="example-group">
        <h3>Edit a list of tags — reorder, rename, delete</h3>
        <p class="text-meta">
          Drag a row to reorder. Click a tag name to rename it inline (Enter or click away
          to save, Escape to cancel). Hover a row to reveal its <code>×</code> button, then
          click to delete. Every action updates the live state below.
        </p>
        <div
          style={{
            padding: "20px 24px",
            background: "var(--sui-bg-base, var(--sui-bg))",
            border: "1px solid var(--sui-border)",
            "border-radius": "var(--sui-radius-md)",
            display: "flex",
            "flex-direction": "column",
            gap: "20px",
            "max-width": "520px",
          }}
        >
          <MutableList
            items={tags()}
            getId={(t) => t.id}
            getName={(t) => t.name}
            onReorder={(nextIds) => setTags(applyReorder(tags(), nextIds))}
            onRename={handleRename}
            onDelete={handleDelete}
            renderDetail={(t) => <>{t.count} open</>}
            label="Tag list"
          />
          <StateReadout tags={tags()} />
        </div>
        <div class="text-meta">
          Call site:{" "}
          <code>
            {
              "<MutableList items={tags()} getId={t => t.id} getName={t => t.name} onReorder={...} onRename={...} onDelete={...} />"
            }
          </code>
        </div>
      </div>
    </div>
  );
};
