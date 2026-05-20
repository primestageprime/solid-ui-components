import type { Component } from "solid-js";
import { createDragRangeSelect } from "./DragRangeSelect";
import type { DragRangeSelectDataProps } from "./DragRangeSelect";

/** Commit-on-release — wider minPixelDelta (15px) to suppress accidental selections. */
export const CommitOnReleaseDragRangeSelect: Component<DragRangeSelectDataProps> =
  createDragRangeSelect({ minPixelDelta: 15, fillOpacity: 0.12 });

/** Eager — minPixelDelta 3px; commits as soon as the user starts dragging. */
export const EagerDragRangeSelect: Component<DragRangeSelectDataProps> =
  createDragRangeSelect({ minPixelDelta: 3, fillOpacity: 0.2 });
