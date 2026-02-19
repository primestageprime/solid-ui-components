# solid-ui-components — Visual Component Migration

## DOING

## TODO

### Component Adoption in jtf-ui

Replace bespoke inline markup in `jtf-ui/src/` with solid-ui-components. Tasks are organized by file for parallel execution. Each task is independent — no cross-task dependencies.

**Rules:**
- Import from `solid-ui-components` (never direct paths)
- Preserve all existing behavior — visual parity, no functional changes
- Run `npx tsc --noEmit` after each file to catch regressions
- Commit per-task so changes are reviewable

#### Violations & Unresolved Tables (2 files, ~300 lines)

- [ ] **violations.tsx** — Replace `<table class="data-table">` (L76-134) with BaseTable + column definitions using DateCell, MetricValueCell, StringCell. Replace bespoke empty state (L64-68) with EmptyState variant="no-data". Replace header `<div style={{ display: flex }}>` (L49-56) with SpreadRow.
- [ ] **unresolved.tsx** — Same table pattern as violations (L88-146) → BaseTable. Replace bespoke "All Clear" empty state (L62-82) with EmptyState variant="empty" + custom icon. Replace warning info box (L148-159) with AlertBox variant="warning". Replace header flex (L34-50) with SpreadRow.

#### ApprovalSection Overhaul (1 file, 290 lines)

- [ ] **ApprovalSection.tsx** — Replace HUDModal+manual footer buttons (L201-244) with HUDConfirmationModal (onConfirm/onClose/loading). Replace raw `<textarea>` (L269-284) with ThemedTextarea. Replace 4 inline `<button>` elements (L129, L178, L211, L226) with Button/GhostButton/PrimaryButton variants. Replace pending-approval banner (L112-143) with WarningSurface + SpreadRow + TextLabel. Replace approved banner (L146-194) with SuccessSurface. Replace error box (L248-257) with AlertBox variant="danger".

#### Summary Cards → MetricCard (1 file, 139 lines)

- [ ] **StatisticsSummary.tsx** — Replace 3 identical inline summary cards (L62-102: "Missing Metrics", "Total Violations", "Assets w/ Violations") with MetricCard component using color props (warning/danger/success based on value). Replace outer `<div style={{ display: flex, flex-direction: column }}>` (L51) with NarrowStack. Replace grid container (L61) with Row or CSS grid class.

#### Small Table Components → BaseTable (3 files, ~260 lines)

- [ ] **MinMaxTable.tsx** — Replace hand-rolled `<table class="data-table">` (L14-57) with BaseTable. Define columns for metric, type (MIN/MAX with color), value (FloatCell), timestamp (DateTimeCell). Keeps DataTableContainer wrapper.
- [ ] **HourlyDataTable.tsx** — Replace hand-rolled table (L53-78) with BaseTable. Dynamic columns from minute-level pivot data. Use FloatCell for numeric values.
- [ ] **HourLevelDataTable.tsx** — Replace hand-rolled table (L35-87) with BaseTable. Use FloatCell/IntCell for metrics, DateTimeCell for timestamps.

#### PowerLogPanel Inputs & Buttons (1 file, 721 lines)

- [ ] **PowerLogPanel.tsx** — Replace raw `<button>` elements (L605, L640, L655) with PrimaryButton/DangerButton/GhostButton. Replace hand-rolled data tables (L371-428 engine selector table, L513-550 records table, L679-730 confirmation table) with BaseTable where feasible (some are editable — may need to keep raw inputs inside cells). Replace manual `.toFixed()` calls (L399, L495, L554, L706) with FloatCell in table contexts. Note: editable input cells may stay raw — focus on display tables and buttons.

#### NoxWidgets & RogWidgets Number Formatting (2 files, ~660 lines)

- [ ] **NoxWidgets.tsx** — Replace `toFixed()`/`toPrecision()` calls in hand-rolled tables (L308-350 correction factors table, L393-448 raw data table) with BaseTable + FloatCell. Replace manual number formatting in DTable entries (L74, L89, L92, L95, L98) with NumberWithUnits where displaying value+unit pairs. Leave MathFormula/FormulaVarRow usage as-is (already adopted).
- [ ] **RogWidgets.tsx** — Replace `.toFixed()`/`.toPrecision()` (L59, L93) with FloatCell or NumberWithUnits in DTable entries. Small file, quick win.

#### Main Grid Page Buttons & Layout (1 file, 1385 lines)

- [ ] **routes/index.tsx** — Replace inline toggle switches (L908-974: forceRecache/forceRawPull toggles built with raw divs) with HUDToggle component. Replace raw filter `<button>` elements (L1265-1293) with Button variant="ghost" with active state styling. Replace bespoke error/retry box (L1008-1032) with AlertBox variant="danger" + action slot. Replace hand-rolled vessel call table (L1296-1330) columns that use manual formatting with CellRenderer equivalents (DateCell, StatusBadge). Replace inline flex containers in header area with SpreadRow/ClusterRow.

