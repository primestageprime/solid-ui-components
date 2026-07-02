import { Component, createSignal } from "solid-js";
import { SectionTitle, MutedBody } from "../../src/components/Text";
import { ActionListItem, type ActionListItemTone } from "../../src/components/ActionListItem";
import {
  ActionList,
  DEFAULT_STATUS_TONES,
  type ActionListItemData,
} from "../../src/components/ActionList";

// ============================================================================
// ActionList showcase — the promoted ListItem workshop bench.
//
//   1. Anatomy    — one row exercising every slot.
//   2. Progressive slots — every prop but the title is optional; rows degrade.
//   3. Working list — the 7-task seed inside a sortable ActionList with all
//                     callbacks wired to local state (drag, edit, select, ×).
//
// Sections 1 & 2 render ActionListItem directly (no reorder) so the anatomy is
// visible on a single row; section 3 is the full curried ActionList.
// ============================================================================

const STATUS_OPTIONS = ["TODO", "DOING", "BLOCKED", "DONE"];

/** Standalone ActionListItem rows aren't inside an ActionList, so mirror the
 *  curried default tone map here to colour them the way the list would. */
const toneFor = (status?: string): ActionListItemTone =>
  (status && DEFAULT_STATUS_TONES[status]) || "neutral";

// A shallow flex column mirroring the bench's row stack.
const stackStyle = {
  display: "flex",
  "flex-direction": "column",
  gap: "8px",
  "max-width": "960px",
} as const;

const seedTasks: ActionListItemData[] = [
  {
    id: "t1",
    name: "deploy minute-level-hover",
    assignee: { initials: "P", kind: "person", active: true },
    tags: [{ label: "stax:jtf", active: true }],
    status: "DONE",
  },
  {
    id: "t2",
    name: "Get creds to connect to sync spreadsheet",
    tags: [{ label: "stax:jtf", active: true }],
    status: "DOING",
  },
  {
    id: "t3",
    name: "Initial user flow — how to add account?",
    assignee: { initials: "A", kind: "ai" },
    tags: [{ label: "primestage:thorcasting", active: true }],
    status: "DOING",
  },
  {
    id: "t4",
    name: 'stray "today" indicator on chart',
    assignee: { initials: "A", kind: "ai" },
    tags: [{ label: "primestage:thorcasting", active: true }],
    status: "TODO",
  },
  {
    id: "t5",
    name: "wire showcase filter to tag facets",
    assignee: { initials: "DA", kind: "ai" },
    tags: [{ label: "primestage:dside" }],
    status: "TODO",
  },
  {
    id: "t6",
    name: "backfill June hours into the STAX sheet",
    assignee: { initials: "P", kind: "person" },
    tags: [{ label: "stax" }],
    status: "TODO",
  },
  {
    id: "t7",
    name: "sketch swimlane card hover states",
    tags: [{ label: "primestage:thorcasting" }],
    status: "TODO",
  },
];

export const ActionListShowcase: Component = () => {
  const [tasks, setTasks] = createSignal<ActionListItemData[]>(seedTasks);

  const reorder = (ids: string[]) => {
    const byId = new Map(tasks().map((t) => [t.id, t]));
    setTasks(ids.map((id) => byId.get(id)!).filter(Boolean));
  };
  const del = (id: string) => setTasks((ts) => ts.filter((t) => t.id !== id));
  const setStatus = (id: string, status: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
  const rename = (id: string, name: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)));

  // Multi-select batch actions. Claim assigns the row to a person (P); release
  // clears the assignee. Both operate on the current selection; ActionList
  // clears the selection after either fires.
  const claim = (ids: string[]) =>
    setTasks((ts) =>
      ts.map((t) =>
        ids.includes(t.id)
          ? { ...t, assignee: { initials: "P", kind: "person", active: true } }
          : t,
      ),
    );
  const release = (ids: string[]) =>
    setTasks((ts) =>
      ts.map((t) => (ids.includes(t.id) ? { ...t, assignee: undefined } : t)),
    );

  return (
    <div class="component-section component-section--full">
      <SectionTitle>ActionList — Composite (Depth 3)</SectionTitle>
      <MutedBody>
        A drop-in, data-driven list of editable action rows. Composes SortableList
        (rowChrome "bare", gap 1) + ActionListItem, which in turn composes the four
        Depth-1 primitives: StatusChip, EditableTitle, AssigneeIcon, TagPill. Curried
        with the default status→tone map (DONE dim, DOING highlight) so app call sites
        pass only data + callbacks.
      </MutedBody>

      <SectionTitle>Anatomy</SectionTitle>
      <MutedBody>
        All slots: status chip, title, assignee, tags (one active), dismiss ×.
      </MutedBody>
      <div style={stackStyle}>
        <ActionListItem
          title="deploy minute-level-hover"
          status="TODO"
          statusOptions={STATUS_OPTIONS}
          tone={toneFor("TODO")}
          assignee={{ initials: "P", kind: "person", active: true }}
          tags={[{ label: "stax", active: true }, { label: "jtf" }]}
          onStatusChange={() => {}}
          onTitleChange={() => {}}
          onDismiss={() => {}}
        />
      </div>

      <SectionTitle>Progressive slots</SectionTitle>
      <MutedBody>Every prop except the title is optional — rows degrade gracefully.</MutedBody>
      <div style={stackStyle}>
        <ActionListItem title="title only" tone={toneFor()} />
        <ActionListItem
          title="with tags"
          tone={toneFor()}
          tags={[{ label: "jtf" }, { label: "stax", active: true }]}
        />
        <ActionListItem title="with status" status="DONE" tone={toneFor("DONE")} />
        <ActionListItem
          title="with a very long title that should truncate with an ellipsis rather than wrap or push the trailing meta cluster out of the row, no matter how long it gets"
          status="TODO"
          tone={toneFor("TODO")}
          assignee={{ initials: "P", kind: "person", active: true }}
          tags={[{ label: "primestage" }]}
          onDismiss={() => {}}
        />
        <ActionListItem
          title="composite tag — company:product split lozenge"
          status="TODO"
          tone={toneFor("TODO")}
          tags={[
            { label: "primestage:thorcasting", active: true },
            { label: "primestage:dside" },
            { label: "stax" },
          ]}
          onDismiss={() => {}}
        />
      </div>

      <SectionTitle>Working list (drag to reorder, click to edit, × to dismiss, click a row to select)</SectionTitle>
      <MutedBody>
        The 7-task seed (1 DONE, 2 DOING, 4 TODO) inside a sortable ActionList — every
        callback wired to local state. Drag a row to reorder, click the title to
        rename, click the status text to edit or its caret to pick, hover the right
        edge for the × cap. Passing <code>actions</code> also turns each row's
        non-interactive area into a selection toggle: click rows to select them
        (clicks on the title, status chip, or × still do their own thing), then use
        the actions bar — <b>[c]laim</b> assigns them to P, <b>[r]elease</b> clears
        the assignee. Press the bracketed hotkey to apply, or Escape to clear the
        selection. Applying an action clears the selection.
      </MutedBody>
      <div style={stackStyle}>
        <ActionList
          items={tasks()}
          statusOptions={STATUS_OPTIONS}
          onSort={reorder}
          onDelete={del}
          onRename={rename}
          onStatusChange={setStatus}
          actions={[
            { hotkey: "c", label: "claim", onApply: claim },
            { hotkey: "r", label: "release", onApply: release },
          ]}
          label="Showcase task list"
        />
      </div>
    </div>
  );
};

export default ActionListShowcase;
