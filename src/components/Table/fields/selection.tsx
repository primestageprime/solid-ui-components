// Table field — selection (Depth 1: imports Checkbox + Layout).
// A fixed leading checkbox column for row selection. The factory owns geometry
// and centering; the client only supplies isSelected + toggle and never reaches
// width, align, or CSS.
//
// Centering (ruled 2026-07-17): the checkbox must sit CENTERED in the column,
// not left-biased. The accessor composes CenteredColumn — a horizontally-
// centering Layout variant (a block-level flex column that fills the cell's
// content box and centers its single child on the cross axis) — so no hand-
// rolled flex CSS is needed. Vertical symmetry comes for free from BaseTable's
// symmetric cell padding (10px top/bottom). No geo adjustment is needed for the
// column either: the horizontal padding is symmetric too (16px each side), so
// the content box is already centered in the 3.25rem column and centering the
// checkbox within the content box equals centering it within the column.
import type { JSX } from "solid-js";
import type { FieldGeo, FieldCol } from "./shared";
import { Checkbox } from "../../Checkbox";
import { CenteredColumn } from "../../Layout";

// 3.25rem = 18px checkbox + 32px cell chrome (16px padding/side); anything less
// clips (bench-measured). min === max makes this a fixed column.
export const geo: FieldGeo = { minCh: 6.5, maxCh: 6.5, css: "3.25rem" };

/** Row-selection checkbox column. `isSelected` and `toggle` are the only client
 *  inputs — width, header, and centering are owned here. */
export const selectionCol = <T,>(
  isSelected: (row: T) => boolean,
  toggle: (row: T) => void,
): FieldCol<T> => ({
  id: "selected",
  header: "",
  width: geo.css,
  geo,
  accessor: (row): JSX.Element => (
    <CenteredColumn>
      <Checkbox checked={isSelected(row)} onChange={() => toggle(row)} />
    </CenteredColumn>
  ),
});
