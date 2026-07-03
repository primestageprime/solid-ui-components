// ============================================
// ActionList — Composite (Depth 3)
// Composes SortableList (rowChrome "bare", gap 1) + ActionListItem. Owns only a
// thin structural CSS file (ActionList.css) for the multi-select actions bar —
// the wrapper column + the accent-cyan bar strip. Everything else is delegated:
// SortableList supplies the reorder mechanics + chromeless rows, ActionListItem
// supplies the row surface and all row visuals. A drop-in, data-driven list of
// editable action rows (todo queues, filter results, work items).
//
// The base is NOT exported — consumers use the curried `ActionList` drop-in (see
// variants.ts) or createActionList(). Follows the createButton / createPanel
// Overrides/DataProps split: the ONE presentational knob is `statusTones` (the
// status→row-tone map), frozen at curry time so the tone mapping never leaks to
// an app call site; everything else is data.
//
// Each callback opts a behaviour in: `onSort` enables drag reorder, `onDelete`
// the × cap, `onRename` the inline title edit, `onStatusChange` the chip edit +
// select. Omit one and that affordance stays inert.
//
// MULTI-SELECT. Passing `actions` turns rows into click-to-toggle selection
// targets and reveals an actions bar while the selection is non-empty. Each
// action is a [hotkey]/label/onApply triple rendered as a REUSED `HotkeyButton`
// (the exact "[c]laim" affordance — no new button component); pressing the
// bracketed key applies it to the selection. Escape clears it (unless an inline
// editor is focused — the editor's own Escape-cancel wins). Applying an action
// clears the selection by default (the batch is done) — set
// `clearSelectionOnApply={false}` to keep it (e.g. in-place claim/release).
// Shift-click range-selects: it applies the anchor row's (last plain-toggled)
// selected state to the whole contiguous span between the anchor and the click.
//
// Selection is UNCONTROLLED by default (owned here, surfaced via
// `onSelectionChange`). Passing `selectedIds` makes it fully CONTROLLED: the
// internal state is ignored, the passed ids are rendered as selected, and the
// list never mutates on its own — every interaction is emitted as an intent via
// `onSelectionChange` for the consumer to honour (or not). `onTagClick` turns
// tag pills into buttons whose clicks fire the callback and never toggle a row.
//
// Reuse decisions: HotkeyButton is reused verbatim for the action buttons.
// BulkActionBar was NOT reused — it is a single-action, CountChip + elevated
// floating toolbar (bg-elevated + drop shadow), whereas this needs N hotkey
// actions in the flat accent-cyan language of the list. BatchBar (a progress
// bar) and SegmentedControl (a single-select toggle) are unrelated.
// ============================================
import {
  Component,
  For,
  Show,
  createEffect,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
  untrack,
} from "solid-js";
import { SortableList } from "../SortableList/SortableList";
import { ActionListItem, type ActionListItemTone } from "../ActionListItem/ActionListItem";
import { HotkeyButton, isEditableTarget } from "../HotkeyButton";
import { idRange } from "./selection";
import type { AssigneeIconProps } from "../ParticipantAvatar/AssigneeIcon";
import type { TagPillData } from "../Badge/TagPill";
import "./ActionList.css";

/** A tag — a plain/`"ns:value"` label, or the explicit `{ key, value }` form. */
export type ActionListTag = TagPillData;

/** Person / AI assignment glyph data. */
export type ActionListAssignee = AssigneeIconProps;

export interface ActionListItemData {
  id: string;
  /** The title. */
  name: string;
  status?: string;
  assignee?: ActionListAssignee;
  /** Assignment roster. Wins over the singular `assignee` when both are given
   *  (the singular is treated as a one-person roster). */
  assignees?: ActionListAssignee[];
  tags?: ActionListTag[];
}

