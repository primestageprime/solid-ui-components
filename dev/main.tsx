/* @refresh reload */
import { render, Dynamic } from "solid-js/web";
import { createSignal, For, Show, Component } from "solid-js";
import "../src/styles/global.css";
import "./main.css";

import { ButtonShowcase } from "./showcases/button";
import { IconShowcase } from "./showcases/icon";
import { StatusBadgeShowcase } from "./showcases/status-badge";
import { InputsShowcase } from "./showcases/inputs";
import { NavItemShowcase } from "./showcases/nav-item";
import { DividerShowcase } from "./showcases/divider";
import { DigitRollerShowcase } from "./showcases/digit-roller";
import { ProgressBarShowcase } from "./showcases/progress-bar";
import { TextShowcase } from "./showcases/text";
import { StackShowcase } from "./showcases/stack";
import { RowShowcase } from "./showcases/row";
import { SurfaceShowcase } from "./showcases/surface";
import { AlertBoxShowcase } from "./showcases/alert-box";
import { DateTimeRangeShowcase } from "./showcases/date-time-range";
import { EmptyStateShowcase } from "./showcases/empty-state";
import { HUDModalShowcase } from "./showcases/hud-modal";
import { HUDSectionShowcase } from "./showcases/hud-section";
import { NavBarShowcase } from "./showcases/nav-bar";
import { ResultDisplayShowcase } from "./showcases/result-display";
import { SectionShowcase } from "./showcases/section";
import { VesselCallHeaderShowcase } from "./showcases/vessel-call-header";
import { HopperShowcase } from "./showcases/hopper";
import { CellRendererShowcase } from "./showcases/cell-renderers";
import { DataTableContainerShowcase } from "./showcases/data-table-container";
import { HUDPageShowcase } from "./showcases/hud-page";
import { HUDToggleShowcase } from "./showcases/hud-toggle";
import { MathFormulaShowcase } from "./showcases/math-formula";
import { InteractiveFormulaShowcase } from "./showcases/interactive-formula";
import { MetricCardShowcase } from "./showcases/metric-card";
import { NumberWithUnitsShowcase } from "./showcases/number-with-units";
import { VesselCardShowcase } from "./showcases/vessel-card";
import { DataListShowcase } from "./showcases/data-list";
import { StatsTableShowcase } from "./showcases/stats-table";
import { HUDPanelShowcase } from "./showcases/hud-panel";
import { HUDTabsShowcase } from "./showcases/hud-tabs";
import { HUDButtonGroupShowcase } from "./showcases/hud-button-group";
import { HUDListShowcase } from "./showcases/hud-list";
import { ProgressCardShowcase } from "./showcases/progress-card";
import { BaseTableShowcase } from "./showcases/base-table";
import { HeatmapShowcase } from "./showcases/heatmap";
import { HeatStreamShowcase } from "./showcases/heatstream";
import { SidebarSelectorShowcase } from "./showcases/sidebar-selector";
import { QuickFilterShowcase } from "./showcases/quick-filter";
import { SelectableTableShowcase } from "./showcases/selectable-table";
import { EngineDataSectionShowcase } from "./showcases/engine-data-section";
import { FormulaPanelShowcase } from "./showcases/formula-panel";
import { HUDConfirmationModalShowcase } from "./showcases/hud-confirmation-modal";
import { ResultPanelShowcase } from "./showcases/result-panel";
import { HeatStreamGridShowcase } from "./showcases/heatstream-grid";

type TabEntry = { id: string; label: string; component: Component };
type TabGroup = { label: string; children: TabEntry[]; defaultOpen?: boolean };

