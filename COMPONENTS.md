# Component Manifest

SolidJS UI component library. All components accept standard HTML attributes via spread props. Factory functions (`createX`) produce curried variants with baked-in defaults.

**Always prefer a curried variant over configuring a base component.** If no curried variant exists for your use case, propose one upstream rather than repeatedly passing the same props.

---

## Badge
- **StatusBadge** — Colored status pill with 5 compliance-themed variants. Key props: `variant` (`compliant`|`violation`|`warning`|`pending`|`info`), `size` (`sm`|`md`), `label`, `href`. Use for: inline status indicators, compliance badges, optionally as links.

## Button
- **Button** — Multi-variant button with loading spinner. Key props: `variant` (`default`|`primary`|`danger`|`ghost`), `size` (`sm`|`md`|`lg`), `loading`. Use for: all clickable actions. Disables automatically when loading.
- **PrimaryButton / DangerButton / GhostButton / SmallPrimaryButton / SmallDangerButton / SmallGhostButton / LargePrimaryButton** — Pre-configured curried variants via `createButton()`. Use for: avoiding repetitive variant/size props.

## Card
- **VesselCard** — Interactive card displaying a vessel with title, remove button, and details slot. Key props: `title`, `active`, `onRemove`, `details`. Use for: selectable vessel list items.

## Cell
- **Cell** — Table cell primitive (`<td>` or `<th>`) with alignment, color, and weight. Key props: `align`, `color`, `weight`, `as` (`td`|`th`). Use for: building custom table layouts.
- **CellTable** — `<table>` wrapper with optional `<thead>`. Key props: `header`. Use for: wrapping Cell-based rows.
- **CellRow** — `<tr>` wrapper with border and highlight options. Key props: `border`, `highlight`. Use for: rows in CellTable.
- Curried variants exported: `KVTable`, `BorderRow`, `DataTerm`, `DataTermMuted`, `DataValue`, `DataValueHighlight`, `DataValueSuccess`, `DataValuePrimary`, `DataValueMuted`, `DataHeader`, `DataHeaderRight`, `DataHeaderCenter`. Use for: key-value data tables without wiring alignment/weight manually.

## DataDisplay
- **DateTimeRange** — Formats ISO start/end timestamps into a readable range string. Key props: `start`, `end`, `mode` (`date`|`datetime`). Use for: displaying time periods.
- **DigitRoller** — Animated digit-by-digit value transition (slot-machine effect). Key props: `value`, `previousValue`, `animate`, `duration`, `stagger`, `onAnimationEnd`. Use for: animated number reveals in dashboards.
- **MetricCard** — Labeled value card with status color. Key props: `label`, `value`, `units`, `color` (`default`|`success`|`warning`|`danger`). Use for: KPI/metric display tiles.
- **NumberWithUnits** — Monospace value paired with a units label. Key props: `value`, `units`, `precision`, `color`. Use for: any numeric display that needs units.
- **ResultDisplay** — Large value + units row with label, sublabel, and badge slot. Key props: `value`, `units`, `label`, `sublabel`, `badge`, `valueColor`. Use for: primary calculation results.
- **ResultPanel** — Wraps ResultDisplay in a FormulaProvider + NarrowStack. Key props: `label`, `value`, `units`, `sublabel`, `valueColor`, `badge`, `formulaProvider`. Use for: result sections that include formula/variable breakdowns.
- **StatsTable** — Simple typed data table with column definitions. Key props: `columns` (array of `StatsColumn`), `rows`, `getRowClass`, `caption`. Use for: quick statistical summary tables.
- **FormulaDecomposition** — Factory functions for compliance formula panels. Exports: `createFormulaResult`, `createGivens`, `createFormula`, `createFormulaPanel`. Key config: `FormulaConfig` with `vars`, `threshold`, `compute`, `latex`. Use for: interactive formula display with result, givens table, and LaTeX rendering.
- **EngineDataSection** — Heading + warning alert + content slot for engine power data. Key props: `heading`, `showWarning`, `defaultKw`, `auxEngineHref`. Use for: engine power compensation sections.

## DataList
- **DTable** — Compact key-value data table wrapper. Use for: definition-list style data.
- **DTableWithHeader** — Data table with `<thead>` support. Key props: `header`. Use for: multi-column data tables with headers.
- **DRow** — Data table row. Key props: `border`, `highlight`. Use for: rows inside DTable.
- **DT** — Term/label cell. Key props: `muted`. Use for: left-side labels in key-value rows.
- **DD** — Value cell with variant colors. Key props: `highlight`, `success`, `primary`, `muted`, `center`. Use for: right-side values in key-value rows.
- **DH** — Header cell. Key props: `align`. Use for: column headers in DTableWithHeader.
- **DHeader** — Header row wrapper. Use for: wrapping DH cells.
- **Val** — Inline numeric display with precision and fallback. Key props: `value`, `precision`, `fallback`. Use for: formatted numbers in table cells.
- **SigFig** — Inline numeric display with significant figures. Key props: `value`, `figures`, `fallback`. Use for: scientific precision display.
- **Units** — Muted inline units suffix. Use for: appending unit text after values.
- **Badge** — Backwards-compatible wrapper around StatusBadge. Key props: `variant` (`default`|`high`|`success`|`warning`|`error`). Use for: inline badges within data lists.

