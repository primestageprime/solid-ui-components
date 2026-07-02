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
import { StatusChip } from "../StatusChip/StatusChip";
import { EditableTitle } from "../EditableTitle/EditableTitle";
import { AssigneeIcon, type AssigneeIconProps } from "../AssigneeIcon/AssigneeIcon";
import { TagPill, type TagPillData } from "../TagPill/TagPill";
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
}

export const ActionListItem: Component<ActionListItemProps> = (props) => {
  const tone = () => props.tone ?? "neutral";
  return (
    <div
      class="sui-action-list-item"
      classList={{
        "sui-action-list-item--dim": tone() === "dim",
        "sui-action-list-item--highlight": tone() === "highlight",
      }}
      role="listitem"
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
        <Show when={props.assignee}>
          {(a) => <AssigneeIcon {...a()} />}
        </Show>
        <For each={props.tags ?? []}>
          {(tag) => <TagPill tag={tag} />}
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
