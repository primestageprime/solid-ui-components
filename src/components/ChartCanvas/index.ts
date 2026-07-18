// Base (ChartCanvas) is intentionally NOT exported — use a curried variant
// (ChartCanvasMd / ChartCanvasLg / ChartCanvasXl) ONLY (no create* factories at call sites).
export { createChartCanvas } from "./ChartCanvas";
export type { ChartCanvasDataProps } from "./ChartCanvas";
export * from "./variants";