## Feedback
- **AlertBox** — Status-colored alert with title, description, and action slot. Key props: `variant` (`info`|`warning`|`success`|`danger`), `title`, `description`, `action`. Use for: warnings, errors, success messages, info banners.
- **EmptyState** — Centered placeholder with icon and message. Key props: `variant` (`default`|`muted`|`accent`), `size` (`sm`|`md`|`lg`), `message`, `icon`. Use for: empty lists, no-data states, loading placeholders.
- **InlineChartErrorOverlay** — Absolute-positioned overlay for chart error states. Key props: `title`, `subtitle`. Use for: overlaying error messages on chart areas.

## Heatmap
- **Heatmap** — Grid of status-colored cells (full/partial/missing/empty) with row and column labels. Key props: `rows` (array of `HeatmapRow`), `columnLabels`, `variant` (`default`|`compact`|`sparkline`), `showLegend`, `showTooltips`, `onCellClick`. Use for: data completeness grids, coverage matrices.
- **HeatmapMulti** — Multi-category heatmap where each cell contains stacked status bars per category. Key props: `rows` (array of `HeatmapMultiRow`), `categoryLabels`, `columnLabels`, `variant` (`default`|`compact`|`sparkline`|`expanded`), `showLegend`, `onCellClick`. Use for: multi-dimension data completeness (e.g., vessel call coverage by data type).

## HeatStack
- **HeatStack** — Vertical stack of items with status cells per key (earliest at bottom). Key props: `items` (array of `HeatStackItem`), `keys`, `variant` (`default`|`compact`), `showLegend`, `showLabels`, `onItemClick`. Use for: chronological data completeness stacks with compact hover preview.

## HeatStream
- **HeatStream** — Transposed stream: keys as rows, items as columns (earliest left). Key props: `items` (array of `HeatStreamItem`), `keys`, `variant` (`default`|`compact`), `showLegend`, `showLabels`, `onItemClick`. Use for: horizontal timeline-style data completeness.

## HeatStreamGrid
- **HeatStreamGrid** — Table where each cell contains a compact HeatStream. Key props: `rows`, `columns`, `keys`, `data` (function returning items per row/col), `onCellClick`, `selectionStore`. Use for: asset-by-time-window data completeness matrices with selection support.

## HUD
- **HUDPage** — Full-page container with optional scanline and grid overlays. Key props: `scanLines`, `gridPattern`. Use for: top-level sci-fi themed page wrapper.
- **HUDSection** — Collapsible section with title, subtitle, corner decorations, and header action slot. Key props: `title`, `subtitle`, `corners` (`clip`|`bracket`|`notch`|`round`|`none`), `variant`, `collapsible`, `collapsed`, `onToggleCollapse`, `headerAction`. Use for: major page sections.
- **HUDPanel** — Styled panel with corner brackets, glow effects, and edge accents. Key props: `title`, `corners`, `variant`, `size` (`sm`|`md`|`lg`), `glow` (`none`|`subtle`|`medium`|`strong`), `edgeAccents`. Use for: decorated content containers.
- **HUDModal** — Portal-based modal with overlay, escape-to-close, and footer slot. Key props: `open`, `onClose`, `title`, `subtitle`, `corners`, `variant`, `size` (`sm`|`md`|`lg`|`xl`), `footer`, `showClose`. Use for: dialog windows.
- **HUDConfirmationModal** — Confirmation dialog with Cancel/Confirm footer built on HUDModal. Key props: `open`, `onClose`, `onConfirm`, `title`, `description`, `confirmLabel`, `cancelLabel`, `loading`, `confirmVariant` (`primary`|`danger`). Use for: destructive action confirmations, submit confirmations.
- **HUDTabs** — Tab bar with multiple style variants. Key props: `tabs` (array of `HUDTab`), `activeTab`, `onTabChange`, `variant` (`default`|`underline`|`boxed`|`pill`), `color`. Use for: switching between views/panels.
- **HUDButtonGroup** — Button arrangement container. Key props: `orientation` (`horizontal`|`vertical`), `gap` (`none`|`sm`|`md`|`lg`), `bordered`. Use for: grouping related buttons.
- **HUDButton** — Styled button for use within HUDButtonGroup. Key props: `variant` (`default`|`primary`|`danger`|`ghost`), `active`. Use for: toggle-style button groups.
- **HUDToggle** — Sci-fi toggle switch with multiple visual styles. Key props: `checked`, `onChange`, `label`, `labelPosition`, `variant` (`default`|`power`|`circuit`|`minimal`), `size`, `color`, `disabled`. Use for: on/off toggles in HUD-themed UI.
- **HUDList / HUDListItem** — Styled list with status dots, icons, dividers. HUDList props: `variant` (`default`|`numbered`|`status`|`menu`), `dividers`, `compact`. HUDListItem props: `status`, `icon`, `secondary`, `interactive`, `selected`. Use for: status lists, menus, settings lists.

