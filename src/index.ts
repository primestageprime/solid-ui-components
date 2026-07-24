// Global reset + design tokens. Imported here (not just authored in source) so
// the box-sizing reset and base `body` rules (margin:0, theme background) ship
// in dist/index.css for consumers of `solid-ui-components/index.css`. Without
// this the default 8px body margin shows as a white frame around dark apps.
import "./styles/global.css";

// createSection is used below to reconstruct the legacy HUDSection alias.
import { createSection } from "./components/Section";

// Types
export type { ColorVariant, CornerStyle } from "./types";

// Components
export * from "./components/Layout";
export * from "./components/Text";
export * from "./components/ResponsiveMoney";
export * from "./components/InlineText";
export * from "./components/Surface";
export * from "./components/Badge";
export * from "./components/BulkActionBar";
export * from "./components/SlotFillBar";
export * from "./components/BatchBar";
export * from "./components/ExtractionBoard";
export * from "./components/Legend";
export * from "./components/StatusLight";
export * from "./components/Dot";
export * from "./components/TruthIndicator";
export * from "./components/QuickFilter";
export * from "./components/MultiSelectFilter";
export * from "./components/ChartHeader";
export * from "./components/Sparkline";
export * from "./components/HeartbeatSparkline";
export * from "./components/TrendSparkline";
export * from "./components/LiveHeartbeatTrace";
export * from "./components/ConnectionStatus";
export * from "./components/ConversationTree";
export * from "./components/MessageBubble";
export * from "./components/ParticipantAvatar";
export * from "./components/ParticipantNameLabel";
export * from "./components/ParticipantTimeLabel";
export * from "./components/ThreadGroup";
export * from "./components/LabeledDivider";
export * from "./components/Chart";
export * from "./components/ChartCanvas";
export * from "./components/Alarm";
export * from "./components/GroupBracket";
export * from "./components/RecentStarred";
export * from "./components/Cell";
export * from "./components/Button";
export * from "./components/HotkeyButton";
export * from "./components/Fab";
export * from "./components/Card";
export * from "./components/DataDisplay";
export * from "./components/Feedback";
export * from "./components/Checkbox";
export * from "./components/Icon";
export * from "./components/Inputs";
export * from "./components/Navigation";
export * from "./components/OverflowNav";
export * from "./components/Toggle";
export * from "./components/SegmentedControl";
export * from "./components/Progress";
export * from "./components/ProgressCard";
export * from "./components/Heatmap";
export * from "./components/Treemap";
export * from "./components/HeatStack";
export * from "./components/HeatStream";
export * from "./components/HeatStreamGrid";
export * from "./components/Table";
// Data-last functional utilities + typed pipe: namespaced (mirrors `fields`).
// Self-contained, liftable-to-own-package module — see src/fn/README.md.
export * as fn from "./fn";
// Fields-as-functions table system: namespaced (columnHelpers still owns the
// bare intCol/textCol/... names until step ③ swaps them out of the barrel).
export * as fields from "./components/Table/fields";
export { FieldTable, SortableFieldTable } from "./components/Table/fields/FieldTable";
export type { FieldTableProps } from "./components/Table/fields/FieldTable";
export * from "./components/PivotGrid";
export * from "./components/ValueMatrix";
export * from "./components/Section";
export * from "./components/Panel";
export * from "./components/ScrollRegion";
export * from "./components/Divider";
export * from "./components/Page";
export * from "./components/Modal";
export * from "./components/BottomSheet";
export * from "./components/Tabs";
export * from "./components/TabbedSidePanel";
export * from "./components/ButtonGroup";
export * from "./components/List";
export * from "./components/PopoverMenu";
export * from "./components/NotificationCenter";
export * from "./components/Selector";
export * from "./components/TitledTimeRangeHeader";
export * from "./components/DataList";
export * from "./components/MathFormula";
export * from "./components/ProgressCheck";
export * from "./components/BurndownChart";
export * from "./components/SprintSelector";
export * from "./components/DagChart";
// SwimlaneChart public API: as of v0.40 the *animated* variant is the
// public default. The underlying static implementation is still
// re-exported as `SwimlaneChartStatic` (and via the
// `./components/SwimlaneChart/SwimlaneChart` path) for internal
// consumers like StatusFlowChart that need synchronous DOM. Props/types
// are intentionally identical, so existing consumers (dside-ui's
// MonitorSwimlane etc.) keep compiling unchanged.
export {
  AnimatedSwimlaneChart as SwimlaneChart,
  createAnimatedSwimlaneChart as createSwimlaneChart,
} from "./components/AnimatedSwimlaneChart";
export type { AnimatedSwimlaneChartDataProps as SwimlaneChartDataProps } from "./components/AnimatedSwimlaneChart";
// Static variant under a distinct public name so the surface doesn't
// collide. Internal callers may also import directly from the folder.
export { SwimlaneChart as SwimlaneChartStatic } from "./components/SwimlaneChart/SwimlaneChart";
// Layout/converter/variants from the SwimlaneChart folder â these are
// component-independent and remain part of the public surface.
export {
  computeSwimlaneLayout,
  LinearFlowSwimlaneChart,
  convertSwimlaneDagInput,
} from "./components/SwimlaneChart";
export type {
  SwimlaneLayoutResult,
  SwimlaneSummary,
  SwimlaneOptions,
  SwimlaneDagInput,
  SwimlaneDagNode,
  SwimlaneDagEdge,
  SwimlaneDagLane,
  SwimlaneStateMachine,
  SwimlaneBucket,
  ConvertedNode,
  ConvertedNodeData,
  ConvertedResult,
} from "./components/SwimlaneChart";
// Animated variant also exported under its original name for callers
// that prefer to be explicit. Curried (data-only); bake overrides with
// createAnimatedSwimlaneChart.
export {
  AnimatedSwimlaneChart,
  createAnimatedSwimlaneChart,
} from "./components/AnimatedSwimlaneChart";
export type { AnimatedSwimlaneChartDataProps } from "./components/AnimatedSwimlaneChart";
// Consumer-facing types for building SwimlaneChart data + custom node cards.
export type { RenderNodeContext } from "./components/AnimatedSwimlaneChart";
export type { StatusFlowNode } from "./components/StatusFlowChart";
export * from "./components/DragDrop";
export * from "./components/Duration";
export * from "./components/Dropdown";
export * from "./components/ResizableContainer";
export * from "./components/Tooltip";
export * from "./components/Select";
export * from "./components/Combobox";
export * from "./components/ThemedNumberInput";
export * from "./components/CurrencyInput";
export * from "./components/Toast";
export * from "./components/ValueRenderer";
export * from "./components/DiffPair";
export * from "./components/ChangeRenderer";
export * from "./components/CandlestickRenderer";
export * from "./components/DateRangePicker";
// DateAxis re-exports â `Cell` (time-bucket type) collides with the existing
// `Cell` table component at the root surface, so we list each export
// explicitly and alias the type to `DateAxisCell` for root-level consumers.
// Consumers who prefer the bare `Cell` name can still import it from
// `solid-ui-components/dist/components/DateAxis`.
export { DateAxis, createDateAxis } from "./components/DateAxis";
export type {
  DateAxisProps,
  DateAxisOverrides,
  DateAxisDataProps,
  DateAxisCellContext,
} from "./components/DateAxis";
export type { Cell as DateAxisCell } from "./components/DateAxis";
export {
  dailyCells,
  weeklyCells,
  monthlyCells,
  hourlyCells,
  isSameCalendarDay,
} from "./components/DateAxis";
export * from "./components/ThreePanelLayout";
export * from "./components/Markdown";
export * from "./components/Kbd";
export * from "./components/CodeBlock";
export * from "./components/DayOfMonthPicker";
export * from "./components/DayOfWeekPicker";
export * from "./components/DatePicker";
export * from "./components/SegmentedInput";
export * from "./components/RangeAmountGroup";
export * from "./components/FormComposite";
export * from "./components/MonthOfYearPicker";
export * from "./components/BigNumberInput";
export * from "./components/CollapsiblePanel";
export * from "./components/WeekCalendar";
export * from "./components/ActionRow";
export * from "./components/AssigneeChips";
export * from "./components/CashflowChart";
export * from "./components/DnDHierarchySortBar";
export * from "./components/ScrubChart";
export * from "./components/CashflowScrubChart";
export * from "./components/WorkProgressCard";
export * from "./components/SplitQueueList";
export * from "./components/ProgressionQueue";
export * from "./components/SortableList";
export * from "./components/ServiceHealthDot";
export * from "./components/MutableList";
// ActionList family — the ActionList Depth-3 list and its Depth-2 row. The
// four Depth-1 primitives ship inside existing families: AssigneeIcon via
// ParticipantAvatar, TagPill + StatusChip via Badge; EditableTitle is standalone
// (InlineText is styleless and non-editable, so genuinely different).
export * from "./components/EditableTitle";
export * from "./components/ActionListItem";
export * from "./components/ActionList";
export * from "./components/CensusView";
export * from "./components/Auth";

