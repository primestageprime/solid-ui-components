// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// HeatPivotGrid — Composed (Depth 2). Curried variant that renders PivotGrid (Depth 1).
import type { JSX } from "solid-js";
import { PivotGrid, type PivotGridProps } from "./PivotGrid";

/**
 * Curried variant of {@link PivotGrid} with `getCellHeat` mandatory.
 * Convenience for the common "magnitude pivot with heat" case — the
 * type system enforces that the heat hook is wired up at the call site.
 */
export type HeatPivotGridProps<
  RowKey extends string,
  ColKey extends string,
  Cell,
> = Omit<PivotGridProps<RowKey, ColKey, Cell>, "getCellHeat"> & {
  getCellHeat: (cell: Cell, row: RowKey, col: ColKey) => number | null;
};

export function HeatPivotGrid<
  RowKey extends string,
  ColKey extends string,
  Cell,
>(props: HeatPivotGridProps<RowKey, ColKey, Cell>): JSX.Element {
  return <PivotGrid {...props} />;
}
