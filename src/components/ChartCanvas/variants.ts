import type { Component } from "solid-js";
import { createChartCanvas } from "./ChartCanvas";
import type { ChartCanvasDataProps } from "./ChartCanvas";

// Explicit Component<ChartCanvasDataProps> annotations keep the shipped .d.ts
// portable across pnpm/github-dep installs (avoids vite-plugin-dts inlining
// solid-js paths through the ephemeral build store — TS2742/TS2305 downstream).
export const ChartCanvasMd: Component<ChartCanvasDataProps> = createChartCanvas({
  height: 240,
});
export const ChartCanvasLg: Component<ChartCanvasDataProps> = createChartCanvas({
  height: 300,
});
export const ChartCanvasMlg: Component<ChartCanvasDataProps> = createChartCanvas({
  height: 350,
});
export const ChartCanvasXl: Component<ChartCanvasDataProps> = createChartCanvas({
  height: 420,
});
