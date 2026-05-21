import { JSX } from "solid-js";
import { PivotGrid, type PivotGridProps } from "./PivotGrid";

/**
 * Curried variant of {@link PivotGrid} with `cellHref` mandatory.
 * Convenience for "every cell is a drilldown link" — type-enforces
 * the navigation contract at the call site.
 */
export type LinkPivotGridProps<
  RowKey extends string,
  ColKey extends string,
  Cell,
> = Omit<PivotGridProps<RowKey, ColKey, Cell>, "cellHref"> & {
  cellHref: (row: RowKey, col: ColKey, cell: Cell | null) => string | undefined;
};

export function LinkPivotGrid<
  RowKey extends string,
  ColKey extends string,
  Cell,
>(props: LinkPivotGridProps<RowKey, ColKey, Cell>): JSX.Element {
  return <PivotGrid {...props} />;
}
