// Barrel — the PUBLIC surface, re-exported from src/index.ts.
//
// Deliberately narrow, like RateGauge's. model.ts is mostly private: its
// line, band and flag functions exist so model.test.ts can read the chart
// without a browser. What a consumer needs is the component, its factory and
// variant, the trace types it draws, the receipt rows for a table beside it,
// and the headless observation. fixtures.ts is test and showcase data only.
export { ProgressFlags, createProgressFlags, DEFAULT_TOLERANCE_RATIO } from "./ProgressFlags";
export type {
  ProgressFlagsProps,
  ProgressFlagsOverrides,
  ProgressFlagsDataProps,
} from "./ProgressFlags";
export { StepProgressFlags } from "./variants";
export { observeProgressFlags, progressReceiptRows } from "./model";
export type {
  ProgressTrace,
  ProgressTraceStep,
  ProgressTraceReceipt,
  ProgressTraceReceiptKind,
  ProgressReceiptRow,
} from "./model";
