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

- [x] ActionRow (geo 15) — DONE. Column→NarrowStack, main→ClusterRow,
  leading/trailing→new NoShrinkClusterRow, body→GrowBox, actions→new EndWrapRow.
  Gaps snapped (6→sm, 5→xs). Hover-reveal + BEM hooks kept. Two new variants
  added (within standing authority).
- [x] Badge family — AUDITED, INTRINSIC (no migration). StatusBadge, StatusChip,
  CountChip, TagPill are all self-contained pills whose `inline-flex`/`gap`
  center their OWN label/count/text/caret (single-widget internals, not
  consumer-child arrangement). Per skill step 4 + Peter's "deeper components
  shouldn't think about styling," wrapping a pill's own text in a Layout Row is
  the absurd-wrapper anti-pattern. Ticked as intrinsic; left as-is.
- [ ] Card/StatusCard (geo 41) — DEFERRED (no showcase in dev/, so visual
  verification is impossible here — the skill's re-screenshot gate can't run).
  Outer column already handled by the composed Surface (direction="column"
  gap="sm"). Remaining internal arrangement to migrate: row1 (name+status) →
  `BaselineSpreadRow` (added); row2 detail column (flex:1;min-height:0;overflow:
  hidden;gap:6→sm) → a `ClipFillColumn` (fill + overflow:hidden, NOT yet added);
  desc-wrap (column-context grow+clip) same; row3 + meta-left/center/right
  (grow/wrap/center/no-shrink clusters at gap:4) → grow/wrap cluster variants
  (not yet added). name flex:1 can DROP (justify:between makes it identical; keep
  min-width:0). The desc clamp measurement (scrollHeight−clientHeight on the desc
  span) is load-bearing — keep the span's intrinsic overflow:hidden. Needs either
  a StatusCard showcase added first, or a DOM-structure `.layout.test.tsx` guard
  plus property-by-property CSS equivalence. Left for a focused follow-up rather
  than shipped blind on the shared checkout.
- [x] Panel (geo 17) — DONE. Frame `.sui-panel` (display:flex column + overflow:clip)
  → composed `ClipColumn`; header (flex/align-center/gap:8) → `ClusterRow` (gap 8=sm
  exact); content region (flex:1;min-height:0;overflow:auto) → new `ScrollFillColumn`.
  `fill` keeps only its non-geometry `height:100%;min-height:0` in Panel.css (height
  is not layout-purity-banned; the flex-column comes from the composed Stack). All
  sui-panel* classes retained as theming/structure hooks (corner brackets, clip-path
  corners, edge accents, header border unaffected). Verified: canary InfoPanels
  pixel-identical, Panel showcase all corner variants clip cleanly, layout-skeleton
  fill panels still expand/scroll. **New column-context vocabulary** (see below).
- [x] Surface (geo 11) — DONE (keystone). direction/align/gap now delegate to a
  composed inner `Stack`(column, `fill`)/`Row`(row) instead of flex/gap/align-items
  on the surface div; the `surface--dir/align/gap` classes stay as inert
  back-compat hooks (tests still assert them). Public props byte-identical; a bare
  Surface (no direction) still renders a plain block div with NO wrapper, so every
  idle/active InteractiveCard is untouched (canary pixel-identical incl. the bright
  active-selection glow). Column wrapper `fill` preserves bottom-pinned meta rows
  (StatusCard row3 margin-top:auto). Gap snaps sm(6)/md(12)/lg(20)→sm(8); only
  live gap in the tree is `sm` (+2px). Active-state bg/border suppression (fbc65b0)
  untouched. `text-align:center` on the stretch variant kept (non-geometry).
- [x] ActionListItem (geo 20) — DONE. Root row → ClusterRow (gap sm exact); meta
  cluster → NoShrinkClusterRow (flex:none, gap 6→sm +2); assignee roster →
  TightClusterRow (gap 3→xs +1). No new variants — reused existing. The
  self-contained icon-button caps (open flex:none; dismiss flex:none +
  align-self:stretch + negative-margin semicircle) STAY as intrinsic
  single-widget geometry (the component's own header declares them
  deliberately-local, non-reusable row chrome; per-child align-self on a
  non-Layout <button> can't be wrapped without breaking the negative-margin
  flush-to-edge cap). Hover-geometry invariant preserved (only flex/gap/align
  moved to Layout classes). Verified on the action-list showcase incl. a hover
  revealing the full-height dismiss cap.
