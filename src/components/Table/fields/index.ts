// ============================================
// Table fields — aggregator (Depth 1: composes the field modules)
// The fields-as-functions table system. Import factories from here:
//   import { nameCol, intCol, resolveFields } from ".../Table/fields";
// Consumers reach it through the package barrel as the `fields` namespace
// (plus the top-level FieldTable component) — columnHelpers still owns the
// bare intCol/textCol/... names in the Table barrel until step ③ of the
// semantic-props release swaps them (see docs/superpowers/plans/
// 2026-07-16-semantic-props-metric.md §3a).
// ============================================
export * from "./shared";
export { GEO, col, resolveFields } from "./resolve";
export { FieldTable, SortableFieldTable } from "./FieldTable";
export type { FieldTableProps } from "./FieldTable";
export { selectionCol, createFieldSelection } from "./selection";
export type { FieldSelection, FieldSelectionOpts } from "./selection";
export { nameCol } from "./name";
export type { NameColOpts } from "./name";
export { identityLinkCol } from "./identity-link";
export type { IdentityLinkColOpts } from "./identity-link";
export { textCol } from "./text";
export type { TextColOpts } from "./text";
export { dateCol } from "./date";
export { dateTimeCol } from "./date-time";
export type { DateTimeColOpts } from "./date-time";
export { intCol } from "./int";
export type { IntColOpts } from "./int";
export { floatCol } from "./float";
export type { FloatColOpts } from "./float";
export { avgCol } from "./avg";
export type { AvgColOpts } from "./avg";
export { moneyCol } from "./money";
export { durationCol } from "./duration";
export type { DurationColOpts } from "./duration";
export { statusCol } from "./status";
export type { StatusColMapping, StatusColOpts } from "./status";
export { listCol } from "./list";
export type { ListColOpts } from "./list";
export { ACTION_ICONS, geoFor, actionCol, clusterCol } from "./actions";
export { withHref, withHint } from "./combinators";
