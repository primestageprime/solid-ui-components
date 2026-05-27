// ============================================
// DragBar — Atomic (Depth 1).
// Horizontal row of draggable "dimension" pills the user drag-reorders to
// reorder a tag hierarchy. Controlled: caller owns the order via `items` +
// `onReorder`. Uses native HTML drag-and-drop (same mechanism as dside's
// DesignView nestOrder bar and PivotPills).
//
// KEY DIFFERENCE from PivotPills (PivotTreemap/PivotPills.tsx):
//   - PivotPills: fixed 3-slot system (outer / inner / unused) with SWAP semantics.
//   - DragBar: N-item general list with INSERT semantics — dragged pill
//     moves to the target index, shifting others. Matches dside's reorder().
// ============================================

import { Component, createSignal, For } from "solid-js";
import "./DragBar.css";

// ── Types ─────────────────────────────────────────────────────────────────

/** A single reorderable dimension pill. */
export interface DragBarItem {
  /** Stable key used in the reordered-ids callback. */
  id: string;
  /** Display label shown inside the pill. */
  label: string;
}

export interface DragBarProps {
  /** Current ordered list of dimension items. */
  items: DragBarItem[];
  /**
   * Called with the new ordered array of ids after a successful drop.
   * The caller is responsible for updating `items` in response.
   */
  onReorder: (nextOrderedIds: string[]) => void;
  /** Optional label text shown before the pills. Defaults to "nest by". */
  label?: string;
}

// ── Pure helpers ──────────────────────────────────────────────────────────

/**
 * Produces a new id-order array by removing the item at `from` and
 * inserting it at `to`. Mirrors dside's DesignView `reorder()` function.
 */
const insertReorder = (ids: string[], from: number, to: number): string[] => {
  if (from === to) return ids;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

// ── Component ─────────────────────────────────────────────────────────────

export const DragBar: Component<DragBarProps> = (props) => {
  const [dragFrom, setDragFrom] = createSignal<number | null>(null);
  const [dragOver, setDragOver] = createSignal<number | null>(null);

  const label = () => props.label ?? "nest by";

  const handleDrop = (toIdx: number) => {
    const from = dragFrom();
    setDragFrom(null);
    setDragOver(null);
    if (from == null || from === toIdx) return;
    const nextIds = insertReorder(
      props.items.map((item) => item.id),
      from,
      toIdx,
    );
    props.onReorder(nextIds);
  };

  return (
    <div class="sui-drag-bar" role="list" aria-label={label()}>
      <span class="sui-drag-bar__label" aria-hidden="true">
        {label()}
      </span>
      <For each={props.items}>
        {(item, idx) => {
          const isSource = () => dragFrom() === idx();
          const isTarget = () =>
            dragOver() === idx() && dragFrom() !== idx();

          return (
            <span
              class={`sui-drag-bar__pill${isSource() ? " sui-drag-bar__pill--dragging" : ""}${isTarget() ? " sui-drag-bar__pill--drag-over" : ""}`}
              draggable={true}
              role="listitem"
              aria-label={item.label}
              title="drag to reorder"
              onDragStart={(e) => {
                setDragFrom(idx());
                e.dataTransfer?.setData("text/plain", String(idx()));
                if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                setDragOver(idx());
              }}
              onDragLeave={() => {
                if (dragOver() === idx()) setDragOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(idx());
              }}
            >
              <span class="sui-drag-bar__grip" aria-hidden="true">
                ⋮⋮
              </span>
              {item.label}
            </span>
          );
        }}
      </For>
    </div>
  );
};
