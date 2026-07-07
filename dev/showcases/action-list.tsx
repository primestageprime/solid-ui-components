import { Component, createMemo, createSignal, Show } from "solid-js";
import { SectionTitle, MutedBody } from "../../src/components/Text";
import { ActionListItem, type ActionListItemTone } from "../../src/components/ActionListItem";
import {
  ActionList,
  DEFAULT_STATUS_TONES,
  type ActionListItemData,
  type ActionListTag,
} from "../../src/components/ActionList";
import { AssigneeIcon, deriveInitials } from "../../src/components/ParticipantAvatar";

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

/** A roster whose names deliberately collide, to exercise deriveInitials:
 *  the verbatim PS/PF example, a three-way Falk push, an unresolvable twin
 *  (Peter Strong shares Peter Stradinger's letters), plus a clash-free name and
 *  an AI. */
const roster: { name: string; kind: "person" | "ai" }[] = [
  { name: "Peter Stradinger", kind: "person" },
  { name: "Peter Falk", kind: "person" },
  { name: "Paula Falk", kind: "person" },
  { name: "Peter Strong", kind: "person" },
  { name: "Ada Lovelace", kind: "person" },
  { name: "Deep Agent", kind: "ai" },
];
const rosterNames = roster.map((p) => p.name);

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

  // ── Controlled-selection + clickable-tag demo ───────────────────────────
  // A separate list that OWNS its selection (selectedIds is driven by a signal
  // the parent updates from onSelectionChange) and keeps the selection after an
  // action (clearSelectionOnApply={false}), so [c]laim / [r]elease operate in
  // place — the dside claim/release idiom. Clicking a tag drives a visible
  // filter: the matching tag lights up and the list narrows to matching rows.
  const [demoTasks, setDemoTasks] = createSignal<ActionListItemData[]>([
    {
      id: "d1",
      name: "pair on the controlled-selection API",
      assignees: [
        { initials: "P", kind: "person", active: true },
        { initials: "DA", kind: "ai" },
      ],
      tags: [{ key: "primestage", value: "dside", active: false }],
      status: "DOING",
    },
    {
      id: "d2",
      name: "backfill STAX June hours",
      assignee: { initials: "P", kind: "person" },
      tags: [{ label: "stax" }],
      status: "TODO",
    },
    {
      id: "d3",
      name: "thorcasting swimlane hovers",
      assignee: { initials: "DA", kind: "ai" },
      tags: [{ key: "primestage", value: "thorcasting" }],
      status: "TODO",
    },
    {
      id: "d4",
      name: "wire showcase filter to tag facets",
      tags: [{ key: "primestage", value: "dside" }],
      status: "TODO",
    },
  ]);

  // ── Replace-mode range demo ─────────────────────────────────────────────
  // An uncontrolled list whose shift-click uses rangeSelectMode="replace": each
  // shift-click yields exactly the span from the anchor to the click, discarding
  // any prior selection (classic file-list semantics). The header echoes the last
  // selection + the meta ActionList now emits so the gesture is visible.
  const [replaceSel, setReplaceSel] = createSignal<string[]>([]);
  const [lastGesture, setLastGesture] = createSignal<string>("—");
  const onReplaceChange = (
    ids: string[],
    meta?: { kind: string; clickedId?: string; shiftKey?: boolean },
  ) => {
    setReplaceSel(ids);
    setLastGesture(
      meta
        ? `${meta.kind}${meta.clickedId ? ` @${meta.clickedId}` : ""}${meta.shiftKey ? " +shift" : ""}`
        : "prune",
    );
  };

  const [demoSel, setDemoSel] = createSignal<string[]>([]);
  const [tagFilter, setTagFilter] = createSignal<string | null>(null);
  const tagLabel = (t: ActionListTag) =>
    "key" in t ? `${t.key}:${t.value}` : t.label;

  // Clicking a tag toggles the filter on that label (click the active one again
  // to clear). onTagClick never toggles the row's selection.
  const onTagClick = (_item: ActionListItemData, tag: ActionListTag) =>
    setTagFilter((cur) => (cur === tagLabel(tag) ? null : tagLabel(tag)));

  // Rows narrowed to the active tag, with the matching pill lit `active`.
  const demoRows = createMemo<ActionListItemData[]>(() => {
    const f = tagFilter();
    const withActive = demoTasks().map((t) => ({
      ...t,
      tags: t.tags?.map((tg) => ({ ...tg, active: !!f && tagLabel(tg) === f })),
    }));
    return f
      ? withActive.filter((t) => (t.tags ?? []).some((tg) => tagLabel(tg) === f))
      : withActive;
  });

  const demoClaim = (ids: string[]) =>
    setDemoTasks((ts) =>
      ts.map((t) =>
        ids.includes(t.id)
          ? {
              ...t,
              assignees: undefined,
              assignee: { initials: "P", kind: "person", active: true },
            }
          : t,
      ),
    );
  const demoRelease = (ids: string[]) =>
    setDemoTasks((ts) =>
      ts.map((t) =>
        ids.includes(t.id) ? { ...t, assignees: undefined, assignee: undefined } : t,
      ),
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
        <ActionListItem
          title="multi-assignee — a roster of glyphs (plural wins over singular)"
          status="DOING"
          tone={toneFor("DOING")}
          assignees={[
            { initials: "P", kind: "person", active: true },
            { initials: "DA", kind: "ai" },
            { initials: "AA", kind: "person" },
          ]}
          tags={[{ label: "primestage:dside", active: true }]}
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
        the assignee. <b>Shift-click</b> a second row to range-select the whole span
        from the last clicked row. Press the bracketed hotkey to apply, or Escape to
        clear the selection. Applying an action clears the selection.
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

      <SectionTitle>Controlled selection, keep-on-apply &amp; clickable tags</SectionTitle>
      <MutedBody>
        This list OWNS its selection — <code>selectedIds</code> is driven by a signal
        the page updates from <code>onSelectionChange</code>, so the list emits intents
        and never mutates on its own. <code>clearSelectionOnApply=&#123;false&#125;</code>
        keeps the selection after <b>[c]laim</b> / <b>[r]elease</b> so you can chain
        actions on the same set (the dside idiom). <b>Click a tag</b> to filter: the
        matching pill lights and the list narrows to matching rows; click the active
        tag again (or the banner's ×) to clear. Tag clicks never toggle row selection.
      </MutedBody>
      <div style={stackStyle}>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
            "min-height": "24px",
            color: "var(--sui-accent)",
            "font-size": "0.8125rem",
          }}
        >
          <span style={{ opacity: 0.75 }}>{demoSel().length} selected</span>
          <Show when={tagFilter()}>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>
              filtering <b>{tagFilter()}</b> ({demoRows().length} of {demoTasks().length})
            </span>
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              style={{
                background: "transparent",
                border: "1px solid var(--sui-border)",
                "border-radius": "999px",
                color: "inherit",
                cursor: "pointer",
                "line-height": 1,
                padding: "0 6px",
              }}
              aria-label="Clear tag filter"
            >
              ×
            </button>
          </Show>
        </div>
        <ActionList
          items={demoRows()}
          statusOptions={STATUS_OPTIONS}
          selectedIds={demoSel()}
          onSelectionChange={setDemoSel}
          clearSelectionOnApply={false}
          onTagClick={onTagClick}
          actions={[
            { hotkey: "c", label: "claim", onApply: demoClaim },
            { hotkey: "r", label: "release", onApply: demoRelease },
          ]}
          label="Controlled task list"
        />
      </div>

      <SectionTitle>Replace-mode range &amp; selection metadata</SectionTitle>
      <MutedBody>
        <code>rangeSelectMode="replace"</code> makes each <b>shift-click</b> select
        exactly the span from the anchor (last plain click) to the click, discarding
        any prior selection — the classic file-list feel, versus the default
        <code>"extend"</code> which merges the span into what's already selected. The
        header echoes <code>onSelectionChange</code>'s new second argument
        (<code>ActionListSelectionMeta</code>): the gesture <code>kind</code>, the
        <code>clickedId</code>, and whether Shift was held — the hook a consumer uses
        to keep a keyboard cursor in sync with mouse clicks.
      </MutedBody>
      <div style={stackStyle}>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
            "min-height": "24px",
            color: "var(--sui-accent)",
            "font-size": "0.8125rem",
          }}
        >
          <span style={{ opacity: 0.75 }}>
            {replaceSel().length} selected [{replaceSel().join(", ")}]
          </span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>
            last gesture: <b>{lastGesture()}</b>
          </span>
        </div>
        <ActionList
          items={seedTasks.slice(0, 5)}
          statusOptions={STATUS_OPTIONS}
          rangeSelectMode="replace"
          onSelectionChange={onReplaceChange}
          actions={[{ hotkey: "c", label: "claim", onApply: () => {} }]}
          label="Replace-mode task list"
        />
      </div>

      <SectionTitle>Roster initials — deriveInitials</SectionTitle>
      <MutedBody>
        The assignee glyphs above take pre-picked <code>initials</code>; on a real
        roster, derive them once with <code>deriveInitials(names)</code> so shared
        letters disambiguate instead of collapsing to a wall of "P"s. Here
        <b> Peter Stradinger</b> and <b>Peter Falk</b> resolve to <code>PS</code> /
        <code>PF</code> (word initials), <b>Paula Falk</b> pushes the Falks into their
        first-word letters (<code>Pe</code> / <code>Pa</code>), and
        <b> Peter Strong</b> — indistinguishable from Peter Stradinger within two chars
        — shares its longest common initials and leans on the hover title. Names that
        never clash keep a single letter. Hover any glyph for the full name.
      </MutedBody>
      <div style={{ display: "flex", "align-items": "center", gap: "16px", "flex-wrap": "wrap" }}>
        {(() => {
          const initials = deriveInitials(rosterNames);
          return roster.map((person) => (
            <div
              style={{
                display: "flex",
                "flex-direction": "column",
                "align-items": "center",
                gap: "4px",
                color: "var(--sui-text)",
              }}
              title={person.name}
            >
              <AssigneeIcon initials={initials.get(person.name)!} kind={person.kind} />
              <span style={{ "font-size": "0.75rem", opacity: 0.7 }}>{person.name}</span>
            </div>
          ));
        })()}
      </div>
    </div>
  );
};

export default ActionListShowcase;
