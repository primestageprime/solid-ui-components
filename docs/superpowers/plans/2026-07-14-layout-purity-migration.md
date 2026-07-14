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
- [x] Card/StatusCard (geo 41) — DONE. A `dev/showcases/status-card.tsx` showcase
  was added first (separate commit 4ee4cee — closes the standing "core card with
  no showcase" gap) so the migration is visually verifiable. Outer column is
  handled by the composed Surface. Migrated: row1 → `BaselineSpreadRow` (name
  drops flex:1 — space-between separates the pair; min-width:0 + ellipsis stay
  intrinsic; status stays an intrinsic badge slot); row2 → `ClipFillColumn`
  (gap 6→sm); desc-wrap → `ClipFillBox`; actions → `TagRow` (gap 6→xs,
  flex-shrink:0 dropped); row3 → `ClusterRow` (gap 6→sm) with the three cells →
  `GrowWrapRow` / `GrowCenterRow` / `TightNoShrinkClusterRow` (gap 4=xs exact);
  margin-top:auto pin kept. Intrinsic kept: name ellipsis, desc clamp
  (scrollHeight−clientHeight measurement is load-bearing), status slot, the
  absolute "more"/popover overlay (overflow-y:auto is the overlay's own scroll).
  Verified on the new showcase: pixel-identical, incl. the active/selected
  re-tint (accent border+wash) AND the clickable hover re-tint (muted border) —
  both flowing through the preserved Surface --surface-bg/--surface-border path.
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
- [x] BatchBar (geo 12) — AUDITED, INTRINSIC (no migration). BatchBar is a
  self-contained progress-bar widget: every region it lays out (done / inflight /
  per-batch stripe / eased fill) is DATA-derived from `batches`/`totalRows`/
  `donePct`/`fillFrac`, never a consumer child. Its wrapper flex-row +
  align:stretch + overflow:hidden mask and the inflight stripe column are the
  widget rendering its own fill — a single-widget internal, same category as
  WorkProgressCard's bar strip, ProgressCard's step circles, and the Badge
  family. Per the standing ruling ("intrinsic single-widget internals stay —
  don't build absurd wrappers") this is left as-is, ticked intrinsic.
- [x] BulkActionBar (geo 7) — DONE. Sticky-bottom overlay anchoring kept in CSS;
  root spread → SpreadRow (gap 16→sm snap), actions → ClusterRow. Props unchanged.

#### P3 — form / overlay controls

- [x] Inputs/ThemedInputs (geo 3) — DONE (field-composition ⇒ migrate). Covers all
  three consumers of `.themed-input-group` (ThemedInput, ThemedTextarea,
  NameInput) sharing ThemedInputs.css. The field column (label above input,
  `flex:1; min-width:0` growing in a form row) → new `GrowColumn` variant (the
  column-stacking analogue of GrowBox; no baked gap). The label keeps its own
  `margin-bottom:8px` (margin is not layout-purity-banned) for the label→input
  spacing, so no gap variant was needed. Verified on the inputs showcase:
  pixel-identical label/input spacing and widths; full suite + QuickFilter (which
  composes ThemedInput) green.
- [x] Checkbox/Checkbox (geo 6) — AUDITED, INTRINSIC. A self-contained inline
  labeled control: its `inline-flex`/align/gap center its OWN painted box +
  its OWN `<label>` (rendered from the `label` string prop + `labelPosition`,
  never a consumer child). Same category as the Badge family / Toggle. Also it is
  INLINE (`inline-flex`) — the Layout Row/Stack are all block-level `display:flex`,
  so composing a Row would turn the control into a full-width block. Left as-is.
- [x] Checkbox/CheckboxField (geo 6) — DONE (field-composition ⇒ migrate, per the
  discriminator). A `dev/showcases/checkbox.tsx` was added first (4647dea — closes
  the Checkbox-family showcase gap). Root row → `TopClusterRow` (align:start keeps
  the box on the first text line, gap 10→sm); label/hint column → `TightStack`
  (gap 2→xs). Only the text column's `min-width:0` remains in CSS. Verified on the
  new showcase: pixel-identical box-to-text alignment and label/hint spacing
  across checked/unchecked/no-hint/disabled.
- [x] Toggle (geo 6) — AUDITED, INTRINSIC. Same as Checkbox: an inline
  (`inline-flex`) labeled switch centering its own track/slider + its own
  `<label>` (from the `label` prop), plus a thematic pill variant that is itself a
  self-contained control. Prop-derived parts, inline-level → intrinsic, left as-is.
- [x] SegmentedInput (geo 14) — AUDITED, INTRINSIC. An INLINE-level stepper control
  widget (`.sui-segmented-stepper` is `inline-flex; fit-content`), rendering its
  own chevron buttons + value cell (each centering its own glyph). Same category
  as SegmentedControl per the inline-level discriminator — block Layout Rows can't
  express it. Left as-is.
- [x] SegmentedControl (geo 6) — AUDITED, INTRINSIC (no migration; Peter-precedent
  via team-lead 2026-07-14). Its segments are DATA-derived (`<For each={options}>`
  → `<button role=radio>`) with intrinsic groove-seam chrome — a single
  self-contained control widget rendering its own strip, same category as
  BatchBar / the Badge family. Decisively: the root is INLINE-LEVEL
  (`inline-flex; width:fit-content; align-self:start`); our Layout Row/Stack are
  all BLOCK-level `display:flex`, so composing one would break the content-width
  inline placement, and spinning up an inline-row primitive for a single consumer
  fails the start-minimal commandment (add it when a SECOND inline control demands
  it). Left as-is. See the inline-level discriminator in the rulings section.
- [x] DayOfWeekPicker (geo 6) — DONE (compose Grid, ruling 3). 7-col grid →
  `Grid` (`columns="repeat(7, var(--dom-cell-size,3.5rem))"`, gap:xs=4 exact);
  cells intrinsic; only `width:fit-content` remains. Verified pixel-identical.
- [ ] DayOfMonthPicker (geo 7)
- [x] MonthOfYearPicker (geo 6) — DONE (compose Grid, ruling 3; showcase-first via
  876cfa0). Grid container (`display:grid; repeat(4,cell); gap:4`) → `Grid`
  primitive (`columns="repeat(4, var(--moy-cell-size,3.5rem))"`, gap:xs=4 exact;
  the --moy-cell-size var rides on the same element so the track resolves). Cells
  stay intrinsic (each centers its own month label). Only `width:fit-content`
  remains in CSS. Verified on the pickers showcase: pixel-identical 4-col grid.
- [ ] DatePicker (geo 7) — overlay-partial
- [ ] DateRangePicker (geo 26) — overlay-partial
- [ ] Combobox (geo 47) — overlay-partial
- [ ] Select (geo 28) — overlay-partial
- [ ] Dropdown (geo 8) — overlay-partial
- [ ] MultiSelectFilter (geo 24) — overlay-partial
- [x] TagInput (geo 11) — AUDITED, INTRINSIC (field-composition discriminator
  applied; fell to intrinsic). Unlike CheckboxField/ThemedInput there is NO outer
  label|control field-row — `.tag-input` is just position:relative/width:100%.
  Everything else is the control's OWN content: `.tag-input__chips` is the input's
  border/chrome holding the data-derived chip flow + the text field (chips inside
  the input border = intrinsic per team-lead), each `__chip` centers its own
  label+remove, `__input` is the control's text field, and `.tag-input__suggestions`
  is an absolute overlay of data-derived option buttons (overlay anchoring stays;
  a single data-derived option column = intrinsic content, not a multi-region
  composition). Nothing to migrate. Left as-is.
- [x] QuickFilter (geo 5) — DONE. Container column (search input above the
  consumer render-prop list) → `NarrowStack` (gap 8=sm exact). The composed
  ThemedInput is wrapped in an `ActionSlot` (flex:none) so it keeps its natural
  height — this REPLACES the old `.sui-quickfilter .themed-input-group { flex:0 0
  auto }` descendant-override (both the root flex-column and that override are
  now gone from the CSS; only width:100%/min-width:0 + the compact input sizing
  remain). Independent of the ThemedInput labeled-field ruling. Verified on the
  quick-filter showcase: pixel-identical, filtering still narrows the list
  (typed "fuel" → 2 of 6), input holds natural height; canary unaffected.

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

## Component-classification discriminators (team-lead 2026-07-14)

Two reusable tests for "migrate vs keep intrinsic", both settled by existing
precedent (no Peter escalation needed):

- **INLINE-LEVEL control widget ⇒ intrinsic, almost by construction.** If a
  component's root is `inline-flex` / `inline-grid` with `width:fit-content`
  (it sits inline and sizes to content — Checkbox, Toggle, SegmentedControl),
  our block-level Layout Row/Stack/Grid cannot express it without turning it
  full-width. Composing an inline-row primitive for a single such consumer fails
  the start-minimal commandment — wait for a SECOND caller to demand it. Keep the
  inline widget's flex intrinsic (it centers/arranges its OWN prop/data-derived
  parts, like the Badge family).
- **Leaf control ⇒ intrinsic; field-composition ⇒ migrate.** A leaf control that
  renders its own label beside its own painted box (Checkbox, Toggle) is
  intrinsic. A block-level FIELD that composes a control + a label/hint text
  region (CheckboxField, ThemedInput) is a real two-region arrangement → migrate
  (root `TopClusterRow`, text column a tight `Stack`; gaps snap normally).

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
- **`ClipFillColumn`** / **`ClipFillBox`** (added for StatusCard) — fill + clip
  in column context: `flex:1 1 auto; min-height:0; overflow:hidden`. Column is a
  Stack (gap:sm, for a multi-region detail column); Box is block flow (for a
  grow-clip wrap holding a clamped text + an absolute affordance).
- **`GrowWrapRow`** / **`GrowCenterRow`** / **`TightNoShrinkClusterRow`** (added
  for StatusCard's row-3 meta strip) — a growing wrap cluster, a growing
  center-justified cluster, and a tight (xs-gap) no-shrink cluster. Reusable for
  any left-grows / center / right-fixed meta strip.
- Still OPEN: **per-child `align-self`** (ActionListItem's dismiss-cap stretch was
  kept intrinsic; a per-child align-self Box variant is the clean route if a
  future case can't keep it intrinsic).

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
- 2026-07-14 — KEYSTONE pass (fresh-context agent). Migrated **Surface** (3ea7bda),
  **Panel** (23b3cd4), **WorkProgressCard** (74167dd), **ActionListItem** (0769d77);
  each verified on the live gallery (Surface+Panel via the categorical-triage
  canary — pixel-identical incl. the bright active-selection state; WPC on its
  showcase; ActionListItem on action-list incl. a hover-revealed full-height
  dismiss cap). Suite stayed green (1557) throughout; tsc + typecheck:dev clean.
  **New Layout vocabulary:** `ScrollFillColumn`, `ClipColumn` (column-context
  scroll/clip, for Panel), `BaselineSpreadRow` (card headers). **Audited INTRINSIC
  (no migration):** BatchBar, Checkbox, Toggle (all self-contained widgets
  arranging their own data/prop-derived parts — same category as the Badge family).
  **Deferred:** StatusCard (no dev showcase → visually unverifiable here — needs a
  showcase or a DOM-structure guard); CheckboxField + SegmentedControl (genuine
  arrangement questions, own pass). Remaining P3/P4/P5 unstarted.
