import { Component, For, Show, createSignal } from "solid-js";
import { SectionTitle, MutedBody } from "../../../src/components/Text";
import { SmAvatar } from "../../../src/components/ParticipantAvatar";
import { SortableList } from "../../../src/components/SortableList";

export const meta = { label: "List Item" };

// ============================================================================
// PROTOTYPE — ListItem (workshop bench, not yet in src/)
//
// A general-purpose drop-in row for dense item lists (todo queues, filter
// results, pick lists). Everything is a DATA prop — no size/variant/tone at
// the call site. Slots, left → right:
//
//   title ..................... [avatar] [tag pills] [status] [dismiss ×]
//
// - `title`    the one required prop.
// - `avatar`   initials + optional color disc (SmAvatar underneath).
// - `tags`     pills; `active` marks a pill as matched/highlighted (e.g. the
//              tag that matched the current filter) — data, not styling.
// - `status`   trailing outlined chip ("TODO", "DONE", ...).
// - `onDismiss` shows the × button when provided.
//
// The drag grip is NOT part of ListItem — SortableList owns reorder mechanics;
// ListItem is what you hand to its `renderItem`.
// ============================================================================

interface ListItemTag {
  label: string;
  /** Highlighted (e.g. matched the active filter). Data-driven, not a style knob. */
  active?: boolean;
}

interface ListItemProps {
  title: string;
  avatar?: { initials: string; color?: string };
  tags?: ListItemTag[];
  status?: string;
  onDismiss?: () => void;
}

const ListItem: Component<ListItemProps> = (props) => (
  <div class="ws-list-item" role="listitem">
    <span class="ws-list-item__title">{props.title}</span>
    <span class="ws-list-item__meta">
      <Show when={props.avatar}>
        {(a) => <SmAvatar initials={a().initials} color={a().color} />}
      </Show>
      <For each={props.tags ?? []}>
        {(tag) => (
          <span
            class="ws-list-item__tag"
            classList={{ "ws-list-item__tag--active": tag.active }}
          >
            {tag.label}
          </span>
        )}
      </For>
      <Show when={props.status}>
        <span class="ws-list-item__status">{props.status}</span>
      </Show>
      <Show when={props.onDismiss}>
        <button
          type="button"
          class="ws-list-item__dismiss"
          aria-label={`Dismiss ${props.title}`}
          onClick={() => props.onDismiss?.()}
        >
          ×
        </button>
      </Show>
    </span>
  </div>
);

// Scratch CSS for the bench. Graduates to ListItem.css on /promote.
const benchCss = `
/* INVARIANT (principle 3): hover reveals via opacity only — never display,
   width, padding, border-width, or font changes. Row geometry is identical
   at rest and on hover. */
.ws-list-item {
  display: flex;
  align-items: center;
  gap: var(--sui-space-sm, 8px);
  width: 100%;
  min-height: 40px;
  padding: var(--sui-space-sm, 8px) var(--sui-space-md, 12px);
  background: var(--sui-bg-secondary);
  border: 1px solid var(--sui-border);
  border-radius: var(--sui-radius-md, 8px);
  color: var(--sui-text-primary);
  font-family: var(--sui-font-family);
  font-size: 0.875rem;
}
.ws-list-item__title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ws-list-item__meta {
  display: flex;
  align-items: center;
  gap: var(--sui-space-xs, 6px);
  flex: none;
}
.ws-list-item__tag,
.ws-list-item__status {
  padding: 1px 10px;
  border-radius: 999px;
  border: 1px solid var(--sui-border);
  color: var(--sui-text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
  white-space: nowrap;
}
.ws-list-item__tag--active {
  border-color: var(--sui-accent);
  color: var(--sui-accent);
  background: rgba(var(--sui-accent-rgb), 0.12);
}
.ws-list-item__status {
  font-family: var(--sui-font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.ws-list-item__dismiss {
  flex: none;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sui-border);
  border-radius: var(--sui-radius-sm, 4px);
  background: transparent;
  color: var(--sui-text-secondary);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.ws-list-item:hover .ws-list-item__dismiss,
.ws-list-item__dismiss:focus-visible {
  opacity: 1;
}
.ws-list-item__dismiss:hover {
  border-color: var(--sui-danger);
  color: var(--sui-danger);
}
/* PROMOTION NOTE: grip hover-reveal belongs to SortableList (or a row option)
   when this graduates; bench-scoped override for now. */
.ws-bench-stack .sui-sortable-list__grip {
  opacity: 0;
  transition: opacity 0.12s ease;
}
.ws-bench-stack .sui-sortable-list__row:hover .sui-sortable-list__grip {
  opacity: 0.45;
}
.ws-bench-stack {
  display: flex;
  flex-direction: column;
  gap: var(--sui-space-sm, 8px);
  max-width: 960px;
}
`;

