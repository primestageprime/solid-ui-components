// Barrel — the PUBLIC surface, re-exported from src/index.ts.
//
// Deliberately narrow, like RateGauge's. model.ts is mostly private: its
// line, band and flag functions exist so model.test.ts can read the chart
// without a browser. What a consumer needs is the component, the trace types
// it draws, the receipt rows for a table beside it, and the headless
// observation. No factory or variant: every prop is data, so the base is the
// curried form. fixtures.ts is test and showcase data only.
export { ProgressFlags } from "./ProgressFlags";
export type { ProgressFlagsProps } from "./ProgressFlags";
export { observeProgressFlags, progressReceiptRows } from "./model";
export type {
  ProgressTrace,
  ProgressTraceStep,
  ProgressTraceReceipt,
  ProgressTraceReceiptKind,
  ProgressReceiptRow,
} from "./model";
