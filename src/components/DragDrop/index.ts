export { DragItem } from "./DragItem";
export type { DragItemProps } from "./DragItem";
export { DragList } from "./DragList";
export type { DragListProps, DragListItem } from "./DragList";
export { QuadrantGrid } from "./QuadrantGrid";
export type { QuadrantGridProps, QuadrantCellConfig } from "./QuadrantGrid";

// Re-export provider pieces from @thisbeyond/solid-dnd so consumers use the same
// module instance as DragItem/DragList (avoids dual-context bugs in dev mode).
export {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  closestCenter,
} from "@thisbeyond/solid-dnd";
export type { DragEvent } from "@thisbeyond/solid-dnd";
