export { useMediaQuery } from "./useMediaQuery";
export { useContainerNarrow } from "./useContainerNarrow";
export { createTruncationObserver } from "./createTruncationObserver";
// Headless drag-and-drop reorder hook (placeholder-drop-target pattern). Shared
// by DnDHierarchySortBar (axis "x") and SortableList (axis "y"); lives here in
// the neutral hooks home so neither component imports from the other's folder.
export {
  createDnDReorder,
  previewOrder,
  hitTestInsertPos,
  isAfterMidpoint,
  pointerToInsertIndex,
} from "./createDnDReorder";
export type {
  CreateDnDReorderOptions,
  DnDReorder,
  DnDReorderAxis,
  DnDItemHandlers,
  DnDContainerHandlers,
  AxisRect,
  DragSize,
} from "./createDnDReorder";
// An axis ceiling that rises with the data and falls only on reset — the fix
// for a y-axis that jitters as values are edited.
export {
  createHighWaterMark,
  nextHighWater,
  stepHighWater,
  isHighWaterSettled,
} from "./createHighWaterMark";
export type {
  HighWaterMark,
  HighWaterMarkOptions,
} from "./createHighWaterMark";
// The held y-DOMAIN built on it: ceiling AND floor, expand at once, shrink
// only on reset — plus its pure step and headless observation.
export {
  createAxisWaterMarks,
  createHeldFit,
  heldDomainOf,
  holdFitDomain,
  NO_HELD_DOMAIN,
  observeAxisWaterMarks,
} from "./createAxisWaterMarks";
export type {
  AxisWaterMarks,
  FitDomain,
  HeldDomain,
  HeldFit,
  WaterMarkFrame,
  WaterMarkRow,
} from "./createAxisWaterMarks";
// The y-axis STRATEGY over those marks: ChartFrame's split button, as a pure
// step (auto / autoscale / fixed), its reactive wrapper, the lock check, and
// the headless observation.
export {
  AXIS_WATER_MARK_HOLD,
  INITIAL_Y_AXIS,
  checkLock,
  createYAxisStrategy,
  displayedDomain,
  formatYAxisRows,
  observeYAxis,
  stepYAxis,
} from "./createYAxisStrategy";
export type {
  YAxisDomain,
  YAxisEvent,
  YAxisFrame,
  YAxisHoldStep,
  YAxisIntent,
  YAxisLockCheck,
  YAxisLockError,
  YAxisMode,
  YAxisRow,
  YAxisState,
  YAxisStep,
  YAxisStrategy,
} from "./createYAxisStrategy";
