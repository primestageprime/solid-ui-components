/* @refresh reload */
import "solid-devtools";
import { render, Dynamic } from "solid-js/web";
import {
  createSignal,
  createMemo,
  For,
  Show,
  type Component,
  onMount,
  onCleanup,
} from "solid-js";
import "../src/styles/global.css";
import "./main.css";
import { ThemeSwitcher } from "./theme-switcher";
import { Sandbox } from "./sandbox";
import { LayoutsGallery } from "./layouts-gallery";
import { HealthView } from "./health-view";
import { Icon } from "../src/components/Icon";
import { TagPill, type PillStats } from "./tag-pill";

// Atomic
import { BaseTableShowcase } from "./showcases/base-table";
import { TableFieldsShowcase } from "./showcases/table-fields";
import { ValueMatrixShowcase } from "./showcases/value-matrix";
import { ButtonShowcase } from "./showcases/button";
import { DnDHierarchySortBarShowcase } from "./showcases/dnd-hierarchy-sort-bar";
import { FabShowcase } from "./showcases/fab";
import { CandlestickRendererShowcase } from "./showcases/candlestick-renderer";
import { CellRendererShowcase } from "./showcases/cell-renderers";
import { GapCellShowcase } from "./showcases/gap-cell";
import { ComboboxShowcase } from "./showcases/combobox";
import { DagChartShowcase } from "./showcases/dag-chart";
import { DateAxisShowcase } from "./showcases/date-axis";
import { ScrubChartShowcase } from "./showcases/scrub-chart";
import { CashflowScrubChartShowcase } from "./showcases/cashflow-scrub-chart";
import { SwimlaneChartShowcase } from "./showcases/swimlane-chart";
import { DataTableContainerShowcase } from "./showcases/data-table-container";
import { DigitRollerShowcase } from "./showcases/digit-roller";
import { DividerShowcase } from "./showcases/divider";
import { GhostRowShowcase } from "./showcases/ghost-row";
import { NestedListShowcase } from "./showcases/nested-list";
import { DotchartShowcase } from "./showcases/dotchart";
import { HeatmapShowcase } from "./showcases/heatmap";
import { HeatStreamShowcase } from "./showcases/heatstream";
import { HeatStackShowcase } from "./showcases/heatstack";
import { ButtonGroupShowcase } from "./showcases/hud-button-group";
import { ListShowcase } from "./showcases/hud-list";
import { ModalShowcase } from "./showcases/hud-modal";
import { BottomSheetShowcase } from "./showcases/bottom-sheet";
import { PageShowcase } from "./showcases/hud-page";
import { PanelShowcase } from "./showcases/hud-panel";
import { AccentSectionShowcase } from "./showcases/hud-section";
import { TabsShowcase } from "./showcases/hud-tabs";
import { TabbedSidePanelShowcase } from "./showcases/tabbed-side-panel";
import { ToggleShowcase } from "./showcases/hud-toggle";
import { SegmentedControlShowcase } from "./showcases/segmented-control";
import { IconShowcase } from "./showcases/icon";
import { InputsShowcase } from "./showcases/inputs";
import { MathFormulaShowcase } from "./showcases/math-formula";
import { NavItemShowcase } from "./showcases/nav-item";
import { ProgressBarShowcase } from "./showcases/progress-bar";
import { AsyncProgressShowcase } from "./showcases/async-progress";
import { MarkdownEditorShowcase } from "./showcases/markdown-editor";
import { RangeAmountGroupShowcase } from "./showcases/range-amount-group";
import { InlineChartErrorOverlayShowcase } from "./showcases/inline-chart-error-overlay";
import { ScrollRegionShowcase } from "./showcases/scroll-region";
import { SectionShowcase } from "./showcases/section";
import { SelectShowcase } from "./showcases/select";
import { SidebarSelectorShowcase } from "./showcases/sidebar-selector";
import { StatsTableShowcase } from "./showcases/stats-table";
import { StatusBadgeShowcase } from "./showcases/status-badge";
import { TextShowcase } from "./showcases/text";
import { ThemedNumberInputShowcase } from "./showcases/themed-number-input";
import { CurrencyInputShowcase } from "./showcases/currency-input";
import { TruthIndicatorShowcase } from "./showcases/truth-indicator";
import { QuickFilterAtomShowcase } from "./showcases/quickfilter-atom";
import { AppShellShowcase } from "./showcases/app-shell";
import { DurationShowcase } from "./showcases/duration";
import { SlotFillBarShowcase } from "./showcases/slot-fill-bar";
import { ProductGridShowcase } from "./showcases/product-grid";
import { LegendShowcase } from "./showcases/legend";
import { StatusLightShowcase } from "./showcases/status-light";
import { DropdownShowcase } from "./showcases/dropdown";
import { PopoverMenuShowcase } from "./showcases/popover-menu";
import { NotificationCenterShowcase } from "./showcases/notification-center";
import { ProgressCheckShowcase } from "./showcases/progress-check";
import { SprintSelectorShowcase } from "./showcases/sprint-selector";
import { WorkerCardShowcase } from "./showcases/worker-card";
import { WorkProgressCardShowcase } from "./showcases/work-progress-card";
import { StatusCardShowcase } from "./showcases/status-card";
import { CheckboxShowcase } from "./showcases/checkbox";
import { MultiSelectFilterShowcase } from "./showcases/multi-select-filter";
import { PickersShowcase } from "./showcases/pickers";
import { SplitQueueListShowcase } from "./showcases/split-queue-list";
import { BucketQueueShowcase } from "./showcases/bucket-queue";
import { SortableListShowcase } from "./showcases/sortable-list";
import { ActionListShowcase } from "./showcases/action-list";
import { MutableListShowcase } from "./showcases/mutable-list";
import { RecentStarredShowcase } from "./showcases/recent-starred";
import { QuadrantGridShowcase } from "./showcases/quadrant-grid";
import { RingChartShowcase } from "./showcases/ring-chart";
import { ChartHeaderShowcase } from "./showcases/chart-header";
import { SparklineShowcase } from "./showcases/sparkline";
import { TrendSparklineShowcase } from "./showcases/trend-sparkline";
import { DistributionSparklineShowcase } from "./showcases/distribution-sparkline";
import { ThroughputChartShowcase } from "./showcases/throughput-chart";
import { BandRailShowcase } from "./showcases/band-rail";
import { SliderShowcase } from "./showcases/slider";
import { ExtractionBoardShowcase } from "./showcases/extraction-board";
import { BurndownChartShowcase } from "./showcases/burndown-chart";
import { CompletionTimelineShowcase } from "./showcases/completion-timeline";
import { ThreePanelLayoutShowcase } from "./showcases/three-panel-layout";
import { ToastShowcase } from "./showcases/toast";
import { TooltipShowcase } from "./showcases/tooltip";
import { ValueRendererShowcase } from "./showcases/value-renderer";

