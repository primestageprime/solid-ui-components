# Layout-purity migration — 2026-07-14

Execution plan + running inventory for the Layout Purity commandment
(`STYLE_GUIDE.md` › *Layout Purity*). Per-component procedure lives in the
`layout-purity-refactor` skill
(`.claude/skills/layout-purity-refactor/SKILL.md`). Regression harness:
`src/test-utils/domStructure.ts`.

## The rule (short form)

No component owns box-model geometry. Rows/columns/gaps/alignment/spreads/fills/
scrolls/pinned-edges come from composing Layout variants — never `display:flex|
grid`, `gap`, `justify-content`, `align-items`, `align-self`, `flex-*`,
`place-*`, `row-gap`/`column-gap`, or `overflow` in a component's own CSS or
inline style. One component per commit, byte-identical props, visually identical
render.

## Buckets

- **exempt-layout** — a `layout`-tagged component; it IS the vocabulary. No work.
- **exempt-chart** — SVG/canvas rendering; positions freely. No work.
- **overlay-partial** — overlay control: keep `position:absolute|fixed` anchoring
  ONLY, migrate every internal row/column.
- **migrate** — full migration.

`geo` = count of banned geometry-property occurrences in the component's CSS
(from `grep -cE 'display:(flex|grid|inline-flex|inline-grid)|justify-content|
align-items|align-self|align-content|flex-*|gap|row-gap|column-gap|overflow|
grid-*|place-*'`). A high count is a bigger surface, not necessarily harder.

## Inventory

### exempt-layout (no work — tick as N/A)