/** A batch action shown in the selection actions bar. */
export interface ActionListAction {
  /** Single-char hotkey, emphasized in the label: [c]laim. Pressing it (while a
   *  selection exists and no inline editor is focused) applies the action. */
  hotkey: string;
  /** Button label; the first case-insensitive `hotkey` char is emphasized. */
  label: string;
  /** Applied to the currently-selected ids. The selection is cleared after. */
  onApply: (selectedIds: string[]) => void;
}

export interface ActionListProps {
  items: ActionListItemData[];
  /** Known statuses; drives each chip's select menu + fixed width. */
  statusOptions?: string[];
  /** Enables drag reorder; called with the new id order after a drop. */
  onSort?: (orderedIds: string[]) => void;
  /** Enables the × cap; called with the removed id. */
  onDelete?: (id: string) => void;
  /** Enables inline title edit; called with the id + new name. */
  onRename?: (id: string, name: string) => void;
  /** Enables chip edit/select; called with the id + new status. */
  onStatusChange?: (id: string, status: string) => void;
  /** Batch actions. Presence ENABLES multi-select: rows become click-to-toggle
   *  targets and an actions bar appears while the selection is non-empty. */
  actions?: ActionListAction[];
  /** Controlled selection. When provided, selection is FULLY controlled: the
   *  list ignores its internal state, renders exactly these ids as selected, and
   *  never mutates on its own — every interaction (toggle, shift-range, Escape,
   *  apply) is emitted as an intent via `onSelectionChange` for the consumer to
   *  honour. Also enables selection on its own (no `actions` needed). Omit for
   *  the uncontrolled default (the list owns selection). */
  selectedIds?: string[];
  /** Whether applying an action clears the selection. Default `true` (the batch
   *  is done — the next click starts fresh). Set `false` to keep the selection
   *  after an action fires (e.g. claim/release that operate in place). */
  clearSelectionOnApply?: boolean;
  /** When provided, tag pills become buttons; clicking one fires this (and does
   *  NOT toggle row selection). Without it, tags stay inert. */
  onTagClick?: (item: ActionListItemData, tag: ActionListTag) => void;
  /** Observer fired whenever the selection changes (uncontrolled) or an intent
   *  is emitted (controlled). */
  onSelectionChange?: (ids: string[]) => void;
  /** Accessible label for the list region. */
  label?: string;
}

/** The single presentational knob: how each status maps to a row tone. Frozen at
 *  curry time (see variants.ts) so the mapping stays out of app call sites. */
export interface ActionListOverrides {
  statusTones?: Record<string, ActionListItemTone>;
}

/** Props that remain available to consumers of a curried ActionList variant. */
export type ActionListDataProps = ActionListProps;

/** Default tone map — DONE recedes, DOING pops, everything else stays neutral. */
export const DEFAULT_STATUS_TONES: Record<string, ActionListItemTone> = {
  DONE: "dim",
  DOING: "highlight",
};