const nav: TabGroup[] = [
  {
    label: "Atomic",
    defaultOpen: true,
    children: [
      { id: "button", label: "Button", component: ButtonShowcase },
      { id: "icon", label: "Icon", component: IconShowcase },
      { id: "toggle", label: "Toggle", component: HUDToggleShowcase },
      { id: "status-badge", label: "StatusBadge", component: StatusBadgeShowcase },
      { id: "inputs", label: "Inputs", component: InputsShowcase },
      { id: "nav-item", label: "NavItem", component: NavItemShowcase },
      { id: "divider", label: "Divider", component: DividerShowcase },
      { id: "digit-roller", label: "DigitRoller", component: DigitRollerShowcase },
      { id: "progress-bar", label: "ProgressBar", component: ProgressBarShowcase },
      { id: "text", label: "Text", component: TextShowcase },
      { id: "cell-renderers", label: "CellRenderers", component: CellRendererShowcase },
      { id: "data-table-container", label: "DataTableContainer", component: DataTableContainerShowcase },
      { id: "hud-page", label: "Page", component: HUDPageShowcase },
      { id: "math-formula", label: "MathFormula", component: MathFormulaShowcase },
      { id: "hud-modal", label: "Modal", component: HUDModalShowcase },
      { id: "hud-section", label: "HUDSection", component: HUDSectionShowcase },
      { id: "section", label: "Section", component: SectionShowcase },
      { id: "stats-table", label: "StatsTable", component: StatsTableShowcase },
      { id: "hud-panel", label: "HUDPanel", component: HUDPanelShowcase },
      { id: "hud-tabs", label: "HUDTabs", component: HUDTabsShowcase },
      { id: "hud-button-group", label: "HUDButtonGroup", component: HUDButtonGroupShowcase },
      { id: "hud-list", label: "HUDList", component: HUDListShowcase },
      { id: "base-table", label: "BaseTable", component: BaseTableShowcase },
      { id: "heatmap", label: "Heatmap", component: HeatmapShowcase },
      { id: "heatstream", label: "HeatStream", component: HeatStreamShowcase },
      { id: "sidebar-selector", label: "SidebarSelector", component: SidebarSelectorShowcase },
    ],
  },
  {
    label: "Layout",
    children: [
      { id: "stack", label: "Stack", component: StackShowcase },
      { id: "row", label: "Row", component: RowShowcase },
      { id: "surface", label: "Surface", component: SurfaceShowcase },
    ],
  },
  {
    label: "Depth 2",
    children: [
      { id: "alert-box", label: "AlertBox", component: AlertBoxShowcase },
      { id: "date-time-range", label: "DateTimeRange", component: DateTimeRangeShowcase },
      { id: "empty-state", label: "EmptyState", component: EmptyStateShowcase },
      { id: "nav-bar", label: "NavBar", component: NavBarShowcase },
      { id: "number-with-units", label: "NumberWithUnits", component: NumberWithUnitsShowcase },
      { id: "vessel-card", label: "VesselCard", component: VesselCardShowcase },
      { id: "quick-filter", label: "QuickFilter", component: QuickFilterShowcase },
      { id: "selectable-table", label: "SelectableTable", component: SelectableTableShowcase },
      { id: "progress-card", label: "ProgressCard", component: ProgressCardShowcase },
      { id: "hud-confirmation-modal", label: "ConfirmationModal", component: HUDConfirmationModalShowcase },
      { id: "heatstream-grid", label: "HeatStreamGrid", component: HeatStreamGridShowcase },
    ],
  },
  {
    label: "Depth 3",
    children: [
      { id: "data-list", label: "DataList", component: DataListShowcase },
      { id: "detail-header", label: "DetailHeader", component: VesselCallHeaderShowcase },
      { id: "result-display", label: "ResultDisplay", component: ResultDisplayShowcase },
      { id: "metric-card", label: "MetricCard", component: MetricCardShowcase },
      { id: "interactive-formula", label: "InteractiveFormula", component: InteractiveFormulaShowcase },
      { id: "engine-data-section", label: "EngineDataSection", component: EngineDataSectionShowcase },
      { id: "formula-panel", label: "FormulaPanel", component: FormulaPanelShowcase },
    ],
  },
  {
    label: "Depth 4",
    children: [
      { id: "result-panel", label: "ResultPanel", component: ResultPanelShowcase },
    ],
  },
  {
    label: "Hopper",
    children: [
      { id: "hopper", label: "All Components", component: HopperShowcase },
    ],
  },
];

const allItems = nav.flatMap((g) => g.children);

const App: Component = () => {
  const [activeTab, setActiveTab] = createSignal("button");
  const openDefaults = Object.fromEntries(nav.map((g) => [g.label, true]));
  const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>(openDefaults);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const navigate = (id: string) => {
    setActiveTab(id);
    const group = nav.find((g) => g.children.some((c) => c.id === id));
    if (group) setOpenGroups((prev) => ({ ...prev, [group.label]: true }));
  };

  return (
    <div class="showcase">
      <nav class="showcase__sidebar">
        <div class="showcase__brand">
          <h1>Solid Components</h1>
          <p>SolidJS Component Library</p>
        </div>
        <For each={nav}>
          {(group) => (
            <div class="nav-group">
              <button class="nav-group__toggle" onClick={() => toggleGroup(group.label)}>
                <span class={`nav-group__chevron ${openGroups()[group.label] ? "nav-group__chevron--open" : ""}`}>&#9654;</span>
                {group.label}
              </button>
              <Show when={openGroups()[group.label]}>
                <div class="nav-group__items">
                  <For each={group.children}>
                    {(item) => (
                      <button
                        class={`nav-item ${activeTab() === item.id ? "nav-item--active" : ""}`}
                        onClick={() => navigate(item.id)}
                      >
                        {item.label}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          )}
        </For>
      </nav>

      <main class="showcase__content">
        <Dynamic
          component={allItems.find((t) => t.id === activeTab())?.component}
          onNavigate={navigate}
        />
      </main>
    </div>
  );
};

render(() => <App />, document.getElementById("root")!);