// Layout
import { ResizableContainerShowcase } from "./showcases/resizable-container";
import { RowShowcase } from "./showcases/row";
import { StackShowcase } from "./showcases/stack";
import { SurfaceShowcase } from "./showcases/surface";

// Depth 2
import { AlertBoxShowcase } from "./showcases/alert-box";
import { AuthShowcase } from "./showcases/auth";
import { ChartShowcase } from "./showcases/chart";
import { ChangeRendererShowcase } from "./showcases/change-renderer";
import { DateRangePickerShowcase } from "./showcases/date-range-picker";
import { DateTimeRangeShowcase } from "./showcases/date-time-range";
import { EmptyStateShowcase } from "./showcases/empty-state";
import { FileDropZoneShowcase } from "./showcases/file-drop-zone";
import { SlotCardShowcase } from "./showcases/slot-card";
import { SectionTableShowcase } from "./showcases/section-table";
import { LayoutVariantsShowcase } from "./showcases/layout-variants";
import { VariantCoverageShowcase } from "./showcases/variant-coverage";
import { ChartSlotsShowcase } from "./showcases/chart-slots";
import { TableGridsShowcase } from "./showcases/table-grids";
import { FormsAndInputsShowcase } from "./showcases/forms-and-inputs";
import { OperatingWeekShowcase } from "./showcases/operating-week";
import { EntityCardShowcase } from "./showcases/entity-card";
import { HeatStreamGridShowcase } from "./showcases/heatstream-grid";
import { ConfirmationModalShowcase } from "./showcases/hud-confirmation-modal";
import { NavBarShowcase } from "./showcases/nav-bar";
import { NumberWithUnitsShowcase } from "./showcases/number-with-units";
import { PivotTreemapShowcase } from "./showcases/pivot-treemap";
import { ProgressCardShowcase } from "./showcases/progress-card";
import { QuickFilterShowcase } from "./showcases/quick-filter";
import { SelectableTableShowcase } from "./showcases/selectable-table";
import { RemovableItemCardShowcase } from "./showcases/removable-item-card";
import { ServiceHealthDotShowcase } from "./showcases/service-health-dot";

// Depth 3
import { CensusViewShowcase } from "./showcases/census-view";
import { ConnectionStatusShowcase } from "./showcases/connection-status";
import { ConversationTreeShowcase } from "./showcases/conversation-tree";
import { DataListShowcase } from "./showcases/data-list";
import { FormulaPanelShowcase } from "./showcases/formula-panel";
import { InteractiveFormulaShowcase } from "./showcases/interactive-formula";
import { MetricCardShowcase } from "./showcases/metric-card";
import { FilterBarShowcase } from "./showcases/filter-bar";
import { ResultDisplayShowcase } from "./showcases/result-display";
import { TitledTimeRangeHeaderShowcase } from "./showcases/titled-time-range-header";

// Depth 4
import { ResultPanelShowcase } from "./showcases/result-panel";

// Sandbox / design exploration
import { PillVariantsShowcase } from "./showcases/pill-variants";
import { DagTraversalSandboxShowcase } from "./showcases/dag-traversal-sandbox";
import { DagTraversalBulkSandboxShowcase } from "./showcases/dag-traversal-bulk-sandbox";
import { WorkshopShowcase } from "./showcases/workshop";
import { AnimatedSwimlaneChartShowcase } from "./showcases/animated-swimlane-chart";
import { RouterDemoShowcase } from "./showcases/router-demo";
import { SwimlaneNodeCardShowcase } from "./showcases/swimlane-node-card";
import { buildWorkshopItems, type BenchModule } from "./workshop-benches";

type ShowcaseProps = {
  onNavigate?: (id: string, pushHash?: boolean) => void;
};
type Item = {
  id: string;
  label: string;
  component: Component<ShowcaseProps>;
  tags: string[];
};