## Icon
- **Icon** — SVG icon component with 27 named icons across 6 groups (status, navigation, data, time, actions, UI/cache). Key props: `name` (e.g., `check`, `warning`, `chevron-down`, `search`, `spinner`), `variant` (`outline`|`solid`), `size` (`xs`|`sm`|`md`|`lg`|`xl`). Use for: all iconography. Spinner icon auto-animates.

## Inputs
- **ThemedInput** — Styled text input with optional label. Key props: `label`, plus all native `<input>` attributes. Use for: themed form text inputs.
- **ThemedTextarea** — Styled textarea with optional label. Key props: `label`, plus all native `<textarea>` attributes. Use for: themed form textareas.

## Layout
- **Stack** — Flex-column container. Key props: `gap` (`xs`|`sm`|`md`|`lg`|`xl`), `align`, `justify`. Use for: vertical stacking of elements.
- **Row** — Flex-row container. Key props: `gap`, `align`, `justify`, `wrap`. Use for: horizontal arrangement of elements.
- **Box** — Flex child with grow/shrink control. Key props: `grow`, `shrink`. Use for: controlling flex item sizing.
- Curried variants: `TightStack`, `NarrowStack`, `SpacedStack`, `ContentStack`, `CenteredStack`, `SmRegion`, `MdRegion`, `LgRegion`, `SpreadRow`, `ClusterRow`, `ActionSlot`, `FadedBox`, `ConstrainedBox`. Use for: common layout patterns without manual gap/align configuration.

## MathFormula
- **MathFormula** — KaTeX LaTeX renderer with interactive variable highlighting via `\var{id}{content}` syntax. Key props: `latex`, `displayMode`, `class`. Use for: rendering mathematical formulas with hover-linked variables.
- **FormulaProvider** — Context provider enabling hover interactions between MathFormula variables and table rows. Use for: wrapping formula + variable table pairs.
- **FormulaVarRow** — Table `<tr>` that highlights when its corresponding formula variable is hovered. Key props: `varId`. Use for: variable definition rows that link to formula terms.

## Navigation
- **NavLink** — Anchor link with active state, color variants, and optional badge. Key props: `active`, `color` (`accent`|`warning`|`danger`|`success`), `badge`. Use for: navigation menus, sidebar links.
- **Link** — Minimal themed anchor wrapper. Use for: inline text links.
- **NewTabLink** — Link that always opens in a new tab (`target="_blank"`). Use for: external links.

## Progress
- **StackedProgressBar** — Multi-segment progress bar. Key props: `segments` (array of `{percentage, color}`), `direction` (`horizontal`|`vertical`), `label`, `background`. Use for: multi-category progress visualization, stacked bar charts.

## ProgressCard
- **ProgressCard** — Step-based progress indicator with icons and connectors. Key props: `title`, `subtitle`, `steps` (array of `ProgressStep` with `id`, `label`, `status`, `icon`), `message`. Use for: multi-step workflow status display.
- **createWorkflowProgressCard** — Factory that derives step statuses from `currentStep` + `status`. Returns a component with props: `title`, `subtitle`, `currentStep`, `status` (`fetching`|`caching`|`completed`|`error`), `message`. Use for: automated workflow progress tracking.
- **CacheProgressCard** — Pre-built 5-step cache workflow progress card (Minutes, Hours, Stats, Coverage, Calcs). Use for: data caching pipeline status.

## Section
- **Section** — Content section with header, subtitle, and action slot. Key props: `title`, `subtitle`, `variant` (`default`|`bordered`|`decorated`), `fill`, `headerAction`. Use for: page content sections with optional corner decorations.
- **Panel** — Simple titled container with padding control. Key props: `title`, `padding` (`none`|`sm`|`md`|`lg`). Use for: lightweight content grouping.
- **Divider** — Content separator line. Key props: `orientation` (`horizontal`|`vertical`), `variant` (`solid`|`dashed`|`dotted`), `spacing` (`sm`|`md`|`lg`). Use for: visual separation between content blocks.

## Selector
- **SidebarSelector** — Sidebar card list with selection content area (generic). Key props: `items`, `selectedId`, `onSelect`, `renderCard`, `renderSelection`, `sidebarWidth`, `maxHeight`, `label`. Use for: master-detail selection patterns, sidebar navigation with preview pane.

