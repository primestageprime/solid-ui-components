export { TreeDiffChart, createTreeDiffChart } from "./TreeDiffChart";
export type {
  TreeDiffChartOverrides,
  TreeDiffChartDataProps,
} from "./TreeDiffChart";
export * from "./variants";
export type {
  TreeDiffChartProps,
  TreeDiffBand,
  TreeDiffChild,
  TreeDiffEntry,
  TreeDiffRoot,
  TreeDiffMode,
  TreeDiffSide,
  TreeDiffKind,
} from "./types";
export {
  ROOT_BASELINE_ID,
  ROOT_COMPARE_ID,
  COMMIT_BASELINE_ID,
  COMMIT_COMPARE_ID,
  HEAD_BASELINE_ID,
  HEAD_COMPARE_ID,
  SAME_ID,
} from "./types";
export { KINDS, kindColor, kindLabel, kindLegendItems, presentKinds } from "./kinds";
// The layout and frame GEOMETRY is INTERNAL and is not re-exported here — the
// same disposition RateGauge's and MutationSliders' `geometry.ts` were given in
// the release that published all three. A consumer supplies a tree and reads
// `onNodeClick`; it never asks the chart where a node landed or which width
// layout it chose. A dev surface that wants the geometry reaches `./layout`,
// `./layout-types` or `./frame` directly, as the scenario board reaches
// `LevelsTimeline/geometry`. `Frame` in particular must stay unpublished:
// `LevelsTimeline/geometry.ts` and `ScrubChart` define the same name, and an
// ambiguous `export *` at the root resolves to NOTHING, silently.
