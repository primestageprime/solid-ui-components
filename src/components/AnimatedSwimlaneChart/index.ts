// src/components/AnimatedSwimlaneChart/index.ts
//
// Curried-only surface: the default-named `AnimatedSwimlaneChart` is the
// data-only curried variant (from ./variants); `createAnimatedSwimlaneChart`
// bakes overrides. The base component and the full `*Props`/`*Overrides`
// types are intentionally NOT exported.
export { createAnimatedSwimlaneChart } from "./AnimatedSwimlaneChart";
export type { AnimatedSwimlaneChartDataProps } from "./AnimatedSwimlaneChart";
export type { RenderNodeContext } from "./defaults";
export * from "./variants";
