import { Component, For, Show, createSignal } from "solid-js";
import { SectionTitle, MutedBody } from "../../../src/components/Text";
import { SortableList } from "../../../src/components/SortableList";

export const meta = { label: "List Item" };

// ============================================================================
// PROTOTYPE — ListItem (workshop bench, not yet in src/)
//
// A general-purpose drop-in row for dense item lists (todo queues, filter
// results, pick lists). Everything is a DATA prop — no size/variant/tone at
// the call site. Slots, left → right:
//
//   title ................... [assignee] [tag pills] [status] [dismiss ×]
//
// - `title`    the one required prop.
// - `assignee` initials inside a person silhouette or an antennaed robot head
//              (kind: "person" | "ai"); `active` highlights the border.
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

interface ListItemAssignee {
  /** Up to 2 characters, centered in the icon. */
  initials: string;
  /** Person silhouette or antennaed robot head. Default "person". */
  kind?: "person" | "ai";
  /** Highlighted border (e.g. matched the active filter). Data-driven. */
  active?: boolean;
}

interface ListItemProps {
  title: string;
  assignee?: ListItemAssignee;
  tags?: ListItemTag[];
  status?: string;
  /** Known statuses; drives the select menu AND the fixed chip width (longest option). */
  statusOptions?: string[];
  /** Called when the user edits (free text) or selects a status. When absent the chip is inert. */
  onStatusChange?: (status: string) => void;
  /** Called when the user renames the item. When absent the title is inert. */
  onTitleChange?: (title: string) => void;
  onDismiss?: () => void;
}

/** Assignment icon: initials (max 2 chars, centered) inside a person
 * silhouette or an antennaed robot head. Outline-only; `active` lights the
 * border. Replaces the old circular avatar. */
const AssigneeIcon: Component<ListItemAssignee> = (props) => {
  const chars = () => props.initials.slice(0, 2);
  return (
    <span
      class="ws-list-item__assignee"
      classList={{ "ws-list-item__assignee--active": props.active }}
      title={props.initials}
    >
      <Show
        when={props.kind === "ai"}
        fallback={
          /* Person: classic user icon — head circle (holds the initials) above
             rounded shoulders. */
          <svg viewBox="0 0 28 26" aria-label={`Assigned to ${props.initials} (person)`}>
            <circle cx="14" cy="10" r="8.75" />
            <path d="M5 25 v-0.5 a9 4.5 0 0 1 18 0 v0.5 z" />
            <text x="14" y="13">{chars()}</text>
          </svg>
        }
      >
        {/* AI: robot head with two antennae. */}
        <svg viewBox="0 0 28 26" aria-label={`Assigned to ${props.initials} (AI)`}>
          <line x1="9" y1="10" x2="7" y2="4" />
          <circle class="dot" cx="6.7" cy="3" r="1.6" />
          <line x1="19" y1="10" x2="21" y2="4" />
          <circle class="dot" cx="21.3" cy="3" r="1.6" />
          <rect x="4" y="10" width="20" height="14" rx="2" />
          <text x="14" y="20.5">{chars()}</text>
        </svg>
      </Show>
    </span>
  );
};

const TagPill: Component<{ tag: ListItemTag }> = (props) => {
  const splitAt = () => props.tag.label.indexOf(":");
  return (
    <Show
      when={splitAt() > 0}
      fallback={
        <span
          class="ws-list-item__tag"
          classList={{ "ws-list-item__tag--active": props.tag.active }}
        >
          {props.tag.label}
        </span>
      }
    >
      <span
        class="ws-list-item__tag ws-list-item__tag--split"
        classList={{ "ws-list-item__tag--active": props.tag.active }}
      >
        <span class="ws-list-item__tag-ns">
          {props.tag.label.slice(0, splitAt())}
        </span>
        <span class="ws-list-item__tag-val">
          {props.tag.label.slice(splitAt() + 1)}
        </span>
      </span>
    </Show>
  );
};

