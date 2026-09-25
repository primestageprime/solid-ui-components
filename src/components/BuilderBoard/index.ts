// Barrel — the PUBLIC surface, re-exported from src/index.ts.
//
// `geometry.ts` is a private module: pure, printable as a table, and its
// exports exist so `geometry.test.ts` can read the frame without a browser —
// not so a consumer can. `RailWidth` is the exception, because a call site
// that curries its own board has to name the type of the `rail` override.
//
// Clients import `BuilderBoard` (the gauge-railed board, the only one today)
// or curry their own once with `createBuilderBoard`.
export { BuilderBoard, createBuilderBoard } from "./BuilderBoard";
export type {
  BuilderBoardProps,
  BuilderBoardOverrides,
  BuilderBoardDataProps,
} from "./BuilderBoard";
export type { RailWidth as BuilderBoardRailWidth } from "./geometry";

// The board BELOW a shell chart (panel A is the shell's), and the pure core
// the app sizes it — and the chart above it — with. These geometry exports
// ARE public: the app must compute the chart height the board implies.
export {
  BuilderBoardBelowChart,
  createBuilderBoardBelowChart,
} from "./BuilderBoardBelowChart";
export { panelBoxOf as builderBoardPanelBoxOf } from "./panelBox";
export type {
  PanelBox as BuilderBoardPanelBox,
  PanelDSlot as BuilderBoardPanelDSlot,
} from "./panelBox";
export type {
  BuilderBoardBelowChartProps,
  BuilderBoardBelowChartOverrides,
  BuilderBoardBelowChartDataProps,
} from "./BuilderBoardBelowChart";
export {
  B_MIN_HEIGHT as BUILDER_BOARD_B_MIN_HEIGHT,
  CD_SHARE as BUILDER_BOARD_CD_SHARE,
  CHART_MIN_HEIGHT as BUILDER_BOARD_CHART_MIN_HEIGHT,
  STACK_BELOW_WIDTH as BUILDER_BOARD_STACK_BELOW_WIDTH,
  builderBoardBelowChart,
  observeBuilderBoardBelowChart,
} from "./geometry";
export type {
  BelowChartGaps as BuilderBoardBelowChartGaps,
  BelowChartInput as BuilderBoardBelowChartInput,
  BelowChartLayout as BuilderBoardBelowChartLayout,
  BelowChartRects as BuilderBoardBelowChartRects,
} from "./geometry";
