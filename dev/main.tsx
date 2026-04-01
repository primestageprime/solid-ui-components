/* @refresh reload */
import { render, Dynamic } from "solid-js/web";
import { createSignal, For, Show, Component, onMount, onCleanup } from "solid-js";
import "../src/styles/global.css";
import "./main.css";
import { ThemeSwitcher } from "./theme-switcher";

// Atomic
import { BaseTableShowcase } from "./showcases/base-table";
import { ButtonShowcase } from "./showcases/button";
import { CellRendererShowcase } from "./showcases/cell-renderers";
import { DagChartShowcase } from "./showcases/dag-chart";
import { DataTableContainerShowcase } from "./showcases/data-table-container";
import { DigitRollerShowcase } from "./showcases/digit-roller";
import { DividerShowcase } from "./showcases/divider";
import { HeatmapShowcase } from "./showcases/heatmap";
import { HeatStreamShowcase } from "./showcases/heatstream";
import { ButtonGroupShowcase } from "./showcases/hud-button-group";
import { ListShowcase } from "./showcases/hud-list";
import { ModalShowcase } from "./showcases/hud-modal";
import { PageShowcase } from "./showcases/hud-page";
import { PanelShowcase } from "./showcases/hud-panel";
import { AccentSectionShowcase } from "./showcases/hud-section";
import { TabsShowcase } from "./showcases/hud-tabs";
import { ToggleShowcase } from "./showcases/hud-toggle";
import { IconShowcase } from "./showcases/icon";
import { InputsShowcase } from "./showcases/inputs";
import { MathFormulaShowcase } from "./showcases/math-formula";
import { NavItemShowcase } from "./showcases/nav-item";
import { ProgressBarShowcase } from "./showcases/progress-bar";
import { SectionShowcase } from "./showcases/section";
import { SidebarSelectorShowcase } from "./showcases/sidebar-selector";
import { StatsTableShowcase } from "./showcases/stats-table";
import { StatusBadgeShowcase } from "./showcases/status-badge";
import { TextShowcase } from "./showcases/text";

// Layout
import { RowShowcase } from "./showcases/row";
import { StackShowcase } from "./showcases/stack";
import { SurfaceShowcase } from "./showcases/surface";

// Depth 2
import { AlertBoxShowcase } from "./showcases/alert-box";
import { DateTimeRangeShowcase } from "./showcases/date-time-range";
import { EmptyStateShowcase } from "./showcases/empty-state";
import { HeatStreamGridShowcase } from "./showcases/heatstream-grid";
import { ConfirmationModalShowcase } from "./showcases/hud-confirmation-modal";
import { NavBarShowcase } from "./showcases/nav-bar";
import { NumberWithUnitsShowcase } from "./showcases/number-with-units";
import { ProgressCardShowcase } from "./showcases/progress-card";
import { QuickFilterShowcase } from "./showcases/quick-filter";
import { SelectableTableShowcase } from "./showcases/selectable-table";
import { VesselCardShowcase } from "./showcases/vessel-card";

// Depth 3
import { DataListShowcase } from "./showcases/data-list";
import { EngineDataSectionShowcase } from "./showcases/engine-data-section";
import { FormulaPanelShowcase } from "./showcases/formula-panel";
import { InteractiveFormulaShowcase } from "./showcases/interactive-formula";
import { MetricCardShowcase } from "./showcases/metric-card";
import { ResultDisplayShowcase } from "./showcases/result-display";
import { VesselCallHeaderShowcase } from "./showcases/vessel-call-header";

// Depth 4
import { ResultPanelShowcase } from "./showcases/result-panel";

// Hopper
import { HopperShowcase } from "./showcases/hopper";

type TabEntry = { id: string; label: string; component: Component };
type TabGroup = { label: string; children: TabEntry[]; defaultOpen?: boolean };