const StatusChip: Component<{
  status: string;
  options?: string[];
  onChange?: (s: string) => void;
  title: string;
}> = (props) => {
  const [editing, setEditing] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);
  // Escape cancels: the resulting blur must not commit the draft.
  let cancelled = false;
  const options = () => props.options ?? [];
  // Fixed width: longest option (or current status), in ch of the mono font.
  const widthCh = () =>
    Math.max(props.status.length, ...options().map((o) => o.length)) + 1;
  const commit = (value: string) => {
    setEditing(false);
    setMenuOpen(false);
    const v = value.trim();
    if (v && v !== props.status) props.onChange?.(v);
  };
  return (
    <span
      class="ws-list-item__status-slot"
      classList={{
        // Tone follows the VALUE (data-driven): DONE recedes, DOING pops.
        "ws-list-item__status-slot--dim": props.status === "DONE",
        "ws-list-item__status-slot--highlight": props.status === "DOING",
      }}
      style={{ width: `${widthCh()}ch` }}
    >
      <Show
        when={!editing()}
        fallback={
          <input
            class="ws-list-item__status-input"
            value={props.status}
            ref={(el) => queueMicrotask(() => { el.focus(); el.select(); })}
            onBlur={(e) => {
              if (!cancelled) commit(e.currentTarget.value);
              cancelled = false;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(e.currentTarget.value);
              if (e.key === "Escape") {
                cancelled = true;
                e.currentTarget.blur();
                setEditing(false);
              }
            }}
          />
        }
      >
        <button
          type="button"
          class="ws-list-item__status-text"
          aria-label={`Edit status of ${props.title}`}
          disabled={!props.onChange}
          onClick={() => setEditing(true)}
        >
          {props.status}
        </button>
      </Show>
      <Show when={props.onChange && options().length > 0}>
        <button
          type="button"
          class="ws-list-item__status-caret"
          aria-label={`Select status of ${props.title}`}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ▾
        </button>
        <Show when={menuOpen()}>
          <div class="ws-list-item__status-menu" role="listbox">
            <For each={options()}>
              {(opt) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={opt === props.status}
                  class="ws-list-item__status-option"
                  classList={{
                    "ws-list-item__status-option--current": opt === props.status,
                  }}
                  onClick={() => commit(opt)}
                >
                  {opt}
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </span>
  );
};

/** The name: inert text, or (with onChange) a hover-revealed edit target that
 * covers ONLY the text itself — the rest of the row stays free for drag. The
 * inline input shrink-wraps the text too (width in ch, live while typing). */
const EditableTitle: Component<{
  title: string;
  onChange?: (t: string) => void;
}> = (props) => {
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  // Escape cancels: blur must NOT commit the draft. The blur fired by the
  // cancel's own focus-out (or the input unmounting) checks this flag.
  let cancelled = false;
  const commit = (value: string) => {
    setEditing(false);
    const v = value.trim();
    if (v && v !== props.title) props.onChange?.(v);
  };
  return (
    <span class="ws-list-item__title">
      <Show
        when={!editing()}
        fallback={
          /* inline-grid + hidden ::after replica of the draft — the input is
             fitted to the text's true rendered width, not a ch estimate. */
          <span class="ws-list-item__title-editor" data-value={draft()}>
            <input
              class="ws-list-item__title-input"
              value={props.title}
              size={1}
              ref={(el) => queueMicrotask(() => { el.focus(); el.select(); })}
              onInput={(e) => setDraft(e.currentTarget.value)}
              onBlur={(e) => {
                if (!cancelled) commit(e.currentTarget.value);
                cancelled = false;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit(e.currentTarget.value);
                if (e.key === "Escape") {
                  cancelled = true;
                  e.currentTarget.blur();
                  setEditing(false);
                }
              }}
            />
          </span>
        }
      >
        <button
          type="button"
          class="ws-list-item__title-text"
          disabled={!props.onChange}
          aria-label={`Rename ${props.title}`}
          onClick={() => {
            setDraft(props.title);
            setEditing(true);
          }}
        >
          {props.title}
        </button>
      </Show>
    </span>
  );
};

