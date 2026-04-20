# Component Manifest

SolidJS UI component library. All components accept standard HTML attributes via spread props. Factory functions (`createX`) produce curried variants with baked-in defaults.

**Always prefer a curried variant over configuring a base component.** If no curried variant exists for your use case, propose one upstream rather than repeatedly passing the same props.

## Theming

Components use `--sui-*` CSS custom properties for all colors, spacing, and visual tokens. The library ships two built-in themes:

- **`themes/default.css`** — Clean, neutral theme suitable for standard business applications.
- **`themes/hud.css`** — Sci-fi / heads-up-display theme with glow effects, scan lines, and angular decorations.

Import one theme in your app entry point:

```ts
import "solid-ui-components/themes/hud.css";
```

To create a custom theme, define `--sui-*` variables in a CSS file and import it instead. See the built-in themes for the full list of available tokens.

**Shared types** exported from the library root:

- `ColorVariant` — `"default" | "primary" | "danger" | "warning" | "success"`
- `CornerStyle` — `"clip" | "bracket" | "notch" | "round" | "none"`

---

## Badge
- **StatusBadge** — Colored status pill with 5 compliance-themed variants. Key props: `variant` (`compliant`|`violation`|`warning`|`pending`|`info`), `size` (`sm`|`md`), `label`, `href`. Use for: inline status indicators, compliance badges, optionally as links.

## Button
- **Button** — Multi-variant button with loading spinner. Key props: `variant` (9 values, see below), `size` (`sm`|`md`|`lg`), `loading`, `active`. Use for: all clickable actions. Disables automatically when loading. The `active` prop applies a selected/pressed visual state (useful in ButtonGroup toggle patterns).
  - Variants:
    - `default` — neutral action; elevated background, bordered
    - `primary` — filled accent; the main call-to-action
    - `secondary` — neutral/supporting filled action (grey palette); pair with `primary`
    - `danger` — destructive action; red-themed, outlined
    - `warning` — amber-informational action (NOT destructive); distinct from `danger` in both hue (amber vs red) and intent (attention/caution vs destruction)
    - `ghost` — transparent until hover; for low-emphasis chrome actions
    - `outlined` — transparent fill with accent border + text; mid-emphasis
    - `text` — link-like; no border, no fill, accent text only
    - `icon-only` — 1.4rem square, accent-colored glyph, no border or fill; pair with an icon child
- **PrimaryButton / SecondaryButton / DangerButton / WarningButton / GhostButton / OutlinedButton / TextButton / IconOnlyButton / SmallPrimaryButton / SmallDangerButton / SmallGhostButton / LargePrimaryButton** — Pre-configured curried variants via `createButton()`. Use for: avoiding repetitive variant/size props. Note: these exports carry explicit `Component<ButtonDataProps>` annotations in `variants.ts` for pnpm/github-dep portability — without the annotation, `vite-plugin-dts` can inline solid-js paths through pnpm's ephemeral build-store temp dir (TS2742), stripping the declarations from the shipped `.d.ts` and producing TS2305 downstream. Same pattern should be applied to Cell and Layout curried variants when they're first consumed downstream (see TODO.md).

