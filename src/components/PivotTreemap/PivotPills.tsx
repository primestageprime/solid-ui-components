// ============================================
// PivotPills — Atomic (Depth 1).
// Drag-to-reorder pill row that lifts a Dim[] permutation to the caller.
// Position 0 = outer, position 1 = inner, position 2+ = unused. Drag any
// pill onto another to swap their slot positions.
// ============================================
import { Component, createSignal, For } from "solid-js";
import "./PivotPills.css";

export interface PivotPillsProps<Dim extends string> {
  /** Current ordering — a permutation of the dim universe. */
  order: Dim[];
  /** Called with the new order after a successful drop. */
  setOrder: (next: Dim[]) => void;
  /** Slot-position labels for the three slots: [outer, inner, unused].
   *  Default ["outer", "inner", "unused"]. Trailing positions reuse the
   *  third label when more than three dims exist. */
  slotLabels?: [string, string, string];
}

const DEFAULT_LABELS: [string, string, string] = ["outer", "inner", "unused"];

export function PivotPills<Dim extends string>(
  p: PivotPillsProps<Dim>,
): ReturnType<Component> {
  const [dragFrom, setDragFrom] = createSignal<number | null>(null);
  const [dragOver, setDragOver] = createSignal<number | null>(null);

  const labels = () => p.slotLabels ?? DEFAULT_LABELS;
  const slotLabel = (idx: number) => {
    const ls = labels();
    if (idx === 0) return ls[0];
    if (idx === 1) return ls[1];
    return ls[2];
  };

  const onDrop = (toIdx: number) => {
    const from = dragFrom();
    setDragFrom(null);
    setDragOver(null);
    if (from == null || from === toIdx) return;
    const next = p.order.slice();
    [next[from], next[toIdx]] = [next[toIdx], next[from]];
    p.setOrder(next);
  };

  return (
    <div class="sui-pivot-pills">
      <span class="sui-pivot-pills__hint">drag to reorder:</span>
      <For each={p.order}>
        {(dim, idx) => {
          const active = () => idx() < 2;
          const isDragOver = () =>
            dragOver() === idx() && dragFrom() !== idx();
          return (
            <div
              class={`sui-pivot-pills__slot${active() ? " sui-pivot-pills__slot--active" : ""}`}
            >
              <span class="sui-pivot-pills__slot-label">
                {slotLabel(idx())}
                {idx() === 0 ? " ›" : ""}
              </span>
              <span
                class={`sui-pivot-pills__pill${active() ? " sui-pivot-pills__pill--active" : ""}${isDragOver() ? " sui-pivot-pills__pill--drag-over" : ""}`}
                draggable={true}
                onDragStart={(e) => {
                  setDragFrom(idx());
                  e.dataTransfer?.setData("text/plain", String(idx()));
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
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
                  onDrop(idx());
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
                title="drag to swap with another pill"
              >
                <span class="sui-pivot-pills__grip">⋮⋮</span>
                {dim}
              </span>
            </div>
          );
        }}
      </For>
    </div>
  );
}
