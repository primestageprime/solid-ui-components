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