## ButtonGroup
- **ButtonGroup** — Button arrangement container. Key props: `orientation` (`horizontal`|`vertical`), `gap` (`none`|`sm`|`md`|`lg`), `bordered`. Use for: grouping related buttons, toggle-style button groups (use Button's `active` prop for selection state).

## Card
- **VesselCard** — Interactive card displaying a vessel with title, remove button, and details slot. Key props: `title`, `active`, `onRemove`, `details`. Use for: selectable vessel list items.

## DagChart
- **DagChart** — SVG directed acyclic graph with dagre-computed layout. Key props: `nodes` (array of `DagNode` with `id`, `label`, `status` (`ColorVariant`), optional `metadata`, optional `sublabel`, optional `avatar`), `edges` (array of `DagEdge` with `source`/`target`), `onNodeClick`, `direction` (`TB`|`LR`), `height`. Nodes render as rounded rects colored by status. When `avatar` is provided, a circular 20px image renders left-aligned inside the node and the label shifts right. When `sublabel` is provided, muted smaller text renders below the label. Edges are directed paths with arrowheads. SVG auto-sizes viewBox to fit all content. Uses `--sui-*` CSS variables. Exported types: `DagNode`, `DagEdge`, `DagChartProps`. Use for: task dependency graphs, workflow DAGs, pipeline visualization.

## Cell
- **Cell** — Table cell primitive (`<td>` or `<th>`) with alignment, color, and weight. Key props: `align`, `color`, `weight`, `as` (`td`|`th`). Use for: building custom table layouts.
- **CellTable** — `<table>` wrapper with optional `<thead>`. Key props: `header`. Use for: wrapping Cell-based rows.
- **CellRow** — `<tr>` wrapper with border and highlight options. Key props: `border`, `highlight`. Use for: rows in CellTable.
- Curried variants exported: `KVTable`, `BorderRow`, `DataTerm`, `DataTermMuted`, `DataValue`, `DataValueHighlight`, `DataValueSuccess`, `DataValuePrimary`, `DataValueMuted`, `DataHeader`, `DataHeaderRight`, `DataHeaderCenter`. Use for: key-value data tables without wiring alignment/weight manually.

## Combobox
- **Combobox** — Unified single- and multi-combobox built on `@kobalte/core/combobox`. The `multiple?` literal narrows `value`/`onChange`: `false`/absent → `ComboboxOption | null`; `true` → `ComboboxOption[]`. Key props: `options` (`Accessor<ComboboxOption[]>`), `value`, `onChange`, `placeholder`, `disabled`, `id`, `onInputChange`, `onCreate` (fires on Enter when input doesn't match an existing option — parent appends to `options`), plus (multi-only) `onRemove`, `showChips` (default `true`). Any other kobalte `ComboboxRootProps` field (e.g., `placement`, `gutter`, `open`/`defaultOpen`, `onOpenChange`, `defaultFilter`) is forwarded via spread. Exported types: `ComboboxProps`, `ComboboxOption`, `SingleComboboxProps`, `MultiComboboxProps`. Uses `--sui-bg-elevated`, `--sui-bg-primary`, `--sui-border`, `--sui-border-bright`, `--sui-accent`, `--sui-accent-rgb`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-danger`, `--sui-danger-rgb`, `--sui-radius-sm`, `--sui-font-family` theme tokens. Use for: searchable selects, tag editors, freeform "pick-or-create" inputs.
  - API divergence from downstream: single-site `onCreateNew` is renamed to `onCreate` (aligned with the multi-site contract).
  - Example:
    ```tsx
    import { Combobox, type ComboboxOption } from "solid-ui-components";

    // Single with create-on-Enter
    <Combobox
      options={countries}
      value={country}
      onChange={setCountry}
      onCreate={(label) => addCountry({ value: slug(label), label })}
    />

    // Multi with chips
    <Combobox
      multiple
      options={tags}
      value={selectedTags}
      onChange={setSelectedTags}
      onCreate={(label) => addTag({ value: slug(label), label })}
      onRemove={(opt) => console.log("removed", opt)}
    />
    ```

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

## Divider
- **Divider** — Content separator line (own component directory). Key props: `orientation` (`horizontal`|`vertical`), `variant` (`solid`|`dashed`|`dotted`), `spacing` (`sm`|`md`|`lg`). Use for: visual separation between content blocks.

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

## Icon
- **Icon** — SVG icon component with 27 named icons across 6 groups (status, navigation, data, time, actions, UI/cache). Key props: `name` (e.g., `check`, `warning`, `chevron-down`, `search`, `spinner`), `variant` (`outline`|`solid`), `size` (`xs`|`sm`|`md`|`lg`|`xl`). Use for: all iconography. Spinner icon auto-animates.

## Inputs
- **ThemedInput** — Styled text input with optional label. Key props: `label`, plus all native `<input>` attributes. Use for: themed form text inputs.
- **ThemedNumberInput** — Themed numeric field built on `@kobalte/core/number-field` with stacked increment/decrement triggers. Key props: `value` (`Accessor<number | undefined>`), `onChange` (`(value: number | undefined) => void`), `name`, `label`, `description`, `errorMessage`, `min`, `max`, `step` (default `1`). Friendly names `min`/`max` map to kobalte's `minValue`/`maxValue`; any other `NumberFieldRootProps` (e.g. `disabled`, `required`, `format`, `formatOptions`, `changeOnWheel`) is forwarded via spread. When `errorMessage` is set, the field renders in invalid state and suppresses the description. Kobalte emits `NaN` on clear — normalized to `undefined` before `onChange`. Uses `--sui-bg-secondary`, `--sui-border`, `--sui-border-focus`, `--sui-accent`, `--sui-accent-rgb`, `--sui-danger`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-radius-sm`, `--sui-font-family` theme tokens. Use for: numeric form fields (RPM, counts, thresholds, bounded parameters).
  - Example:
    ```tsx
    import { ThemedNumberInput } from "solid-ui-components";
    import { createSignal } from "solid-js";

    const [rpm, setRpm] = createSignal<number | undefined>(undefined);

    <ThemedNumberInput
      name="rpm"
      label="Engine RPM"
      description="Target steady-state RPM."
      value={rpm}
      onChange={setRpm}
      min={0}
      max={10000}
      step={50}
    />
    ```
- **ThemedTextarea** — Styled textarea with optional label. Key props: `label`, plus all native `<textarea>` attributes. Use for: themed form textareas.

## Layout
- **Stack** — Flex-column container. Key props: `gap` (`xs`|`sm`|`md`|`lg`|`xl`), `align`, `justify`. Use for: vertical stacking of elements.
- **Row** — Flex-row container. Key props: `gap`, `align`, `justify`, `wrap`. Use for: horizontal arrangement of elements.
- **Box** — Flex child with grow/shrink control. Key props: `grow`, `shrink`. Use for: controlling flex item sizing.
- **ResizableContainer** — Container with draggable edge handles for manual resize. Key props: `directions` (array of `"top"`|`"right"`|`"bottom"`|`"left"`, default `["right", "bottom"]`), `minWidth`/`maxWidth`/`initialWidth`, `minHeight`/`maxHeight`/`initialHeight`, `onResize` (called with `{ width, height }` during drag), `gridMode` (skip inline width/height when parent grid controls sizing), `externalWidth` (accessor that syncs internal width from an external source). Exports `ResizeDirection` and `ResizeDimensions` types. Use for: side panels, resizable columns, draggable split views. Uses `--sui-accent-rgb` for handle hover color. Note: the `onResize` callback intentionally uses the `{ width, height }` object shape rather than positional `(width, height)` arguments — this is the upstream-canonical signature; downstream callers using the legacy positional form must adapt.
- Curried variants: `TightStack`, `NarrowStack`, `SpacedStack`, `ContentStack`, `CenteredStack`, `SmRegion`, `MdRegion`, `LgRegion`, `SpreadRow`, `ClusterRow`, `ActionSlot`, `FadedBox`, `ConstrainedBox`. Use for: common layout patterns without manual gap/align configuration.

## List
- **List** — Styled list with status dots, icons, dividers. Key props: `variant` (`default`|`status`|`menu`), `dividers`, `compact`. Note: `numbered` variant has been removed. Use for: status lists, menus, settings lists.
- **ListItem** — List item with status indicators and interactive states. Key props: `status` (`active`|`inactive`|`warning`|`error`|`success`), `icon`, `secondary`, `interactive`, `selected`. Use for: items within List.

## MathFormula
- **MathFormula** — KaTeX LaTeX renderer with interactive variable highlighting via `\var{id}{content}` syntax. Key props: `latex`, `displayMode`, `class`. Use for: rendering mathematical formulas with hover-linked variables.
- **FormulaProvider** — Context provider enabling hover interactions between MathFormula variables and table rows. Use for: wrapping formula + variable table pairs.
- **FormulaVarRow** — Table `<tr>` that highlights when its corresponding formula variable is hovered. Key props: `varId`. Use for: variable definition rows that link to formula terms.

## Modal
- **Modal** — Portal-based modal with overlay, escape-to-close, and footer slot. Key props: `open`, `onClose`, `title`, `subtitle`, `corners` (`CornerStyle`), `variant` (`ColorVariant`), `size` (`sm`|`md`|`lg`|`xl`), `showClose`, `footer`. Use for: dialog windows.

## ConfirmationModal
- **ConfirmationModal** — Confirmation dialog with Cancel/Confirm footer built on Modal. Key props: `open`, `onClose`, `onConfirm`, `title`, `subtitle`, `description`, `size`, `corners`, `variant`, `confirmLabel`, `loadingLabel`, `cancelLabel`, `loading`, `confirmVariant` (`primary`|`danger`). Use for: destructive action confirmations, submit confirmations.

## Navigation
- **NavLink** — Anchor link with active state, color variants, and optional badge. Key props: `active`, `color` (`accent`|`warning`|`danger`|`success`), `badge`. Use for: navigation menus, sidebar links.
- **Link** — Minimal themed anchor wrapper. Use for: inline text links.
- **NewTabLink** — Link that always opens in a new tab (`target="_blank"`). Use for: external links.

## Page
- **Page** — Full-page container with optional scanline and grid overlays. Key props: `scanLines`, `gridPattern`. Use for: top-level page wrapper. Scanline and grid effects are theme-dependent.

## Panel
- **Panel** — Styled container with corner decorations, glow effects, and edge accents. Key props: `title`, `corners` (`CornerStyle`), `variant` (`ColorVariant`), `size` (`none`|`sm`|`md`|`lg` — replaces old `padding` prop), `glow` (`none`|`subtle`|`medium`|`strong`), `edgeAccents`. Has `createPanel` factory for curried variants. Use for: decorated content containers.
- **InfoPanel** — Default color, subtle glow, clipped corners.
- **AccentPanel** — Primary color, medium glow, bracket corners.
- **DangerPanel** — Danger color, strong glow, clipped corners.
- **WarningPanel** — Warning color, subtle glow, clipped corners.
- **SuccessPanel** — Success color, subtle glow, clipped corners.
- **CompactPanel** — Small size, no glow, clipped corners.
- **DecoratedPanel** — Bracket corners with edge accents and medium glow.
- **SimplePanel** — Small size, no decorations. (Formerly CompactJTFPanel.)
- **SpaciousPanel** — Large size.

## PopoverMenu
- **PopoverMenu** — Trigger button with positioned action dropdown. Key props: `trigger` (JSX content for the trigger button), `items` (array of `PopoverMenuItem` with `id`, `label`, optional `icon`), `onSelect` (callback with item `id`), `align` (`left`|`right`), `size` (`sm`|`md`). Internals: GhostButton trigger with chevron-down caret, List with `variant="menu"` for items. Closes on click-outside and Escape. Use for: action menus, user menus, context menus.
- **RightPopoverMenu** — Right-aligned, small trigger. Use for: header action menus.

## ProgressCheck
- **ProgressCheck** — Three-state progress indicator: empty checkbox (0%), partial fill (1-99%), green check (100%). Key props: `progress` (0-1 number), `size` (`xs`|`sm`|`md`|`lg`|`xl`, default `sm`). SVG-based, matches Icon sizing. Use for: task completion indicators, goal progress, hierarchical rollup status.

## BurndownChart
- **BurndownChart** — SVG burndown bar chart with dual-axis stacked bars and trendline. Key props: `bars` (array of `BurndownBar` with `planned_complete`, `planned_incomplete`, `unplanned_complete`, `unplanned_incomplete`), `onSegmentClick` (callback with `barIndex` and `BurndownSegmentKind`), `height`. Above zero: green (planned complete) on grey (planned incomplete). Below zero: orange (unplanned complete) on red (unplanned incomplete). Trendline projects remaining planned work to zero with "+Nd" annotation. Uses `--sui-*` CSS variables. Use for: sprint burndown tracking, planned vs actual visualization.

## Progress
- **StackedProgressBar** — Multi-segment progress bar. Key props: `segments` (array of `{percentage, color}`), `direction` (`horizontal`|`vertical`), `label`, `background`. Use for: multi-category progress visualization, stacked bar charts.

## ProgressCard
- **ProgressCard** — Step-based progress indicator with icons and connectors. Key props: `title`, `subtitle`, `steps` (array of `ProgressStep` with `id`, `label`, `status`, `icon`), `message`. Use for: multi-step workflow status display.
- **createWorkflowProgressCard** — Factory that derives step statuses from `currentStep` + `status`. Returns a component with props: `title`, `subtitle`, `currentStep`, `status` (`fetching`|`caching`|`completed`|`error`), `message`. Use for: automated workflow progress tracking.
- **CacheProgressCard** — Pre-built 5-step cache workflow progress card (Minutes, Hours, Stats, Coverage, Calcs). Use for: data caching pipeline status.

## Section
- **Section** — Collapsible section with title, subtitle, corner decorations, and header action slot. Key props: `title`, `subtitle`, `variant` (`ColorVariant` — sets accent color), `corners` (`CornerStyle` — visual corner treatment; replaces old `"bordered"`/`"decorated"` variant values), `fill`, `showHeader`, `headerAction`, `collapsible`, `collapsed`, `onToggleCollapse`, `defaultExpanded`. Has `createSection` factory. Use for: major page sections.

## Select
- **Select** — Unified single- and multi-select built on `@kobalte/core/select`. The `multiple?` literal narrows `value`/`onChange`: `false`/absent → `SelectOption | null`; `true` → `SelectOption[]`. Key props: `options` (`Accessor<SelectOption[]>`), `value`, `onChange`, `label`, `description`, `placeholder`, `id`. Any other kobalte `SelectRootProps` field (e.g. `placement`, `gutter`, `open`/`defaultOpen`, `onOpenChange`, `disabled`) is forwarded via spread. Single-mode uses `disallowEmptySelection={false}`; multi-mode renders a comma-joined preview plus an inline clear button in the trigger. Exported types: `SelectProps`, `SelectOption`, `SingleSelectProps`, `MultiSelectProps`. Uses `--sui-bg-elevated`, `--sui-bg-primary`, `--sui-border`, `--sui-border-bright`, `--sui-accent`, `--sui-accent-rgb`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-radius-sm`, `--sui-font-family` theme tokens. Use for: priority pickers, status filters, tag selectors, any single- or multi-select form field.
  - Example:
    ```tsx
    import { Select, type SelectOption } from "solid-ui-components";

    const options: SelectOption[] = [
      { value: "low", label: "Low" },
      { value: "high", label: "High" },
    ];

    // Single
    <Select label="Priority" options={() => options} value={priority} onChange={setPriority} />

    // Multi
    <Select multiple label="Statuses" options={() => options} value={statuses} onChange={setStatuses} />
    ```

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

## Tabs
- **Tabs** — Tab bar with multiple style variants. Key props: `tabs` (array of `Tab`), `activeTab`, `onTabChange`, `variant` (`default`|`underline`|`boxed`|`pill`), `color` (`ColorVariant`). `Tab` interface supports optional `hint` (muted text after label, e.g., keyboard shortcut hints). Exports `TabStatus` type (`"warning" | "error"`). Use for: switching between views/panels.

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

## Toast
- **Toast** — Kobalte-backed toast built on `@kobalte/core/toast`. Key props: `toastId` (`number`, injected by `toaster.show`), `title` (required), `description?` (`string | JSX.Element`), `variant?` (`info`|`success`|`warning`|`error`, default `info`), `actions?` (array of `ToastAction { label, onClick, variant? }`), `duration?` (ms; falls back to kobalte default), `persistent?` (suppress auto-dismiss + progress bar). Any other `ToastRootProps` field (`priority`, swipe handlers, escape-key, etc.) is forwarded to `Toast.Root`. Exported types: `ToastProps`, `ToastAction`, `ToastVariant`, `ShowToastInput`, `ToastHandle`. Uses `--sui-bg-elevated`, `--sui-bg-secondary`, `--sui-bg-tertiary`, `--sui-border`, `--sui-border-bright`, `--sui-border-focus`, `--sui-accent`, `--sui-accent-rgb`, `--sui-success`, `--sui-success-rgb`, `--sui-warning`, `--sui-warning-rgb`, `--sui-danger`, `--sui-danger-rgb`, `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-radius-sm`, `--sui-font-family` theme tokens. Use for: imperative notifications (save confirmations, error messages, prompts with actions, session warnings).
- **ToastRegion** / **ToastList** — Curried atomics that wrap kobalte's `Toast.Region` / `Toast.List` with baked-in viewport styling. Mount once near the app root inside a `Portal`. Exported types: `ToastRegionCurriedProps`, `ToastListCurriedProps`.
- **showToast(input)** — Imperative helper. Returns `{ id: number, dismiss: () => void }`. Accepts the same shape as `ToastProps` minus `toastId`.
- **toaster** — Re-export of kobalte's raw `toaster` for `update` / `clear` / `promise` use cases beyond `showToast`. For sub-components like `Toast.Root` / `Toast.Title` / `Toast.Description` directly, import from `@kobalte/core/toast` (already an installed peer).
  - Example:
    ```tsx
    import { Portal } from "solid-js/web";
    import {
      showToast,
      toaster,
      ToastList,
      ToastRegion,
    } from "solid-ui-components";

    // 1. Mount the region once (near app root):
    <Portal>
      <ToastRegion limit={10}>
        <ToastList />
      </ToastRegion>
    </Portal>

    // 2. Fire toasts imperatively:
    const handle = showToast({
      title: "Unsaved changes",
      description: "Your work will be lost if you leave this page.",
      variant: "warning",
      actions: [
        { label: "Save",    variant: "primary",   onClick: save    },
        { label: "Discard", variant: "secondary", onClick: discard },
      ],
    });

    // 3. Dismiss by handle or by id:
    handle.dismiss();
    toaster.clear();
    ```

## Toggle
- **Toggle** — Checkbox toggle switch with label positioning and accent color. Key props: `size` (`sm`|`md`|`lg`), `label`, `labelPosition` (`left`|`right`), `variant` (`default`|`minimal`), `color` (`ColorVariant`), plus all native checkbox attributes. Note: `power` and `circuit` variants have been removed. Use for: boolean on/off controls.

## Tooltip
- **Tooltip** — Hover/focus-activated tooltip built on `@kobalte/core/tooltip`. Renders an accessible floating panel with arrow and fade animation. Key props: `content` (`string | JSX.Element` or an accessor returning either — re-evaluated per open), `children` (the trigger), `class` (appended to the Kobalte trigger; pass `"sui-tooltip__trigger--cell"` for the dense-table "cell" semantics), `openDelay` (default `100`; `1000` matches the downstream `TooltipCell` pattern), `closeDelay` (default `100`), plus any `TooltipRootProps` field (`placement`, `gutter`, `open`/`defaultOpen`, `onOpenChange`, `disabled`, `triggerOnFocusOnly`, `forceMount`, etc.) which is forwarded to `Kobalte.Tooltip.Root`. Exported types: `TooltipProps`, `TooltipContent`. Uses `--sui-border`, `--sui-bg-secondary`, `--sui-text-primary`, `--sui-radius-sm`, `--sui-border-focus` theme tokens. Use for: field hints, truncated-cell full-text reveals, keyboard-shortcut legends, anything hover-activated. No separate `TooltipCell` is shipped — inline `<Tooltip openDelay={1000} class="sui-tooltip__trigger--cell">` instead.
  - Example:
    ```tsx
    import { Tooltip } from "solid-ui-components";

    <Tooltip content="Deletes the row. Cannot be undone.">
      <DangerButton>Delete</DangerButton>
    </Tooltip>

    // Reactive content via accessor:
    <Tooltip content={() => `Count: ${count()}`}>
      <GhostButton>Hover</GhostButton>
    </Tooltip>

    // Cell semantics (matches the legacy TooltipCell):
    <Tooltip content={row.fullText} openDelay={1000} class="sui-tooltip__trigger--cell">
      <span>{row.truncatedText}</span>
    </Tooltip>
    ```
  - Divergence from initial audit sketch: `class` is used instead of `className` (upstream convention); `openDelay`/`closeDelay` are not separately declared on `TooltipProps` because Kobalte's `TooltipRootProps` already includes them — `mergeProps` injects the 100 ms defaults before the passthrough spread.

## Renderers

The renderers family is a set of small, composable components for displaying field-style data: primitives with labels, before/after diffs, and OHLC candlesticks. They share a `--sui-*` token-driven label/value grid and render zero-config for common cases; host code can opt into a `renderValue` dispatcher hook when a domain needs custom types (status badges, epoch-millis dates, etc.).

- **ValueRenderer** — Atomic (Depth 1). Labeled label/value layout with a pluggable value dispatcher. Key props: `label?`, `value` (`unknown`), `renderValue?` (`(v: unknown) => JSX.Element | undefined` — host override; returning `undefined` falls through to the default dispatcher), `numberPrecision?` (default `2`), `class?`. Default dispatch handles `string`, `number`, `boolean`, `null`/`undefined`, arrays, plain objects, and pre-rendered JSX elements (`$$typeof` sentinel) — everything else falls through to `String(v)`. Objects render as a key/value entry list and recurse through the same `renderValue` pipeline so overrides apply at every nesting level. No component imports; owns `ValueRenderer.css`. Uses `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-font-family` tokens. Use for: generic field display, object dumps, anywhere you previously wrote `<span>{label}:</span><span>{value}</span>`.
  - Example:
    ```tsx
    import { ValueRenderer } from "solid-ui-components";

    // Zero-config primitives
    <ValueRenderer label="Count" value={1234.5678} />
    <ValueRenderer label="Active" value={true} />
    <ValueRenderer label="Missing" value={null} />

    // Objects — recurse through the default dispatcher
    <ValueRenderer
      label="Context"
      value={{ temperature: 45.2, active: true, name: "Engine #3" }}
    />

    // Custom dispatch — host injects a domain renderer; return undefined to
    // defer to the default dispatcher.
    <ValueRenderer
      label="Status"
      value="ALARM"
      renderValue={(v) => (isStatus(v) ? <StatusBadge status={v} /> : undefined)}
    />
    ```

- **ChangeRenderer** — Depth 2 (Composite; composes `ValueRenderer` twice). Before/after pair layout with a directional arrow. Key props: `label?`, `before` (`unknown`), `after` (`unknown`), `renderValue?` (shared override applied to both sides), `numberPrecision?`, `arrow?` (`JSX.Element`; default `"→"`), `class?`. Dispatches each side through `ValueRenderer` so any override stays consistent across the pair. Owns `ChangeRenderer.css`. Uses the same `--sui-*` token set as `ValueRenderer`, plus the arrow styling. Use for: single-field diffs, alarm before/after displays, config change rows.
  - Example:
    ```tsx
    import { ChangeRenderer } from "solid-ui-components";

    <ChangeRenderer label="Count" before={12} after={15} />
    <ChangeRenderer
      label="Context"
      before={{ temp: 45, active: true }}
      after={{ temp: 50, active: true }}
    />
    <ChangeRenderer
      label="Status"
      before="NOMINAL"
      after="ALARM"
      renderValue={(v) => (isStatus(v) ? <StatusBadge status={v} /> : undefined)}
    />
    ```
  - Divergence from initial audit sketch (documented, intentional): the upstream `ChangeRenderer` does not replicate downstream `ChangeObjectRenderer`'s per-key aligned grid with added/removed/changed/unchanged highlighting. Objects on each side render through `ValueRenderer`'s default entry list — the key-level diff remains a domain concern. Host code that needs that behavior can keep it as a domain component wrapping `ValueRenderer` or two `ChangeRenderer`s, following the audit's "absorb what fits, leave domain behavior behind" principle.

- **CandlestickRenderer** — Atomic (Depth 1). OHLC box visualization with open/close flanks, high/low stacked markers, and a mean value inside the box. Key props: `label?`, `candlestick` (`Candlestick | null | undefined` where `Candlestick = { open, close, high, low, mean, openAt?, closeAt? }`), `getBoxColor?` (`(c: Candlestick) => string`; default colors bullish candles green and bearish red via `--sui-success` / `--sui-danger`), `precision?` (default `2`), `class?`. Null/undefined candlestick renders an em-dash. No component imports; owns `CandlestickRenderer.css`. Uses `--sui-text-primary`, `--sui-text-secondary`, `--sui-text-muted`, `--sui-success`, `--sui-danger`, `--sui-warning`, `--sui-radius-sm`, `--sui-font-family` tokens. Use for: price/metric candles, bucket-aggregated statistics (where min/max/avg + open/close make sense). Exported types: `CandlestickRendererProps`, `Candlestick`.
  - Divergence from downstream: the upstream component does not embed a hover tooltip (the downstream `CandlestickRenderer` uses `useSmartTooltip` with full OHLC breakdown). Callers that need the tooltip wrap the base in the library's `Tooltip` component and supply their own content.
  - Example:
    ```tsx
    import { CandlestickRenderer } from "solid-ui-components";

    <CandlestickRenderer
      label="Price"
      candlestick={{ open: 100, close: 105, high: 107, low: 99, mean: 103 }}
    />

    // Custom color (e.g., doji-aware)
    <CandlestickRenderer
      candlestick={cs}
      getBoxColor={(c) =>
        Math.abs(c.close - c.open) / (c.high - c.low || 1) < 0.03
          ? "var(--sui-warning)"
          : c.close >= c.open ? "var(--sui-success)" : "var(--sui-danger)"
      }
    />
    ```

## VesselCallHeader
- **VesselCallHeader** — Vessel name + time range + duration + badge display. Key props: `vesselName`, `connectedAt`, `disconnectedAt`, `assetId`, `badge`, `action`, `href`. Use for: vessel call detail page headers, vessel call list item titles.
