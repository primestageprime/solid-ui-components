// ============================================
// ValueMatrix — Composite (Depth 2: composes BaseTable)
// A row-axis × column-axis grid of computed values — NOT a row table: every
// cell is `value(row, col)`, evaluated across two axes. Treatment follows the
// 2026-07-17 ruling: consumers configure functions (value, row, col) → Tone
// and (row, col) → selected; the component owns all geometry and color.
//
// Generalizes the compliance-threshold table shape (certification levels ×
// power sources, tone by threshold compliance, selected = the chosen
// level/source pair) and fits any scenario grid — e.g. viable price ×
// salaries-to-pay in a financial forecast.
// ============================================
import { mergeProps, type JSX } from "solid-js";
import type { Tone } from "../../types";
import type { TableColumn } from "../Table/types";
import { BaseTable } from "../Table/BaseTable";
import "./ValueMatrix.css";

export interface ValueMatrixProps<R, C> {
  /** Row-axis values (one table row per entry). */
  rows: R[];
  /** Column-axis values (one value column per entry). */
  cols: C[];
  /** Row-axis display label, e.g. 90 → "90%". */
  rowLabel: (row: R) => string;
  /** Column header label, e.g. source → "Shore". */
  colLabel: (col: C) => string;
  /** Header over the row-axis column, e.g. "CE". Empty when omitted. */
  rowAxisLabel?: string;
  /** The matrix: value at (row, col); null renders BLANK (ruled 2026-07-18:
   *  empty markers distract from real data). */
  value: (row: R, col: C) => number | null;
  /** Value formatter, e.g. formatGPerKwh. Defaults to String(value). */
  format?: (value: number) => string;
  /** Configure-time treatment: tone of a cell from its value + coordinates. */
  tone?: (value: number | null, row: R, col: C) => Tone;
  /** The emphasized cell(s), e.g. the chosen scenario. */
  selected?: (row: R, col: C) => boolean;
}

export function ValueMatrix<R, C>(props: ValueMatrixProps<R, C>): JSX.Element {
  interface MatrixRow {
    row: R;
  }
  // Column config tracks the axes (they can be data-driven, e.g. dynamic
  // power sources); cell content re-evaluates per render via the accessors.
  const columns = (): TableColumn<MatrixRow>[] => [
    {
      id: "__row_axis",
      header: props.rowAxisLabel ?? "",
      accessor: ({ row }) => (
        <span class="sui-value-matrix__axis">{props.rowLabel(row)}</span>
      ),
    },
    ...props.cols.map(
      (col, i): TableColumn<MatrixRow> => ({
        id: `__col_${i}`,
        header: props.colLabel(col),
        align: "center",
        accessor: ({ row }) => {
          const value = props.value(row, col);
          const tone = props.tone?.(value, row, col) ?? "default";
          return (
            <span
              classList={{
                "sui-value-matrix__cell": true,
                [`sui-value-matrix__cell--${tone}`]: tone !== "default",
                "sui-value-matrix__cell--selected":
                  props.selected?.(row, col) ?? false,
              }}
            >
              {value == null ? "" : (props.format ?? String)(value)}
            </span>
          );
        },
      }),
    ),
  ];

  const data = () => props.rows.map((row) => ({ row }));

  return (
    <div class="sui-value-matrix">
      <BaseTable data={data()} columns={columns()} compact />
    </div>
  );
}

/** The configure-time mapping surface: axis labels, value formatting, and the
 *  tone treatment. Curried away by `createValueMatrix` so a domain matrix's
 *  call sites pass only axes + values + selection. */
export type ValueMatrixOverrides<R, C> = Pick<
  ValueMatrixProps<R, C>,
  "rowAxisLabel" | "rowLabel" | "colLabel" | "format" | "tone"
>;
export type ValueMatrixDataProps<R, C> = Omit<
  ValueMatrixProps<R, C>,
  keyof ValueMatrixOverrides<R, C>
>;

/** Curry a domain matrix (e.g. a compliance grid: g/kWh format + threshold
 *  tone baked in) so call sites supply only rows/cols/value/selected.
 *  Generic-preserving, mirroring `createTreemap`. */
export function createValueMatrix<R, C>(
  defaults: Partial<ValueMatrixProps<R, C>> & ValueMatrixOverrides<R, C>,
): (props: ValueMatrixDataProps<R, C>) => JSX.Element {
  return (props) => <ValueMatrix {...mergeProps(defaults, props)} />;
}
