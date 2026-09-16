// Barrel — WORKSHOP PROTOTYPE, deliberately NOT re-exported from src/index.ts.
//
// The bench (dev/showcases/workshop/levels-timeline.tsx) reaches this folder
// directly while the API is still being settled. Promotion (`/promote`) is
// what adds the package export, the dedicated showcase, the COMPONENTS.md
// entry and whatever curried variants the first real caller turns out to need.
//
// No factory here on purpose: every prop is data (`series`, `mutations`,
// `domain`, `selectedMutationId`, `onSelectMutation`), so there is nothing
// static to curry, and `createLevelsTimeline({})` would be an unconfigured
// surface.
export { LevelsTimeline } from "./LevelsTimeline";
export type { LevelsTimelineProps } from "./LevelsTimeline";
export {
  MAX_STROKE,
  MIN_STROKE,
  MONTHLY_TICK_LIMIT,
  RAIL_LABEL_GAP,
  axisTicks,
  changeTimes,
  droplinePositions,
  flagPositions,
  levelsRailGeometry,
  maxCountOf,
  railSpans,
  strokeFor,
  transferRibbons,
  valueDomainOf,
  yearTicks,
  levelsTimelineGeometry,
  monthTicks,
  stepPath,
  stepVertices,
  timeOf,
  xScaleFor,
  yDomainOf,
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
  Ribbon,
  Transfer,
  LevelPoint,
  LevelsTimelineGeometry,
  Line,
  MonthTick,
  Mutation,
  Point,
  Series,
  TimeDomain,
  TimeValue,
} from "./geometry";
