// ============================================
// ActionListItem — Composite (Depth 2)
// Owns CSS (ActionListItem.css) as a DELIBERATE Depth-2 exception: the row is
// pure structural geometry (the flex layout, the transparent-border hover
// outline that lights with zero geometry shift, the tone opacity, and the
// semi-circular dismiss cap that eats the row padding with negative margins) —
// none of which is reusable atomic styling, so it stays local to the row rather
// than manufacturing a throwaway primitive.
//
// The row: [StatusChip] [EditableTitle] [meta: AssigneeIcon, TagPills, dismiss ×].
// Composes the four Depth-1 primitives; owns only the row chrome.
//
// Visual contract (preserved exactly from the workshop bench):
//  - All foreground is the accent (color: var(--sui-accent)); every child rides
//    currentColor / inherit, so the whole row reads in one thematic colour.
//  - `tone` = row OPACITY: "dim" 0.25, "highlight" 1 (+ the chip fill), neutral
//    0.5. The tone→status mapping lives one level up in ActionList (its
//    `statusTones` override) so it stays out of app call sites; here it is just
//    a presentational prop the parent supplies.
//  - Dismiss reveals on hover via OPACITY only. INVARIANT: hover never changes
//    geometry — no display / width / padding / border-width / font shift.
//  - Dismiss is the flipped semicircle cap (border-radius 999px 0 0 999px) flush
//    to the row's right edge via negative margins.
// ============================================
import { Component, For, Show } from "solid-js";
import { StatusChip } from "../Badge/StatusChip";
import { EditableTitle } from "../EditableTitle/EditableTitle";
import { AssigneeIcon, type AssigneeIconProps } from "../ParticipantAvatar/AssigneeIcon";
import { TagPill, type TagPillData } from "../Badge/TagPill";
import "./ActionListItem.css";

export type ActionListItemTone = "dim" | "neutral" | "highlight";

export interface ActionListItemProps {
  /** The title / name of the row. */
  title: string;
  /** Trailing status chip text. Omit to hide the chip. */
  status?: string;
  /** Known statuses; drives the chip's select menu AND its fixed width. */
  statusOptions?: string[];
  /** Person / AI assignment glyph. */
  assignee?: AssigneeIconProps;
  /** Person / AI assignment roster — rendered as a tight row of glyphs. When set,
   *  it wins over the singular `assignee` (which is treated as a one-item roster). */
  assignees?: AssigneeIconProps[];
  /** Tag pills (plain, "ns:value" split, or explicit { key, value }). */
  tags?: TagPillData[];
  /** Row opacity tone. Supplied by ActionList from its status→tone map. Default "neutral". */
  tone?: ActionListItemTone;
  /** Called when the user edits/selects a status. When absent the chip is inert. */
  onStatusChange?: (status: string) => void;
  /** Called when the user renames the row. When absent the title is inert. */
  onTitleChange?: (title: string) => void;
  /** Called on dismiss. When absent the × cap is hidden. */
  onDismiss?: () => void;
  /** Whether the row is currently selected. Lights a persistent accent border +
   *  subtle accent fill (geometry-safe — the border already exists transparent). */
  selected?: boolean;
  /** Toggle selection. When present the row's non-interactive area becomes a
   *  click target; clicks that land on an inner control (the title button/input,
   *  the status chip text/caret/menu, the dismiss ×) do NOT toggle. When absent
   *  the row is not selectable. Receives the originating click so the parent can
   *  branch on `shiftKey` (plain toggle vs. range select). */
  onSelect?: (e: MouseEvent) => void;
  /** When present, tag pills become buttons; clicking one fires this (with the
   *  clicked tag) and never toggles row selection. When absent, tags stay inert. */
  onTagClick?: (tag: TagPillData) => void;
}

export const ActionListItem: Component<ActionListItemProps> = (props) => {
  const tone = () => props.tone ?? "neutral";
  // Plural roster wins; the singular assignee is a one-item roster; neither → [].
  const assignees = () =>
    props.assignees ?? (props.assignee ? [props.assignee] : []);
  // Toggle selection only for clicks on the row's non-interactive area. Every
  // inner affordance (EditableTitle, StatusChip, dismiss, and — when wired — the
  // clickable tags) renders a <button> or <input>, so a single `closest` guard
  // excludes all of them at once. The event is passed through so the parent can
  // branch on shiftKey for range selection.
  const onRowClick = (e: MouseEvent) => {
    if (!props.onSelect) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, input, select, textarea, [role='listbox']")) return;
    props.onSelect(e);
  };
  return (
    <div
      class="sui-action-list-item"
      classList={{
        "sui-action-list-item--dim": tone() === "dim",
        "sui-action-list-item--highlight": tone() === "highlight",
        "sui-action-list-item--selectable": !!props.onSelect,
        "sui-action-list-item--selected": !!props.selected,
      }}
      role="listitem"
      aria-selected={props.onSelect ? !!props.selected : undefined}
      onClick={onRowClick}
    >
      <Show when={props.status}>
        <StatusChip
          status={props.status!}
          options={props.statusOptions}
          onChange={props.onStatusChange}
          highlight={tone() === "highlight"}
          title={props.title}
        />
      </Show>
      <EditableTitle title={props.title} onChange={props.onTitleChange} />
      <span class="sui-action-list-item__meta">
        <Show when={assignees().length > 0}>
          <span class="sui-action-list-item__assignees">
            <For each={assignees()}>
              {(a) => <AssigneeIcon {...a} />}
            </For>
          </span>
        </Show>
        <For each={props.tags ?? []}>
          {(tag) => (
            <Show when={props.onTagClick} fallback={<TagPill tag={tag} />}>
              <button
                type="button"
                class="sui-action-list-item__tag"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onTagClick!(tag);
                }}
              >
                <TagPill tag={tag} />
              </button>
            </Show>
          )}
        </For>
        <Show when={props.onDismiss}>
          <button
            type="button"
            class="sui-action-list-item__dismiss"
            aria-label={`Dismiss ${props.title}`}
            onClick={() => props.onDismiss?.()}
          >
            ×
          </button>
        </Show>
      </span>
    </div>
  );
};
