// Barrel — WORKSHOP PROTOTYPE, deliberately NOT re-exported from src/index.ts.
//
// The bench (dev/showcases/workshop/levels-timeline.tsx) reaches this folder
// directly while the API is still being settled. Promotion (`/promote`) is
// what adds the package export, the dedicated showcase, the COMPONENTS.md
// entry and whatever curried variants the first real caller turns out to need.
//
// No factory here on purpose: every prop is data (`levels`, `transfers`,
// `mutations`, `domain`, `selectedMutationId`, `onSelectMutation`), so there
// is nothing static to curry, and `createLevelsTimeline({})` would be an
// unconfigured surface.
export { LevelsTimeline } from "./LevelsTimeline";
export type { LevelsTimelineProps } from "./LevelsTimeline";
export {
  MONTHLY_TICK_LIMIT,
  axisTicks,
  changeTimes,
  droplinePositions,
  flagPositions,
  levelsRailGeometry,
  railSpans,
  BAND_MARGIN,
  FILL_FRACTION,
  adjacencyWidth,
  bandPath,
  DEFAULT_FRAME,
  MIN_VIEW_HEIGHT,
  bandWidth,
  frameFor,
  viewHeightFor,
  edgeWidth,
  transitionHalf,
  countAt,
  fillWidth,
  maxCountIn,
  peakHeadcount,
  spanBottom,
  spanTop,
  flowBands,
  hCurve,
  perPersonWidth,
  railRuns,
  taperHalves,
  transitionWidth,
  valueDomainOf,
  yearTicks,
  monthTicks,
  timeOf,
  xScaleFor,
  yScaleFor,
} from "./geometry";
export type {
  CountPoint,
  Dropline,
  Flag,
  Level,
  LevelsRailGeometry,
  Rail,
  RailSpan,
  BandRun,
  EdgePoint,
  Frame,
  FlowBand,
  Taper,
  Transfer,
  MonthTick,
  Mutation,
  Point,
  TimeDomain,
  TimeValue,
} from "./geometry";