const ActionListBase: Component<ActionListProps & ActionListOverrides> = (props) => {
  const tones = () => props.statusTones ?? DEFAULT_STATUS_TONES;
  const toneFor = (status?: string): ActionListItemTone =>
    (status && tones()[status]) || "neutral";

  // --- Multi-select ------------------------------------------------------
  // Controlled when `selectedIds` is supplied: the internal signal is then
  // ignored and every mutation is emitted as an intent only (never applied here).
  const controlled = () => props.selectedIds !== undefined;
  const [internalIds, setInternalIds] = createSignal<string[]>([]);
  const selection = () => props.selectedIds ?? internalIds();
  const selectionEnabled = () => (props.actions?.length ?? 0) > 0 || controlled();
  // Single write path: apply internally only when uncontrolled, always emit.
  const emit = (next: string[]) => {
    if (!controlled()) setInternalIds(next);
    props.onSelectionChange?.(next);
  };
  const isSelected = (id: string) => selection().includes(id);

  // The anchor is the last plain-toggled row — pure interaction state (not part
  // of the selection model), so it stays local even in controlled mode.
  const [anchorId, setAnchorId] = createSignal<string | null>(null);
  const plainToggle = (id: string) => {
    setAnchorId(id);
    const cur = selection();
    emit(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };
  // Shift-click: apply the anchor row's current selected state to the whole
  // contiguous span [anchor..target]. Selecting the anchor then shift-clicking
  // selects the span; deselecting it deselects the span. Ids outside the span
  // are untouched. The anchor stays put so a further shift-click re-ranges from
  // it. With no usable anchor, falls back to a plain toggle.
  const rangeToggle = (id: string) => {
    const order = props.items.map((i) => i.id);
    const anchor = anchorId();
    const range = idRange(order, anchor, id);
    if (!range) {
      plainToggle(id);
      return;
    }
    const cur = selection();
    const select = anchor != null && cur.includes(anchor);
    if (select) {
      const merged = new Set([...cur, ...range]);
      emit(order.filter((x) => merged.has(x)));
    } else {
      const drop = new Set(range);
      emit(cur.filter((x) => !drop.has(x)));
    }
  };

  // Prune ids that leave the list (e.g. a selected row is deleted). Uncontrolled
  // only — a controlled consumer owns its selection and prunes it itself, so the
  // list stays true to "never mutates on its own" when controlled. Reacts to
  // `items` only — untrack the selection read so this doesn't loop on toggle.
  createEffect(() => {
    if (controlled()) return;
    const live = new Set(props.items.map((i) => i.id));
    untrack(() => {
      const cur = internalIds();
      const pruned = cur.filter((id) => live.has(id));
      if (pruned.length !== cur.length) emit(pruned);
    });
  });

  // Escape clears the selection — but only when no inline editor is focused, so
  // the EditableTitle / StatusChip Escape-cancel behaviour keeps precedence.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (!selectionEnabled() || selection().length === 0) return;
    if (isEditableTarget(e.target)) return;
    emit([]);
  };
  onMount(() => window.addEventListener("keydown", onKeyDown));
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  const applyAction = (action: ActionListAction) => {
    action.onApply(selection());
    if (props.clearSelectionOnApply ?? true) emit([]); // batch done → start fresh
  };

  return (
    <div class="sui-action-list">
      <Show when={selectionEnabled() && selection().length > 0}>
        <div class="sui-action-list__bar" role="toolbar" aria-label="Selection actions">
          <span class="sui-action-list__bar-count">
            {selection().length} selected
          </span>
          <For each={props.actions}>
            {(action) => (
              <HotkeyButton
                hotkey={action.hotkey}
                variant="ghost"
                size="sm"
                onTrigger={() => applyAction(action)}
              >
                {action.label}
              </HotkeyButton>
            )}
          </For>
        </div>
      </Show>
      <SortableList
        items={props.items}
        getId={(d) => d.id}
        // onSort enables reorder; without it a drop simply doesn't persist.
        onReorder={(ids) => props.onSort?.(ids)}
        rowChrome="bare"
        gap={1}
        label={props.label}
        renderItem={(d) => (
          <ActionListItem
            title={d.name}
            status={d.status}
            statusOptions={props.statusOptions}
            assignee={d.assignee}
            assignees={d.assignees}
            tags={d.tags}
            tone={toneFor(d.status)}
            selected={isSelected(d.id)}
            onSelect={
              selectionEnabled()
                ? (e) => (e.shiftKey ? rangeToggle(d.id) : plainToggle(d.id))
                : undefined
            }
            onTagClick={
              props.onTagClick ? (tag) => props.onTagClick!(d, tag) : undefined
            }
            onStatusChange={
              props.onStatusChange ? (s) => props.onStatusChange!(d.id, s) : undefined
            }
            onTitleChange={
              props.onRename ? (name) => props.onRename!(d.id, name) : undefined
            }
            onDismiss={props.onDelete ? () => props.onDelete!(d.id) : undefined}
          />
        )}
      />
    </div>
  );
};

export function createActionList(
  defaults: Partial<ActionListOverrides>,
): Component<ActionListDataProps> {
  return (props) => <ActionListBase {...mergeProps(defaults, props)} />;
}