const ListItem: Component<ListItemProps> = (props) => (
  <div
    class="ws-list-item"
    classList={{
      // Row tone mirrors the status: DONE recedes, DOING pops, TODO neutral.
      "ws-list-item--dim": props.status === "DONE",
      "ws-list-item--highlight": props.status === "DOING",
    }}
    role="listitem"
  >
    <Show when={props.status}>
      <StatusChip
        status={props.status!}
        options={props.statusOptions}
        onChange={props.onStatusChange}
        title={props.title}
      />
    </Show>
    <EditableTitle title={props.title} onChange={props.onTitleChange} />
    <span class="ws-list-item__meta">
      <Show when={props.assignee}>
        {(a) => <AssigneeIcon {...a()} />}
      </Show>
      <For each={props.tags ?? []}>
        {(tag) => <TagPill tag={tag} />}
      </For>
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
  /* Resting rows read as a subtly different background, not an outline; the
     border exists (transparent) so hover can light it with zero geometry
     shift (principle 3). */
  background: var(--sui-bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--sui-radius-md, 8px);
  color: var(--sui-text-primary);
  font-family: var(--sui-font-family);
  font-size: 0.875rem;
}
.ws-list-item:hover {
  border-color: var(--sui-border-bright, var(--sui-border));
}
.ws-list-item__title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
/* The edit target covers ONLY the text itself — a shrink-wrapped button
   inside the flexible title slot; the slot's leftover width stays inert. */
.ws-list-item__title-text {
  font: inherit;
  color: inherit;
  background: transparent;
  border: none;
  padding: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
  vertical-align: middle;
}
.ws-list-item__title-text:disabled {
  cursor: default;
}
.ws-list-item:hover .ws-list-item__title-text:not(:disabled) {
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}
/* Fitted editor: a hidden replica of the draft text sizes the grid cell, so
   the input is exactly as wide as its content (same font, live per keystroke). */
