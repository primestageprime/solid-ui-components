// ============================================
// createDnDReorder — headless reorder hook (placeholder-drop-target pattern).
//
// Encapsulates the native HTML5 drag-and-drop reorder mechanic used by dside's
// BrainstormPane: during a drag, the dragged item is spliced OUT of the list
// and re-inserted at `insertPos`, so the whole list previews the reordered
// state live on every hover. The dragged item's own slot is rendered as a
// PLACEHOLDER (the gap the item will drop into); the floating element under the
// cursor is the browser's native drag image, captured at dragstart.
//
// Coordinate space: `insertPos` is an index into the list with the dragged item
// REMOVED — the same space `displayItems` splices into. This keeps the maths
// drift-free regardless of where the dragged item currently sits.
//
// SolidJS gotchas handled here:
//   - dragstart deferral: setting `dragId` synchronously inside dragstart makes
//     Solid swap the dragged node into a placeholder DURING dragstart, which
//     aborts the native drag. We defer it with `setTimeout(…, 0)`.
//   - reactivity: `items()` is read inside the memo / handlers, never snapshot,
//     so the preview tracks the live list and never goes stale.
//   - props are never mutated; reorder is reported via `onReorder(orderedIds)`.
// ============================================

import { Accessor, createMemo, createSignal } from "solid-js";

// ── Types ─────────────────────────────────────────────────────────────────

export type DnDReorderAxis = "x" | "y";

export interface CreateDnDReorderOptions<T> {
  /** Reactive accessor for the current ordered list. */
  items: () => T[];
  /** Stable id for an item; used in the `onReorder` callback and hit-tests. */
  getId: (item: T) => string;
  /** Called with the new ordered id array after a successful drop. */
  onReorder: (orderedIds: string[]) => void;
  /**
   * Hit-test axis. "y" (default) compares the cursor's clientY against the
   * hovered item's vertical midpoint (before/after = above/below). "x" compares
   * clientX against the horizontal midpoint (before/after = left/right) — use
   * for horizontal / flex-wrap rows.
   */
  axis?: DnDReorderAxis;
}

/** Width/height of the dragged element, captured at dragstart. */
export interface DragSize {
  width: number;
  height: number;
}

/**
 * Per-item drag props. `onDragStart` MUST stay on the item so the browser uses
 * that element as the drag source (and we can capture its footprint as the drag
 * image). `onDragEnd` stays on the item too: dragend fires on the original
 * source node — which Solid swaps out for the placeholder during the drag — so
 * the listener has to live where it was captured to still fire when the drag
 * aborts outside any drop target.
 */
export interface DnDItemHandlers {
  draggable: true;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: (e: DragEvent) => void;
}

/**
 * CONTAINER-row drag props. Hit-testing lives here (not on each pill) so it
 * covers the row's DEAD ZONES — gaps between pills, the label area, and the
 * trailing empty space past the last pill — where a per-pill handler never
 * fires. `onDragOver` reads the live geometry of the `[data-dnd-id]` items the
 * component renders and updates `insertPos` for ANY cursor coordinate.
 */