// ── Bench data ──────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  avatar?: { initials: string; color?: string };
  tags: ListItemTag[];
  status: string;
}

const seedTasks: Task[] = [
  {
    id: "t1",
    title: "deploy minute-level-hover",
    avatar: { initials: "P", color: "#3b5bdb" },
    tags: [{ label: "stax", active: true }, { label: "jtf" }],
    status: "TODO",
  },
  {
    id: "t2",
    title: "Get creds to connect to sync spreadsheet",
    tags: [{ label: "stax", active: true }, { label: "jtf" }],
    status: "TODO",
  },
  {
    id: "t3",
    title: "Initial user flow — how to add account?",
    avatar: { initials: "A", color: "#5f3dc4" },
    tags: [{ label: "primestage", active: true }, { label: "thorcasting" }],
    status: "TODO",
  },
  {
    id: "t4",
    title: 'stray "today" indicator on chart',
    avatar: { initials: "A", color: "#5f3dc4" },
    tags: [{ label: "primestage", active: true }, { label: "thorcasting" }],
    status: "TODO",
  },
];

// ── Bench ───────────────────────────────────────────────────────────────────

const ListItemBench: Component = () => {
  const [tasks, setTasks] = createSignal<Task[]>(seedTasks);

  const reorder = (ids: string[]) => {
    const byId = new Map(tasks().map((t) => [t.id, t]));
    setTasks(ids.map((id) => byId.get(id)!).filter(Boolean));
  };

  const dismiss = (id: string) =>
    setTasks((ts) => ts.filter((t) => t.id !== id));

  return (
    <div class="component-section component-section--full">
      <style>{benchCss}</style>
      <SectionTitle>List Item — anatomy</SectionTitle>
      <MutedBody>
        All slots: title, avatar, tags (one active), status, dismiss.
      </MutedBody>
      <div class="ws-bench-stack">
        <ListItem
          title="deploy minute-level-hover"
          avatar={{ initials: "P", color: "#3b5bdb" }}
          tags={[{ label: "stax", active: true }, { label: "jtf" }]}
          status="TODO"
          onDismiss={() => {}}
        />
      </div>

      <SectionTitle>Progressive slots</SectionTitle>
      <MutedBody>Every prop except title is optional — rows degrade gracefully.</MutedBody>
      <div class="ws-bench-stack">
        <ListItem title="title only" />
        <ListItem title="with tags" tags={[{ label: "jtf" }, { label: "stax", active: true }]} />
        <ListItem title="with status" status="DONE" />
        <ListItem
          title="with a very long title that should truncate with an ellipsis rather than wrap or push the trailing meta cluster out of the row, no matter how long it gets"
          avatar={{ initials: "P", color: "#3b5bdb" }}
          tags={[{ label: "primestage" }]}
          status="TODO"
          onDismiss={() => {}}
        />
      </div>

      <SectionTitle>Inside SortableList (drag to reorder, × to dismiss)</SectionTitle>
      <MutedBody>
        ListItem is the `renderItem` content — SortableList owns the grip and
        the placeholder gap.
      </MutedBody>
      <div class="ws-bench-stack">
        <SortableList
          items={tasks()}
          getId={(t) => t.id}
          onReorder={reorder}
          renderItem={(t) => (
            <ListItem
              title={t.title}
              avatar={t.avatar}
              tags={t.tags}
              status={t.status}
              onDismiss={() => dismiss(t.id)}
            />
          )}
          label="Workshop task list"
        />
      </div>
    </div>
  );
};

export default ListItemBench;
