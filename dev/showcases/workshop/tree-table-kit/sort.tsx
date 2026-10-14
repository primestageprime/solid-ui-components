// Bench-owned sort for the Tree Table. BaseTable's own sort reorders the FLAT
// row list, which pulls children away from their parents (table E shows it).
// Here the sort state lives on the bench, the header is a button, and the
// comparator goes into flattenTree, which sorts siblings at every level.
import type { Component } from "solid-js";
import { PressableLabelButton } from "../../../../src/components/Button";
import "./sort.css";

export type SortDir = "asc" | "desc";
export interface SortState<C extends string> {
  readonly col: C;
  readonly dir: SortDir;
}

/** Same cycle as BaseTable: none → asc → desc → none. */
export const nextSort = <C extends string>(
  prev: SortState<C> | null,
  col: C,
): SortState<C> | null =>
  prev?.col !== col
    ? { col, dir: "asc" }
    : prev.dir === "asc"
      ? { col, dir: "desc" }
      : null;

export interface SortHeaderProps {
  readonly label: string;
  readonly dir: SortDir | null;
  readonly onSort: () => void;
}

// Bench shortcut: borrows BaseTable's indicator classes so the glyphs match.
export const SortHeader: Component<SortHeaderProps> = (props) => (
  <PressableLabelButton
    class="tree-sort-header"
    active={props.dir !== null}
    aria-label={`Sort by ${props.label}${props.dir ? `, now ${props.dir === "asc" ? "ascending" : "descending"}` : ""}`}
    onClick={() => props.onSort()}
  >
    {props.label}
    <span class="hud-table__sort-indicator">
      {props.dir === "asc" ? (
        "▲"
      ) : props.dir === "desc" ? (
        "▼"
      ) : (
        <span class="hud-table__sort-placeholder">⇅</span>
      )}
    </span>
  </PressableLabelButton>
);
