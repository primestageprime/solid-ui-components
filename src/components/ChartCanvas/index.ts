// Base (ChartCanvas) is intentionally NOT exported — use a curried variant
// (ChartCanvasMd / ChartCanvasLg / ChartCanvasXl) or createChartCanvas({ height }).
export { createChartCanvas } from "./ChartCanvas";
export type { ChartCanvasDataProps } from "./ChartCanvas";
export * from "./variants";
