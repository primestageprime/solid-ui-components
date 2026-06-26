// ============================================
// SortableList — Composite (Depth 2).
// Vertical drag-and-drop reorder list of full-width rows — the reusable SUI
// equivalent of dside's todo/BrainstormPane reorder. The vertical sibling of
// DnDHierarchySortBar: same headless `createDnDReorder` mechanic, but axis "y"
// and full-width stacked rows instead of a horizontal pill row.
//
// Controlled: the caller owns the order via `items` + `onReorder`. Generic over
// the item type `T`; the consumer supplies row CONTENT via `renderItem` and
// identity via `getId`. SortableList owns only the row wrapper, the drag grip,
// the spacing, and the placeholder gap.
//
// PATTERN (shared with DnDHierarchySortBar): during a drag the dragged row is
// spliced OUT of the list and re-inserted at the live insert position, so the
// whole column previews the reordered state on every hover. The dragged row's
// own slot renders as a PLACEHOLDER — a full-width dashed gap sized to the
// dragged row's captured HEIGHT (border-box) so the column footprint doesn't
// shift mid-drag. The floating row under the cursor is the browser's native
// drag image. Hit-testing lives on the CONTAINER so the placeholder tracks the
// cursor through the gaps between rows too (the dead zones).
//
// NO curried variant — intentional, and by rule. Every prop is data or a
// callback (`items` / `getId` / `onReorder` / `renderItem` / `label`); there is
// nothing presentational (size/variant/tone) to freeze. Per the "curried set"
// rule the exception is data-only components, exactly like DnDHierarchySortBar
// and SplitQueueList: the base component is already zero-config at the call
// site, so a curried drop-in would add no value.
// ============================================

import { For, JSX, Show } from "solid-js";
import { createDnDReorder } from "../../hooks/createDnDReorder";
import "./SortableList.css";

// ── Types ─────────────────────────────────────────────────────────────────

export interface SortableListProps<T> {
  /** Current ordered list of items (controlled — the caller owns the order). */
  items: T[];
  /** Stable id for an item; used in the `onReorder` callback and hit-tests. */
  getId: (item: T) => string;
  /**
   * Called with the new ordered array of ids after a successful drop. The
   * caller is responsible for updating `items` in response.
   */
  onReorder: (orderedIds: string[]) => void;
  /** Render an item's row content (fills the row to the right of the grip). */
  renderItem: (item: T) => JSX.Element;
  /** Accessible label for the list region. Defaults to "Sortable list". */
  label?: string;
}

// ── Component ─────────────────────────────────────────────────────────────

export function SortableList<T>(props: SortableListProps<T>): JSX.Element {
  const label = () => props.label ?? "Sortable list";

  // axis "y": a vertical column, so the before/after hit-test compares the
  // cursor's Y against each row's vertical midpoint (above / below).
  const dnd = createDnDReorder<T>({
    items: () => props.items,
    getId: (item) => props.getId(item),
    onReorder: (ids) => props.onReorder(ids),
    axis: "y",
  });

  return (
    // Hit-testing lives on the CONTAINER column (not each row) so the
    // placeholder tracks the cursor through the row gaps too, where a per-row
    // dragover never fires. The handler reads each row's live geometry via the
    // `data-dnd-id` stamps below.
    <div
      class="sui-sortable-list"
      role="list"
      aria-label={label()}
      onDragOver={dnd.containerHandlers.onDragOver}
      onDrop={dnd.containerHandlers.onDrop}
    >
      <For each={dnd.displayItems()}>
        {(item) => {
          const id = () => props.getId(item);
          const handlers = () => dnd.itemHandlers(id());
          return (
            <Show
              when={!dnd.isPlaceholder(id())}
              fallback={
                /* Placeholder — the dragged row's live drop slot. A full-width
                   dashed gap that reflows down the column as you drag. Sized to
                   the dragged row's EXACT captured HEIGHT (border-box) so the
                   gap matches the source row's footprint and the column doesn't
                   shift mid-drag (width comes from the flex column itself, like
                   the bar matches width). `data-dnd-id` carries the dragged id
                   so the container hit-test excludes this slot. */
                <div
                  class="sui-sortable-list__row sui-sortable-list__placeholder"
                  aria-label="Drop position"
                  data-dnd-id={id()}
                  draggable={handlers().draggable}
                  onDragEnd={handlers().onDragEnd}
                  style={
                    dnd.dragSize()
                      ? {
                          height: `${dnd.dragSize()!.height}px`,
                          "box-sizing": "border-box",
                        }
                      : undefined
                  }
                />
              }
            >
              <div
                class="sui-sortable-list__row"
                role="listitem"
                title="drag to reorder"
                data-dnd-id={id()}
                draggable={handlers().draggable}
                onDragStart={handlers().onDragStart}
                onDragEnd={handlers().onDragEnd}
              >
                <span class="sui-sortable-list__grip" aria-hidden="true">
                  ⠿
                </span>
                <div class="sui-sortable-list__content">
                  {props.renderItem(item)}
                </div>
              </div>
            </Show>
          );
        }}
      </For>
    </div>
  );
}