.ws-list-item__title-editor {
  display: inline-grid;
  align-items: center;
  max-width: 100%;
  vertical-align: middle;
}
.ws-list-item__title-editor::after {
  content: attr(data-value) " ";
  grid-area: 1 / 1;
  visibility: hidden;
  white-space: pre;
  overflow: hidden;
}
.ws-list-item__title-input {
  grid-area: 1 / 1;
  width: 100%;
  min-width: 1ch;
  font: inherit;
  color: inherit;
  background: transparent;
  border: none;
  padding: 0;
  outline: 1px solid var(--sui-accent);
  outline-offset: 1px;
  border-radius: 2px;
}
.ws-list-item__meta {
  display: flex;
  align-items: center;
  gap: var(--sui-space-xs, 6px);
  flex: none;
}
/* Assignment icon: outline shapes; --active lights the border + initials. */
.ws-list-item__assignee {
  flex: none;
  display: inline-flex;
  align-items: center;
}
.ws-list-item__assignee svg {
  width: 25px;
  height: 23px;
  fill: none;
  stroke: var(--sui-border-bright, var(--sui-border));
  stroke-width: 1.5;
  stroke-linejoin: round;
}
.ws-list-item__assignee svg circle.dot {
  fill: var(--sui-border-bright, var(--sui-border));
  stroke: none;
}
.ws-list-item__assignee svg text {
  stroke: none;
  fill: var(--sui-text-secondary);
  font-family: var(--sui-font-mono);
  font-size: 9px;
  font-weight: 700;
  text-anchor: middle;
}
.ws-list-item__assignee--active svg {
  stroke: var(--sui-accent);
}
.ws-list-item__assignee--active svg circle.dot {
  fill: var(--sui-accent);
}
.ws-list-item__assignee--active svg text {
  fill: var(--sui-accent);
}
.ws-list-item__tag {
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
.ws-list-item__tag--split {
  display: inline-flex;
  align-items: stretch;
  padding: 0;
  overflow: hidden;
}
.ws-list-item__tag-ns,
.ws-list-item__tag-val {
  padding: 1px 8px;
}
.ws-list-item__tag-ns {
  /* The namespace is the lozenge's heading: SAME background and font color
     as the value side — strong type is the only differentiator. */
  border-right: 1px solid var(--sui-border);
  font-weight: 700;
}
.ws-list-item__tag--split.ws-list-item__tag--active .ws-list-item__tag-ns {
  border-right-color: var(--sui-accent);
}
.ws-list-item__status-slot {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  box-sizing: content-box;
  padding: 1px 10px;
  border: 1px solid var(--sui-border);
  border-radius: 999px;
  font-family: var(--sui-font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--sui-text-muted);
  line-height: 1.5;
  white-space: nowrap;
}
/* Value-driven tones: DONE recedes, TODO stays neutral, DOING pops. */
.ws-list-item__status-slot--dim {
  opacity: 0.45;
}
.ws-list-item__status-slot--highlight {
  border-color: var(--sui-accent);
  color: var(--sui-accent);
  background: rgba(var(--sui-accent-rgb), 0.12);
}
.ws-list-item__status-text,
.ws-list-item__status-input {
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
  background: transparent;
  border: none;
  padding: 0;
  min-width: 0;
  flex: 1 1 auto;
  text-align: center;
  cursor: text;
}
.ws-list-item__status-text:disabled {
  cursor: default;
}
.ws-list-item:hover .ws-list-item__status-text:not(:disabled) {
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}
.ws-list-item__status-input {
  outline: 1px solid var(--sui-accent);
  outline-offset: 1px;
  border-radius: 2px;
}
.ws-list-item__status-caret {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 1.2ch;
  background: transparent;
  border: none;
  padding: 0;
  color: var(--sui-text-secondary);
  font-size: 0.6875rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.ws-list-item:hover .ws-list-item__status-caret,
.ws-list-item__status-caret:focus-visible {
  opacity: 1;
}
.ws-list-item__status-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 10;
  min-width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sui-bg-elevated);
  border: 1px solid var(--sui-border-bright, var(--sui-border));
  border-radius: var(--sui-radius-sm, 4px);
  padding: 2px;
}
.ws-list-item__status-option {
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 2px;
  padding: 3px 8px;
  color: var(--sui-text-secondary);
  cursor: pointer;
}
.ws-list-item__status-option:hover {
  background: rgba(var(--sui-accent-rgb), 0.15);
  color: var(--sui-text-primary);
}
.ws-list-item__status-option--current {
  color: var(--sui-accent);
}
.ws-list-item__dismiss {
  /* Semi-circular cap, flush against the row's right edge: stretches the full
     row height and eats the row's padding with negative margins. */
  flex: none;
  align-self: stretch;
  width: 22px;
  margin: calc(-1 * var(--sui-space-sm, 8px))
    calc(-1 * var(--sui-space-md, 12px))
    calc(-1 * var(--sui-space-sm, 8px)) 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sui-border);
  border-radius: 999px 0 0 999px;
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
/* PROMOTION NOTE: SortableList's row wrapper (Surface: 8px 12px padding,
   border, elevated bg) must not add chrome around ListItem — the row IS the
   ListItem, so the wrapper would double it. Zero vertical growth; horizontal
   growth only the grip's slot. !important beats the wrapper's inline padding.
   Becomes a chromeless-row option on SortableList when this graduates. */
