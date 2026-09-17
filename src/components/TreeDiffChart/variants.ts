// Curried TreeDiffChart variants — the correct call-site form.
//
// One variant, deliberately. The chart's props are almost all data, so there
// is only one presentational decision to bake (`legend`), and the default it
// derives from the data is the right answer for the case anyone has: show the
// change key when the entries carry kinds, and show nothing to key when they
// do not. A second variant would be a consumer who keys the colours in its own
// chrome and wants `createTreeDiffChart({ legend: false })` once in their
// design-system layer — which is what the factory is for.
import type { Component } from "solid-js";
import {
  createTreeDiffChart,
  type TreeDiffChartDataProps,
} from "./TreeDiffChart";

/**
 * The scenario-tree diff as a drop-in: data and callbacks only.
 *
 * `legend` is left to the chart's data-derived default ON PURPOSE rather than
 * pinned to `true`/`false` the way `RateDial` pins its wording. A pinned
 * `true` would draw an empty key for entries that carry no `kind`, and a
 * pinned `false` would hide the key from the consumers who do — the default is
 * a function of the data, so it is not a decision this variant can make once.
 */
export const ScenarioTreeDiff: Component<TreeDiffChartDataProps> =
  createTreeDiffChart({});