// Auto-discovered workshop benches (dev/showcases/workshop/*.tsx). Each file
// default-exports a Component; new benches appear here with no registration edit.
const workshopBenchItems = buildWorkshopItems(
  import.meta.glob<BenchModule>("./showcases/workshop/*.tsx", { eager: true }),
);

const items: Item[] = [
  // Workshop: standalone entry, surfaced via the dedicated sidebar link.
  // Tagged "workshop" so the depth-grouped list filters it out.
  {
    id: "workshop",
    label: "Workshop",
    component: WorkshopShowcase,
    tags: ["workshop"],
  },
  ...workshopBenchItems,
  {
    id: "base-table",
    label: "BaseTable",
    component: BaseTableShowcase,
    tags: ["depth:1", "table", "data"],
  },
  {
    id: "table-fields",
    label: "Table Fields",
    component: TableFieldsShowcase,
    tags: ["depth:2", "table", "data"],
  },
  {
    id: "value-matrix",
    label: "ValueMatrix",
    component: ValueMatrixShowcase,
    tags: ["depth:2", "table", "data"],
  },
  {
    id: "button",
    label: "Button",
    component: ButtonShowcase,
    tags: ["depth:0", "form"],
  },
  {
    id: "dnd-hierarchy-sort-bar",
    label: "DnDHierarchySortBar",
    component: DnDHierarchySortBarShowcase,
    tags: ["depth:0", "form"],
  },
  {
    id: "fab",
    label: "Fab",
    component: FabShowcase,
    tags: ["depth:1", "form"],
  },
  {
    id: "hud-button-group",
    label: "ButtonGroup",
    component: ButtonGroupShowcase,
    tags: ["depth:0", "form"],
  },
  {
    id: "candlestick-renderer",
    label: "CandlestickRenderer",
    component: CandlestickRendererShowcase,
    tags: ["depth:0", "chart", "data"],
  },
  {
    id: "cell-renderers",
    label: "CellRenderers",
    component: CellRendererShowcase,
    tags: ["depth:1", "data"],
  },
  {
    id: "gap-cell",
    label: "GapCell",
    component: GapCellShowcase,
    tags: ["depth:2", "table", "data"],
  },
  {
    id: "combobox",
    label: "Combobox",
    component: ComboboxShowcase,
    tags: ["depth:0", "form"],
  },
  {
    id: "dag-chart",
    label: "DagChart",
    component: DagChartShowcase,
    tags: ["depth:0", "chart", "data"],
  },
  {
    id: "date-axis",
    label: "DateAxis",
    component: DateAxisShowcase,
    tags: ["depth:0", "chart", "time"],
  },
  {
    id: "scrub-chart",
    label: "ScrubChart",
    component: ScrubChartShowcase,
    tags: ["depth:1", "chart", "time", "data"],
  },
  {
    id: "cashflow-scrub-chart",
    label: "CashflowScrubChart",
    component: CashflowScrubChartShowcase,
    tags: ["depth:2", "chart", "time", "data"],
  },
  {
    id: "swimlane-chart",
    label: "SwimlaneChart",
    component: SwimlaneChartShowcase,
    tags: ["depth:0", "chart", "data"],
  },
  {
    id: "animated-swimlane-chart",
    label: "AnimatedSwimlaneChart",
    component: AnimatedSwimlaneChartShowcase,
    tags: ["depth:0", "chart", "data"],
  },
  {
    id: "router-demo",
    label: "Edge routers (dag-svg)",
    component: RouterDemoShowcase,
    tags: ["depth:0", "chart"],
  },
  {
    id: "swimlane-node-card",
    label: "SwimlaneNodeCard",
    component: SwimlaneNodeCardShowcase,
    tags: ["depth:0", "chart"],
  },
  {
    id: "data-table-container",
    label: "DataTableContainer",
    component: DataTableContainerShowcase,
    tags: ["depth:1", "table", "data", "container"],
  },
  {
    id: "digit-roller",
    label: "DigitRoller",
    component: DigitRollerShowcase,
    tags: ["depth:2", "indicator", "data"],
  },
  {
    id: "divider",
    label: "Divider",
    component: DividerShowcase,
    tags: ["depth:0", "layout"],
  },
  {
    id: "ghost-row",
    label: "GhostRow",
    component: GhostRowShowcase,
    tags: ["depth:1", "list", "indicator"],
  },
  {
    id: "nested-list",
    label: "NestedList",
    component: NestedListShowcase,
    tags: ["depth:1", "layout", "list"],
  },
  {
    id: "heatmap",
    label: "Heatmap",
    component: HeatmapShowcase,
    tags: ["depth:0", "chart", "data"],
  },
  {
    id: "heatstream",
    label: "HeatStream",
    component: HeatStreamShowcase,
    tags: ["depth:0", "chart", "time", "data"],
  },
  {
    id: "heatstack",
    label: "HeatStack",
    component: HeatStackShowcase,
    tags: ["depth:0", "chart", "data"],
  },
  {
    id: "icon",
    label: "Icon",
    component: IconShowcase,
    tags: ["depth:0", "text"],
  },
  {
    id: "inputs",
    label: "Inputs",
    component: InputsShowcase,
    tags: ["depth:0", "form"],
  },
  {
    id: "hud-list",
    label: "List",
    component: ListShowcase,
    tags: ["depth:0", "list"],
  },
  {
    id: "math-formula",
    label: "MathFormula",
    component: MathFormulaShowcase,
    tags: ["depth:0", "math", "text"],
  },
  {
    id: "hud-modal",
    label: "Modal",
    component: ModalShowcase,
    tags: ["depth:1", "feedback"],
  },
  {
    id: "bottom-sheet",
    label: "BottomSheet",
    component: BottomSheetShowcase,
    tags: ["depth:0", "feedback"],
  },
  {
    id: "nav-item",
    label: "NavItem",
    component: NavItemShowcase,
    tags: ["depth:0", "navigation"],
  },
  {
    id: "hud-page",
    label: "Page",
    component: PageShowcase,
    tags: ["depth:0", "layout"],
  },
  {
    id: "hud-panel",
    label: "Panel",
    component: PanelShowcase,
    tags: ["depth:0", "container"],
  },
  {
    id: "progress-bar",
    label: "ProgressBar",
    component: ProgressBarShowcase,
    tags: ["depth:0", "indicator"],
  },
  {
    id: "async-progress",
    label: "AsyncProgress",
    component: AsyncProgressShowcase,
    tags: ["depth:1", "indicator"],
  },
  {
    id: "markdown-editor",
    label: "MarkdownEditor",
    component: MarkdownEditorShowcase,
    tags: ["depth:2", "data"],
  },
  {
    id: "range-amount-group",
    label: "RangeAmountGroup",
    component: RangeAmountGroupShowcase,
    tags: ["depth:2", "input"],
  },
  {
    id: "inline-chart-error-overlay",
    label: "InlineChartErrorOverlay",
    component: InlineChartErrorOverlayShowcase,
    tags: ["depth:1", "feedback"],
  },
  {
    id: "scroll-region",
    label: "ScrollRegion",
    component: ScrollRegionShowcase,
    tags: ["depth:0", "container", "layout"],
  },
  {
    id: "section",
    label: "Section",
    component: SectionShowcase,
    tags: ["depth:0", "container"],
  },
  {
    id: "hud-section",
    label: "Section (Accent)",
    component: AccentSectionShowcase,
    tags: ["depth:0", "container"],
  },
  {
    id: "select",
    label: "Select",
    component: SelectShowcase,
    tags: ["depth:0", "form"],
  },
  {
    id: "sidebar-selector",
    label: "SidebarSelector",
    component: SidebarSelectorShowcase,
    tags: ["depth:0", "navigation", "form"],
  },
  {
    id: "stats-table",
    label: "StatsTable",
    component: StatsTableShowcase,
    tags: ["depth:2", "table", "data"],
  },
  {
    id: "status-badge",
    label: "StatusBadge",
    component: StatusBadgeShowcase,
    tags: ["depth:0", "indicator", "status"],
  },
  {
    id: "hud-tabs",
    label: "Tabs",
    component: TabsShowcase,
    tags: ["depth:0", "navigation"],
  },
  {
    id: "tabbed-side-panel",
    label: "TabbedSidePanel",
    component: TabbedSidePanelShowcase,
    tags: ["depth:1", "container", "navigation"],
  },
  {
    id: "text",
    label: "Text",
    component: TextShowcase,
    tags: ["depth:0", "text"],
  },
  {
    id: "themed-number-input",
    label: "ThemedNumberInput",
    component: ThemedNumberInputShowcase,
    tags: ["depth:0", "form"],
  },
  {
    id: "currency-input",
    label: "CurrencyInput",
    component: CurrencyInputShowcase,
    tags: ["depth:1", "form"],
  },
  {
    id: "app-shell",
    label: "AppShell",
    component: AppShellShowcase,
    tags: ["depth:0", "layout", "navigation"],
  },
  {
    id: "burndown-chart",
    label: "BurndownChart",
    component: BurndownChartShowcase,
    tags: ["depth:1", "chart", "time", "data"],
  },
  {
    id: "completion-timeline",
    label: "CompletionTimeline",
    component: CompletionTimelineShowcase,
    tags: ["depth:1", "chart", "time", "data"],
  },
  {
    id: "dropdown",
    label: "Dropdown",
    component: DropdownShowcase,
    tags: ["depth:0", "form"],
  },
  {
    id: "duration",
    label: "Duration",
    component: DurationShowcase,
    tags: ["depth:0", "time", "text"],
  },
  {
    id: "popover-menu",
    label: "PopoverMenu",
    component: PopoverMenuShowcase,
    tags: ["depth:0", "navigation", "feedback"],
  },
  {
    id: "notification-center",
    label: "NotificationCenter",
    component: NotificationCenterShowcase,
    tags: ["depth:3", "feedback", "navigation"],
  },
  {
    id: "progress-check",
    label: "ProgressCheck",
    component: ProgressCheckShowcase,
    tags: ["depth:0", "indicator"],
  },
  {
    id: "quadrant-grid",
    label: "QuadrantGrid",
    component: QuadrantGridShowcase,
    tags: ["depth:0", "chart", "data"],
  },
  {
    id: "ring-chart",
    label: "RingChart",
    component: RingChartShowcase,
    tags: ["depth:0", "chart", "data"],
  },
  {
    id: "chart-header",
    label: "ChartHeader",
    component: ChartHeaderShowcase,
    tags: ["depth:2", "chart", "indicator"],
  },
  {
    id: "sparkline",
    label: "Sparkline",
    component: SparklineShowcase,
    tags: ["depth:1", "chart", "indicator"],
  },
  {
    id: "trend-sparkline",
    label: "TrendSparkline",
    component: TrendSparklineShowcase,
    tags: ["depth:1", "chart", "indicator"],
  },
  {
    id: "distribution-sparkline",
    label: "DistributionSparkline",
    component: DistributionSparklineShowcase,
    tags: ["depth:1", "chart", "indicator", "data"],
  },
  {
    id: "sprint-selector",
    label: "SprintSelector",
    component: SprintSelectorShowcase,
    tags: ["depth:0", "form", "time"],
  },
  {
    id: "slot-fill-bar",
    label: "SlotFillBar",
    component: SlotFillBarShowcase,
    tags: ["depth:0", "indicator", "chart"],
  },
  {
    id: "product-grid",
    label: "ProductGrid",
    component: ProductGridShowcase,
    tags: ["depth:1", "data", "chart"],
  },
  {
    id: "pivot-treemap",
    label: "PivotTreemap",
    component: PivotTreemapShowcase,
    tags: ["depth:1", "chart", "data"],
  },
  {
    id: "legend",
    label: "Legend",
    component: LegendShowcase,
    tags: ["depth:0", "indicator", "chart"],
  },
  {
    id: "status-light",
    label: "StatusLight",
    component: StatusLightShowcase,
    tags: ["depth:0", "indicator", "status"],
  },
  {
    id: "throughput-chart",
    label: "ThroughputChart",
    component: ThroughputChartShowcase,
    tags: ["depth:1", "chart", "time", "data"],
  },
  {
    id: "band-rail",
    label: "BandRail",
    component: BandRailShowcase,
    tags: ["depth:1", "chart", "form", "data"],
  },
  {
    id: "slider",
    label: "Slider",
    component: SliderShowcase,
    tags: ["depth:1", "form", "data"],
  },
  {
    id: "extraction-board",
    label: "ExtractionBoard",
    component: ExtractionBoardShowcase,
    tags: ["depth:1", "chart", "data", "container"],
  },
  {
    id: "truth-indicator",
    label: "TruthIndicator",
    component: TruthIndicatorShowcase,
    tags: ["depth:0", "indicator"],
  },
  {
    id: "quickfilter-atom",
    label: "QuickFilter (atom)",
    component: QuickFilterAtomShowcase,
    tags: ["depth:1", "form"],
  },
  {
    id: "worker-card",
    label: "WorkerCard",
    component: WorkerCardShowcase,
    tags: ["depth:1", "container", "indicator"],
  },
  {
    id: "work-progress-card",
    label: "WorkProgressCard",
    component: WorkProgressCardShowcase,
    tags: ["depth:1", "container", "indicator", "data", "time"],
  },
  {
    id: "status-card",
    label: "StatusCard",
    component: StatusCardShowcase,
    tags: ["depth:2", "container", "status", "data"],
  },
  {
    id: "split-queue-list",
    label: "SplitQueueList (deprecated)",
    component: SplitQueueListShowcase,
    tags: ["depth:1", "list", "navigation", "container"],
  },
  {
    id: "bucket-queue",
    label: "BucketQueue",
    component: BucketQueueShowcase,
    tags: ["depth:1", "list", "navigation", "container"],
  },
  {
    id: "sortable-list",
    label: "SortableList",
    component: SortableListShowcase,
    tags: ["depth:1", "list", "form", "container"],
  },
  {
    id: "action-list",
    label: "ActionList",
    component: ActionListShowcase,
    tags: ["depth:3", "list", "data"],
  },
  {
    id: "mutable-list",
    label: "MutableList",
    component: MutableListShowcase,
    tags: ["depth:2", "list", "form", "container"],
  },
  {
    id: "recent-starred",
    label: "RecentStarred",
    component: RecentStarredShowcase,
    tags: ["depth:1", "list", "navigation", "container"],
  },
  {
    id: "three-panel-layout",
    label: "ThreePanelLayout",
    component: ThreePanelLayoutShowcase,
    tags: ["depth:0", "layout"],
  },
  {
    id: "toast",
    label: "Toast",
    component: ToastShowcase,
    tags: ["depth:0", "feedback"],
  },
  {
    id: "toggle",
    label: "Toggle",
    component: ToggleShowcase,
    tags: ["depth:0", "form"],
  },
  {
    id: "checkbox",
    label: "Checkbox",
    component: CheckboxShowcase,
    tags: ["depth:0", "form"],
  },
  {
    id: "multi-select-filter",
    label: "MultiSelectFilter",
    component: MultiSelectFilterShowcase,
    tags: ["depth:1", "form", "filter"],
  },
  {
    id: "pickers",
    label: "Recurrence pickers",
    component: PickersShowcase,
    tags: ["depth:1", "form", "time"],
  },
  {
    id: "segmented-control",
    label: "SegmentedControl",
    component: SegmentedControlShowcase,
    tags: ["depth:0", "form"],
  },
  {
    id: "tooltip",
    label: "Tooltip",
    component: TooltipShowcase,
    tags: ["depth:0", "feedback"],
  },
  {
    id: "value-renderer",
    label: "ValueRenderer",
    component: ValueRendererShowcase,
    tags: ["depth:0", "data"],
  },

  {
    id: "resizable-container",
    label: "ResizableContainer",
    component: ResizableContainerShowcase,
    tags: ["depth:0", "layout"],
  },
  {
    id: "row",
    label: "Row",
    component: RowShowcase,
    tags: ["depth:0", "layout"],
  },
  {
    id: "stack",
    label: "Stack",
    component: StackShowcase,
    tags: ["depth:0", "layout"],
  },
  {
    id: "surface",
    label: "Surface",
    component: SurfaceShowcase,
    tags: ["depth:0", "layout", "container"],
  },

  {
    id: "alert-box",
    label: "AlertBox",
    component: AlertBoxShowcase,
    tags: ["depth:1", "feedback"],
  },
  {
    id: "auth",
    label: "Auth",
    component: AuthShowcase,
    tags: ["depth:2", "form", "feedback", "list"],
  },
  {
    id: "chart",
    label: "Chart",
    component: ChartShowcase,
    tags: ["depth:0", "chart", "data"],
  },
  {
    id: "dotchart",
    label: "DotChart (composition smoke)",
    component: DotchartShowcase,
    tags: ["depth:1", "chart", "time", "data"],
  },
  {
    id: "change-renderer",
    label: "ChangeRenderer",
    component: ChangeRendererShowcase,
    tags: ["depth:1", "data", "indicator"],
  },
  {
    id: "hud-confirmation-modal",
    label: "ConfirmationModal",
    component: ConfirmationModalShowcase,
    tags: ["depth:1", "feedback"],
  },
  {
    id: "date-range-picker",
    label: "DateRangePicker",
    component: DateRangePickerShowcase,
    tags: ["depth:0", "form", "time"],
  },
  {
    id: "date-time-range",
    label: "DateTimeRange",
    component: DateTimeRangeShowcase,
    tags: ["depth:2", "time"],
  },
  {
    id: "empty-state",
    label: "EmptyState",
    component: EmptyStateShowcase,
    tags: ["depth:1", "feedback"],
  },
  {
    id: "file-drop-zone",
    label: "FileDropZone",
    component: FileDropZoneShowcase,
    tags: ["depth:2", "form", "container"],
  },
  {
    id: "slot-card",
    label: "SlotCard",
    component: SlotCardShowcase,
    tags: ["depth:2", "list", "container", "data"],
  },
  {
    id: "section-table",
    label: "SectionTable",
    component: SectionTableShowcase,
    tags: ["depth:2", "table", "data"],
  },
  {
    id: "layout-variants",
    label: "Layout variants",
    component: LayoutVariantsShowcase,
    tags: ["depth:0", "layout", "container"],
  },
  {
    id: "variant-coverage",
    label: "Variant coverage",
    component: VariantCoverageShowcase,
    tags: ["depth:1", "feedback", "navigation", "form"],
  },
  {
    id: "chart-slots",
    label: "Chart slots",
    component: ChartSlotsShowcase,
    tags: ["depth:1", "chart", "data", "status"],
  },
  {
    id: "table-grids",
    label: "Tables and grids",
    component: TableGridsShowcase,
    tags: ["depth:2", "table", "data", "list"],
  },
  {
    id: "forms-and-inputs",
    label: "Forms and inputs",
    component: FormsAndInputsShowcase,
    tags: ["depth:2", "form", "time", "data"],
  },
  {
    id: "operating-week",
    label: "Operating week — WeekCalendar + WeeklyCashflowChart",
    component: OperatingWeekShowcase,
    tags: ["depth:2", "chart", "time", "data"],
  },
  {
    id: "entity-card",
    label: "EntityCard",
    component: EntityCardShowcase,
    tags: ["depth:2", "list", "container", "status"],
  },
  {
    id: "heatstream-grid",
    label: "HeatStreamGrid",
    component: HeatStreamGridShowcase,
    tags: ["depth:1", "chart", "time", "data"],
  },
  {
    id: "nav-bar",
    label: "NavBar",
    component: NavBarShowcase,
    tags: ["depth:0", "navigation"],
  },
  {
    id: "number-with-units",
    label: "NumberWithUnits",
    component: NumberWithUnitsShowcase,
    tags: ["depth:2", "data"],
  },
  {
    id: "progress-card",
    label: "ProgressCard",
    component: ProgressCardShowcase,
    tags: ["depth:1", "container", "indicator"],
  },
  {
    id: "quick-filter",
    label: "QuickFilter",
    component: QuickFilterShowcase,
    tags: ["depth:1", "form"],
  },
  {
    id: "selectable-table",
    label: "SelectableTable",
    component: SelectableTableShowcase,
    tags: ["depth:1", "table", "data", "form"],
  },
  {
    id: "removable-item-card",
    label: "RemovableItemCard",
    component: RemovableItemCardShowcase,
    tags: ["depth:1", "container", "data"],
  },

  {
    id: "census-view",
    label: "CensusView",
    component: CensusViewShowcase,
    tags: ["depth:3", "table", "data"],
  },
  {
    id: "connection-status",
    label: "ConnectionStatus",
    component: ConnectionStatusShowcase,
    tags: ["depth:2", "indicator", "status"],
  },
  {
    id: "service-health-dot",
    label: "ServiceHealthDot",
    component: ServiceHealthDotShowcase,
    tags: ["depth:2", "indicator", "status"],
  },
  {
    id: "conversation-tree",
    label: "ConversationTree",
    component: ConversationTreeShowcase,
    tags: ["depth:1", "list", "chat"],
  },
  {
    id: "data-list",
    label: "DataList",
    component: DataListShowcase,
    tags: ["depth:1", "list", "data"],
  },
  {
    id: "titled-time-range-header",
    label: "TitledTimeRangeHeader",
    component: TitledTimeRangeHeaderShowcase,
    tags: ["depth:0", "container", "data"],
  },
  {
    id: "formula-panel",
    label: "FormulaPanel",
    component: FormulaPanelShowcase,
    tags: ["depth:2", "container", "math"],
  },
  {
    id: "interactive-formula",
    label: "InteractiveFormula",
    component: InteractiveFormulaShowcase,
    tags: ["depth:3", "form", "math"],
  },
  {
    id: "filter-bar",
    label: "FilterBar",
    component: FilterBarShowcase,
    tags: ["depth:1", "form", "navigation", "container"],
  },
  {
    id: "metric-card",
    label: "MetricCard",
    component: MetricCardShowcase,
    tags: ["depth:2", "container", "indicator", "data"],
  },
  {
    id: "result-display",
    label: "ResultDisplay",
    component: ResultDisplayShowcase,
    tags: ["depth:2", "math", "data"],
  },

  {
    id: "result-panel",
    label: "ResultPanel",
    component: ResultPanelShowcase,
    tags: ["depth:2", "container", "math", "data"],
  },

  {
    id: "pill-variants",
    label: "Pill Variants (sandbox)",
    component: PillVariantsShowcase,
    tags: [],
  },
  {
    id: "dag-traversal-detail",
    label: "DAG Traversal · Detail (sandbox)",
    component: DagTraversalSandboxShowcase,
    tags: [],
  },
  {
    id: "dag-traversal-bulk",
    label: "DAG Traversal · Bulk (sandbox)",
    component: DagTraversalBulkSandboxShowcase,
    tags: [],
  },
];