#### Detail Page Layout & Numbers (1 file, 1177 lines)

- [ ] **routes/detail/[id]/index.tsx** — Replace manual `.toFixed()` / `.toLocaleString()` calls (L163, L183, L189, L195, L201, L207, L213, L509, L512, L520, L523, L526, L529) with NumberWithUnits or FloatCell in DTable entries. Replace inline summary card patterns with MetricCard where applicable. Replace hand-rolled overview table (L485-540) with BaseTable.

#### Report Pages (2 files, ~1880 lines)

- [ ] **routes/reports/fortnight/[id].tsx** — Replace hand-rolled report tables with BaseTable where data is tabular. Replace raw `<button>` (L735) with Button. Replace `<input>` (L538) with ThemedInput. Replace `.toFixed()`/`.toPrecision()`/`.toLocaleString()` (L837, L929, L937, L939, L492) with FloatCell/NumberWithUnits. Replace inline flex containers (L435, L609, L809, L977, L1047) with Stack/Row variants. Large file — focus on highest-impact tables and buttons first.
- [ ] **routes/reports/durability.tsx** — Replace raw `<button>` elements (L283, L288, L301, L306) with Button variants. Replace `<input>` (L325) with ThemedInput. Replace inline flex containers with Stack/Row.

#### Calculation Deep-Dive Pages (2 files, ~1590 lines)

- [ ] **routes/detail/[id]/nox.tsx** — Replace hand-rolled data tables (L618-675) with BaseTable + FloatCell. Replace `.toFixed()` calls (L637-689, L758-760) with NumberWithUnits in DTable contexts. Replace inline flex layout containers (L571-587, L802-808) with SpreadRow/NarrowStack.
- [ ] **routes/detail/[id]/rog.tsx** — Replace hand-rolled tables (L551-584 correction factors, L618-657 raw data) with BaseTable + FloatCell. Replace `.toFixed()` calls (L568, L575, L582, L665-667) with NumberWithUnits. Replace inline flex containers (L504-520, L700-706) with SpreadRow/NarrowStack.

### Existing Components to Curry (completed)

- [x] **BaseTable curried variants** — CompactTable, StripedTable, StickyTable, DataTable — Table/variants.ts
- [x] **HUDPanel curried variants** — InfoPanel, AccentPanel, DangerPanel, WarningPanel, SuccessPanel, CompactPanel, DecoratedPanel — HUD/variants.ts
- [x] **Section curried variants** — CollapsibleSection, DecoratedSection, BorderedSection, CompactJTFPanel, SpaciousPanel — Section/variants.ts
- [x] **Button curried variants** — PrimaryButton, DangerButton, GhostButton, SmallPrimaryButton, SmallDangerButton, SmallGhostButton, LargePrimaryButton — Button/variants.ts

## DONE

#### Skipped / Consolidated

- [x] **HourlyEntryRow** — Already done: refactored into PowerLogPanel; too domain-specific for shared library
- [x] **MinuteLevelCard** — Already done: VesselCard + SparklinePixel CSS already extracted; JTFVesselCallHeatmap is domain-specific
- [x] **DurationDisplay** — Consolidated to formatConnectionDuration() in jtf-ui/src/utils/dateUtils.ts
- [x] **HighFlowBadge** — Replaced by StatusBadge compliant/sm variant — no new component needed
- [x] **ViolationBadge** — Replaced by StatusBadge with borders added to all variants — Badge/StatusBadge.css

#### Atomic (Depth 1)

