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
// bracketed key applies it to the selection. Selection state is uncontrolled
// (owned here), surfaced via `onSelectionChange`. Escape clears it (unless an
// inline editor is focused — the editor's own Escape-cancel wins). Applying an
// action CLEARS the selection: the batch is done, so the next click starts a
// fresh set rather than silently re-applying to a stale selection.
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
  /** Observer fired whenever the (uncontrolled) selection changes. */
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

  // --- Multi-select (uncontrolled) ---------------------------------------
  const selectionEnabled = () => (props.actions?.length ?? 0) > 0;
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // Single write path so the observer fires on every real change.
  const applySelection = (next: string[]) => {
    setSelectedIds(next);
    props.onSelectionChange?.(next);
  };
  const isSelected = (id: string) => selectedIds().includes(id);
  const toggle = (id: string) =>
    applySelection(
      isSelected(id) ? selectedIds().filter((x) => x !== id) : [...selectedIds(), id],
    );

  // Prune ids that leave the list (e.g. a selected row is deleted). Reacts to
  // `items` only — untrack the selection read so this doesn't loop on toggle.
  createEffect(() => {
    const live = new Set(props.items.map((i) => i.id));
    untrack(() => {
      const cur = selectedIds();
      const pruned = cur.filter((id) => live.has(id));
      if (pruned.length !== cur.length) applySelection(pruned);
    });
  });

  // Escape clears the selection — but only when no inline editor is focused, so
  // the EditableTitle / StatusChip Escape-cancel behaviour keeps precedence.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (!selectionEnabled() || selectedIds().length === 0) return;
    if (isEditableTarget(e.target)) return;
    applySelection([]);
  };
  onMount(() => window.addEventListener("keydown", onKeyDown));
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  const applyAction = (action: ActionListAction) => {
    action.onApply(selectedIds());
    applySelection([]); // batch done — start fresh next time
  };

  return (
    <div class="sui-action-list">
      <Show when={selectionEnabled() && selectedIds().length > 0}>
        <div class="sui-action-list__bar" role="toolbar" aria-label="Selection actions">
          <span class="sui-action-list__bar-count">
            {selectedIds().length} selected
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
            tags={d.tags}
            tone={toneFor(d.status)}
            selected={isSelected(d.id)}
            onSelect={selectionEnabled() ? () => toggle(d.id) : undefined}
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
