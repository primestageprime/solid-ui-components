# SUI component index

One line per component: `Name (depth) tags — doc`. Tag facets: plain = what it shows, `~` = interaction, `=` = data shape, `@` = where it sits. Higher depth = more composed; reach for the highest depth that covers the need. `variants:` are curried, data-only names of the factory on that line.

ActionListItem (2) card status button ~select ~hotkey =scalar @row — Composite (Depth 2).
AlarmBands (1) mark chart ~view =range @slot — pure SVG renderer of translucent red rectangles, one per pre-computed Range.
AlarmHotZones (1) mark count chart ~view =range @slot — pure renderer of a striped block + thick border + ×N count badge per HotZone.
AlarmOverlay (2) mark chart ~view =range =time-series @slot — curried one-call overlay.
AlarmStripeDefs (1) mark ~view =scalar @slot — SVG <defs> registering the diagonal-stripe pattern used by AlarmHotZones.
AppBar (3) tabs menu avatar ~navigate =enum @header @shell — the top bar of a full-page app with a few top-level views and an account menu.
AppMain (0) panel ~layout ~scroll =scalar @shell — the body slot of AppShell;
AppNavLink (1) link text ~navigate =list @header — a flat, always-visible top-bar link list where SUI's plain NavLink (href-based) 
AppShell (0) panel ~layout ~scroll =scalar @shell — the outermost frame of any full-page app screen — it is the largest, most-compos
AreaFocusGrid (1) grid table number ~select ~hover =matrix =grouped @panel — pivot dashboards where every column belongs to a group that spans multiple sub-c
AreaSeries (1) chart bar mark ~view =series =time-series @slot — a single filled region or a neutral band/channel between two lines — but reach f
AssigneeIcon (1) avatar icon ~view =participants @inline — Atomic Primitive (Depth 1).
AsyncProgress (1) progress bar duration ~animate =scalar @inline — any async operation whose duration varies run-to-run but is stable enough histor
AutoStackItem (1) panel ~layout =list @container — wrapping each block passed to AutoStackRow.
AutoStackRow (1) panel ~layout =list @container — the layout engine under FormComposite and NestedList — reach for FormComposite d
Badge (1) table text badge ~view =pair =table @container — inline badges within data lists.
BalanceReviewChart (2) chart bar ~hover ~view =time-series =multi-series @panel — a monthly review page's "where are we, and how did we get here" chart.
BandRail (1) gauge bar ~drag ~select =range =scalar @control — a draw dial, a price dial, any "at what point does this stop working" control.
BarSeries (1) chart bar mark ~view =series =time-series @slot — counts or stacked totals over time or category — but reach for CompletionTimelin
BaselineDot (1) badge icon ~view =boolean @inline — marking the one baseline scenario in a scenario list/chip row — see "Scenario ma
BaseTable (1) table ~sort ~scroll =table @panel — standard sortable data tables, including long lists inside a fixed-height pane.
BatchBar (1) progress bar ~animate =scalar @inline — a smooth, confidence-reading extraction progress bar that animates toward a lear
BigNumberInput (1) number money field ~edit ~type =scalar @inline — inline editing of a headline money/number figure.
BottomSheet (1) dialog menu ~dismiss ~reveal =list @overlay — container-scoped action sheets, in-pane detail drawers, mobile-style option pick
BoxRing (1) mark ~view =boolean @slot — an attention outline (over capacity, invalid).
BucketQueue (1) list count status ~select ~collapse =grouped =enum @rail — a compliance/triage sidebar where items live in a few lifecycle states you alway
BuilderBoard (2) chart table field ~edit ~view =schedule =time-series @panel — Composite (Depth 2).
BulkActionBar (2) button count toolbar ~bulk ~multi-select ~submit =list @toolbar — one-row multi-select bulk actions over a grid (e.g.
BurndownChart (2) chart bar ~hover ~view =time-series =multi-series @panel — sprint burndown tracking, planned vs actual visualization.
CandlestickRenderer (1) chart mark ~view =time-series =range @slot — price/metric candles, bucket-aggregated statistics (where min/max/avg + open/clo
CashflowScrubChart (3) chart axis money ~zoom ~drag ~hover =time-series =multi-series @panel — cashflow / coffers visualisations that need both per-day detail (the axis ribbon
Cell (0) table text ~view =table @cell — building custom table layouts.
CellRow (0) table text ~view =table @cell — rows in CellTable.
CellTable (0) table text ~view =table @cell — wrapping Cell-based rows.
CensusView (3) table heatmap count ~view ~select =matrix =table @page — Composite (Depth 3).
ChangeRenderer (2) diff text ~view =pair @inline — single-field diffs, alarm before/after displays, config change rows.
Chart (1) chart ~click ~hover =series =time-series @container — click-to-add-a-date on a time chart, or click-to-select a value on a numeric one
ChartHeader (2) header count text ~view =scalar @header — the header line above any chart (counts, windows, units).
ChartLabels (1) text mark ~view =list @slot — Draws the label ladder as a Chart slot child: one <text> per item placeLabels fo
ChartTooltip (1) tooltip ~hover =scalar @slot — a hover readout anchored to the nearest datum — but reach for ThroughputChart, C
Checkbox (1) field ~toggle =boolean @control — standalone checkboxes (do NOT hand-roll an <input type=checkbox>).
CheckboxCell (1) status chip field ~view ~toggle =enum =boolean @cell — read-only boolean columns;
CheckboxField (2) field text ~toggle =boolean @row — checklists and settings rows.
CodeBlock (1) code ~view =text @container — displaying JSON payloads, config snippets, log dumps, raw code in showcases.
CollapsiblePanel (2) panel ~collapse ~toggle =scalar @rail — dockable left/right sidebars (filters, inspectors, tool panels) that a user can 
Combobox (1) field menu ~search ~select ~type =list =enum @control — searchable selects, tag editors, freeform "pick-or-create" inputs.
CompactBucketQueue (1) list count status ~select ~collapse =grouped =enum @rail — BucketQueue for a narrow side pane: 11px headers, 20px rows (2px x 8px padding, 
CompletionTimeline (2) chart bar timeline ~hover ~view =time-series =events @panel — ETL/ingestion dashboards, activity-over-time monitors showing what completed and
ConfiguredCard (2) card log status ~view =scalar =list @panel — Composed (Depth 2, zero CSS: composes StatusCard / StatusCell).
ConfiguredDetail (2) card log status ~view =scalar =list @panel — Composed (Depth 2, zero CSS).
ConfiguredLog (2) card log status ~view =scalar =list @panel — Composed (Depth 2, zero CSS).
ConnectionStatus (3) status sparkline text ~view =list =time-series @row — dispatcher / worker / service liveness rows in dashboards and HUDs.
ConversationTree (2) thread tree avatar ~view ~collapse =tree =participants @panel — code review threads, ops incident timelines, multi-actor decision logs, team sta
CountBadge (2) badge count ~view =scalar @overlay — unread counts on a bell/inbox trigger, any corner-anchored numeric badge.
CountChip (2) chip count status ~view ~animate =list @inline — dashboard/status-strip inline summaries ("12 IN PROGRESS · 4 BLOCKED") — the lar
CountInput100 (1) field money number ~type ~edit =scalar @control — Counts up to 99.
CountInput10K (1) field money number ~type ~edit =scalar @control — Counts up to 9,999.
createActionList (3) list card button ~select ~multi-select ~hotkey ~bulk =list @panel — Composite (Depth 3). variants: ActionList
createActionRow (2) button text ~click =scalar @row — Composite (Depth 2). variants: AccentActionRow, DangerActionRow, PlainActionRow
createAlertBox (1) notice status button ~view ~dismiss =text @section — Status-colored alert with title, description, and action slot. variants: DangerAlert, InfoAlert, SuccessAlert, WarningAlert
createAmountStrip (1) field money number ~edit ~type =scalar @row — Factory behind AmountStrip's curried variants; variants: AmountStrip, HoursAmountStrip, LargeAmountStrip, SeatsAmountStrip, SeatsPriceAmountStrip, SmallAmountStrip +1
createAnimatedSwimlaneChart (2) flow graph card ~animate ~click ~pan ~zoom =steps =graph @panel — Curried-variant factory. variants: AnimatedSwimlaneChart
createAppHeader (0) panel ~layout ~scroll =scalar @shell — Factory behind AppHeader's curried variants; variants: AppHeader, CompactAppHeader, InlineAppHeader
createAreaFocusGrid (1) grid table number ~select ~hover =matrix =grouped @panel — Factory: returns an AreaFocusGrid pre-configured with sizing overrides.
createAssigneeChips (1) chip avatar count ~view =participants =list @inline — Atomic (Depth 1). variants: Assignees, MdAssigneeChips
createAssigneeIcon (1) avatar icon ~view =participants @inline — Freeze the presentational Override (size) so call sites stay data-only.
createBandRail (1) gauge bar ~drag ~select =range =scalar @control — Curry the presentational config — in practice the formatter, which is a static d
createBaseTable (1) table ~sort ~scroll =table @panel — Sortable data table with sticky header, striped rows, column groups (colspan). variants: CompactTable, DataTable, StickyTable, StripedTable
createBatchBar (1) progress bar ~animate =scalar @inline — Curried BatchBar factory (ADR-0001).
createBigNumberInput (1) number money field ~edit ~type =scalar @inline — Atomic (Depth 1).
createBox (0) panel ~layout =scalar @container — Flex child with grow/shrink control. variants: ActionSlot, AnchorBox, AnchorFillBox, ClipBox, ClipFillBox, ConstrainedBox +15
createBoxRing (1) mark ~view =boolean @slot — a stroked ring standing off the box.
createBuilderBoard (2) chart table field ~edit ~view =schedule =time-series @panel — Composite (Depth 2).
createBuilderBoardBelowChart (2) table field ~edit =schedule =list @panel — Composite (Depth 2). variants: BuilderBoardBelowChart
createButton (1) button icon ~click ~submit =scalar @control — Multi-variant button with loading spinner. variants: DangerButton, DefaultButton, DisclosureButton, GhostButton, GlyphSlotGhostButton, IconOnlyButton +15
createButtonGroup (1) button ~click =list @toolbar — Button arrangement container. variants: BorderedButtonGroup, ButtonGroup, VerticalButtonGroup
createCadenceStrip (1) field button ~select ~edit =enum =schedule @row — Factory behind CadenceStrip's curried variants; variants: CadenceStrip, MonthlyOrAnnualCadenceStrip, PayCadenceStrip, RecurringCadenceStrip
createCashflowScrubChart (3) chart axis money ~zoom ~drag ~hover =time-series =multi-series @panel — Domain Composite (Depth 3). variants: FramedCashflowScrubChart, StillCashflowScrubChart
createCell (0) table text ~view =table @cell — Table cell primitive (<td> or <th>) with alignment, color, and weight. variants: DataHeader, DataHeaderCenter, DataHeaderRight, DataTerm, DataTermMuted, DataValue +4
createCellRenderer (1) text ~view =scalar @cell — ============================================ Helper to create cell renderer for 
createCellRow (0) table text ~view =table @cell — <tr> wrapper with border and highlight options. variants: BorderRow
createCellTable (0) table text ~view =table @cell — <table> wrapper with optional <thead>. variants: KVTable
createChannelChart (2) chart legend ~hover ~view =time-series =range @panel — Composite (Depth 2). variants: ChannelChart, ChannelDivergenceChart
createChartCanvas (1) chart ~view =series @container — Factory: freeze the chart-area height to produce a data-only curried ChartCanvas variants: ChartCanvasLg, ChartCanvasMd, ChartCanvasMlg, ChartCanvasXl
createChartFrame (2) chart header button ~collapse ~toggle ~zoom =time-series @panel — Composite (Depth 2), zero CSS. variants: ChartFrame, ContentAutoGrowChartFrame, ContentChartFrame, FillAutoGrowChartFrame, FillChartFrame
createCheckbox (1) field ~toggle =boolean @control — Atomic boolean control: a native input[type=checkbox] (visually hidden) behind a variants: DoneCheckbox, SmallCheckbox
createClampedText (1) text ~truncate =text @inline — Atomic (Depth 1). variants: ClampedText
createCodeBlock (1) code ~view =text @container — Atomic Primitive (Depth 1).
createCollapsiblePanel (2) panel ~collapse ~toggle =scalar @rail — Composite (Depth 2).
createConfirmationModal (1) dialog button ~submit ~dismiss =text @overlay — Confirmation dialog with Cancel/Confirm footer built on Modal. variants: ConfirmationModal, DangerConfirmationModal, LargePrimaryConfirmationModal, PrimaryConfirmationModal
createCurrentValueIndicator (1) mark ~view =scalar @slot — Marks ONE caller-supplied point (point: CurrentValue | null, {x, y, label}) with variants: AccentCurrentValueIndicator, WarningCurrentValueIndicator
createDateAxis (1) axis date heatmap ~select ~drag =time-series @control — Factory that returns a curried DateAxis with a baked-in presentational cellWidth
createDatePicker (1) field date calendar ~pick =scalar @control — Atomic (Depth 1, src/components/DatePicker/DatePicker.tsx).
createDayOfMonthPicker (1) field date ~pick ~multi-select =enum @control — Atomic (Depth 1). variants: CompactDayOfMonthPicker
createDayOfWeekPicker (1) field date ~pick ~multi-select =enum @control — Atomic (Depth 1).
createDiffPair (1) diff ~view =pair @row — createDiffPair — Factory for Curried Variants. variants: BoldArrowDiffPair, FlowDiffPair
createDirtyComboBox (2) field menu status ~select ~edit =enum @control — Curry the control's words once — the vocabulary belongs to the SCREEN (scenarios variants: ScenarioComboBox
createDistributionSparkline (1) sparkline number ~view =list @inline — Bake the encoding (band, marks, capacity) into a named variant. variants: P95Sparkline
createDivider (1) divider ~view =scalar @inline — Content separator line (own component directory). variants: DashedDivider, Divider, VerticalDivider
createDragRangeSelect (1) mark ~drag ~zoom ~select =range @slot — Renders the translucent band for a drag-to-select gesture, as a Structural Primi variants: CommitOnReleaseDragRangeSelect, EagerDragRangeSelect
createDropdown (1) field menu ~select ~edit =enum =list @control — Atomic (Depth 1). variants: CompactDropdown, InlineSubtleDropdown
createEmptyState (1) empty icon text ~view =text @container — Centered placeholder with icon and message. variants: EmptyState, MutedEmptyState
createEndLabels (1) text mark ~truncate =pair @slot — a lead label at the box's left and a trail at its right, dropping the trail and 
createExtractionBoard (4) list progress status card ~view ~animate =grouped =steps @page — Composite (Depth 2) swimlane board for an ETL extraction view.
createFab (2) button icon ~click =scalar @overlay — Factory that returns a curried Fab component with baked-in presentational defaul variants: AddFab
createFileDropZone (2) field empty ~upload ~drag =file @container — Composite (Depth 2, owns minimal structural CSS: the dashed outline, its drag-ov variants: CompactFileDropTarget, FileDropTarget
createFocusLabelBand (1) header progress text ~view =scalar @header — Factory: returns a FocusLabelBand pre-configured with override defaults.
createFormComposite (2) field money ~edit ~submit =schedule @section — Composite (Depth 2, zero CSS).
createFormula (1) formula number ~view =list @section — ============================================ createFormula =====================
createFormulaCaption (2) formula number text ~view =scalar @inline — @example const Cost = createFormulaCaption({ formatFactor: dollars, formatResult
createFormulaResult (1) formula number ~view =list @section — ============================================ createFormulaResult ===============
createFullscreenBox (1) panel ~expand ~toggle =scalar @overlay — Atomic (Depth 1). variants: FillFullscreenBox, FullscreenBox
createGhostArc (1) mark ~hover =pair @slot — A dashed bezier arc between two caller-given ArcPoints, drawn as a Structural Pr variants: SubtleGhostArc, WarningGhostArc
createGhostPin (1) mark ~hover =scalar @slot — Renders one ShapeGlyph at ctx.hoverX(), as a Structural Primitive (Depth 1) slot variants: SubtleGhostPin, WarningGhostPin
createGhostRow (1) text placeholder ~click ~reveal =scalar @row — Atomic (Depth 1, src/components/GhostRow/GhostRow.tsx). variants: IndentedGhostRow
createGivens (1) formula number ~view =list @section — ============================================ createGivens ======================
createGrid (1) grid ~layout =list @container — Layout's bare CSS-grid container, a Layout Primitive (Depth 1) owning Layout.css variants: CardGrid, ChipGrid, FillPaneRailGrid, LabelValueGrid, LooseCardGrid, WideCardGrid
createGroupedMutationSliders (3) field number diff ~drag ~edit =grouped =list @panel — Curry a grouped row: lock the axes and the vocabulary once, and the call site is
createGrowthStrip (2) field number ~edit ~type =schedule @row — a fifth Strips Composite (Depth 2, zero CSS): how a count of units changes each  variants: GrowthStrip, SimpleGrowthStrip, UnitsGrowthStrip
createHatchPattern (1) mark ~view =scalar @slot — a <pattern> of diagonal stripes, referenced as url(#id).
createHighlightSegments (1) mark ~view =range @slot — Paints translucent [start, end] bands, as a Structural Primitive (Depth 1) slot  variants: AccentHighlightSegments, FaintHighlightSegments
createHotkeyButton (2) button kbd ~hotkey ~click =scalar @control — Composite (Depth 2, src/components/HotkeyButton/HotkeyButton.tsx).
createHourlyWageAmountStrip (1) field money ~edit ~type =scalar @row — Factory behind HourlyWageAmountStrip's curried variants. variants: HourlyWageAmountStrip
createHUDPanel (1) panel header ~view =scalar @container — Factory behind HUDPanel's curried variants.
createIcon (1) icon ~view =enum @inline — SVG icon component with 47 named icons across 8 groups (status, navigation, data variants: InlineMetaIcon
createKbd (1) kbd text ~view =scalar @inline — Atomic Primitive (Depth 1).
createLabeledDivider (1) divider text ~view =scalar @row — Atomic Primitive (Depth 1). variants: DateDivider
createLabelStrip (1) text field ~view =scalar @row — Factory behind LabelStrip's curried variants; variants: LabelStrip
createLevelsTimeline (1) timeline bar chart ~hover ~view =time-series =grouped @panel — Factory for a curried timeline. variants: LevelsRailChart
createList (1) list status ~select ~click =list @container — Styled list with status dots, icons, dividers. variants: ScrollList
createMarkdown (1) markdown text ~view =markdown @container — Atomic (Depth 1).
createMarkdownEditor (2) markdown field ~edit ~type =markdown @panel — Composite (Depth 2).
createMarkedSlider (1) field gauge number ~drag ~edit =scalar =range @control — Curry a slider: lock the grid once, and the call site is left with the scale, th variants: ContinuousMarkedSlider
createMessageBubble (1) thread text avatar ~view =text =participants @row — Atomic Primitive (Depth 1). variants: OtherBubble, SelfBubble
createModal (1) dialog ~dismiss ~submit =scalar @overlay — Portal-based modal with overlay, escape-to-close, and footer slot. variants: FullscreenModal, LargeModal, Modal
createMonthOfYearPicker (1) field date ~pick ~multi-select =enum @control — Atomic (Depth 1).
createMutationSliders (3) field number diff ~drag ~edit =list =pair @panel — Curry a row: lock the unit, the vocabulary and the grid once, and the call site  variants: CompactCurrencyMutationSliders, NumberMutationSliders
createMutationToolbar (2) toolbar button date ~submit ~pick =schedule @toolbar — Curry the toolbar's words once, the way createPairedMutationSliders curries its 
createOverflowNav (2) tabs menu ~navigate ~select =list @toolbar — Pure Composite (Depth 2). variants: CenteredOverflowNav, OverflowNav
createPairedMutationSliders (3) field number diff ~drag ~edit =list =pair @panel — Curry a paired row: lock the two axes and the vocabulary once, and the call site
createPanel (1) panel header ~view =scalar @container — Styled container with corner decorations, glow effects, and edge accents. variants: AccentPanel, CompactPanel, DangerPanel, DecoratedPanel, InfoPanel, SimplePanel +3
createParticipantAvatar (1) avatar ~view =participants @inline — Atomic Primitive (Depth 1). variants: LgAvatar, MdAvatar, SmAvatar
createParticipantNameLabel (1) text avatar ~view =participants @inline — Atomic Primitive (Depth 1).
createParticipantTimeLabel (1) date duration text ~view =scalar @inline — Atomic Primitive (Depth 1).
createPayrollTaxStrip (1) field money number ~edit ~view =scalar @row — Factory behind PayrollTaxStrip's curried variants. variants: PayrollTaxStrip
createPinMarkers (1) mark icon ~click ~hover =events @slot — Renders one ShapeGlyph per entry in data, as a Structural Primitive (Depth 1) sl variants: CompactPinMarkers, WarningPinMarkers
createPlaceholder (1) placeholder ~view =scalar @container — Bake the compile-time shape (size/fit/multiline) into a named variant. variants: BlockPlaceholder, FillPlaceholder, FitPlaceholder, LargePlaceholder, MediumPlaceholder, SmallPlaceholder
createProductGridCard (1) card progress text ~select ~click =scalar @row — Factory: returns a ProductGridCard pre-configured with override defaults.
createProgressCard (1) card progress status flow ~view =steps @row — Create a pre-configured ProgressCard with default props
createProgressCheck (1) progress icon status ~view =scalar @inline — Three-state progress indicator: empty checkbox (0%), partial fill (1-99%), green variants: LargeProgressCheck, ProgressCheck
createRangeAmountGroup (2) field money number ~edit ~type =range @section — Atomic (Depth 2).
createRangeDialog (1) dialog field ~edit ~submit =range @overlay — a slider's range (a dial's min/max click), any [min, max] a reader sets by hand.
createRateGauge (2) gauge number progress ~view =scalar @inline — Bake the wording into a named variant. variants: RateDial
createRow (0) panel ~layout =list @container — Flex-row container. variants: ActionWrapRow, BarLineRow, BaselineClusterRow, BaselineSpreadRow, BaselineWrapRow, CenteredWrapRow +27
createScrollRegion (1) panel ~scroll =scalar @container — Factory: freeze defaults (e.g. variants: ScrollRegionLg, ScrollRegionMd
createScrubChart (2) chart axis ~zoom ~drag ~hover ~toggle =time-series =multi-series @panel — Factory that returns a curried ScrubChart with the sizing knobs baked in.
createSection (1) panel header text ~collapse ~view =scalar @section — Collapsible section with title, subtitle, corner decorations, and header action  variants: BorderedSection, CollapsibleSection, DecoratedSection, HUDSection
createSegmentBar (1) bar progress mark ~view =list @slot — a rounded bar cut into fractional segments ({ from, to, fill }, 0–1 of the box),
createSegmentedControl (1) button tabs ~select ~toggle =enum @control — Atomic (Depth 1).
createSegmentedInput (1) button field ~select ~toggle =enum @control — Atomic (Depth 1).
createSlider (1) field number ~drag ~edit =scalar =range @control — Curry the formatter when the unit is a static decision.
createSpanBadge (2) mark badge ~view =scalar @slot — A glyph badge on a corner of the bar, drawn only when when(datum) holds — the ! 
createSpanEndLabels (2) mark badge ~view =scalar @slot — #3 … $33.8k: a lead and a trail label on the bar, the trail dropped when it does
createSpanLanes (2) timeline bar ~view =schedule =grouped @slot — Composite (Depth 2), a Chart slot.
createSpanRing (2) mark badge ~view =scalar @slot — An attention ring round the bar, drawn only when when(datum) holds.
createStack (0) panel ~layout =list @container — Flex-column container. variants: CenteredColumn, CenteredStack, ClipColumn, ClipFillColumn, ClipFillColumnFlush, Column +25
createStackedTimelineChart (2) chart bar timeline ~hover ~view =time-series =multi-series =events @panel — Curry the crossing, the inset and the tick text once per screen.
createStampedRow (2) text date avatar ~view =scalar @row — Factory behind StampedRow's curried variants; variants: PinnedStampedRow, StampedRow
createStatusBadge (1) badge status ~view =enum @inline — Colored status pill with 5 compliance-themed variants. variants: CompliantBadge, DoingBadge, InfoBadge, PendingBadge, SmStatusBadge, TodoBadge +2
createStatusCard (1) card status text ~click ~view =scalar @row — Curried StatusCard — bind common defaults (e.g.
createStatusFlowChart (2) flow chart count ~view ~hover =steps =grouped @panel — Curried-variant factory for StatusFlowChart (per ADR-0001).
createStatusLight (1) status icon ~view =enum @inline — Atomic. variants: MdStatusLight, SmallStatusLight
createStepTimeline (3) timeline chart progress ~hover ~view =steps =events =time-series @panel — Composite (Depth 3), src/components/StepTimeline/. variants: StepTimeline
createSurface (0) panel ~view ~layout =scalar @container — Themed container primitive with padding, radius, background, and border control. variants: CardSurface, CenteredSurface, CompactCard, CompactSurface, ContentSurface, DangerSurface +14
createSwimlaneChart (2) flow graph card ~animate ~click ~pan ~zoom =steps =graph @panel — Atomic Primitive (Depth 1). variants: LinearFlowSwimlaneChart
createTabbedSidePanel (2) tabs panel ~collapse ~navigate ~toggle =enum @rail — Pure Composite (Depth 2). variants: LeftNavTabbedPanel, RightDetailTabbedPanel
createTabs (1) tabs ~navigate ~select =enum @header — Tab bar with multiple style variants. variants: BoxedTabs, PillTabs, Tabs, UnderlineTabs
createText (0) text ~view =text @inline — Polymorphic text element with variant and color. variants: AccentBody, AccentCaptionLabel, AccentEmphasisBody, CaptionLabel, ChipLabel, CompactLabel +49
createThreadGroup (1) thread avatar text ~view ~collapse =list =participants @section — Atomic Primitive (Depth 1). variants: FlatThreadGroup, IndentedThreadGroup
createThreePanelLayout (1) panel ~layout ~scroll =scalar @shell @page — Curry a ThreePanelLayout with its geometry baked (e.g. variants: FluidListDetailThreePanel, InspectorThreePanel, SplitThreePanel, StandardThreePanel
createThreeSlotRow (2) text status ~view ~layout =scalar @row — Composite (Depth 2), src/components/ThreeSlotRow/. variants: ThreeSlotRow
createThresholdRail (1) gauge bar ~drag ~select =range =scalar @control — Factory behind ThresholdRail's curried variants.
createTimelineBar (1) timeline bar ~view =schedule @slot — Draws one rect per datum into a named LANE, as a Structural Primitive (Depth 1)  variants: DenseTimelineBar, SparseTimelineBar
createToggle (1) field button ~toggle =boolean @control — Checkbox toggle switch with label positioning and accent color. variants: LeftTruthToggle, TruthToggle
createTreeDiffChart (2) tree diff chart ~view ~hover =tree =pair @panel — Bake the legend decision into a named variant. variants: ScenarioTreeDiff
createTreemap (1) treemap chart ~hover ~click =grouped =tree @panel — Factory: returns a Treemap pre-configured with the given Override Props. variants: SelectableTreemap
createTruthIndicator (1) status icon ~view =boolean @inline — Atomic (Depth 1). variants: LargeTruthIndicator, SmallTruthIndicator, TruthIndicator
createValueMatrix (1) grid table number status ~hover ~view =matrix @panel — Curry a domain matrix (e.g.
createWeekCalendar (2) calendar grid timeline ~select ~view =schedule @panel — Composite (Depth 2).
createWindowStrip (1) field date ~pick ~edit =range @row — Factory behind WindowStrip's curried variants; variants: EndWindowStrip, StartWindowStrip, WindowStrip
createWorkflowProgressCard (1) card progress status flow ~view =steps @row — automated workflow progress tracking. variants: CacheProgressCard
createYAxisLockDialog (2) dialog field ~edit ~submit =range @overlay — Composite (Depth 2), zero CSS. variants: YAxisLockDialog, YAxisLockDialogNumber
Crosshair (1) mark ~hover =multi-series @slot — a hover guide with per-series nearest-point dots — but reach for ThroughputChart
CurrencyInput (1) field money ~type ~edit =scalar @control — any money input — pick a smaller maxValue for a tighter column.
CurrencyInput100M (1) field money number ~type ~edit =scalar @control — Money up to $99,999,999.
CurrencyInput10K (1) field money number ~type ~edit =scalar @control — Money up to $9,999.
CurrencyInput1B (1) field money number ~type ~edit =scalar @control — Money up to $1,000,000,000.
CurrencyInput1M (1) field money number ~type ~edit =scalar @control — Money up to $999,999.
CurrentValueIndicator (1) mark ~view =scalar @slot — highlighting one live/current/selected value on an existing plot;
DagChart (1) graph flow ~pan ~zoom ~click =graph @panel — task dependency graphs, workflow DAGs, pipeline visualization.
DailyDateAxis (2) axis date heatmap ~select ~drag =time-series @control — Curried day-cell variant.
DataTableContainer (1) table panel ~scroll =scalar @container — constraining table height with scroll.
DateAxis (1) axis date heatmap ~select ~drag =time-series @control — scrubber/date-header ribbons, per-cell heatmaps at any cadence, linked time-axis
DateCell (1) date text ~view =scalar @cell — the largest table with a date column — reach for FieldTable (fields.dateCol) fir
DatePicker (1) field date calendar ~pick =scalar @control — a single-date field where DateRangePicker (below) is too much — reach for DateRa
DateRangePicker (1) field date calendar ~pick =range @control — time-range filters, alarm-investigation timespan controls, reporting period sele
DateTimeCell (1) date text ~view =scalar @cell — the largest table with a timestamp column — reach for FieldTable (fields.dateTim
DateTimeRange (2) date text ~view =range @inline — displaying time periods.
DayOfMonthPicker (1) field date ~pick ~multi-select =enum @control — monthly recurring-schedule day selection, day-of-month filters.
DayOfWeekPicker (1) field date ~pick ~multi-select =enum @control — weekly recurring-schedule day selection, weekday filters.
DD (1) table text badge ~view =pair =table @container — right-side values in key-value rows.
DeviationBand (1) mark ~view =range =series @slot — Draws a deviation band as a Chart slot child: one filled <polygon> per run build
DH (1) table text badge ~view =pair =table @container — column headers in DTableWithHeader.
DHeader (1) table text badge ~view =pair =table @container — wrapping DH cells.
DiffPair (1) diff ~view =pair @row — any labeled before/after pair display where the two sides need a shared layout +
DigitRoller (1) number ~animate =scalar @inline — any animated numeric display;
DismissibleNoticeBanner (2) notice button ~dismiss =text @header — a top-of-app or top-of-settings notice nudging users toward linking a detected s
DistributionSparkline (1) sparkline number ~view =list @inline — a dashboard tile, table column or definition list where the reader needs to know
DnDHierarchySortBar (1) chip toolbar ~drag ~reorder =list @toolbar — tag-hierarchy nest-order controls, dimension ordering in pivot/aggregation UIs.
Dot (0) status icon ~view =enum @inline — Atomic (Depth 0).
DragRangeSelect (1) mark ~drag ~zoom ~select =range @slot — click-and-drag range selection on a plot (zoom-to-selection, filter-by-drag) — c
Dropdown (1) field menu ~select ~edit =enum =list @control — an editable name that also picks from a list.
DropdownFitLabel (1) field menu ~select ~edit =enum =list @control — a combo whose width must not jump between selections (DirtyComboBox on the payro
DRow (1) table text badge ~view =pair =table @container — rows inside DTable.
DT (1) table text badge ~view =pair =table @container — left-side labels in key-value rows.
DTable (1) table text badge ~view =pair =table @container — definition-list style data.
DTableWithHeader (1) table text badge ~view =pair =table @container — multi-column data tables with headers.
Duration (1) duration text ~view =scalar @inline — durations alongside relative-time captions (e.g.
DurationCell (1) number money duration ~view =scalar @cell — the largest table with a duration column — reach for FieldTable (fields.duration
EditableTitle (1) text field ~edit ~type =text @header — Atomic Primitive (Depth 1).
EllipsisText (2) text ~truncate ~hover =text @cell — the underlying primitive behind every truncating table cell (IdCell, StringCell,
EndLabels (1) text mark ~truncate =pair @slot — a lead label at the box's left and a trail at its right, dropping the trail and 
EntityCard (2) card status text ~select ~click =scalar @row — vessel-call pickers, triage queues, report selectors — any list/sidebar card key
EpisodeCard (1) list card ~select ~click =list @rail — a worked example of a renderCard implementation — copy its shape for a real Side
EpisodeSelection (1) list card ~select ~click =list @rail — a worked example of a renderSelection implementation, alongside EpisodeCard — re
ExtractionBoard (4) list progress status card ~view ~animate =grouped =steps @page — a live ETL extraction / ingestion dashboard where a data store advances tables t
Fab (2) button icon ~click =scalar @overlay — primary floating actions anchored to a container corner.
FieldTable (2) table status date money number ~sort ~filter ~select ~multi-select =table @panel — every standard data table — this is the largest, most-configured table component
FileDropZone (2) field empty ~upload ~drag =file @container — OCR/import/upload tools — anywhere a file enters the app.
FillTextArea (1) field text ~type ~edit =text @container — a notes field that fills a detail pane.
FilterableTable (2) table field ~filter ~search ~sort =table @panel — Composite (Depth 2).
FilterBar (1) toolbar field chip ~filter ~multi-select =grouped =enum @toolbar — a page-level faceted filter over many dimensions whose state several tiles read 
FloatCell (1) number money duration ~view =scalar @cell — the largest table with a decimal column — reach for FieldTable (fields.floatCol)
FocusLabelBand (1) header progress text ~view =scalar @header — pivot-grid focus labels with aggregate progress affordances above and/or below.
FormComposite (2) field money ~edit ~submit =schedule @section — recurring-payment / schedule forms where a name+amount block pairs with a varian
FormulaCaption (2) formula number text ~view =scalar @inline — a figure's derived total under it (hours × rate, seats × fee).
FormulaProvider (1) formula table ~hover ~view =list @section — wrapping formula + variable table pairs.
FormulaVarRow (1) formula table ~hover ~view =list @section — variable definition rows that link to formula terms.
GapBox (2) placeholder text ~view =text @container — a design canon page or a touchstone wherever the layout needs a box standing in 
GapBracket (1) mark number ~view =pair @slot — "this far from the forecast / target / floor" at a line's end;
GapCell (2) number diff ~view =pair @cell — census/migration gap columns (source − landed).
GhostArc (1) mark ~hover =pair @slot — previewing a link/connection between two points before it's committed — compose 
GhostPin (1) mark ~hover =scalar @slot — previewing where a pin would land under the pointer before a click commits it — 
GhostRow (1) text placeholder ~click ~reveal =scalar @row — dside-ui and thorcasting-ui's right-rail rows — the largest matching row primiti
GlyphBadge (1) badge mark icon ~view =scalar @slot — !, a padlock, a count.
Grid (1) mark ~view =series @slot — horizontal/vertical reference gridlines under a plot — but reach for ThroughputC
GroupBracket (0) mark divider ~view =grouped @cell — a per-row grouping gutter in dense lists/tables where contiguous runs of a group
GroupedBucketQueue (2) tree list count ~select ~collapse ~filter =grouped =tree @rail — a filter/config sidebar grouped by more than one facet at once (Direction → Cate
GroupedMutationSliders (3) field number diff ~drag ~edit =grouped =list @panel — a before/after editor where each named thing carries THREE OR MORE bounded quant
GroupedSelector (2) list count ~select ~collapse =grouped @rail — any grouped, collapsible, selectable rail.
HatchPattern (1) mark ~view =scalar @slot — waiting / blocked / tentative stretches.
HeartbeatSparkline (1) sparkline progress ~view =time-series @inline — any "% of budget over time" sparkline (rate-limit headroom, queue depth, heartbe
Heatmap (1) heatmap grid ~hover ~view =matrix @panel — data completeness grids, coverage matrices.
HeatmapMulti (1) heatmap grid ~hover ~view =matrix @panel — multi-dimension data completeness (e.g., vessel call coverage by data type).
HeatPivotGrid (2) grid heatmap table ~view ~hover =matrix @panel — magnitude-heat pivots (no current consumer — verify need before building against
HeatStack (1) heatmap bar ~hover =time-series =matrix @panel — chronological data completeness stacks with compact hover preview.
HeatStream (1) heatmap timeline ~hover =time-series @panel — horizontal timeline-style data completeness.
HeatStreamGrid (1) heatmap grid ~select ~hover =matrix =time-series @panel — asset-by-time-window data completeness matrices with selection support.
HeightReveal (1) panel ~collapse ~animate =boolean @container — a collapsible body that should slide shut, such as ChartFrame's chart.
HighlightSegments (1) mark ~view =range @slot — shading a range (an alarm zone, a selection, a filtered window) behind a plot's 
HotkeyButton (2) button kbd ~hotkey ~click =scalar @control — the exact [c]laim-style affordance already reused by ActionList's multi-select a
HUDButtonGroup (1) button ~click =list @toolbar — Alias for ButtonGroup.
HUDConfirmationModal (1) dialog button ~dismiss ~submit =scalar @overlay — Alias for ConfirmationModal.
HUDListItem (1) list status ~select ~click =list @container — Alias for ListItem.
HUDModal (1) dialog button ~dismiss ~submit =scalar @overlay — Alias for Modal.
HUDPage (1) panel ~view ~scroll =scalar @page — Alias for Page.
HUDTabs (1) tabs ~navigate ~select =enum @header — Alias for Tabs.
Icon (1) icon ~view =enum @inline — all iconography.
IdCell (1) text ~truncate ~view =text @cell — ============================================ ID Renderer =======================
IndentRail (1) tree mark ~view =tree @cell — a hierarchy where a listitem cannot go, e.g.
InlineChartErrorOverlay (1) notice chart ~view =text @overlay — overlaying error messages on chart areas.
InlineText (1) text number ~view =scalar @cell — numeric/text cell values whose colour is computed from data (e.g.
IntCell (1) number money duration ~view =scalar @cell — the largest table with an integer column — reach for FieldTable (fields.intCol) 
IntervalInput (2) field number duration ~edit ~select =schedule @control — billing/subscription/recurrence cadences — "repeat every N days/weeks/months/yea
Kbd (1) kbd text ~view =scalar @inline — command-palette hotkey hints, inline keyboard shortcut labels.
LabeledDivider (1) divider text ~view =scalar @row — day-change or large-gap separators in conversation streams, named section breaks
Legend (1) legend text ~view ~toggle =list @inline — explaining a color encoding in a chart, heatmap, dot-chart, or any other visuali
LevelsTimeline (1) timeline bar chart ~hover ~view =time-series =grouped @panel — Atomic (Depth 1).
LineSeries (1) chart bar mark ~view =series =time-series @slot — a trend, projection, or running total drawn as a path — but reach for BurndownCh
Link (1) link text ~navigate =scalar @inline — inline text links.
LinkPivotGrid (2) grid table link ~navigate ~click =matrix @panel — drilldown pivots where every cell always navigates (amygdala/jtf consumers).
ListDetailLogThreePanel (1) panel log ~layout ~scroll =scalar @shell @page — @deprecated Use <ListDetailThreePanel rightWidth="wide" />: width is configurati
ListDetailThreePanel (1) panel log ~layout ~scroll =scalar @shell @page — List-and-detail page with a wide left column: 320 left, right 240 (rightWidth="n
ListItem (1) list status ~select ~click =list @container — items within List.
LiveHeartbeatTrace (2) sparkline status ~animate =time-series @cell — dropping a live heartbeat trace into a dense table cell or compact row without t
LocalizationSettings (1) tabs field panel ~navigate ~edit =enum @page — The Localization settings tab body: a locale choice and a 12-hour toggle, on the
LogLineList (2) log table date ~view ~scroll =list =events @panel — Composed (Depth 2, zero CSS: composes BaseTable / SectionTable).
LongTextCell (1) text ~truncate ~view =text @cell — the largest table with a long free-text column — reach for FieldTable (fields.te
ManagedListSection (2) list field button ~edit ~submit =list @section — a Settings → Login methods panel where users add/remove ways to sign in to one a
Markdown (1) markdown text ~view =markdown @container — Atomic (Depth 1).
MarkdownEditor (2) markdown field ~edit ~type =markdown @panel — Composite (Depth 2).
MarkedSlider (1) field gauge number ~drag ~edit =scalar =range @control — one bounded quantity whose ALLOWANCE and whose PREVIOUS figure both have to be v
MathFormula (1) formula table ~hover ~view =list @section — rendering mathematical formulas with hover-linked variables.
MetricCard (1) card number text ~view =scalar @row — KPI/metric display tiles.
MetricValueCell (1) number money duration ~view =scalar @cell — the largest table with a metric column — reach for FieldTable first, hand-assemb
MinuteDateTimeCell (1) date text ~view =scalar @cell — Convenience cell for minute-level timestamps: YYYY-MM-DD HH:mm
ModeSplitButton (2) button menu ~click ~select =enum @control — Composite (Depth 2), zero CSS.
MoneyCell (1) number money duration ~view =scalar @cell — the largest table with a money column — reach for FieldTable (fields.moneyCol) f
MonthOfYearPicker (1) field date ~pick ~multi-select =enum @control — yearly/annual-schedule month selection, month-of-year filters.
MultiSelectFilter (1) field chip ~filter ~multi-select =enum @control — a compact category/status filter that adapts to available width in toolbars and 
MutableList (3) list card field ~edit ~reorder ~drag ~dismiss =list @panel — editable ordered card lists (rename + reorder + delete), e.g.
MutationSliders (3) field number diff ~drag ~edit =list =pair @panel — a before/after scenario editor where several bounded quantities move together an
MutationToolbar (2) toolbar button date ~submit ~pick =schedule @toolbar — the header of any panel that edits a list of dated changes — the Hourly and Lice
NameInput (1) field text ~type ~edit =text @control — naming a scenario/option/label;
NavLink (1) link text ~navigate =scalar @rail — navigation menus, sidebar links.
NestedList (1) list tree ~view ~select =tree @container — The role="list" container.
NestedListItem (1) list tree ~view ~select =tree @container — One row of a hierarchy: role="listitem" + aria-level, indented one 12px step per
NewTabLink (1) link text ~navigate =scalar @inline — external links.
NotificationCenter (3) menu badge count list ~click ~dismiss ~navigate =list =events @header — a global notification/inbox bell in an app header, an activity feed with per-ite
NumberWithUnits (1) number text ~view =scalar @inline — any numeric display that needs units.
OutOfRangeMarkers (1) mark ~view =series @slot — a held y domain under a series that leaves it.
Page (1) panel ~view ~scroll =scalar @page — top-level page wrapper.
PairedMutationSliders (3) field number diff ~drag ~edit =list =pair @panel — a before/after editor where each named thing has TWO bounded quantities that mov
ParticipantNameLabel (1) text avatar ~view =participants @inline — author names inside ThreadGroup headers, mention surfaces, anywhere a colored pa
ParticipantTimeLabel (1) date duration text ~view =scalar @inline — "5m ago" / "2h ago" captions in conversation headers.
PinMarkers (1) mark icon ~click ~hover =events @slot — a set of clickable/hoverable glyph markers (annotations, flags, events) at data 
PinnedFillColumn (2) panel header ~scroll ~view =scalar @container @rail — a rail with a pinned search, a centre pane with a pinned current step, a log rai
PivotGrid (1) grid table ~view =matrix @panel — the base grid when neither cell-href nor heat-coloring is baked at the call site
PivotPills (1) chip toolbar ~select ~drag =enum @toolbar — the dimension-picker control above a PivotTreemap (or any other two-slot pivot s
PivotTreemap (2) treemap grid progress ~select ~hover =matrix =grouped @panel — alarm-tag pivots, ops-data drilldowns, any "rows × two-tag axes" visualization w
Placeholder (2) placeholder ~view =scalar @container — skeleton dashboards / section stubs while composing a page before the real conte
PointCaptions (1) text mark ~view =list @slot — "early" over a dot, "under" below it, a series' end value beside its last point.
PointSeries (1) chart bar mark ~view =series =time-series @slot — scatter markers or emphasized series endpoints — but reach for ChannelChart firs
PopoverMenu (1) menu button ~click ~dismiss =list @overlay — action menus, user menus, account menus, context menus.
PopoverTooltip (1) tooltip ~hover ~click =text @overlay — anywhere a hover tooltip also needs to work on tap/touch — a Count cell whose po
ProductGrid (2) grid card progress ~select ~view =matrix =grouped @panel — product-strategy roadmaps, OKR boards (objectives below the line, key results ab
ProductGridCard (1) card progress text ~select ~click =scalar @row — per-item cards inside ProductGrid, or any roadmap/coverage grid card with progre
ProgressCard (1) card progress status flow ~view =steps @row — multi-step workflow status display.
ProgressFlags (3) chart progress mark ~view ~hover =time-series =events @panel — Composite (Depth 3, zero CSS).
ProportionalItem (0) panel ~layout ~resize =list @container — wrapping each pane passed to ProportionalStack.
ProportionalStack (0) panel ~layout ~resize =list @container — a row/column of panes that should share space by declared importance rather than
QuadrantGrid (2) grid card ~drag ~reorder =grouped @panel — a generic 2x2 grid of labeled, colored drop zones.
QuickFilter (2) field ~search ~filter ~type =list @control — text search over any collection — works with lists, tables, trees, or other rend
RangeAmountGroup (2) field money number ~edit ~type =range @section — min/typical/max amount ranges (budget bands, price tiers, estimate spreads).
RateGauge (2) gauge number progress ~view =scalar @inline — Composite (Depth 2).
RecentStarredSidebar (1) list link ~select ~toggle =list @rail — pure sidebar renderer (no navigation/persistence) built on Layout NarrowStack + 
ReferenceLine (1) chart bar mark ~view =series =time-series @slot — a threshold, target, "now" marker, or ghost preview rule — but reach for Burndow
RemovableItemCard (2) card button ~select ~dismiss =scalar @row — selectable list items.
ReservedWidth (1) panel ~animate ~layout =scalar @container — anything whose width animates or swaps between states (DirtyComboBox;
ResizableContainer (0) panel ~resize ~drag =scalar @container — side panels, resizable columns, draggable split views.
ResponsiveMoney (1) money number ~truncate ~view =scalar @inline — money figures in width-constrained cells, dashboard KPIs, responsive table colum
ResultDisplay (1) number text ~view =scalar @inline — primary calculation results.
ResultPanel (1) number formula ~view =scalar @section — result sections that include formula/variable breakdowns.
RightPopoverMenu (1) menu button ~click ~dismiss =list @overlay — header action menus, account dropdowns (email header + Logout).
RingChart (1) gauge chart progress ~view =grouped =scalar @inline — completion gauges, category-breakdown donuts, any "N of total" ring indicator.
ScenarioDot (1) badge icon ~view =enum @inline — a scenario chip/list row where scenarios are told apart by colour alone.
ScenarioGlyph (1) badge icon ~view =enum @inline — a scenario chip/list row where scenarios must be distinguishable without relying
ScrollRegion (1) panel ~scroll =scalar @container — any scrollable list/panel where a "more below/above" cue is wanted and a hard ed
ScrubChart (2) chart axis ~zoom ~drag ~hover ~toggle =time-series =multi-series @panel — linked chart + axis pairings where the chart needs to show the big picture while
ScrubChartBand (1) mark ~view =range =series @slot — Draws a deviation band inside a ScrubChart render callback: one filled <polygon>
ScrubChartCrosshair (1) mark ~hover =multi-series @slot — Draws a hover crosshair inside a ScrubChart render callback: a vertical guide at
ScrubChartLabels (1) text mark ~view =list @slot — Draws the label ladder inside a ScrubChart render callback: one <text> per label
ScrubChartReferenceLine (1) mark ~view =scalar @slot — Draws one horizontal reference rule inside a ScrubChart render callback, spannin
ScrubChartTooltip (1) tooltip ~hover =scalar @slot — Draws a hover tooltip card inside a ScrubChart render callback, flipped off a ME
SearchField (1) field ~search ~type =text @control — Atomic (Depth 1).
SearchInput (2) field icon ~search ~type ~filter =text @header — a pinned search at the head of a list rail (PinnedFillColumn header), a table qu
SectionLabel (1) header text divider ~scroll ~view =scalar @header — any section-divider label;
SectionTable (1) table header count ~sort ~view =table @section — a titled report table whose count must track the (possibly externally-filtered) 
SegmentBar (1) bar progress mark ~view =list @slot — a phased span, a stacked progress bar.
SegmentedControl (1) button tabs ~select ~toggle =enum @control — mode/override switches, view togglers, any single choice across 3+ states.
SegmentedInput (1) button field ~select ~toggle =enum @control — mutually-exclusive choices among a small fixed set (view toggles, filters, mode 
Select (1) field menu ~select ~multi-select =enum =list @control — priority pickers, status filters, tag selectors, any single- or multi-select for
SelectableTable (1) table ~multi-select ~bulk ~sort =table @panel — batch operations on table rows.
ServiceHealthDot (2) status icon tooltip ~hover =enum @inline — navbar/app-shell service heartbeat indicators, dispatcher health clusters.
ShapeGlyph (1) mark icon ~view =scalar @slot — ShapeGlyph — pure descriptor → SVG element.
SharingSettings (1) tabs field panel ~navigate ~edit =enum @page — The Sharing settings tab body: who can open it and an allow-edit toggle, on the 
Sidebar (1) panel ~resize ~drag ~layout =scalar @rail — the resizable side column of a two-pane app layout — the largest, most-configure
SidebarPanel (0) panel ~layout =scalar @rail — a sidebar sized once by the app (production layouts) rather than resized by the 
SidebarSelector (1) list card ~select ~click =list @rail — Sidebar card list with selection content area (generic).
SigFig (1) table text badge ~view =pair =table @container — scientific precision display.
SignedAreaChart (2) chart ~hover ~view =time-series =series @panel — cumulative ahead/behind against a target, cashflow vs plan.
Slider (1) field number ~drag ~edit =scalar =range @control — a bounded numeric input where the reader wants the value and the position at onc
SlideReveal (1) panel button ~reveal ~animate =boolean @inline — actions that appear only in a state.
SliderField (1) field number ~type ~edit =scalar @control — each figure of a valueLabel node, so a person types the reading they hold.
SlotFillBar (1) progress bar status ~animate =list =steps @inline — a queue of work units progressing one at a time (build steps, batch import slots
SlotTrack (1) mark timeline ~view =schedule @slot — a payment schedule's expected dates against what landed.
SlotTrackSwatch (1) mark timeline ~view =schedule @slot — One lozenge with a dot, at legend size: a Legend item's swatch.
SortableFieldTable (2) table status date money number ~sort ~filter ~select ~multi-select =table @panel — Curried sortable variant (ruled 2026-07-18): the table is sortable or it isn't —
SortableList (2) list ~drag ~reorder =list @container — ── Component ─────────────────────────────────────────────────────────────
SpanLanes (2) timeline bar ~view =schedule =grouped @slot — Composite (Depth 2), a Chart slot.
Sparkline (0) sparkline ~view =series @inline — inline throughput/count strips where the caller owns the color semantics, and a 
SplitQueueList (1) list count ~select =grouped @rail — DEPRECATED, removed in the next major.
SprintSelector (1) field date button ~select ~navigate =enum =schedule @control — sprint pickers, burndown week navigators, compact multi-period selectors.
StackedAreaSeries (1) chart ~view =multi-series =time-series @slot — a composition of parts over time whose TOTAL is as meaningful as its parts.
StackedProgressBar (1) progress bar ~view =grouped =list @inline — multi-category progress visualization, stacked bar charts.
StackedTimelineChart (2) chart bar timeline ~hover ~view =time-series =multi-series =events @panel — hours or capacity by source over a year with a threshold and dated changes — the
StarToggle (1) button icon ~toggle =boolean @inline — a 5-point star <button> that fills when the item is starred;
StaticSplitLayout (1) list panel ~view =list @container — the framing around a read-only list of recent items over a composed bottom block
StatsTable (1) table number ~view =table @panel — quick statistical summary tables.
StatusCard (2) card status text ~click ~view =scalar @row — the largest existing status-card component — reach for NotificationRow first if 
StatusCell (1) status chip field ~view ~toggle =enum =boolean @cell — the largest table that already models a status column — reach for FieldTable (fi
StatusChip (1) chip status ~select ~edit =enum @inline — Atomic Primitive (Depth 1).
StatusChipDisplay (1) chip status ~view =enum @inline — a card or list row that shows a status and leaves changing it to the detail view
StickyGroupHeader (1) header text divider ~scroll ~view =scalar @header — Atomic (Depth 1, src/components/Section/StickyGroupHeader.tsx).
StringCell (1) text ~truncate ~view =text @cell — ============================================ String Renderer ===================
SwimlaneChart (1) flow graph card ~animate ~click ~pan ~zoom =steps =graph @panel — current-step-in-workflow displays, DOING-centered Kanban, dependency chain visua
SwimlaneChartStatic (1) flow graph card ~click ~pan ~zoom =steps =graph @panel — an internal/external caller that needs the static (non-animated) swimlane layout
TabbedSidePanel (2) tabs panel ~collapse ~navigate ~toggle =enum @rail — persistent right- or left-side detail panels where the tab strip itself is the o
TableQuickFilter (2) field ~filter ~search =list @header — adding client-side text filtering to any existing table/list without adopting a 
TableSectionHeader (1) header count text ~view =scalar @header — Composable header for a table/section: title on the left, a record count (or cus
TagCell (1) status chip field ~view ~toggle =enum =boolean @cell — the largest table/list that already models this column — reach for FieldTable (v
TagPill (2) chip badge count ~view ~dismiss =scalar @inline — Composed (Depth 2;
TargetBarChart (2) chart bar ~hover ~view =time-series =multi-series =grouped @panel — projected vs booked per period per category (the Contract Builder's Projections 
ThemedInput (1) field text ~type ~edit =text @control — themed form text inputs.
ThemedNumberInput (1) field number ~type ~edit =scalar @control — numeric form fields (RPM, counts, thresholds, bounded parameters).
ThemedTextarea (1) field text ~type ~edit =text @control — themed form textareas.
ThreePanelLayout (1) panel ~layout ~scroll =scalar @shell @page — multi-pane investigation pages, tuning pages, anywhere the four-slot shape appli
ThresholdRail (1) gauge bar ~drag ~select =range =scalar @control — Alias for BandRail.
ThroughputChart (2) chart bar axis tooltip ~hover ~view =time-series =multi-series @panel — Composed (Depth 2).
TickSeries (1) mark ~view =events @slot — events on a track where a dot would read as a value.
TimelineBar (1) timeline bar ~view =schedule @slot — a schedule/Gantt-style strip of lane-laid bars under or beside a plot — compose 
TitledTimeRangeHeader (1) header text date duration ~view =range @header — detail-page and list-item headers for titled records with a time range — session
ToastList (1) toast notice ~dismiss ~animate =list @overlay — the list portion of the toast mount point — always paired with ToastRegion, neve
ToastRegion (1) toast notice ~dismiss ~animate =list @overlay — mounting the toast viewport once near the app root — see the ToastRegion/ToastLi
Toggle (1) field button ~toggle =boolean @control — boolean on/off controls.
Tooltip (1) tooltip text ~hover =text @overlay — field hints, truncated-cell full-text reveals, keyboard-shortcut legends, anythi
TreeDiffChart (2) tree diff chart ~view ~hover =tree =pair @panel — Composite (Depth 2).
Treemap (1) treemap chart ~hover ~click =grouped =tree @panel — tag-based pivots, mosaic dashboards, "fraction-of-whole" group-and-leaf layouts.
TreeTable (2) table tree ~expand ~collapse ~sort =tree =table @panel — expandable rows and sub-rows — an item made of smaller items (assemblies and par
TrendSparkline (1) sparkline number ~view =time-series @inline — projected balances, running totals, any compact "where is this heading?" indicat
Units (1) table text badge ~view =pair =table @container — appending unit text after values.
UserMenu (2) menu avatar button ~click ~navigate =participants @header — the user/account control in an app header (Taskmaster canon, 2026-10-15).
Val (1) table text badge ~view =pair =table @container — formatted numbers in table cells.
ValueHandle (1) mark ~drag ~edit =scalar @slot — dragging a bar's or column's top edge to set its value on a chart.
ValueMatrix (2) grid table number status ~hover ~view =matrix @panel — compliance/threshold grids, scenario matrices (viable price under N salaries), a
ValueRenderer (1) text number ~view =pair @inline — generic field display, object dumps, anywhere you previously wrote <span>{label}
VarianceStrip (1) bar chart ~view =time-series @slot — the day-by-day variance under a balance plot (BalanceReviewChart), or alone (Var
VarianceStripChart (2) chart bar ~hover ~view =time-series @panel — a page that wants the variance bars without the balance lines.
WeekCalendar (2) calendar grid timeline ~select ~view =schedule @panel — schedule/agenda views, design-session planners, any per-day time-block layout.
WeeklyCashflowChart (2) chart bar money ~hover ~view =time-series =multi-series @panel — financial runway/coffers dashboards, weekly burn-vs-revenue forecasting.
withCellStyle (1) text ~view =scalar @cell — Factory to create a styled version of any cell renderer.
withValueColor (1) text ~view =scalar @cell — Factory to create a cell with dynamic coloring based on value.
WorkerCard (2) card status progress ~view ~animate =list =steps @row — a live ETL extraction dashboard showing per-worker slot state alongside Extracti
WorkProgressCard (1) card progress duration ~view ~animate =scalar @row — monitor/sprint dashboards showing live task progress vs.
XAxis (1) axis ~view =series @slot — the chart's own bottom axis chrome — but reach for ThroughputChart (general read
XSpan (1) mark ~view =range @slot — a window with no data or no schedule, a period out of scope.
YAxis (1) axis ~view =series @slot — the chart's own left axis chrome — but reach for ThroughputChart first if it alr
