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
import { type Component, For, Show, createSignal, onCleanup } from "solid-js";
import {
  ClusterRow,
  NoShrinkClusterRow,
  TightClusterRow,
} from "../Layout/variants";
import { StatusChip } from "../Badge/StatusChip";
import { EditableTitle, type EditTrigger } from "../EditableTitle/EditableTitle";
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
  /** Which gesture opens the inline title editor. Default `"singleClick"`. In
   *  `"doubleClick"` a single click on the title falls through to row selection
   *  and a double click edits. In `"clickSelected"` a click edits only when the
   *  row is already `selected` (else it falls through to selection) — the
   *  file-list "click to select, click again to rename" idiom. See {@link EditTrigger}. */
  editTrigger?: EditTrigger;
  /** Called on dismiss. When absent the × cap is hidden. */
  onDismiss?: () => void;
  /** Require a two-step confirm before firing `onDismiss`. When true the first
   *  click on the × cap ARMS it (the glyph flips to a danger-tinted ✓ and the
   *  label becomes "Confirm delete"); a second click fires `onDismiss`. Arming
   *  auto-cancels when the pointer leaves the row, on Escape, or after a few
   *  seconds. Default false — the cap deletes on a single click, unchanged. */
  confirmDismiss?: boolean;
  /** Called when the row's "open" affordance is clicked. When present a small
   *  magnifying-glass button renders in the meta cluster; clicking it fires this
   *  and never toggles row selection or opens the inline editor. When absent, no
   *  button renders. */
  onOpen?: () => void;
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
  // Two-step delete confirmation (opt-in via `confirmDismiss`). The first click
  // arms; a second confirms. Arming auto-cancels when the pointer leaves the
  // row, on Escape, or after AUTO_CANCEL_MS — so a stray arm never lingers. The
  // cap keeps its exact geometry either way (only glyph/colour change), so the
  // row's hover-geometry invariant is preserved.
  const AUTO_CANCEL_MS = 4000;
  const [armed, setArmed] = createSignal(false);
  let cancelTimer: ReturnType<typeof setTimeout> | undefined;
  const clearTimer = () => {
    if (cancelTimer !== undefined) {
      clearTimeout(cancelTimer);
      cancelTimer = undefined;
    }
  };
  const disarm = () => {
    clearTimer();
    setArmed(false);
  };
  onCleanup(clearTimer);
  const onDismissClick = () => {
    if (!props.confirmDismiss) {
      props.onDismiss?.();
      return;
    }
    if (armed()) {
      disarm();
      props.onDismiss?.();
    } else {
      setArmed(true);
      clearTimer();
      cancelTimer = setTimeout(disarm, AUTO_CANCEL_MS);
    }
  };
  // Row layout is composed from Layout variants (layout-purity): the row is a
  // ClusterRow (align:center, gap:sm — [chip, title, meta]), the meta cluster a
  // NoShrinkClusterRow (flex:none, gap 6→sm), the assignee roster a
  // TightClusterRow (gap 3→xs). The self-contained icon-button caps (open,
  // dismiss) keep their intrinsic single-widget geometry — flex:none sizing and
  // the dismiss cap's align-self:stretch + negative-margin semicircle are
  // deliberately-local to this row (see the header note), not consumer-child
  // arrangement. The hover-geometry invariant is untouched (only flex/gap/align
  // moved to Layout classes; hover still changes colour/opacity only).
  return (
    <ClusterRow
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
      onMouseLeave={() => {
        if (armed()) disarm();
      }}
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
      <EditableTitle
        title={props.title}
        onChange={props.onTitleChange}
        editTrigger={props.editTrigger}
        rowSelected={props.selected}
      />
      <NoShrinkClusterRow class="sui-action-list-item__meta">
        <Show when={assignees().length > 0}>
          <TightClusterRow class="sui-action-list-item__assignees">
            <For each={assignees()}>
              {(a) => <AssigneeIcon {...a} />}
            </For>
          </TightClusterRow>
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
        <Show when={props.onOpen}>
          <button
            type="button"
            class="sui-action-list-item__open"
            aria-label="Open"
            title="Open"
            onClick={(e) => {
              e.stopPropagation();
              props.onOpen?.();
            }}
          >
            {/* Magnifying glass — inline SVG riding currentColor, matching the
                library's StarToggle icon idiom (not an emoji, so it inherits the
                row's thematic accent). */}
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle
                cx="8.5"
                cy="8.5"
                r="5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
              />
              <line
                x1="12.6"
                y1="12.6"
                x2="17"
                y2="17"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </Show>
        <Show when={props.onDismiss}>
          <button
            type="button"
            class="sui-action-list-item__dismiss"
            classList={{ "sui-action-list-item__dismiss--armed": armed() }}
            aria-label={armed() ? `Confirm delete ${props.title}` : `Dismiss ${props.title}`}
            title={armed() ? "Confirm delete" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onDismissClick();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" && armed()) disarm();
            }}
          >
            {armed() ? "✓" : "×"}
          </button>
        </Show>
      </NoShrinkClusterRow>
    </ClusterRow>
  );
};
