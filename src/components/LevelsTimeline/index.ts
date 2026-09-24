// Barrel — the PUBLISHED surface, and deliberately small.
//
// What a client needs to draw a levels timeline:
//
//   • `LevelsRailChart` — the zero-config CURRIED variant. Data and callbacks
//     only; the format is baked. This is what a new call site should use.
//   • `createLevelsTimeline` — bake your own `formatValue` into a variant.
//   • `LevelsTimeline` + `LevelsTimelineProps` — the BASE component and its
//     full props. Kept on the published surface because live consumers
//     (thorcasting-ui, the scenario board) are written against them; a
//     promotion is not the moment to break a consumer's signature.
//   • `pickDay` / `PickStrategy` — what a click on the plot reports — and
//     `abbreviateDates`, the axis's date-row rule, for a consumer's tabs.
//   • the DATA types it has to construct, and `timeOf` to compare two
//     `TimeValue`s — they are `Date | number`, so `.getTime()` does not
//     typecheck on the union and a consumer that hand-rolled the
//     normalisation would be a second definition of one number.
//
// Everything else geometry.ts exports — the frame, the scales, the band and
// ribbon path builders, the tick cadences, the width caps — is INTERNAL. It
// was all exported once, while the API was being settled on the bench, and
// keeping that open would publish sixty names (`Point`, `Frame`, `Rail`,
// `bandPath`, `hCurve`, …) into a package this size for no caller. The
// geometry module still stands alone and still prints as a table; a dev
// surface that wants it reaches `./geometry` directly, as the scenario board
// does.
export { LevelsTimeline, createLevelsTimeline } from "./LevelsTimeline";
export type {
  LevelsTimelineDataProps,
  LevelsTimelineOverrides,
  LevelsTimelineProps,
} from "./LevelsTimeline";
export * from "./variants";
export { timeOf } from "./geometry";
// The click strategy and the date-row abbreviator (2026-09-24). `pickDay` is
// curried into a variant (`createLevelsTimeline({ pickAt: pickDay })`);
// `abbreviateDates` labels a consumer's change tabs with the SAME rule the
// axis uses, so a tab row and the axis never disagree about a year.
export { abbreviateDates, pickDay } from "./geometry";
export type { PickStrategy } from "./geometry";
export type {
  CountPoint,
  Level,
  Mutation,
  TimeDomain,
  TimeValue,
  Transfer,
} from "./geometry";
