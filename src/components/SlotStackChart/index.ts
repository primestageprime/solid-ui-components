// Barrel — the PUBLIC surface, re-exported from src/index.ts. The base is
// exported beside its factory, as StackedTimelineChart's and TargetBarChart's
// are: the words a screen curries are optional, so the base is usable as it
// stands. Every type carries the component's name, because an ambiguous
// `export *` resolves to nothing. `SlotStackMarks` stays internal: it is the
// chart's mark, not a part a screen assembles.
export {
  SLOT_STACK_FALLBACK_SIZE,
  SlotStackChart,
  createSlotStackChart,
} from "./SlotStackChart";
export type {
  SlotStackChartDataProps,
  SlotStackChartOverrides,
  SlotStackChartProps,
} from "./SlotStackChart";
export { SlotStackLegend, slotStackLegendItems } from "./SlotStackLegend";
export { SLOT_STACK_TOTAL_PAINT } from "./SlotStackMarks";
export type { SlotStackLegendProps } from "./SlotStackLegend";
export { SLOT_STACK_WORDS, slotStackRows } from "./slotStackGeometry";
export type { SlotStackLabels } from "./slotStackLabels";
export type {
  SlotStackClasses,
  SlotStackExpand,
  SlotStackSeries,
  SlotStackSlot,
  SlotStackWords,
} from "./slotStackGeometry";
