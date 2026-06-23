export { BatchBar, createBatchBar } from "./BatchBar";
export type {
  BatchBarProps,
  BatchBarOverrides,
  BatchBarDataProps,
  BatchSpec,
} from "./BatchBar";

// The shared-model progress controller. Create ONE per board and pass it to
// every BatchBar that should share a single learned estimate; omit it and each
// bar learns its own. The clock seam is internal/test-only.
export { useProgressEngine as useBatchProgress } from "../../internal/progress/useProgressEngine";
export type {
  ProgressController,
  ProgressClock,
} from "../../internal/progress/useProgressEngine";
export type { BatchState, BatchInput } from "../../internal/progress/engine";