// Styles - import this in your app: import "solid-ui-components/styles.css"

// Backward compatibility â will be removed in a future version
export { Page as HUDPage } from "./components/Page";
export { Modal as HUDModal } from "./components/Modal";
export { ConfirmationModal as HUDConfirmationModal } from "./components/Modal";
export { Tabs as HUDTabs } from "./components/Tabs";
export { ButtonGroup as HUDButtonGroup } from "./components/ButtonGroup";
export { ListItem as HUDListItem } from "./components/List";
// Section's base component is intentionally unexported on this version (consumers
// use createSection()/curried variants). HUDSection was the old raw default
// Section; recreate it as a default-configured Section so legacy consumers keep
// working. title/subtitle/children remain accepted (not in the overridable set).
export const HUDSection = createSection({});
export { createPanel as createHUDPanel } from "./components/Panel";
export * from "./components/WorkerCard";
export * from "./components/CompletionTimeline";
export * from "./components/ThroughputChart";
export * from "./components/RingChart";
// export * from "./components/PivotTreemap"; // local-link build workaround: dir not committed
export * from "./components/AreaFocusGrid";
export * from "./components/ProductGridCard";
export * from "./components/FocusLabelBand";
export * from "./components/ProductGrid";

// Hooks
export * from "./hooks";

// GhostRow — de-emphasized clickable rows (rail children, link rows)
export * from "./components/GhostRow";

// Choreography — compose + sequence animation effects across components
// (collapse/expand/fadeIn/fadeOut/slideDown/rollUp/glowIn/settleIn, step/
// commit/choreograph, and the anim() data-anim spread helper). Public API;
// the implementation lives beside the other animation engines in
// src/internal/animation/.
export {
  anim,
  choreograph,
  step,
  weightedStep,
  commit,
  collapse,
  expand,
  fadeIn,
  fadeOut,
  slideDown,
  rollUp,
  glowIn,
  settleIn,
  DEFAULT_TOTAL_MS,
} from "./internal/animation/choreography";
export type {
  EffectFn,
  EffectInstance,
  Step,
} from "./internal/animation/choreography";

// Theme-switching API — see src/themes/README.md.
export {
  THEMES,
  loadTheme,
  loadBaseline,
  getPersistedTheme,
  persistTheme,
} from "./themes/loader";
export type { ThemeId, ThemeEntry } from "./themes/manifest";
