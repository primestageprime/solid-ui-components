// ============================================
// Root export contract — checked by `tsc`, never executed
// ============================================
//
// `src/index.ts` is `export *` over every family barrel, and an AMBIGUOUS
// `export *` (two barrels publishing the same name) resolves to NOTHING,
// silently — the name simply vanishes from the root. The DateAxis family also
// re-exports by an EXPLICIT list that did not grow when DailyDateAxis,
// dayCellContent and dayCellContext were added, so they shipped in the
// tarball while no consumer could import them. Both failures used to be
// pinned by nine vitest files (`*/barrel.test.ts`, `*.export.test.tsx`,
// `unstable.test.ts`) that each imported the whole root at runtime and
// asserted `typeof sui.X === "function"`.
//
// The type checker answers the same question for free: a name that the root
// does not export is a compile error on `sui.X`, and a name that must stay
// PRIVATE is pinned with `@ts-expect-error`, which fails the moment the name
// appears. This file is included by tsconfig.json (`src/**`) and so runs
// under `npm run typecheck` — a CI gate — without starting a worker, building
// jsdom, or importing the barrel.
//
// Anything a consumer must reach from the package root belongs on a line
// here. Anything that must NOT leak to the root belongs under `// private`.
//
// (No runtime: nothing imports this module. The `_`-prefixed bindings exist
// only to give the `satisfies` clauses an expression to sit on.)
import * as sui from "./index";
import * as unstable from "./unstable";
import type {
  ChangeTone,
  Domain,
  Entity,
  GroupRun,
  GroupedMeasure,
  GroupedMeasureAxes,
  GroupedMeasureAxis,
  GroupedMeasureIndex,
  GroupedMutationEntity,
  GroupedMutationSliderLabels,
  GroupedMutationSlidersDataProps,
  GroupedMutationSlidersOverrides,
  GroupedMutationSlidersProps,
  MarkedSliderDataProps,
  MarkedSliderOverrides,
  MarkedSliderProps,
  MeasureIndex,
  PairedMeasure,
  PairedMeasureAxes,
  PairedMeasureAxis,
  PairedMutationEntity,
  PairedMutationSliderLabels,
  PairedMutationSlidersDataProps,
  PairedMutationSlidersOverrides,
  PairedMutationSlidersProps,
  RateGaugeBox,
  RateGaugeCalloutMode,
  TreeDiffBand,
  TreeDiffChartProps,
  TreeDiffChild,
  TreeDiffEntry,
  TreeDiffKind,
  TreeDiffMode,
  TreeDiffRoot,
} from "./index";

type Fn = (...args: never[]) => unknown;
type Root = typeof sui;

// ── components and factories that must resolve from the root ────────────
// Each entry fails to compile if the name is missing or is not callable.
const _rootFunctions = [
  // DateAxis family (explicit re-export list in src/index.ts)
  sui.DateAxis,
  sui.DailyDateAxis,
  sui.createDateAxis,
  sui.dayCellContent,
  sui.dayCellContext,
  sui.dailyCells,
  sui.weeklyCells,
  sui.monthlyCells,
  sui.hourlyCells,
  sui.isSameCalendarDay,
  // NotificationCenter + prefab actions
  sui.NotificationCenter,
  sui.CountBadge,
  sui.viewAction,
  sui.dismissAction,
  sui.markReadAction,
  sui.acceptAction,
  sui.declineAction,
  sui.deleteAction,
  // StatusFlowChart — factory and pure helpers (the base component stays
  // private; see below)
  sui.createStatusFlowChart,
  sui.pickVisibleCols,
  sui.assignColumns,
  sui.resolveParentStatuses,
  // StackedTimelineChart / MutationToolbar / high-water mark
  sui.StackedTimelineChart,
  sui.createStackedTimelineChart,
  sui.MutationToolbar,
  sui.createMutationToolbar,
  sui.createHighWaterMark,
  sui.nextHighWater,
  sui.stepHighWater,
  sui.isHighWaterSettled,
  // ChannelChart
  sui.ChannelChart,
  sui.ChannelDivergenceChart,
  sui.createChannelChart,
  // RateGauge callout breakpoint
  sui.calloutModeFor,
  sui.rateGaugeCalloutLabels,
  // TreeDiffChart
  sui.TreeDiffChart,
  sui.createTreeDiffChart,
  sui.ScenarioTreeDiff,
  sui.kindColor,
  sui.kindLabel,
  // MutationSliders family and its three split siblings
  sui.MutationSliders,
  sui.createMutationSliders,
  sui.NumberMutationSliders,
  sui.MarkedSlider,
  sui.createMarkedSlider,
  sui.ContinuousMarkedSlider,
  sui.PairedMutationSliders,
  sui.createPairedMutationSliders,
  sui.GroupedMutationSliders,
  sui.createGroupedMutationSliders,
  // /unstable entry — resolves from THAT entry
  unstable.channelModel,
  unstable.formatChannelTable,
] satisfies Fn[];

