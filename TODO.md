# solid-ui-components — Visual Component Migration

## DOING

## TODO

### Showcases missing for these components

Add a `dev/showcases/<name>.tsx` and register in `dev/main.tsx`:
- `Cell` (currently only via `cell-renderers.tsx` — low priority since the showcase covers the public surface)

Done in v0.18.0 / v0.19.0: BurndownChart, CompletionTimeline, Dropdown,
Duration, PopoverMenu, ProgressCheck, QuadrantGrid, RingChart,
SprintSelector, StatusLight, TagInput, ThroughputChart, WorkerCard.


### Follow-ups from the 2026-05-15 migration sweep

Surfaced while wrapping up the parallel jtf-ui adoption pass. None block, but each one made an agent reach for an inline override.

- [ ] **Document `SurfaceDataProps` strips overrides** in COMPONENTS.md — passing `padding` / `radius` / `bg` / `borderColor` to a curried `WarningSurface` / `SuccessSurface` (etc.) errors with TS2322. Either widen the data-prop type or add a one-liner to the entry telling callers to trust the curry's defaults.
- [ ] **`SpreadCenterRow` curried variant** — `SpreadRow` strips `align` from `RowDataProps`, so the durability route fell back to raw `<Row align="center" justify="between">`. Either add a curried variant that bakes `align: "center"` in, or relax `RowDataProps` to allow `align` overrides for header rows.
- [ ] **`ComplianceThresholdTable.powerSources[].label` widening** — currently typed `string`, which blocks `NumberWithUnits` adoption inside the label (vessel-detail Nox/Rog still use `.toFixed(0)` for the kW label). Widening to `JSX.Element | string` would unblock it.
- [ ] **ISO-date locale shift in `routes/index.tsx`** — the cached vessel-call table used to render `connected_at` via `toISOString()` (UTC); now uses `<DateCell value={...} format="iso" />` which formats in local time. Cells near midnight UTC may shift one day. If preserving UTC matters, swap to a custom format string with explicit timezone.

### Type-annotate remaining curried variant exports (TS2742 portability)

Button variants (`src/components/Button/variants.ts`) carry explicit `Component<ButtonDataProps>` annotations as of v0.3.1 — without them, `vite-plugin-dts` inlines solid-js type paths through pnpm's ephemeral github-dep build-store temp directory (TS2742 "inferred type cannot be named…"), which strips the declarations from the shipped `.d.ts` and surfaces as TS2305 downstream. Same fix applied:

- [x] **Cell curried variants** (`src/components/Cell/variants.ts`) — KVTable, BorderRow, and 10× `createCell()` exports annotated. Commit `3152ef7`.
- [x] **Layout curried variants** (`src/components/Layout/variants.ts`) — 19 Stack/Row/Box variants annotated. Commit `0c1dba4`.

### Component Adoption in jtf-ui (completed 2026-05-15)

Replaced bespoke inline markup in `jtf-ui/src/` with solid-ui-components via a parallel multi-agent sweep. Most files were already migrated by an upstream `e60f49f` ("Adopt solid-ui-components across jtf-ui: replace bespoke markup in 16 files") pass; the agents finished the remaining seams.

Per-file outcome:

- [x] **violations.tsx** — file removed from the branch; entry retired.
- [x] **unresolved.tsx** — already migrated (e60f49f); BaseTable + EmptyState + AlertBox + SpreadRow in place.
- [x] **ApprovalSection.tsx** — warning/success banners swapped to `WarningSurface` / `SuccessSurface` + `SpreadRow` (`af1401b`). HUDConfirmationModal / ThemedTextarea / AlertBox / Button variants were already in place upstream.
- [x] **StatisticsSummary.tsx** — remaining inline grid container replaced with `Row gap="md" wrap` + `Box grow` (`251c320`). NarrowStack + 3× MetricCard were already in place upstream.
- [x] **MinMaxTable.tsx**, **HourlyDataTable.tsx**, **HourLevelDataTable.tsx** — already on BaseTable + DataTableContainer + FloatCell/IntCell/MinuteDateTimeCell upstream (e60f49f). No-op.
- [x] **PowerLogPanel.tsx** — already on BaseTable + PrimaryButton + FloatCell-via-`withCellStyle` upstream. Editable hourly-entry input table left raw by design. No-op.
- [x] **NoxWidgets.tsx** — 3 remaining `.toFixed()` / `kW` / `%` spots converted to `NumberWithUnits` (`076b154`).
- [x] **RogWidgets.tsx** — file removed from the branch; entry retired.
- [x] **routes/index.tsx** — header → `SpreadRow` + `ClusterRow`; filter buttons → `Button variant="ghost" size="sm" active={…}`; vessel-call table columns → `DateCell` + `StatusBadge` (`6d4a8ae`). HUDToggle + AlertBox already done upstream. See the follow-up note about UTC → local date shift.
- [x] **routes/detail/[id]/index.tsx** — file moved to `src/components/fortnight/vessel-detail/VesselCallOverview.tsx`; migrated there (`3bde59d`).
- [x] **routes/detail/[id]/nox.tsx** — file moved to `src/components/fortnight/vessel-detail/VesselCallNoxDetail.tsx`; already migrated upstream.
- [x] **routes/detail/[id]/rog.tsx** — file moved to `src/components/fortnight/vessel-detail/VesselCallRogDetail.tsx`; already migrated upstream.
- [x] **routes/reports/fortnight/[id].tsx** + **components/fortnight/FortnightReportBody.tsx** — `MetricInput` swapped to `ThemedInput` (load-bearing density overrides flagged inline); compliance-card grid → `Row gap="md" wrap`; hand-rolled `ComplianceDot` swapped to library `Dot` (`98139eb` + `7a05b8e`). Editable per-metric `MissingData` grid intentionally left raw — `BaseTable` cell renderers are read-only.
- [x] **routes/reports/durability.tsx** — header + loading flex containers → `Row` (`c6aa2d2`). Buttons + ThemedInput already done upstream.

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