export interface DnDContainerHandlers {
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

export interface DnDReorder<T> {
  /** Live render order: dragged item spliced out and re-inserted at insertPos. */
  displayItems: Accessor<T[]>;
  /** Id of the item currently being dragged, or null. */
  dragId: Accessor<string | null>;
  /** Insert index in the dragged-removed coordinate space, or null. */
  insertPos: Accessor<number | null>;
  /** Bounding size of the dragged element captured at dragstart, or null. */
  dragSize: Accessor<DragSize | null>;
  /** True when `id` is the dragged item — its slot should render as a placeholder. */
  isPlaceholder: (id: string) => boolean;
  /** Per-item drag props to spread onto the item element for `id`. */
  itemHandlers: (id: string) => DnDItemHandlers;
  /**
   * Drag props to spread onto the CONTAINER row element. The component must mark
   * each rendered item (and its placeholder) with `data-dnd-id={id}` so the
   * container handler can read their geometry.
   */
  containerHandlers: DnDContainerHandlers;
  /**
   * Imperatively set the insert index (dragged-removed coordinate space).
   * Exposed for callers that want to compute the index themselves (e.g. via
   * `pointerToInsertIndex` on their own geometry). Clamped on commit by
   * `previewOrder`. Pass `null` to clear.
   */
  setInsertIndex: (index: number | null) => void;
}

// ── Pure helpers (exported for unit testing) ────────────────────────────────

/**
 * The live preview order: remove the dragged item and re-insert it at
 * `insertPos` (an index into the dragged-removed list). Returns the input
 * unchanged when there is no active drag. Never mutates `items`.
 */
export function previewOrder<T>(
  items: T[],
  getId: (item: T) => string,
  dragId: string | null,
  insertPos: number | null,
): T[] {
  if (!dragId || insertPos == null) return items;
  const moved = items.find((it) => getId(it) === dragId);
  if (!moved) return items;
  const without = items.filter((it) => getId(it) !== dragId);
  const clamped = Math.max(0, Math.min(insertPos, without.length));
  return [...without.slice(0, clamped), moved, ...without.slice(clamped)];
}

/**
 * Compute the insert position (in the dragged-removed coordinate space) for a
 * hover over `overId`. `after` is true when the cursor is past the hovered
 * item's midpoint along the active axis. Returns null when the hovered item is
 * not found (e.g. hovering the dragged item's own placeholder).
 */
export function hitTestInsertPos<T>(
  items: T[],
  getId: (item: T) => string,
  dragId: string,
  overId: string,
  after: boolean,
): number | null {
  if (overId === dragId) return null;
  const without = items.filter((it) => getId(it) !== dragId);
  const k = without.findIndex((it) => getId(it) === overId);
  if (k < 0) return null;
  return after ? k + 1 : k;
}

/** Minimal geometry an item contributes to container-level hit-testing. */
export interface AxisRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * CONTAINER-level, geometry-based hit-test. Given the rects of the NON-DRAGGED
 * items in document order and a cursor `coord` (clientX for axis "x", clientY
 * for "y"), returns the insert index in the DRAGGED-REMOVED coordinate space =
 * the count of items whose midpoint along `axis` is before `coord`:
 *   - before the first midpoint → 0
 *   - between items → k
 *   - past the last item → rects.length (the end)
 * Result is clamped to [0, rects.length].
 *
 * Unlike per-item hit-testing this is defined for ANY coordinate in the row,
 * which is what makes dead zones (gaps, label area, trailing space) work: the
 * placeholder tracks the pointer everywhere. The dragged item is excluded by
 * the caller (it isn't in `rects`), so hovering its own placeholder is a no-op.
 */
export function pointerToInsertIndex(
  rects: AxisRect[],
  coord: number,
  axis: DnDReorderAxis,
): number {
  let count = 0;
  for (const r of rects) {
    const mid = axis === "x" ? (r.left + r.right) / 2 : (r.top + r.bottom) / 2;
    if (mid < coord) count++;
  }
  return Math.max(0, Math.min(count, rects.length));
}

/**
 * Whether the cursor is past the element rect's midpoint along `axis`.
 * "x" → right of horizontal midpoint; "y" → below vertical midpoint.
 */
export function isAfterMidpoint(
  axis: DnDReorderAxis,
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): boolean {
  return axis === "x"
    ? clientX - rect.left > rect.width / 2
    : clientY - rect.top > rect.height / 2;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function createDnDReorder<T>(
  options: CreateDnDReorderOptions<T>,
): DnDReorder<T> {
  const { items, getId, onReorder } = options;
  const axis: DnDReorderAxis = options.axis ?? "y";

  const [dragId, setDragId] = createSignal<string | null>(null);
  const [insertPos, setInsertPos] = createSignal<number | null>(null);
  const [dragSize, setDragSize] = createSignal<DragSize | null>(null);

  // Read items() reactively so the preview tracks the live list.
  const displayItems = createMemo<T[]>(() =>
    previewOrder(items(), getId, dragId(), insertPos()),
  );

  const reset = () => {
    setDragId(null);
    setInsertPos(null);
    setDragSize(null);
  };

  const commit = () => {
    if (dragId() && insertPos() != null) {
      onReorder(displayItems().map(getId));
    }
    reset();
  };

  const onDragStart = (id: string) => (e: DragEvent) => {
    const rowEl = e.currentTarget as HTMLElement | null;
    if (e.dataTransfer) {
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
      // Capture the element as the floating drag image while it is still
      // rendered normally (before the placeholder takes over).
      if (rowEl) {
        const r = rowEl.getBoundingClientRect();
        e.dataTransfer.setDragImage(rowEl, e.clientX - r.left, e.clientY - r.top);
      }
    }
    if (rowEl) {
      const r = rowEl.getBoundingClientRect();
      setDragSize({ width: r.width, height: r.height });
    }
    setInsertPos(null);
    // CRITICAL: defer flipping the row into a placeholder. Setting `dragId`
    // synchronously here would make Solid remove the dragged node DURING its
    // own dragstart, and the browser aborts the drag. A 0ms timeout lets
    // dragstart finish first, then the placeholder takes over.
    setTimeout(() => setDragId(id), 0);
  };

  // CONTAINER-level dragover. Fires for ANY cursor position over the row — pills,
  // the gaps between them, the label, and the trailing space past the last pill
  // — which is what fixes the dead-zone staleness. The hook reads geometry only
  // through the event's `currentTarget` (the row element the component owns);
  // the component supplies geometry by stamping each item with `data-dnd-id`.
  const onContainerDragOver = (e: DragEvent) => {
    const current = dragId();
    if (!current) return; // not our drag — leave other dnd (text, etc.) alone.
    e.preventDefault(); // required so the subsequent `drop` fires.
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const container = e.currentTarget as HTMLElement | null;
    if (!container) return;
    const coord = axis === "x" ? e.clientX : e.clientY;
    // Build rects for the NON-DRAGGED items in document order. The dragged
    // item's slot is its placeholder (also tagged data-dnd-id={dragId}); we skip
    // it so the index is geometric over the other items only.
    const rects: AxisRect[] = [];
    container.querySelectorAll<HTMLElement>("[data-dnd-id]").forEach((el) => {
      if (el.getAttribute("data-dnd-id") === current) return;
      const r = el.getBoundingClientRect();
      rects.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    });
    const next = pointerToInsertIndex(rects, coord, axis);
    if (insertPos() !== next) setInsertPos(next);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    commit();
  };

  // dragend fires on the source even when the drag is aborted (e.g. dropped
  // outside any target), so it both commits and cleans up. It must stay on the
  // item element: that is the node the browser captured as the drag source.
  const onDragEnd = () => {
    commit();
  };

  const itemHandlers = (id: string): DnDItemHandlers => ({
    draggable: true,
    onDragStart: onDragStart(id),
    onDragEnd,
  });

  const containerHandlers: DnDContainerHandlers = {
    onDragOver: onContainerDragOver,
    onDrop,
  };

  return {
    displayItems,
    dragId,
    insertPos,
    dragSize,
    isPlaceholder: (id: string) => dragId() === id,
    itemHandlers,
    containerHandlers,
    setInsertIndex: setInsertPos,
  };
}