/* Near-flush rows — 1px of space between them (Peter, 2026-07-02). */
.ws-bench-stack .sui-sortable-list {
  gap: 1px;
}
.ws-bench-stack .sui-sortable-list__row:not(.sui-sortable-list__placeholder) {
  padding: 0 !important;
  border: none;
  background: transparent;
  gap: 6px;
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
/* Row tone mirrors the status chip: DONE dims the text and right-side chips,
   DOING lights them accent, TODO stays neutral. */
.ws-list-item--dim .ws-list-item__title,
.ws-list-item--dim .ws-list-item__meta {
  opacity: 0.45;
}
.ws-list-item--highlight .ws-list-item__title {
  color: var(--sui-accent);
}
.ws-list-item--highlight .ws-list-item__tag {
  border-color: var(--sui-accent);
  color: var(--sui-accent);
  background: rgba(var(--sui-accent-rgb), 0.12);
}
.ws-list-item--highlight .ws-list-item__tag-ns {
  border-right-color: var(--sui-accent);
}
.ws-list-item--highlight .ws-list-item__assignee svg {
  stroke: var(--sui-accent);
}
.ws-list-item--highlight .ws-list-item__assignee svg circle.dot {
  fill: var(--sui-accent);
}
.ws-list-item--highlight .ws-list-item__assignee svg text {
  fill: var(--sui-accent);
}
.ws-bench-stack {
  display: flex;
  flex-direction: column;
  gap: var(--sui-space-sm, 8px);
  max-width: 960px;
}
`;

// ── Bench data ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["TODO", "DOING", "BLOCKED", "DONE"];

interface Task {
  id: string;
  title: string;
  assignee?: ListItemAssignee;
  tags: ListItemTag[];
  status: string;
}

const seedTasks: Task[] = [
  {
    id: "t1",
    title: "deploy minute-level-hover",
    assignee: { initials: "P", kind: "person", active: true },
    tags: [{ label: "stax:jtf", active: true }],
    status: "DONE",
  },
  {
    id: "t2",
    title: "Get creds to connect to sync spreadsheet",
    tags: [{ label: "stax:jtf", active: true }],
    status: "DOING",
  },
  {
    id: "t3",
    title: "Initial user flow — how to add account?",
    assignee: { initials: "A", kind: "ai" },
    tags: [{ label: "primestage:thorcasting", active: true }],
    status: "DOING",
  },
  {
    id: "t4",
    title: 'stray "today" indicator on chart',
    assignee: { initials: "A", kind: "ai" },
    tags: [{ label: "primestage:thorcasting", active: true }],
    status: "TODO",
  },
  {
    id: "t5",
    title: "wire showcase filter to tag facets",
    assignee: { initials: "DA", kind: "ai" },
    tags: [{ label: "primestage:dside" }],
    status: "TODO",
  },
  {
    id: "t6",
    title: "backfill June hours into the STAX sheet",
    assignee: { initials: "P", kind: "person" },
    tags: [{ label: "stax" }],
    status: "TODO",
  },
  {
    id: "t7",
    title: "sketch swimlane card hover states",
    tags: [{ label: "primestage:thorcasting" }],
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

  const setStatus = (id: string, status: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));

  const setTitle = (id: string, title: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, title } : t)));

  return (
    <div class="component-section component-section--full">
      <style>{benchCss}</style>
      <SectionTitle>List Item — anatomy</SectionTitle>
      <MutedBody>
        All slots: title, assignee, tags (one active), status, dismiss.
      </MutedBody>
      <div class="ws-bench-stack">
        <ListItem
          title="deploy minute-level-hover"
          assignee={{ initials: "P", kind: "person", active: true }}
          tags={[{ label: "stax", active: true }, { label: "jtf" }]}
          status="TODO"
          statusOptions={STATUS_OPTIONS}
          onStatusChange={() => {}}
          onTitleChange={() => {}}
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
          assignee={{ initials: "P", kind: "person", active: true }}
          tags={[{ label: "primestage" }]}
          status="TODO"
          onDismiss={() => {}}
        />
        <ListItem
          title="composite tag — company:product split lozenge"
          tags={[
            { label: "primestage:thorcasting", active: true },
            { label: "primestage:dside" },
            { label: "stax" },
          ]}
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
              assignee={t.assignee}
              tags={t.tags}
              status={t.status}
              statusOptions={STATUS_OPTIONS}
              onStatusChange={(s) => setStatus(t.id, s)}
              onTitleChange={(title) => setTitle(t.id, title)}
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
