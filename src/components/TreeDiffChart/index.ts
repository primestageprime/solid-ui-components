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
// ── DEPRECATED: the layout and frame GEOMETRY below is internal ─────────────
//
// Audited 2026-09-17 against real consumers
// (`docs/adherence/variant-audit-2026-09-16.md`): none of the names in the
// rest of this file has a caller anywhere — not a consumer repo, not the
// `tree-diff-chart` showcase, not the Scenario Board bench, not
// `barrel.test.ts`. A consumer supplies a tree and reads `onNodeClick`; it
// never asks the chart where a node landed or which of the three width
// layouts it chose.
//
// The same question was adjudicated the other way twice in the release that
// published these (0.171.0): RateGauge's ~20 `geometry.ts` exports stay
// private, MutationSliders' ~30 geometry FUNCTIONS became private, and
// `LevelsTimeline/index.ts` documents the policy in full — a dev surface that
// wants the geometry reaches `./geometry` directly, as the scenario board
// does. TreeDiffChart never got that scrub.
//
// `Frame` is the sharpest case: `LevelsTimeline/geometry.ts` and `ScrubChart`
// define the same name internally, so publishing it here is one `export *`
// away from an ambiguous re-export that resolves to NOTHING, silently — the
// exact hazard `barrel.test.ts` exists for.
//
// There is no public successor, and saying "import it from `./frame` instead"
// would be false: `package.json` `exports` publishes the root, the themes and
// the CSS entries only — no component subpath — so a package consumer has no
// route to these modules at all. The relative import is available to an
// IN-REPO dev surface (a bench or a showcase), exactly as the scenario board
// reaches `LevelsTimeline/geometry`, and to nothing else. So this is not a
// migration; it is an over-publication being withdrawn.
//
// Phase 2 of add/deprecate/delete, NOT phase 3: these shipped in 0.171.0, so
// they are marked and kept. Do not extend this block, and delete these lines
// once a minor version has passed with nothing reading them.
/** @deprecated Internal geometry, no public successor. In-repo dev surfaces import `./layout` relatively; removed after 0.172.x. */
export { computeTreeDiffLayout } from "./layout";
/** @deprecated Internal geometry, no public successor. In-repo dev surfaces import `./layout` relatively; removed after 0.172.x. */
export type { TreeDiffLayoutInput } from "./layout";
/** @deprecated Internal geometry, no public successor. In-repo dev surfaces import `./layout-types` relatively; removed after 0.172.x. */
export type {
  TreeDiffLayout,
  LayoutNode,
  LayoutEdge,
  LayoutBand,
  LayoutGuide,
  LayoutCaption,
} from "./layout-types";
/** @deprecated Internal geometry, no public successor. In-repo dev surfaces import `./frame` relatively; removed after 0.172.x. */
export { computeFrame, NARROW_AT, SPINE_AT, WIDE_AT } from "./frame";
/** @deprecated Internal geometry, no public successor — and `Frame` is an ambiguous-export hazard at the root. In-repo dev surfaces import `./frame` relatively; removed after 0.172.x. */
export type { TreeDiffLayoutMode, Frame } from "./frame";
