// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// DnDHierarchySortBar — Atomic (Depth 1).
// Horizontal row of draggable "dimension" pills the user drag-reorders to
// reorder a tag hierarchy. Controlled: caller owns the order via `items` +
// `onReorder`. Uses native HTML drag-and-drop via the headless `createDnDReorder`
// hook (the placeholder-drop-target pattern from dside's BrainstormPane).
//
// PATTERN: during a drag an explicit PLACEHOLDER opens up and occupies the slot
// the dragged pill will land in; the whole row reflows live as you drag, and the
// drop commits the previewed order. The floating pill under the cursor is the
// browser's native drag image. (Replaces the old `--drag-over` highlight.)
//
// KEY DIFFERENCE from PivotPills (PivotTreemap/PivotPills.tsx):
//   - PivotPills: fixed 3-slot system (outer / inner / unused) with SWAP semantics.
//   - DnDHierarchySortBar: N-item general list with INSERT semantics — the row
//     previews the reordered state on every hover. Matches dside's reorder().
// ============================================

import { type Component, For, Show } from "solid-js";
import { createDnDReorder } from "../../hooks/createDnDReorder";
import "./DnDHierarchySortBar.css";

// ── Types ─────────────────────────────────────────────────────────────────

/** A single reorderable dimension pill. */
export interface DnDHierarchySortBarItem {
  /** Stable key used in the reordered-ids callback. */
  id: string;
  /** Display label shown inside the pill. */
  label: string;
}

export interface DnDHierarchySortBarProps {
  /** Current ordered list of dimension items. */
  items: DnDHierarchySortBarItem[];
  /**
   * Called with the new ordered array of ids after a successful drop.
   * The caller is responsible for updating `items` in response.
   */
  onReorder: (nextOrderedIds: string[]) => void;
  /** Optional label text shown before the pills. Defaults to "nest by". */
  label?: string;
}

// ── Component ─────────────────────────────────────────────────────────────

export const DnDHierarchySortBar: Component<DnDHierarchySortBarProps> = (props) => {
  const label = () => props.label ?? "nest by";

  // axis "x": this is a horizontal flex-wrap row, so the before/after hit-test
  // compares the cursor's X against each pill's horizontal midpoint.
  const dnd = createDnDReorder<DnDHierarchySortBarItem>({
    items: () => props.items,
    getId: (item) => item.id,
    onReorder: (ids) => props.onReorder(ids),
    axis: "x",
  });

  return (
    // Hit-testing lives on the CONTAINER row (not the pills) so the placeholder
    // tracks the cursor through the row's dead zones — the gaps between pills,
    // the label, and the empty space past the last pill — where a per-pill
    // dragover never fires. The handler reads each item's live geometry via the
    // `data-dnd-id` stamps below.
    <div
      class="sui-dnd-hierarchy-sort-bar"
      role="list"
      aria-label={label()}
      onDragOver={dnd.containerHandlers.onDragOver}
      onDrop={dnd.containerHandlers.onDrop}
    >
      <span class="sui-dnd-hierarchy-sort-bar__label" aria-hidden="true">
        {label()}
      </span>
      <For each={dnd.displayItems()}>
        {(item) => {
          const handlers = () => dnd.itemHandlers(item.id);
          return (
            <Show
              when={!dnd.isPlaceholder(item.id)}
              fallback={
                /* Placeholder — the dragged pill's live drop slot. It opens a
                   gap that reflows through the row as you drag; the floating
                   pill under the cursor is the browser's drag image. Sized to
                   the dragged pill's EXACT captured footprint — both width AND
                   height, border-box — so the gap matches the source pill
                   precisely and the row geometry doesn't shift (which would
                   otherwise reflow/wrap the row and move pills under the
                   cursor). `data-dnd-id` carries the dragged id so the container
                   hit-test can exclude this slot from the geometry. */
                <span
                  class="sui-dnd-hierarchy-sort-bar__pill sui-dnd-hierarchy-sort-bar__placeholder"
                  aria-label="Drop position"
                  data-dnd-id={item.id}
                  draggable={handlers().draggable}
                  onDragEnd={handlers().onDragEnd}
                  style={
                    dnd.dragSize()
                      ? {
                          width: `${dnd.dragSize()!.width}px`,
                          height: `${dnd.dragSize()!.height}px`,
                          "box-sizing": "border-box",
                        }
                      : undefined
                  }
                />
              }
            >
              <span
                class="sui-dnd-hierarchy-sort-bar__pill"
                role="listitem"
                aria-label={item.label}
                title="drag to reorder"
                data-dnd-id={item.id}
                draggable={handlers().draggable}
                onDragStart={handlers().onDragStart}
                onDragEnd={handlers().onDragEnd}
              >
                <span class="sui-dnd-hierarchy-sort-bar__grip" aria-hidden="true">
                  ⋮⋮
                </span>
                {item.label}
              </span>
            </Show>
          );
        }}
      </For>
    </div>
  );
};
