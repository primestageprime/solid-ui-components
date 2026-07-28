// Base (FileDropZone) is exported for typing only — call sites use the curried
// variants below.
export { FileDropZone, createFileDropZone } from "./FileDropZone";
export type {
  FileDropZoneProps,
  FileDropZoneOverrides,
  FileDropZoneDataProps,
} from "./FileDropZone";
export { FileDropTarget, CompactFileDropTarget } from "./variants";