const TAG_CATEGORIES: { label: string; tags: string[] }[] = [
  {
    label: "Depth",
    tags: ["depth:0", "depth:1", "depth:2", "depth:3", "depth:4"],
  },
  {
    label: "Shape",
    tags: [
      "chart",
      "table",
      "list",
      "form",
      "layout",
      "feedback",
      "navigation",
      "indicator",
      "container",
      "text",
    ],
  },
  { label: "Domain", tags: ["data", "time", "math", "status", "chat"] },
];

const itemById = new Map(items.map((i) => [i.id, i]));

const TOTAL_ITEMS = items.length;

type Route = { id: string | null; tags: Set<string>; query: string };

const parseHash = (hash: string): Route => {
  const raw = hash.replace(/^#\/?/, "");
  const [path, queryStr = ""] = raw.split("?");
  const segments = path.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? null;
  const id = last && itemById.has(last) ? last : null;
  const params = new URLSearchParams(queryStr);
  const tags = new Set((params.get("tags") ?? "").split(",").filter(Boolean));
  const query = params.get("q") ?? "";
  return { id, tags, query };
};

const buildHash = (
  id: string | null,
  tags: Set<string>,
  query: string,
): string => {
  const path = id ?? "";
  const params = new URLSearchParams();
  if (tags.size > 0) params.set("tags", [...tags].sort().join(","));
  if (query.trim()) params.set("q", query.trim());
  const qs = params.toString();
  return `#/${path}${qs ? `?${qs}` : ""}`;
};

const App: Component = () => {
  const initial = parseHash(location.hash);
  const fallbackId = items[0]?.id ?? "";
  const [activeId, setActiveId] = createSignal(initial.id ?? fallbackId);
  const [selectedTags, setSelectedTags] = createSignal<Set<string>>(
    initial.tags,
  );
  const [query, setQuery] = createSignal(initial.query);

  const syncHash = () => {
    location.hash = buildHash(activeId(), selectedTags(), query());
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
    syncHash();
  };

  const clearTags = () => {
    setSelectedTags(new Set<string>());
    syncHash();
  };

  const navigate = (id: string, pushHash = true) => {
    setActiveId(id);
    if (pushHash) syncHash();
  };

  // Filter items: AND across categories, OR within. Text query AND on top.
  const matches = (item: Item, tags: Set<string>, q: string): boolean => {
    if (q && !item.label.toLowerCase().includes(q.toLowerCase())) return false;
    if (tags.size === 0) return true;
    for (const cat of TAG_CATEGORIES) {
      const catSelected = cat.tags.filter((t) => tags.has(t));
      if (catSelected.length === 0) continue;
      const itemHasAny = catSelected.some((t) => item.tags.includes(t));
      if (!itemHasAny) return false;
    }
    return true;
  };

  const filteredItems = createMemo(() => {
    const tags = selectedTags();
    const q = query();
    return items.filter((i) => matches(i, tags, q));
  });

  const currentSetIds = createMemo(
    () => new Set(filteredItems().map((i) => i.id)),
  );

  const computeStatsFor = (tag: string): PillStats => {
    const sel = selectedTags();
    const q = query();
    const active = sel.has(tag);
    const next = new Set(sel);
    if (active) next.delete(tag);
    else next.add(tag);
    const newSet = new Set(
      items.filter((i) => matches(i, next, q)).map((i) => i.id),
    );
    const cur = currentSetIds();
    let added = 0;
    let removed = 0;
    for (const id of newSet) if (!cur.has(id)) added++;
    for (const id of cur) if (!newSet.has(id)) removed++;
    return {
      active,
      currentCount: cur.size,
      newCount: newSet.size,
      added,
      removed,
    };
  };

  // Group filtered items by depth (depth:N or "Other" for untagged).
  // Items tagged "workshop" are surfaced via the dedicated sidebar link,
  // not in the depth-grouped list.
  const groupedItems = createMemo(() => {
    const filtered = filteredItems().filter(
      (i) => !i.tags.includes("workshop"),
    );
    const groups: { label: string; items: Item[] }[] = [
      { label: "Depth 0 (primitive)", items: [] },
      { label: "Depth 1", items: [] },
      { label: "Depth 2", items: [] },
      { label: "Depth 3", items: [] },
      { label: "Depth 4", items: [] },
      { label: "Other", items: [] },
    ];
    for (const item of filtered) {
      const depthTag = item.tags.find((t) => t.startsWith("depth:"));
      if (depthTag === "depth:0") groups[0].items.push(item);
      else if (depthTag === "depth:1") groups[1].items.push(item);
      else if (depthTag === "depth:2") groups[2].items.push(item);
      else if (depthTag === "depth:3") groups[3].items.push(item);
      else if (depthTag === "depth:4") groups[4].items.push(item);
      else groups[5].items.push(item);
    }
    for (const g of groups)
      g.items.sort((a, b) => a.label.localeCompare(b.label));
    return groups.filter((g) => g.items.length > 0);
  });

  // Sync hash → state on browser back/forward
  onMount(() => {
    const handler = () => {
      const r = parseHash(location.hash);
      if (r.id) setActiveId(r.id);
      setSelectedTags(r.tags);
      setQuery(r.query);
    };
    window.addEventListener("hashchange", handler);
    onCleanup(() => window.removeEventListener("hashchange", handler));
  });

  // Set initial hash if missing
  if (!location.hash) syncHash();

  const matchCount = () => filteredItems().length;

  return (
    <div class="showcase">
      <nav class="showcase__sidebar">
        <div class="showcase__sidebar-head">
          <div class="showcase__brand">
            <div class="showcase__brand-row">
              <div>
                <h1>Solid Components</h1>
                <p>SolidJS Component Library</p>
              </div>
              <a
                class="health-link"
                href="#/health"
                title="SUI health — ratchet metrics"
              >
                <Icon name="stethoscope" size="sm" />
              </a>
            </div>
            <ThemeSwitcher />
          </div>

          <button
            type="button"
            class={`workshop-link ${activeId() === "workshop" ? "workshop-link--active" : ""}`}
            onClick={() => navigate("workshop")}
            title="Live focus area for whatever's being worked on"
          >
            Workshop
          </button>

          <For each={workshopBenchItems}>
            {(bench) => (
              <button
                type="button"
                class={`workshop-link workshop-link--bench ${activeId() === bench.id ? "workshop-link--active" : ""}`}
                onClick={() => navigate(bench.id)}
                title="Workshop bench (in-progress component)"
              >
                {bench.label}
              </button>
            )}
          </For>

          <button
            type="button"
            class="workshop-link"
            onClick={() => {
              location.hash = "#/layouts";
            }}
            title="Gallery of saved default layouts"
          >
            Layouts →
          </button>

          <div class="showcase__tags">
            <For each={TAG_CATEGORIES}>
              {(cat) => (
                <div class="tag-category">
                  <div class="tag-category__label">{cat.label}</div>
                  <div class="tag-category__pills">
                    <For each={cat.tags}>
                      {(tag) => (
                        <TagPill
                          tag={tag}
                          stats={computeStatsFor(tag)}
                          onToggle={() => toggleTag(tag)}
                          totalItems={TOTAL_ITEMS}
                        />
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
            <Show when={selectedTags().size > 0}>
              <button type="button" class="tag-clear" onClick={clearTags}>
                Clear filters ({matchCount()} match
                {matchCount() === 1 ? "" : "es"})
              </button>
            </Show>
          </div>

          <div class="showcase__filter">
            <input
              type="search"
              class="showcase__filter-input"
              placeholder="Filter by name…"
              value={query()}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                syncHash();
              }}
            />
          </div>
        </div>

        <div class="showcase__sidebar-list">
          <For each={groupedItems()}>
            {(group) => (
              <div class="nav-group">
                <div class="nav-group__toggle nav-group__toggle--static">
                  {group.label}{" "}
                  <span class="nav-group__count">{group.items.length}</span>
                </div>
                <div class="nav-group__items">
                  <For each={group.items}>
                    {(item) => (
                      <button
                        class={`nav-item ${activeId() === item.id ? "nav-item--active" : ""}`}
                        onClick={() => navigate(item.id)}
                        title={item.tags.join(" · ")}
                      >
                        {item.label}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      </nav>

      <main class="showcase__content">
        <Dynamic
          component={itemById.get(activeId())?.component}
          onNavigate={navigate}
        />
      </main>
    </div>
  );
};

const Root: Component = () => {
  const [route, setRoute] = createSignal(location.hash);
  onMount(() => {
    const onHash = () => setRoute(location.hash);
    window.addEventListener("hashchange", onHash);
    onCleanup(() => window.removeEventListener("hashchange", onHash));
  });
  return (
    <Show
      when={route().startsWith("#/health")}
      fallback={
        <Show
          when={route().startsWith("#/layouts")}
          fallback={
            <Show when={route().startsWith("#/sandbox")} fallback={<App />}>
              <Sandbox />
            </Show>
          }
        >
          <LayoutsGallery />
        </Show>
      }
    >
      <HealthView />
    </Show>
  );
};

render(() => <Root />, document.getElementById("root")!);