## Surface
- **Surface** — Themed container primitive with padding, radius, background, and border control. Key props: `padding` (`none`|`sm`|`md`|`lg`), `radius` (`none`|`sm`|`md`|`lg`), `bg`, `borderColor`, `interactive`, `active`. Use for: base container for cards, panels, and interactive areas.
- Curried variants: `CardSurface`, `CompactSurface`, `InteractiveCard`, `InfoSurface`, `WarningSurface`, `SuccessSurface`, `DangerSurface`. Use for: pre-themed containers for specific contexts (alerts, cards, status surfaces).

## Table
- **BaseTable** — Sortable data table with sticky header, striped rows, column groups (colspan). Key props: `data`, `columns` (array of `TableColumn`), `maxHeight`, `fill`, `stickyHeader`, `striped`, `hoverable`, `compact`, `getRowClass`, `onRowClick`, `emptyMessage`. Use for: standard sortable data tables.
- **GroupedTable** — Table with rowspan grouping for merged cells. Key props: `rows` (array of `GroupedRow`), `columns` (array of `RowspanColumn` with `rowspan` flag), `maxHeight`, `compact`. Use for: tables where rows share common group fields (e.g., vessel calls with multiple trains).
- **SelectableTable** — Table with checkbox selection and action bar. Key props: `data`, `columns`, `getRowId`, `selectionStore`, `selectionActions`. Use for: batch operations on table rows.
- **QuickFilter** — Filter input + BaseTable passthrough. Key props: all BaseTable props + `filterPlaceholder`. Use for: adding text search to any BaseTable.
- **DataTableContainer** — Scrollable container wrapper. Key props: `maxHeight`, `fill`. Use for: constraining table height with scroll.
- **createSelectionStore / fromSignal** — Utilities to create or wrap selection state (`SelectionStore<Id>`). Use for: managing checkbox selection state, optionally backed by persistent storage.
- **Column helpers**: `floatCol`, `intCol`, `dateTimeCol`, `dateCol`, `textCol` + curried factories (`floatColWith`, `intColWith`, etc.). Use for: declarative column definitions with built-in cell renderers.
- **Cell renderers**: `IdCell`, `StringCell`, `TagCell`, `MoneyCell`, `DateCell`, `DateTimeCell`, `MinuteDateTimeCell`, `DurationCell`, `StatusCell`, `CheckboxCell`, `FloatCell`, `IntCell`, `MetricValueCell`, `LongTextCell`. Use for: typed cell formatting in tables. Compose with `withCellStyle` or `withValueColor` for styled/conditional-color variants.

## Text
- **Text** — Polymorphic text element with variant and color. Key props: `variant` (`value`|`label`|`title`|`body`|`units`|`sublabel`), `color`, `as` (`span`|`p`|`h1`..`h4`|`div`). Use for: all themed text rendering.
- Curried variants (always prefer these over configuring `Text` directly):
  - **TextValue** — `variant="value"`. Use for: data values, readouts.
  - **TextLabel** — `variant="label"`. Use for: field labels, captions.
  - **TextTitle** — `variant="title"`. Use for: section/panel titles (renders `<span>`).
  - **PageTitle** — `variant="title"`, `as="h1"`. Use for: top-level page headings.
  - **TextBody** — `variant="body"`. Use for: paragraph text, descriptions.
  - **TextUnits** — `variant="units"`. Use for: unit labels next to values.
  - **TextSublabel** — `variant="sublabel"`. Use for: secondary labels, footnotes.
  - **MonoValue** — Monospace value text. Use for: numeric readouts alongside units.
  - **NowrapBody** — Body text that never wraps. Use for: inline formatted values.
  - **MutedBody** — Dim body text. Use for: secondary descriptions, hints.
  - **AccentBody** — Cyan-accented body text. Use for: highlighted descriptions.
  - **FlexLabel** — Label that grows to fill available space. Use for: label + value rows.
  - **InlineUnits** — Inherits parent font-size, muted. Use for: appending units inline.
  - **InfoTitle / WarningTitle / SuccessTitle / DangerTitle** — Status-colored titles. Use for: section headings with semantic color.

## Toggle
- **Toggle** — Checkbox toggle switch with label positioning. Key props: `size` (`sm`|`md`|`lg`), `label`, `labelPosition` (`left`|`right`), plus all native checkbox attributes. Use for: boolean on/off controls in standard (non-HUD) UI.

## VesselCallHeader
- **VesselCallHeader** — Vessel name + time range + duration + badge display. Key props: `vesselName`, `connectedAt`, `disconnectedAt`, `assetId`, `badge`, `action`, `href`. Use for: vessel call detail page headers, vessel call list item titles.