- [x] N/A — Layout/* (Stack, Row, Box, AppShell, ProportionalStack) — the family
- [x] N/A — BottomSheet (geo 8)
- [x] N/A — CollapsiblePanel (geo 16)
- [x] N/A — Modal (geo 23)
- [x] N/A — Page (geo 6)
- [x] N/A — ScrollRegion (geo 8)
- [x] N/A — Section + Section/StickyGroupHeader (geo 17 + 3)
- [x] N/A — SplitQueueList (geo 32)
- [x] N/A — ThreePanelLayout (geo 31)

### exempt-chart (no work — SVG/canvas; tick as N/A)

- [x] N/A — AnimatedSwimlaneChart/SwimlaneAnimatedLane (geo 18)
- [x] N/A — AreaFocusGrid (geo 16)
- [x] N/A — CandlestickRenderer (geo 17)
- [x] N/A — CashflowChart (geo 6)
- [x] N/A — CashflowScrubChart (geo 6)
- [x] N/A — DateAxis (geo 17)
- [x] N/A — FocusLabelBand (geo 5)
- [x] N/A — Heatmap (geo 52)
- [x] N/A — HeatStack (geo 38)
- [x] N/A — HeatStream (geo 57)
- [x] N/A — ScrubChart (geo 4)
- [x] N/A — Sparkline (geo 1)
- [x] N/A — StatusFlowChart (geo 21)
- [x] N/A — Treemap (geo 25)
- [x] N/A — TrendSparkline (geo 1)

### overlay-partial (keep position anchoring, migrate internals) — see P3

Combobox (47), Dropdown (8), Select (28), DatePicker (7), DateRangePicker (26),
MultiSelectFilter (24), PopoverMenu (16), Toast (22). Scheduled inside P3
(controls) and P-overlay below.

### migrate

Priority order below (P1 pilot → P5 remainder). Category folders with several
CSS files list each file. Check the box when migrated (or BLOCKED with reason).

#### P1 — pilot

- [x] AssigneeChips (geo 6) — DONE. Wrapper → new `ChipCluster` Layout variant
  (wrapping cluster, `flex-shrink:0` baked). Chip pill `inline-flex` kept as
  intrinsic. Gap 3px→4px (xs), imperceptible. **Precedent set:** a Primitive now
  imports Layout for geometry while keeping intrinsic CSS — see report/blockers.
- [x] WorkerCard (geo 10) — DONE. identity/history/plan-inner rows → SpreadRow,
  name+badge → ClusterRow (gaps on-scale: 8px = sm, or absent/invisible under
  space-between). BEM hook classes retained on the Layout wrappers.
  `overflow:hidden` on plan/progress/bar-track now composed via the ClipBox
  Layout variant (Peter ruling 4 — no intrinsic carve-out). Retrofit landed.
- [x] LabeledDivider (geo 4) — DONE (ruling 1). `::before/::after flex:1` lines
  replaced with two real `GrowBox` rule elements; outer flex row → ClusterRow
  (gap 8=sm exact). Render verified identical (same 3 flex items, 1px lines,
  8px gaps). Public props byte-identical.
- [x] ProductGridCard (geo 4) — DONE. Centered column → new `CenteredColumn`
  Layout variant (align:center, sm gap, no justify). Gap snapped 6px→8px (sm)
  per ruling 2. Card visuals + data-state attrs + click/keyboard semantics kept.
- [x] FormComposite (geo 10) — DONE (ruling 3). Extracted the holy-albatross
  behavior into a new `AutoStackRow` / `AutoStackItem` Layout primitive; the
  slots now compose them (outer gap 12px→md, item gap sm). FormComposite is now
  a zero-CSS Composite (FormComposite.css deleted). Existing test updated to the
  new internals (public props unchanged).
- [x] DiffPair (geo 10) — DONE (ruling 3). Labeled form → new `Grid` primitive
  via the `LabelValueGrid` variant (gap 12px→md); before/arrow/after row → new
  `BaselineWrapRow` variant. Sides/arrow keep only intrinsic min-width/color
  (the redundant `flex:0 1 auto` / no-shrink `flex:0 0 auto` dropped — the 1-char
  arrow's shrink is imperceptible). Public props byte-identical.

#### P2 — high-traffic

- [ ] ActionRow (geo 15)
- [ ] Badge/CountChip (geo 6) · Badge/StatusBadge (geo 3) · Badge/StatusChip (geo 2) · Badge/TagPill (geo 3) — mostly intrinsic pill styling; review each
- [ ] Card/StatusCard (geo 41)
- [ ] Panel (geo 17)
- [ ] Surface (geo 11)
- [ ] ActionListItem (geo 20)
- [ ] ActionList (geo 6)
- [ ] ButtonGroup (geo 7)
- [ ] ProgressCard (geo 18)
- [ ] WorkProgressCard (geo 14)
- [ ] BatchBar (geo 12)
- [ ] BulkActionBar (geo 7)

#### P3 — form / overlay controls

- [ ] Inputs/ThemedInputs (geo 3)
- [ ] Checkbox/Checkbox (geo 6) · Checkbox/CheckboxField (geo 6)
- [ ] Toggle (geo 6)
- [ ] SegmentedInput (geo 14)
- [ ] SegmentedControl (geo 6)
- [ ] DayOfWeekPicker (geo 6)
- [ ] DayOfMonthPicker (geo 7)
- [ ] MonthOfYearPicker (geo 6)
- [ ] DatePicker (geo 7) — overlay-partial
- [ ] DateRangePicker (geo 26) — overlay-partial
- [ ] Combobox (geo 47) — overlay-partial
- [ ] Select (geo 28) — overlay-partial
- [ ] Dropdown (geo 8) — overlay-partial
- [ ] MultiSelectFilter (geo 24) — overlay-partial
- [ ] TagInput (geo 11)
- [ ] QuickFilter (geo 5)

#### P4 — big composites

- [ ] Table/Table (geo 42) · Table/CellRenderers (geo 14) · Table/GapCell (geo 2)
- [ ] Selector/SidebarSelector (geo 38)
- [ ] ExtractionBoard (geo 44)
- [ ] ThreadGroup (geo 24)
- [ ] DataDisplay/DigitRoller (geo 5) · NumberWithUnits (geo 7) · ResultDisplay (geo 13) · StatsTable (geo 3)
- [ ] CensusView (geo 11)
- [ ] SortableList (geo 10)
- [ ] MutableList (geo 13)
- [ ] Tabs (geo 10)
- [ ] RecentStarred (geo 16)
- [ ] WeekCalendar (geo 6) — likely BLOCK: CSS-grid time/day matrix, no Layout grid analogue
- [ ] DnDHierarchySortBar (geo 8)

#### P-overlay — overlay controls not in P3

- [ ] PopoverMenu (geo 16) — overlay-partial
- [ ] Toast (geo 22) — overlay-partial

#### P5 — remainder (migrate, unprioritized)

Atoms whose flex is mostly **intrinsic element styling** (a self-contained
element centering its own label) — expect most to be "intrinsic-only, note &
tick", not real arrangement migrations. Review each per skill step 4.

- [ ] Button (geo 7) — intrinsic (button centers its own label)
- [ ] Icon (geo 4) — intrinsic
- [ ] Kbd (geo 2) — intrinsic
- [ ] StatusLight (geo 4) — intrinsic
- [ ] ServiceHealthDot (geo 6) — intrinsic + label row
- [ ] ParticipantAvatar/ParticipantAvatar (geo 4) · AssigneeIcon (geo 3) — intrinsic
- [ ] TruthIndicator (geo 4)
- [ ] ProgressCheck (geo 4)
- [ ] ValueRenderer (geo 13)
- [ ] ResponsiveMoney (geo 2)
- [ ] BigNumberInput (geo 4)
- [ ] CurrencyInput (geo 2)
- [ ] ThemedNumberInput (geo 12)
- [ ] EditableTitle (geo 8)
- [ ] List (geo 8)
- [ ] Markdown (geo 4)
- [ ] MathFormula (geo 9)
- [ ] RangeAmountGroup (geo 9)
- [ ] Progress/AsyncProgress + StackedProgressBar (geo 7 + n)
- [ ] TitledTimeRangeHeader (geo 11)
- [ ] SprintSelector (geo 8)
- [ ] Legend (geo 12) — HTML swatch/label rows (chart-adjacent but box-model → migrates)
- [ ] PivotTreemap/PivotPills (geo 12) — HTML pill rows
- [ ] Feedback/InlineChartErrorOverlay (geo 3) — overlay-ish; review
- [ ] DragDrop/QuadrantGrid (geo 10) — likely BLOCK: CSS-grid 2×2, no Layout grid analogue

## Known structural blockers (need a decision / new primitive)

- **CSS-grid layouts** — `QuadrantGrid`, `WeekCalendar`, and the chart heat
  grids (exempt). Layout has no grid primitive. Either (a) add a `Grid` Layout
  primitive + `createGrid` factory (a real expansion → Peter sign-off), or
  (b) leave grid as an allowed exemption for genuine 2-D matrices. Flagged, not
  decided.
- **Pseudo-element geometry** — `LabeledDivider`'s `::before/::after { flex:1 }`
  rule lines draw the divider; there is no child element to wrap in a Layout.
  See P1 note.
- **Off-scale gaps** — e.g. AssigneeChips' 3px wrapper gap; the Layout scale is
  4px(xs)/8px(sm). Accept the 1px nudge where imperceptible; a load-bearing
  off-scale value is a BLOCK, not a scale expansion (Peter-gated).

## Progress log

- 2026-07-14 — P0 complete: commandment recorded (STYLE_GUIDE + decision-tree),
  skill written, harness landed, this plan doc created.
- 2026-07-14 — Peter's 4 rulings recorded (STYLE_GUIDE + skill). **P1 pilot
  complete (6/6):** AssigneeChips, WorkerCard, ProductGridCard, LabeledDivider,
  FormComposite, DiffPair all migrated; WorkerCard clip retrofit via ClipBox.
  New Layout vocabulary added: `ChipCluster`, `ClipBox`, `CenteredColumn`,
  `BaselineWrapRow`, `LabelValueGrid` variants; `AutoStackRow`/`AutoStackItem`
  and `Grid` primitives. Each has a `*.layout.test.tsx` guard; full suite green
  (1547). Next: P2 high-traffic composites.