- [x] ActionList (geo 6) — DONE. Wrapper column → NarrowStack, selection bar →
  ClusterRow; bar's accent styling + margin-right:auto spacer kept. Props unchanged.
- [x] ButtonGroup (geo 7) — DONE. Marked layout-exempt (DEPRECATED-as-such) in
  the header + prop docs. Pure-path curried variants ALREADY existed
  (`ButtonGroup`/`VerticalButtonGroup`/`BorderedButtonGroup` in variants.ts) — no
  redundant H/VButtonGroup aliases added (#2 rule). Runtime gap/orientation
  props kept unchanged; zero breaking changes.
- [x] ProgressCard (geo 18) — DONE. Header→ClusterRow, steps→TightClusterRow,
  each step + connector→no-shrink ActionSlot. Step circle/icon keep their
  intrinsic glyph-centering flex (single-glyph badge, not child arrangement).
  Props unchanged.
- [x] WorkProgressCard (geo 14) — DONE. Outer column handled by the composed
  Surface (direction="column"). Only consumer-facing arrangement is the header
  (claimed + status) → new `BaselineSpreadRow` (align:baseline, justify:between;
  header had no gap, +sm min-gap is invisible under space-between). The bar strip
  (bar-wrap/bar/seg/sign) is an INTRINSIC single-widget internal — a progress bar
  rendering its own data-derived fill segments + a self-centering sign badge — so
  its flex stays (standing ruling: single-widget internals stay; ProgressCard
  precedent). Title/subtitle/claimed keep intrinsic clamp/ellipsis. Verified on
  the work-progress-card showcase (headers spread, bars pinned, signs centered).
- [ ] BatchBar (geo 12)
- [x] BulkActionBar (geo 7) — DONE. Sticky-bottom overlay anchoring kept in CSS;
  root spread → SpreadRow (gap 16→sm snap), actions → ClusterRow. Props unchanged.

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

## P2 friction — RESOLVED (Peter, 2026-07-14)

- **Gap scale: snap EVERYTHING to xs(4)/sm(8).** No md/lg on Stack/Row. 12px→sm,
  16px→sm, even when visible; no tolerance gate; nothing blocks on gap size.
  Note each snap in the commit. (Grid/AutoStack keep their own md step.)
- **ButtonGroup → `layout`-exempt but DEPRECATED-as-such.** Keep its runtime
  gap/orientation API working unchanged (zero breaking changes); ADD curried
  variants (`HButtonGroup`/`VButtonGroup`) for the pure path; consumers migrate
  later. Ticked as exempt below.
- **no-shrink cluster + justify-end wrap variants** — within standing authority;
  add as named variants when a migrating component needs them.

## P2 sequencing finding — do the layout-owning primitives before the cards

Reading StatusCard/WorkProgressCard surfaced a dependency the P2 order doesn't
account for:

- **The cards delegate their OUTER column to `Surface`** (`<Surface
  direction="column" gap="sm">`). Migrating `Surface` will change/retire those
  layout props, so the cards' outer composition is defined by the Surface pass —
  doing the cards first means reworking them after Surface.
- **The cards' inner geometry is column-context growth/clip** (`flex:1;
  min-height:0; overflow:hidden` fill/desc regions; `flex:1` meta cells;
  baseline spread rows). The Layout vocabulary today is row-context
  (`GrowBox`=min-width:0). Migrating StatusCard alone would spawn ~6–8 ad-hoc
  column-context variants (baseline-spread, clip-fill-column, clip-grow-column,
  no-shrink-wrap, grow-wrap-cluster…). Those same variants are what `Surface`
  and `Panel` need — better designed ONCE with the primitives than ad-hoc per
  card.

**Recommendation:** re-sequence P2 to **Surface → Panel → (cards: StatusCard,
WorkProgressCard) → ActionListItem → BatchBar.** The primitives establish the
column-context variant vocabulary; the cards then compose it cleanly instead of
each inventing its own. (Raised with team-lead 2026-07-14.)

### Vocabulary gaps the remaining P2 needs (design once, with the primitives)

Enumerated while reading StatusCard, WorkProgressCard, ActionListItem:

- **Column-context growth/clip** — `flex:1; min-height:0` fill columns and
  `overflow:hidden` clip regions IN a column. Today only `FillColumn` (no clip)
  and `ScrollColumn` (scroll, not clip) exist; `GrowBox` is min-*width*:0 (row
  context). Need e.g. `ClipFillColumn`, a column-context grow-clip box.
- **Per-child cross-axis alignment (`align-self`)** — ActionListItem's dismiss
  cap uses `align-self: stretch` to span the row height. A `Row`'s single
  `align` prop can't express per-child alignment. Needs an `AlignSelf*` Box
  variant (or a Box `alignSelf` prop) — a real vocabulary addition.
- **No-shrink on intrinsic buttons/icons** — `flex:none` on self-contained icon
  buttons (open/dismiss caps). Clean route is wrapping in `ActionSlot`, but that
  nests a div around each button; worth deciding the idiom (wrapper vs a Box
  `shrink` on the button-owning primitive) before doing it 6× per row.
- **Baseline spread** — `align:baseline; justify:between` (StatusCard row1).
  A `BaselineSpreadRow` variant covers it (trivial, add when first used).

These are shared across Surface/Panel/the cards/ActionListItem — hence the
recommendation to establish them WITH the primitive pass, not ad-hoc per card.

### Column-context vocabulary ADDED (Surface + Panel pass, 2026-07-14)

- **`ScrollFillColumn`** (`Layout/variants.ts`) — `flex:1 1 auto; min-height:0;
  overflow:auto`. The column-context scroll region (vertical analogue of
  `ScrollColumn` which is row-context `min-width:0`). No baked gap. Used by Panel's
  content region; the go-to for any "fills the leftover column height AND scrolls
  its own vertical overflow" region (e.g. StatusCard's future desc-wrap).
- **`ClipColumn`** (`Layout/variants.ts`) — a flex column that clips overflow
  (`overflow: clip`, not `hidden` — not a scroll container). Vertical sibling of
  `ClipBox`. For a bounded frame that clips decorative bleed / a clip-path notch
  while delegating scroll to an inner `ScrollFillColumn`. Used by Panel's frame.
- **Surface's column delegation** — a bare `Stack`(column, `fill`)/`Row` composed
  inside Surface when `direction` is set; the cards that pass
  `<Surface direction="column" gap="sm">` now get this for free.
- Still OPEN for the cards/ActionListItem: **per-child `align-self`** (dismiss-cap
  stretch) and **`FillColumn`+`overflow:hidden` clip-fill** (already have
  `FillColumn` no-clip and `ScrollFillColumn` scroll; a `ClipFillColumn` = fill +
  `overflow:hidden` is the remaining gap, add when StatusCard's desc-wrap needs it).

## Progress log

- 2026-07-14 — P0 complete: commandment recorded (STYLE_GUIDE + decision-tree),
  skill written, harness landed, this plan doc created.
- 2026-07-14 — P2 in progress: rulings recorded; migrated ActionRow,
  BulkActionBar, ActionList, ProgressCard; ButtonGroup marked exempt; Badge
  family audited intrinsic. Added `NoShrinkClusterRow`/`EndWrapRow`. Suite green
  (1557). Surfaced the sequencing finding above before StatusCard.
- 2026-07-14 — Peter's 4 rulings recorded (STYLE_GUIDE + skill). **P1 pilot
  complete (6/6):** AssigneeChips, WorkerCard, ProductGridCard, LabeledDivider,
  FormComposite, DiffPair all migrated; WorkerCard clip retrofit via ClipBox.
  New Layout vocabulary added: `ChipCluster`, `ClipBox`, `CenteredColumn`,
  `BaselineWrapRow`, `LabelValueGrid` variants; `AutoStackRow`/`AutoStackItem`
  and `Grid` primitives. Each has a `*.layout.test.tsx` guard; full suite green
  (1547). Next: P2 high-traffic composites.