// ── constants that must resolve from the root, with their shape ─────────
const _rootConstants = [
  sui.STACKED_TIMELINE_FALLBACK_SIZE,
  sui.DEFAULT_MUTATION_TOOLBAR_LABELS,
  sui.DEFAULT_CHANNEL_CHART_TONES,
  sui.CHANNEL_CHART_FALLBACK_SIZE,
] satisfies object[];
const _spineIds = [sui.SAME_ID, sui.ROOT_BASELINE_ID] satisfies [
  "__same",
  "__root_baseline",
];
const _kinds = sui.KINDS satisfies readonly TreeDiffKind[];

// ── contract TYPES that must resolve from the root ──────────────────────
// A type that stops being re-exported is a compile error on its import line
// above; listing them here keeps the imports used.
type _ContractTypes = [
  TreeDiffChartProps,
  TreeDiffRoot,
  TreeDiffBand,
  TreeDiffChild,
  TreeDiffEntry,
  TreeDiffMode,
  GroupedMutationSlidersProps,
  GroupedMutationSlidersOverrides,
  GroupedMutationSlidersDataProps,
  GroupedMutationSliderLabels,
  GroupedMeasureAxis,
  GroupedMeasureAxes,
  GroupedMeasure,
  GroupedMutationEntity,
  GroupedMeasureIndex,
  GroupRun,
  MarkedSliderProps,
  MarkedSliderOverrides,
  MarkedSliderDataProps,
  Entity,
  Domain,
  ChangeTone,
  PairedMutationSlidersProps,
  PairedMutationSlidersOverrides,
  PairedMutationSlidersDataProps,
  PairedMutationSliderLabels,
  PairedMeasureAxis,
  PairedMeasureAxes,
  PairedMeasure,
  PairedMutationEntity,
  MeasureIndex,
  RateGaugeBox,
  RateGaugeCalloutMode,
];

// ── private: names that must NOT leak to the package root ───────────────
// `@ts-expect-error` fails to compile the moment the name DOES resolve.

// The curried-only policy: the StatusFlowChart base must not reach the root,
// or two views of one board can disagree about where a status belongs.
// @ts-expect-error -- StatusFlowChart is factory-only at the root
type _Private1 = Root["StatusFlowChart"];
// ChannelChart's geometry core lives on the /unstable entry only (PR #194).
// @ts-expect-error -- channelModel is /unstable only
type _Private2 = Root["channelModel"];
// @ts-expect-error -- formatChannelTable is /unstable only
type _Private3 = Root["formatChannelTable"];
// GroupedMutationSliders internals
// @ts-expect-error -- private
type _Private4 = Root["measureEntities"];
// @ts-expect-error -- private
type _Private5 = Root["resolveAxes"];
// @ts-expect-error -- private
type _Private6 = Root["slotFor"];
// @ts-expect-error -- private
type _Private7 = Root["runsOf"];
// @ts-expect-error -- private
type _Private8 = Root["GroupedDial"];
// PairedMutationSliders internals
// @ts-expect-error -- private
type _Private9 = Root["measureEntity"];
// @ts-expect-error -- private
type _Private10 = Root["resolveAxis"];
// @ts-expect-error -- private
type _Private11 = Root["PAIR_SLOT"];
// @ts-expect-error -- private
type _Private12 = Root["PairedDial"];

export {};
