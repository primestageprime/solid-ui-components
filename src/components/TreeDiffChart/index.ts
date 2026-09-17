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
export { computeTreeDiffLayout } from "./layout";
export type { TreeDiffLayoutInput } from "./layout";
export type {
  TreeDiffLayout,
  LayoutNode,
  LayoutEdge,
  LayoutBand,
  LayoutGuide,
  LayoutCaption,
} from "./layout-types";
export { computeFrame, NARROW_AT, SPINE_AT, WIDE_AT } from "./frame";
export type { TreeDiffLayoutMode, Frame } from "./frame";
