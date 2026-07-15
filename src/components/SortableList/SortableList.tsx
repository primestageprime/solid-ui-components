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
// NO curried variant — intentional, and by rule. The core props are all data or
// callbacks (`items` / `getId` / `onReorder` / `renderItem` / `label`). The two
// presentational knobs it does carry — `rowChrome` and `gap` — both DEFAULT to
// the original behaviour ("surface" chrome, 8px gap), so the base is still
// zero-config at the call site; consumers that want the chromeless look (e.g.
// ActionList) opt in with rowChrome="bare". Per the "curried set" rule the
// exception is data-only-by-default components, exactly like DnDHierarchySortBar
// and SplitQueueList: a curried drop-in would add no value.
// ============================================

import { For, type JSX, Show } from "solid-js";
import { createDnDReorder } from "../../hooks/createDnDReorder";
import { NarrowStack } from "../Layout/variants";
import { Surface } from "../Surface/Surface";
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
  /**
   * Row chrome. "surface" (default) wraps each row in the Surface primitive
   * (border / elevated bg / 8px 12px padding) with the grip always visible —
   * the original behaviour. "bare" strips that chrome (no border, transparent
   * bg, zero padding) and hides the grip until the row is hovered, so a
   * self-styled row content (e.g. ActionListItem) IS the row's only surface.
   */
  rowChrome?: "surface" | "bare";
  /** Vertical gap between rows, in px. Default 8. */
  gap?: number;
}

// ── Component ─────────────────────────────────────────────────────────────

export function SortableList<T>(props: SortableListProps<T>): JSX.Element {
  const label = () => props.label ?? "Sortable list";
  const bare = () => props.rowChrome === "bare";

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
    // Column context comes from the composed NarrowStack (flex-column, sm gap).
    // The DEPRECATED runtime numeric `gap` prop rides in on the
    // --sui-sortable-gap custom property (a cssvar bridge — see SortableList.css,
    // where a doubled-class rule wins over the Stack's sm gap); kept for zero
    // breaking changes, not a scale value (same shape as ButtonGroup's runtime
    // layout props).
    // biome-ignore lint/a11y/useSemanticElements: intentional ARIA <list>; a native <ul>/<ol> would require <li> children, but the rows are Surface components in a flex column — swapping would break the drag layout.
    <NarrowStack
      class="sui-sortable-list"
      classList={{ "sui-sortable-list--bare": bare() }}
      role="list"
      aria-label={label()}
      style={{ "--sui-sortable-gap": `${props.gap ?? 8}px` }}
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
                   dashed gap that reflows down the column as you drag. Composes
                   the SAME Surface chrome (border / radius / padding box-model)
                   as the live row so its footprint matches exactly; the dashed
                   accent border + tint come from `.sui-sortable-list__placeholder`.
                   Sized to the dragged row's EXACT captured HEIGHT (border-box)
                   so the gap matches the source row's footprint and the column
                   doesn't shift mid-drag (width comes from the flex column
                   itself, like the bar matches width). `data-dnd-id` carries the
                   dragged id so the container hit-test excludes this slot.
                   Surface forwards `data-dnd-id` / `draggable` / `onDragEnd` to
                   its root div via its prop-spread, so the DnD wiring is intact. */
                <Surface
                  class="sui-sortable-list__row sui-sortable-list__placeholder"
                  aria-label="Drop position"
                  data-dnd-id={id()}
                  draggable={handlers().draggable}
                  onDragEnd={handlers().onDragEnd}
                  padding="none"
                  radius="md"
                  style={
                    dnd.dragSize()
                      ? {
                          padding: "8px 12px",
                          height: `${dnd.dragSize()!.height}px`,
                          "box-sizing": "border-box",
                        }
                      : { padding: "8px 12px" }
                  }
                />
              }
            >
              {/* The draggable row composes the Surface primitive for its chrome
                  (border / radius / padding box-model + the elevated background).
                  Surface splits off only its visual props and spreads everything
                  else — `data-dnd-id`, `draggable`, `onDragStart`, `onDragEnd`,
                  `role`, `title` — onto its root div, so this IS the geometry-
                  measured, drag-source element the container hit-test reads. */}
              <Surface
                class="sui-sortable-list__row"
                role="listitem"
                title="drag to reorder"
                data-dnd-id={id()}
                draggable={handlers().draggable}
                onDragStart={handlers().onDragStart}
                onDragEnd={handlers().onDragEnd}
                padding="none"
                radius="md"
                direction="row"
                align="center"
                gap="sm"
                /* "bare" drops the inline bg + padding so the CSS below can
                   strip the chrome; the row content becomes the only surface. */
                bg={bare() ? undefined : "var(--sui-bg-elevated)"}
                style={bare() ? undefined : { padding: "8px 12px" }}
              >
                <span class="sui-sortable-list__grip" aria-hidden="true">
                  ⠿
                </span>
                <div class="sui-sortable-list__content">
                  {props.renderItem(item)}
                </div>
              </Surface>
            </Show>
          );
        }}
      </For>
    </NarrowStack>
  );
}
