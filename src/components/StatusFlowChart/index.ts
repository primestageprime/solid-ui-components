// Base (StatusFlowChart) is intentionally NOT exported past this barrel — use
// createStatusFlowChart ONLY. The family ships no pre-baked curried variants
// because there is no universal status taxonomy for SUI to bake; the factory
// requires one, so every consumer defines its own variant once. See the
// comment on StatusFlowChartOverrides for why the taxonomy is definition-time.
// The base itself stays exported HERE so the component's own tests and the
// showcase can mount it directly; src/index.ts deliberately re-exports only
// the factory.
export { StatusFlowChart, createStatusFlowChart } from "./StatusFlowChart";
export type {
  StatusFlowChartProps,
  StatusFlowChartOverrides,
  StatusFlowChartDataProps,
  StatusFlowRenderContext,
} from "./StatusFlowChart";
export type {
  StatusFlowNode,
  StatusFlowColumn,
  StatusFlowBreakpoint,
  ColAssignment,
} from "./columns";
export {
  pickVisibleCols,
  assignColumns,
  resolveParentStatuses,
} from "./columns";
