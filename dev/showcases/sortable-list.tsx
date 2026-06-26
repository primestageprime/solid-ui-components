import { Component, createSignal, For } from "solid-js";
import { SortableList } from "../../src/components/SortableList";

// ── Sample data ───────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  detail: string;
}

const INITIAL_TASKS: Task[] = [
  { id: "spec", title: "Write the spec", detail: "Draft the API surface + edge cases" },
  { id: "build", title: "Build the component", detail: "Reuse the headless DnD hook" },
  { id: "test", title: "Add tests", detail: "Integration drag + placeholder coverage" },
  { id: "showcase", title: "Wire the showcase", detail: "Register it in the dev gallery" },
  { id: "ship", title: "Ship it", detail: "Bump, tag, publish" },
];

// ── Helpers ───────────────────────────────────────────────────────────────

const applyReorder = (tasks: Task[], nextIds: string[]): Task[] => {
  const lookup = new Map(tasks.map((t) => [t.id, t]));
  return nextIds.flatMap((id) => {
    const t = lookup.get(id);
    return t ? [t] : [];
  });
};

// ── Sub-components ────────────────────────────────────────────────────────

/** Current-order readout rendered beneath the list (mirrors the pill-bar demo). */
const OrderReadout: Component<{ tasks: Task[] }> = (props) => (
  <div style={{ display: "flex", "flex-direction": "column", gap: "6px" }}>
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
    <div style={{ display: "flex", gap: "8px", "align-items": "center", "flex-wrap": "wrap" }}>
      <For each={props.tasks}>
        {(t, idx) => (
          <>
            <span
              style={{
                "font-size": "11px",
                color: "var(--sui-text-primary)",
                "font-family": "monospace",
              }}
            >
              {idx() + 1}. {t.id}
            </span>
            {idx() < props.tasks.length - 1 && (
              <span style={{ color: "var(--sui-text-muted)", "font-size": "11px" }}>→</span>
            )}
          </>
        )}
      </For>
    </div>
  </div>
);

// ── Main showcase ─────────────────────────────────────────────────────────

export const SortableListShowcase: Component = () => {
  const [tasks, setTasks] = createSignal<Task[]>(INITIAL_TASKS);

  return (
    <div class="component-section">
      <h2>SortableList — Composed (Depth 1)</h2>
      <p class="text-meta">
        Owns CSS (<code>SortableList.css</code>), no component imports. A controlled
        vertical drag-to-reorder list of full-width rows — the SUI equivalent of
        dside's todo/BrainstormPane reorder, and the vertical sibling of{" "}
        <code>DnDHierarchySortBar</code>. Built on the shared headless{" "}
        <code>createDnDReorder</code> hook (axis <code>"y"</code>): as you drag a row,
        a full-width dashed placeholder opens a gap in the slot the row will land in
        and the whole column reflows live to preview the reordered state; the drop
        commits it. The floating row under the cursor is the browser's native drag
        image. The caller owns the order via <code>items</code> + <code>onReorder</code>,
        and supplies row content via <code>renderItem</code>.
      </p>
      <p class="text-meta">
        No curried variant — intentional. Every prop is data or a callback (
        <code>items</code> / <code>getId</code> / <code>onReorder</code> /{" "}
        <code>renderItem</code> / <code>label</code>); there are no presentational
        props to freeze. Like <code>DnDHierarchySortBar</code> and{" "}
        <code>SplitQueueList</code>, it's already zero-config at the call site. See
        STYLE_GUIDE.md "Variant Surface: keep it minimal".
      </p>

      <div class="example-group">
        <h3>Drag to reorder a task list</h3>
        <p class="text-meta">
          Grab a row by anywhere (the <code>⠿</code> grip signals it's draggable) and
          drag it up or down: a dashed gap opens where it will land and the other rows
          reflow live around it (the placeholder reserves the dragged row's height).
          Release to commit — the order readout below updates on drop.
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
          <SortableList
            items={tasks()}
            getId={(t) => t.id}
            onReorder={(nextIds) => setTasks(applyReorder(tasks(), nextIds))}
            renderItem={(t) => (
              <div style={{ display: "flex", "flex-direction": "column", gap: "2px" }}>
                <span style={{ "font-weight": 600, "font-size": "13px" }}>{t.title}</span>
                <span style={{ "font-size": "11px", color: "var(--sui-text-muted)" }}>
                  {t.detail}
                </span>
              </div>
            )}
            label="Task list"
          />
          <OrderReadout tasks={tasks()} />
        </div>
        <div class="text-meta">
          Call site:{" "}
          <code>
            {"<SortableList items={tasks()} getId={t => t.id} onReorder={handleReorder} renderItem={renderRow} />"}
          </code>
        </div>
      </div>
    </div>
  );
};
