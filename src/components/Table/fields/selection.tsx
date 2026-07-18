// Table field — selection (Depth 1: imports Checkbox + Layout).
// A fixed leading checkbox column for row selection. The factory owns geometry
// and centering; the client only supplies a FieldSelection (created by
// createFieldSelection) and never reaches width, align, or CSS.
//
// Generic behavior (ruled 2026-07-17):
// - the HEADER is a select-all/none checkbox — indeterminate over a partial
//   selection, checked when every current row is selected;
// - SHIFT-CLICK range-selects: the previous click and this click are the
//   endpoints, and every row between them in the CURRENT sort order is set to
//   the state this click gives its endpoint (Gmail semantics).
//
// Centering (ruled 2026-07-17): the checkbox must sit CENTERED in the column,
// not left-biased. The accessor composes CenteredColumn — a horizontally-
// centering Layout variant (a block-level flex column that fills the cell's
// content box and centers its single child on the cross axis) — so no hand-
// rolled flex CSS is needed. Vertical symmetry comes for free from BaseTable's
// symmetric cell padding. The header checkbox centers via the standard
// .sui-field-th-center wrapper.
import type { JSX } from "solid-js";
import { createSignal } from "solid-js";
import type { FieldGeo, FieldCol } from "./shared";
import { Checkbox } from "../../Checkbox";
import { CenteredColumn } from "../../Layout";
import { map } from "../../../fn";

// 2.125rem = 18px checkbox + 8px breathing room per side — the field-frame's
// standard cell chrome (shared.css .sui-field-frame). min === max: fixed.
export const geo: FieldGeo = { minCh: 4.75, maxCh: 4.75, css: "2.125rem" };

export interface FieldSelectionOpts<T> {
  /** The rows in their CURRENT sort order — range selection walks this. */
  rows: () => readonly T[];
  /** Stable identity for a row (survives resorting/refetch). */
  key: (row: T) => string;
}

export interface FieldSelection<T> {
  /** The selected keys (reactive). */
  selected: () => ReadonlySet<string>;
  isSelected: (row: T) => boolean;
  /** Flip one row; with `range` set, apply this click's resulting state to
   *  every row between the previous click and this one. */
  toggle: (row: T, opts?: { range?: boolean }) => void;
  /** Aggregate over the CURRENT rows. */
  allState: () => "none" | "some" | "all";
  /** all → deselect current rows; otherwise select them all. */
  toggleAll: () => void;
  clear: () => void;
}

/** Selection state for a field table: one of these per table, passed to
 *  `selectionCol`. Anchoring for shift-ranges is keyed (not indexed), so a
 *  resort between clicks ranges over the new order, as the eye expects. */
export function createFieldSelection<T>(
  opts: FieldSelectionOpts<T>,
): FieldSelection<T> {
  const [selected, setSelected] = createSignal<ReadonlySet<string>>(new Set());
  let anchorKey: string | null = null;

  const isSelected = (row: T) => selected().has(opts.key(row));

  const toggle = (row: T, o?: { range?: boolean }) => {
    const key = opts.key(row);
    if (o?.range && anchorKey !== null && anchorKey !== key) {
      const keys = map(opts.key, opts.rows());
      const from = keys.indexOf(anchorKey);
      const to = keys.indexOf(key);
      if (from !== -1 && to !== -1) {
        const target = !selected().has(key);
        const [lo, hi] = from < to ? [from, to] : [to, from];
        setSelected((prev) => {
          const next = new Set(prev);
          for (let i = lo; i <= hi; i++) {
            if (target) {
              next.add(keys[i]);
            } else {
              next.delete(keys[i]);
            }
          }
          return next;
        });
        anchorKey = key;
        return;
      }
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    anchorKey = key;
  };

  const allState = (): "none" | "some" | "all" => {
    const rows = opts.rows();
    if (rows.length === 0) return "none";
    let count = 0;
    for (const row of rows) {
      if (isSelected(row)) count += 1;
    }
    return count === 0 ? "none" : count === rows.length ? "all" : "some";
  };

  const toggleAll = () => {
    const rows = opts.rows();
    const selectAll = allState() !== "all";
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of rows) {
        if (selectAll) {
          next.add(opts.key(row));
        } else {
          next.delete(opts.key(row));
        }
      }
      return next;
    });
    anchorKey = null;
  };

  const clear = () => {
    setSelected(new Set<string>());
    anchorKey = null;
  };

  return { selected, isSelected, toggle, allState, toggleAll, clear };
}

/** Row-selection checkbox column: select-all/none header, shift-click range
 *  selection in the body. The FieldSelection is the only client input —
 *  width, header, and centering are owned here. */
export const selectionCol = <T,>(selection: FieldSelection<T>): FieldCol<T> => ({
  id: "selected",
  header: (
    <span class="sui-field-th-center">
      <Checkbox
        checked={selection.allState() === "all"}
        indeterminate={selection.allState() === "some"}
        onClick={() => selection.toggleAll()}
        aria-label="Select all rows"
      />
    </span>
  ),
  width: geo.css,
  geo,
  accessor: (row): JSX.Element => (
    <CenteredColumn>
      <Checkbox
        checked={selection.isSelected(row)}
        onClick={(e: MouseEvent) => selection.toggle(row, { range: e.shiftKey })}
        // Shift-click must range-select, not smear a native text selection
        // across the rows between the endpoints.
        onMouseDown={(e: MouseEvent) => {
          if (e.shiftKey) e.preventDefault();
        }}
        aria-label="Select row"
      />
    </CenteredColumn>
  ),
});