const nav: TabGroup[] = [
  {
    label: "Atomic",
    defaultOpen: true,
    children: [
      { id: "base-table", label: "BaseTable", component: BaseTableShowcase },
      { id: "button", label: "Button", component: ButtonShowcase },
      { id: "hud-button-group", label: "ButtonGroup", component: ButtonGroupShowcase },
      { id: "cell-renderers", label: "CellRenderers", component: CellRendererShowcase },
      { id: "dag-chart", label: "DagChart", component: DagChartShowcase },
      { id: "data-table-container", label: "DataTableContainer", component: DataTableContainerShowcase },
      { id: "digit-roller", label: "DigitRoller", component: DigitRollerShowcase },
      { id: "divider", label: "Divider", component: DividerShowcase },
      { id: "heatmap", label: "Heatmap", component: HeatmapShowcase },
      { id: "heatstream", label: "HeatStream", component: HeatStreamShowcase },
      { id: "icon", label: "Icon", component: IconShowcase },
      { id: "inputs", label: "Inputs", component: InputsShowcase },
      { id: "hud-list", label: "List", component: ListShowcase },
      { id: "math-formula", label: "MathFormula", component: MathFormulaShowcase },
      { id: "hud-modal", label: "Modal", component: ModalShowcase },
      { id: "nav-item", label: "NavItem", component: NavItemShowcase },
      { id: "hud-page", label: "Page", component: PageShowcase },
      { id: "hud-panel", label: "Panel", component: PanelShowcase },
      { id: "progress-bar", label: "ProgressBar", component: ProgressBarShowcase },
      { id: "section", label: "Section", component: SectionShowcase },
      { id: "hud-section", label: "Section (Accent)", component: AccentSectionShowcase },
      { id: "sidebar-selector", label: "SidebarSelector", component: SidebarSelectorShowcase },
      { id: "stats-table", label: "StatsTable", component: StatsTableShowcase },
      { id: "status-badge", label: "StatusBadge", component: StatusBadgeShowcase },
      { id: "hud-tabs", label: "Tabs", component: TabsShowcase },
      { id: "text", label: "Text", component: TextShowcase },
      { id: "toggle", label: "Toggle", component: ToggleShowcase },
    ],
  },
  {
    label: "Layout",
    children: [
      { id: "row", label: "Row", component: RowShowcase },
      { id: "stack", label: "Stack", component: StackShowcase },
      { id: "surface", label: "Surface", component: SurfaceShowcase },
    ],
  },
  {
    label: "Depth 2",
    children: [
      { id: "alert-box", label: "AlertBox", component: AlertBoxShowcase },
      { id: "hud-confirmation-modal", label: "ConfirmationModal", component: ConfirmationModalShowcase },
      { id: "date-time-range", label: "DateTimeRange", component: DateTimeRangeShowcase },
      { id: "empty-state", label: "EmptyState", component: EmptyStateShowcase },
      { id: "heatstream-grid", label: "HeatStreamGrid", component: HeatStreamGridShowcase },
      { id: "nav-bar", label: "NavBar", component: NavBarShowcase },
      { id: "number-with-units", label: "NumberWithUnits", component: NumberWithUnitsShowcase },
      { id: "progress-card", label: "ProgressCard", component: ProgressCardShowcase },
      { id: "quick-filter", label: "QuickFilter", component: QuickFilterShowcase },
      { id: "selectable-table", label: "SelectableTable", component: SelectableTableShowcase },
      { id: "vessel-card", label: "VesselCard", component: VesselCardShowcase },
    ],
  },
  {
    label: "Depth 3",
    children: [
      { id: "data-list", label: "DataList", component: DataListShowcase },
      { id: "detail-header", label: "DetailHeader", component: VesselCallHeaderShowcase },
      { id: "engine-data-section", label: "EngineDataSection", component: EngineDataSectionShowcase },
      { id: "formula-panel", label: "FormulaPanel", component: FormulaPanelShowcase },
      { id: "interactive-formula", label: "InteractiveFormula", component: InteractiveFormulaShowcase },
      { id: "metric-card", label: "MetricCard", component: MetricCardShowcase },
      { id: "result-display", label: "ResultDisplay", component: ResultDisplayShowcase },
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

/** Build a URL-friendly slug from group label: "Depth 2" → "depth-2" */
const slugify = (label: string) => label.toLowerCase().replace(/\s+/g, "-");

/** Map of item id → hash path, e.g. "dag-chart" → "atomic/dag-chart" */
const itemPaths = new Map<string, string>();
for (const group of nav) {
  const groupSlug = slugify(group.label);
  for (const item of group.children) {
    itemPaths.set(item.id, `${groupSlug}/${item.id}`);
  }
}

/** Find item id from a hash path like "atomic/dag-chart" */
const idFromHash = (hash: string): string | null => {
  const path = hash.replace(/^#\/?/, "");
  for (const [id, p] of itemPaths) {
    if (p === path) return id;
  }
  return null;
};

const App: Component = () => {
  const initialId = idFromHash(location.hash) ?? "base-table";
  const [activeTab, setActiveTab] = createSignal(initialId);
  const openDefaults = Object.fromEntries(nav.map((g) => [g.label, true]));
  const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>(openDefaults);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const navigate = (id: string, pushHash = true) => {
    setActiveTab(id);
    const group = nav.find((g) => g.children.some((c) => c.id === id));
    if (group) setOpenGroups((prev) => ({ ...prev, [group.label]: true }));
    if (pushHash) {
      const path = itemPaths.get(id);
      if (path) location.hash = `/${path}`;
    }
  };

  // Sync hash → state on browser back/forward
  onMount(() => {
    const handler = () => {
      const id = idFromHash(location.hash);
      if (id) navigate(id, false);
    };
    window.addEventListener("hashchange", handler);
    onCleanup(() => window.removeEventListener("hashchange", handler));
  });

  // Set initial hash if not already set
  if (!location.hash) {
    const path = itemPaths.get(initialId);
    if (path) location.hash = `/${path}`;
  }

  return (
    <div class="showcase">
      <nav class="showcase__sidebar">
        <div class="showcase__brand">
          <h1>Solid Components</h1>
          <p>SolidJS Component Library</p>
          <ThemeSwitcher />
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