- [x] **StatusBadge** — Compliance/status badge with color-coded background — Badge/StatusBadge
- [x] **CellRenderers** — 15 cell formatters + withCellStyle/withValueColor factories — Table/CellRenderers
- [x] **DataTableContainer** — Scrollable wrapper with max-height, fill, sticky utilities — Table/DataTableContainer
- [x] **HUDPage** — Page shell with grid pattern + scan lines — HUD/HUDPage
- [x] **HUDToggle** — Toggle with 4 variants (default/power/circuit/minimal), sizes, colors — HUD/HUDToggle
- [x] **MathFormula** — KaTeX renderer with interactive variable highlighting — MathFormula/MathFormula
- [x] **MetricCard** — label + value + color variants (default/success/warning/danger) — DataDisplay/MetricCard
- [x] **AlertBox / StatusBox** — Colored border box with icon + content + action slot — Feedback/AlertBox
- [x] **EmptyState** — Centered flex container with loading/empty/no-data message — Feedback/EmptyState
- [x] **NavLink** — Active-state nav link with indicator border — Navigation/NavLink
- [x] **ThemedTextarea** — HUD-styled textarea input — Inputs/ThemedTextarea
- [x] **ThemedInput** — HUD-styled text input — Inputs/ThemedInput
- [x] **StatsTable** — Period statistics table with styled headers — DataDisplay/StatsTable
- [x] **StackedProgressBar** — Stacked colored fill bar with horizontal/vertical direction — Progress/StackedProgressBar
- [x] **SparklinePixel** — CSS classes (.sparkline-pixel, .sparkline-pixel-column) for inline heatmap sparklines — Heatmap/Heatmap.css
- [x] **InlineChartErrorOverlay** — Absolute-positioned centered "No Data Available" overlay — Feedback/InlineChartErrorOverlay
- [x] **MetricValueCell** — Compliance-colored toPrecision(4) number display — Table/CellRenderers
- [x] **MetricStatusCell** — CSS class (.cell-metric-status) for uppercase status text with dynamic color — Table/CellRenderers.css
- [x] **StickyRowCell** — CSS classes (.sticky-row-cell, .sticky-row-header) for sticky left columns — Table/DataTableContainer.css
- [x] **StickyTableHeader** — CSS class for sticky thead with dark bg, z-index — Table/DataTableContainer.css
- [x] **Fill prop** — `fill` boolean on Section, BaseTable, DataTableContainer for viewport-locked flex chains
- [x] **ComplianceThresholdTable** — CE × Engine Power grid table with dynamic columns — jtf-ui/src/components/ComplianceThresholdTable
- [x] **HUDPanel** — Atomic (owns HUD.css). Title + decorative corners + glow + content — HUD/HUDPanel
- [x] **HUDTabs** — Atomic (owns HUD.css). Tab bar with underline/boxed/pill variants — HUD/HUDTabs
- [x] **HUDButtonGroup + HUDButton** — Atomic (owns HUD.css). Button arrangement with gap variants — HUD/HUDButtonGroup
- [x] **HUDList + HUDListItem** — Atomic (owns HUD.css). Status/menu list with dividers — HUD/HUDList
- [x] **ProgressCard** — Atomic (owns ProgressCard.css). Step icons with title, subtitle, message — ProgressCard/ProgressCard
- [x] **BaseTable** — Atomic (owns Table.css). Sortable table with sticky header, striped rows — Table/BaseTable
- [x] **Heatmap + HeatmapMulti** — Atomic (owns Heatmap.css). Grid cells with status colors, legends, tooltips — Heatmap/Heatmap
- [x] **SidebarSelector** — Atomic (owns SidebarSelector.css). Sidebar card list + content area — Selector/SidebarSelector

#### Depth 2 (compose Atomic, zero CSS)

- [x] **NumberWithUnits** — monospace number + sans-serif units, precision + color props — DataDisplay/NumberWithUnits
- [x] **ResultDisplay** — Large value + units + status badge row — DataDisplay/ResultDisplay
- [x] **NoxResultPanel** — Extract layout shell (ResultPanel), keep domain logic curried — DataDisplay/ResultPanel
- [x] **RogResultPanel** — Refactored to use ResultPanel layout shell — DataDisplay/ResultPanel
- [x] **VesselCard showcase** — Depth 2 showcase, zero CSS, composed from InteractiveCard + SpreadRow + TextLabel + Button
- [x] **StatsTable showcase** — Depth 2 showcase with typed columns, row variants, NumberWithUnits cell accessors
- [x] **QuickFilter** — Depth 2 (zero CSS). Composes BaseTable (Atomic). Filter input + table — Table/QuickFilter
- [x] **SelectableTable** — Depth 2 (zero CSS removed). Composes Button (Atomic). Table + checkbox + action bar — Table/SelectableTable
- [x] **HUDConfirmationModal** — Depth 2 (zero CSS). Composes HUDModal (Atomic) + Button (Atomic). Confirmation dialog with Cancel/Confirm footer — HUD/HUDConfirmationModal

#### Depth 3 (contains Depth 2 components, zero CSS)

- [x] **DataList showcase** — contains Depth 2 sub-components (DTable, DD, Badge), added NumberWithUnits examples
- [x] **EngineDataSection** — Depth 3 (zero CSS). Composes AlertBox (D2) + NumberWithUnits (D2) + Text/Layout variants — DataDisplay/EngineDataSection
- [x] **createFormulaPanel** — Depth 3 (zero CSS). Factory producing composed panels using ResultDisplay (D3), DTable (D2), MathFormula (Atomic), StatusBadge (Atomic) — DataDisplay/FormulaDecomposition

#### Depth 4 (contains Depth 3 components, zero CSS)

- [x] **ResultPanel** — Depth 4 (zero CSS). Composes ResultDisplay (D3) + FormulaProvider (Atomic) — DataDisplay/ResultPanel

## HOPPER
