# Changelog

## [Unreleased]

### Added

- **`FileDropZone`** — a drop target that is also a click-to-browse picker
  (`FileDropTarget`, `CompactFileDropTarget`). It validates the extension,
  shows a self-clearing rejection notice derived from `accept`
  (`PDF only — drop a .pdf file`), and hands the file to the caller; upload,
  parsing and results stay the caller's. Keyboard-operable (Enter/Space,
  without the page scrolling under it) and `aria`-labelled. Owns a minimal
  structural CSS file for the dashed outline, its drag-over/disabled states
  and the two densities — the same documented exception `Fab` carries, because
  a dashed target is not expressible as a `Surface` variant and the drag-over
  highlight is a state of the component, not of the surface scale. Added
  because two consumers had hand-rolled it, one of them carrying a code
  comment asking upstream for exactly this.
- **`SlotCard` gained an `error` slot, an `action` prop, and two templates.**
  `error` is a danger-toned line at priority 1 (a failure reason never drops).
  `action` (`{ label, onClick }`) mounts a trailing SUI-chosen ghost button on
  templates configured for it — typed rather than a JSX slot so SUI keeps
  owning the button variant — and its click never reaches the card's
  `onSelect`. New templates: `DenseStatusNote` (`DenseStatusRow` plus the
  failure line) and `TitleAssetProgress` (`TitleProgress` plus a
  sub-identifier and the action). Together they cover a work queue's running,
  queued and finished cards.
- **`NoShrinkColumn`** — a Layout variant that keeps its intrinsic width in a
  flex row (`flex-shrink:0`) while stacking its children. The column sibling
  of `NoShrinkClusterRow`: pair it with `GrowColumn` when a fixed data column
  (timestamps, IDs) sits beside a prose column that absorbs the slack.
- **`SectionTable` + `TableSectionHeader`** — a table that groups its rows
  under section headers, and the composable header itself (title + record
  count on one line).
- **`CashflowScrubChart` gained `yPadFraction`** — an optional tight,
  zero-independent y-domain.

### Fixed

- **A `SlotCard` row whose every slot is absent now renders no element at
  all**, so it costs neither markup nor the stack's gap. This is what lets a
  template carry a conditional row (`DenseStatusNote`'s error line) without a
  succeeded card growing a blank line.
- **`SlotCard`'s overlay cards reserve room for their overlays.** The corner
  badge and the remove glyph were landing on the first line of text as soon as
  the text was long enough to reach the corners. The remove ✕ is now revealed
  on hover or keyboard focus rather than always showing, so a resting list
  isn't a wall of ✕.
- **A vertical `Divider` collapsed to nothing in its most common host.**
  `height: 100%` has no definite basis to resolve against in a flex row sized
  by its content, so the rule simply didn't render. It now spans the row via
  `align-self: stretch`, keeping `min-height: 100%` for parents that do have a
  definite height.
- **`observeSize` applied library-wide.** Every remaining measuring component
  constructed a raw `ResizeObserver` writing signals synchronously, which
  re-queues the observer inside the browser's own delivery phase and produces
  "ResizeObserver loop completed with undelivered notifications" (several
  offenders render many times per page — `ResponsiveMoney` once per money
  cell, `createTruncationObserver` once per truncatable cell). Migrated:
  `MultiSelectFilter`, `ResponsiveMoney`, `createTruncationObserver`,
  `useContainerNarrow`, `ScrollRegion`, `OverflowNav`, `StaticSplitLayout`,
  `MessageBubble`, `CashflowChart`, `AnimatedSwimlaneChart`, `SwimlaneChart`,
  `ThroughputChart`, `StatusFlowChart`, `DagChart`. No public props changed
  and no measurement logic moved — only the scheduling. (`BucketQueue`, which
  landed on main after this work, still runs its own multi-element observer.)
- **`MessageBubble` leaked its ResizeObserver** — it was never disconnected,
  so the observer outlived every unmounted bubble. Now disposed via
  `onCleanup`.
- **`observeSize` tolerates entries without size data.** Polyfills and test
  doubles dispatch minimal `{ target }` entries; the primitive falls back to
  measuring the element rather than throwing on `contentRect.width`.

## 0.115.0

### Added
- **`NotificationCenter` gained `when`, `read`, and `onMarkAllRead`.** `when` is
  a pre-formatted relative time the consumer humanizes ("2m", "1d") — SUI ships
  no date formatter, so the string crosses the boundary already rendered. `read`
  drops an item's unread dot and removes it from the derived badge count.
  `onMarkAllRead` is what MOUNTS the pinned footer action: omit it and neither
  the footer nor its divider render, so the panel never shows a dead affordance.
  `markAllReadLabel` overrides the wording. All three are optional and additive.
- **`NotificationItem.tone` is now live.** It was declared in the props from the
  start and never rendered. It now colours the row's glyph well and picks the
  glyph (`info` → info, `task` → clock, `warning` → warning), defaulting to
  `info`.
- **`GrowTightStack`** — a Layout variant that grows to fill its share of a
  parent row and may shrink past its content (`flex:1; min-width:0`) while
  stacking its children with an `xs` gap. The tight sibling of `GrowStack`
  (whose `sm` gap reads as separate sections) for the text column of a
  media-object row. Added because the geometry had no variant — per the
  layout-purity rule, the missing variant is the finding.

### Changed
- **`NotificationCenter`'s panel is now an inbox, not a card stack.** Pinned
  header (label + de-emphasized count lozenge), scrolling rows, optional pinned
  footer. Rows became unboxed media objects — unread gutter, tone glyph well,
  text column — washed and bordered only on hover, so a long feed stays quiet at
  rest. This supersedes the three-line `CompactSurface` card canon the component
  shipped with; the only `Surface` in the panel is now the `PopoverSurface`.
  Precedent recorded in `docs/agents/design-decision-tree.md`, which also gains
  a *Notification / activity panel* branch it was missing.
- **`NotificationCenter`'s bell now has hover and open states.** It previously
  had neither — a bare transparent button, with nothing tying it to the panel
  hanging off it. It now takes a faint accent wash on hover, and while open an
  accent-tinted well with an accent border **plus** the glyph swapping
  `outline`→`solid`. Two independent signals, so the state survives a monochrome
  or colourblind theme. The open skin matches
  `.sui-dropdown--subtle.sui-dropdown--open`. The trigger also gained a fixed
  32px box so its corner badge clears the glyph instead of sitting on it, and
  the badge is ringed in the background colour to punch out of the open tint.
- **The derived badge count now excludes `read` items** as well as `transient`
  ones. Unchanged for consumers that never set `read`.

### Fixed
- **`Link` now carries a type scale (13px/500) instead of inheriting one.** It
  declared only colour, decoration, and cursor, and appears in no theme — so it
  rendered at whatever font-size it happened to inherit, the document's 16px in
  practice. Inside any dense component that made an inline link *larger than the
  0.875rem title above it*, and made it silently disagree with a sibling
  `TextButton` rendering the same affordance. 13px/500 matches `.sui-btn` in
  `themes/_baseline.css` deliberately: a text button and an inline link are
  alternate renderings of the same inline action — one navigates, one calls back
  — so a component that picks between them by `href` presence must not change
  size as a result. **Consumer-visible**: an app using `<Link>` in 16px prose
  will see those links render at 13px; wrap them in the appropriate `Text`
  variant if you want the prose scale back.
- **`NotificationCenter`'s two action branches no longer sit at different
  indents.** The `href` branch used `NavLink`, which is a nav-RAIL item and bakes
  `padding-left:16px` — so a link CTA rendered ~16px right of a `TextButton` CTA
  in the row above it. It now uses `Link` (the unpadded accent anchor, the right
  atom for an inline CTA), and both branches are wrapped in a `ClusterRow` so
  they size to their content and left-pack instead of stretching as column
  children and centring their own labels.
- **`NotificationCenter` item titles use `TextTitle` instead of `TextValue`.**
  `TextValue` is `1.5rem/600` — the metric-readout variant, for numbers like
  "42.3". Against the `0.75rem` detail line that was a 2× scale jump inside a
  340px popover, so a long title rendered as a five-line headline slab.

## 0.114.0

### Added
- **`fn.find`, `fn.findLast`, `fn.findIndex`, `fn.some`** — four more data-last
  helpers in the same dual (curried / direct) shape as `map` and `filter`.
  `find` and `findLast` carry the type-guard overload. `findLast` exists so a
  backward search needs no `.reverse()` link, which the house style forbids.

### Fixed
- **`Icon`'s `edit` and `trash` glyphs are now visible in the gallery.** Both
  existed in `ICON_PATHS` and were exported, but neither appeared in any
  `ICON_GROUPS` array — and the showcase renders the groups, so the two were
  undiscoverable to anyone browsing the icon set. A test now asserts that
  `ICON_GROUPS` covers every `ICON_PATHS` entry exactly once, and that no group
  lists a name with no path. No API change; both names already worked.
- **Bucket sizing no longer assumes a particular `renderItem`.** Four fixes, all
  in service of a consumer rendering whatever it likes:
  `.bucket-queue__row:first-child` used `border-top: none`, making that one row
  1px shorter than the rest — since sizing measures one row and multiplies by
  the count, every bucket under-counted by `(rows − 1)` px and scrolled a sliver
  it had room for (it now hides the border with `transparent` rather than
  removing it); the measured row is taken from the first *populated* bucket
  (bucket 0 is routinely empty, and measuring nothing left everything on the
  `ROW_FALLBACK` constant); the empty strip is measured too, since `emptyLabel`
  is consumer JSX and can wrap; and the `ResizeObserver` now watches the
  row/header/strip rather than only the root, on the `border-box` — a theme
  switch, a late web font or a changed `renderItem` resizes a row without
  resizing the root, so a root-only content-box observer never re-fired.

  **Known limitation:** the model measures one row and multiplies, so rows must
  be uniform within a queue. A `renderItem` whose height varies per item makes
  each bucket's natural height an estimate.

### Changed
- **BREAKING — `ProgressionQueue` is renamed `BucketQueue`.** 0.113.1 exported
  `ProgressionQueue`; that name is gone, with no alias. "Progression" implied
  stepwise forward movement the component never had — direction and distance
  fall out of bucket order, and a move from bucket 3 to bucket 1 is not
  special-cased. Renamed with it: the `sections` prop is now `buckets`, the
  `ProgressionSection` type is now `Bucket`, and the `.prog-queue__*` /
  `data-pq-*` hooks are now `.bucket-queue__*` / `data-bq-*` (`.prog-queue__section`
  specifically becomes `.bucket-queue__bucket`). Consumers importing only
  `SplitQueueList` are unaffected.
- **BREAKING — `onSelect` widens to `(key: string | null) => void`.** `null`
  means the worked bucket drained, so a consumer can clear its detail panel. It
  fires only from the triage advance, never from a click. **`strict: true` does
  not reliably catch this**: passing a Solid `Setter` directly
  (`onSelect={setSelected}`) still compiles, because `Setter`'s overloads absorb
  the wider parameter — and then stores `null` in your signal. Grep for
  `onSelect={setX}` rather than trusting the compiler; the fixed form is
  `onSelect={(k) => setSelected(k ?? undefined)}`.
- **`BucketQueue` is now the library's single queue component.** It gains
  multi-select grouping (`checkedKeys` / `onToggleCheck`, scoped to buckets
  marked `selectable`), roving-focus keyboard navigation
  (`focusedKey` / `onFocusChange`), `scrollToKey`, per-bucket `emptyLabel`, and
  a transfer animation played whenever an item's `bucketOf` result changes.
- **Moving the selected item advances the selection** to the next item still
  waiting in the bucket it left (successor taken from the source bucket's
  pre-move order, skipping anything that departed in the same batch). Processing
  the tail falls back *up* rather than jumping to the top; draining the bucket
  fires `onSelect(null)`. The roving tab stop follows; DOM focus deliberately
  does not move.
- **`renderItem` now returns bare content** — the row owns its padding, so a
  selected row's accent bar can never touch consumer content and the header,
  rows and empty strip share one left edge.
- **Checked rows no longer paint a background fill.** Checking is a bulk action,
  so the tint became a band of low-contrast rows that fought the hover fill. The
  filled checkbox is now the entire treatment.
- **A selected row no longer paints a background fill** — it keeps only the inset
  accent bar, and hover owns the fill. The previous persistent fill sat behind
  row text at too low a contrast.

### Deprecated
- **`SplitQueueList` is a compile shim over `BucketQueue`** and is removed in
  the next major. It is **not** pixel-identical — the merged component draws its
  own chrome. `topCapRows` maps to the resolved bucket's `capRows`;
  `topOnly`, `topFloorRows`, `animationMs` and `rowHeight` are accepted but
  ignored. `static` mode still delegates to
  `StaticSplitLayout`, which is **not** deprecated.

### Removed
- `SplitQueueList`'s two-pane animation engine (`flight`, `play`, `flip`,
  `arrival`, `animation`, and its `layout` module) — ~2,700 lines. Its
  `keyboard` module was not removed — it moved (and was adapted) to
  `BucketQueue/keyboard.ts`.

### Migration
Replace `resolved` / `unresolved` with one `items` array plus `bucketOf`:

```tsx
<BucketQueue<T>
  buckets={[
    { key: "done", label: "Categorized", tone: "success" },
    { key: "todo", label: "Suggestions", tone: "accent", selectable: true },
  ]}
  items={[...resolved, ...unresolved]}
  bucketOf={(i) => (isDone(i) ? "done" : "todo")}
  keyOf={(i) => i.key}
  renderItem={renderRow}
/>
```

There is no `selectMode` prop — pass `checkedKeys` to turn select mode on.

## 0.113.1

### Fixed

- **`NotificationCenter` overlay chrome moved to CSS.** 0.113.0 shipped the component with its trigger + corner-badge positioning as inline `style={{…}}` object literals, which regressed the `health` vision ratchet (`styleRubricViolations` 0→4, `inlineStyleSrc` 75→79) — ADR-0003's inline-style rubric can't categorize `position`/`display`/`cursor`/`border`. The static positioning chrome now lives in a minimal `NotificationCenter.css` (the same overlay-chrome exception `PopoverMenu`/`Dropdown`/`Toast`/`Fab` take); only the dynamic panel position rides inline via the computed `panelStyle()`. No public API or visual change.

## 0.113.0

### Added

- **`NotificationCenter`** (Depth 3) — generic, router-agnostic notification center: a bell trigger with a rolling count badge and a dropdown of notification items (title + optional detail + optional CTA), built as a zero-CSS composite. Handles open/close (controlled **and** uncontrolled `open`), outside-click/Esc close, a busy spinner, and a polite `aria-live` announcement; the consumer supplies `items` and navigates via the `onAction` callback — no `@solidjs/router` dependency and no dependence on consumer CSS. Items render as the three-line card canon (`CompactSurface` → title row / muted detail / accent action). Extracted from thorcasting-ui. `badgeTone` and item `tone` are reserved in the exported types (a single non-danger treatment ships now — minimal-variant rule).
- **`CountBadge`** (Badge family) — count-only rolling corner pill (composes `DigitRoller`) for overlaying a trigger's corner.
- **`PopoverSurface`** Surface Curried Variant + **`Surface` `shadow` prop** — elevated floating panel (bg-elevated, hairline border, drop shadow, 280–360px wide) for overlay controls.
- **`Icon` `bell` glyph** (outline + solid).
- **`.sui-sr-only`** global utility — screen-reader-only clip technique for `aria-live` status regions.

## 0.112.1

### Fixed

- **`setPointerCapture` no longer crashes a drag gesture when its element is disconnected.** `Chart.onPointerDown` called `setPointerCapture` on a stored `svgEl` ref (not `e.currentTarget`); when a reactive re-render or mid-gesture unmount detached that ref, Chromium threw `InvalidStateError`, which propagated uncaught through Solid's event delegation and crashed the consumer app (Vite overlay). The `?.` only guarded the method being absent (jsdom), not it throwing. New shared helper `safeSetPointerCapture()` swallows the two benign, expected failures — `InvalidStateError` (element disconnected) and `NotFoundError` (no active pointer) — and warns on anything else; all four capture sites (`Chart`, `DateAxis`, `ScrubChart`, `DagChart`) route through it, folding `DagChart`'s existing inline try/catch into the shared helper. (Log prefix changed from `[DagChart] setPointerCapture threw:` to `[SUI] setPointerCapture threw:`.)

## 0.112.0

### Added

- **`Auth/` category — `ManagedListSection` + `DismissibleNoticeBanner`** (ruled 2026-07-22): user-confirmed Auth0 account linking (add/remove login methods, two-click confirms, first-use popup-retry) and the unlinked-sibling notice banner, migrated from thorcasting-ui. Both take the auth API via the `auth` Data Prop (structural `AuthApi` in `Auth/types.ts`) — dependency injection; SUI gains no dependency. Apps pass `authApi` from `@primestageprime/auth0-stdb-client`.
- **`NoticeBar`** Surface Curried Variant — full-width flush informational bar (row, center, accent-tinted, radius none) for top-of-app notices.

## 0.111.1

### Fixed

- Build fix: the barrel no longer exports an uncommitted module (0.111.0 failed to publish). No API change from 0.111.0.

## 0.111.0

### Added

- **`BucketQueue<T>`** (ruled 2026-07-22) — a Composite (Depth 2) that stacks N always-present buckets into one full-height bar, bucketing items through their lifecycle as a progression (e.g. terminal-happy on top, terminal-unhappy in the middle, transient at the bottom). Every bucket shows its count at all times. **Sizing is a weighted water-fill measured in JS** (pure CSS can't express it): an empty bucket collapses to just its summary line; a populated bucket shrink-wraps; when the populated buckets overflow the height they share it by `weight`, each capped at its content, so a bucket that shrinks under its share hands the surplus back and the others expand to fill. Chrome is thematically **neutral** — the only role color is a **dot** beside each bucket label. Controlled, optional selection (`onSelect`/`selectedKey`); fills its parent's height or an explicit `height`. Generic over the item type: the consumer owns `buckets`, `items`, `bucketOf`, `keyOf`, `renderItem`. The pure sizing core is exported as `allocateHeights(input)`. Full docs in `COMPONENTS.md`.

## 0.110.0

### Changed

- **`floatCol` displays the value AS GIVEN — it no longer rounds, and the `precision` prop is removed** (ruled 2026-07-22). Rounding a displayed number is a DATA decision, not a display one: it belongs at the storage/query layer (or the calculation function deriving the value) so every view of the same figure agrees, and so a table can't paper over storage imprecision. `floatCol` now groups thousands (pure presentation) and renders exactly the number it's handed. **BREAKING — `floatCol(source, { precision })` no longer compiles; move the rounding to where the value is produced.** If a float shows too many digits, round it in SQL / the store / the calc fn, not in the column.
- **`aggregateCol` and `avgCol` drop `precision` too** — same rule. An aggregate's precision is the `combine` function's job: `avgCol` shows the RAW mean (a mean is rarely a clean number), so a rounded average is `aggregateCol(keys, (v) => Math.round(mean(v)), …)` — the rounding lives in the calculation, never a display knob.
- The low-level `FloatCell` renderer is unchanged and keeps its `precision` prop — it's the primitive escape hatch (`col(…, "float")`, `columnHelpers`), not the curried column. The doctrine applies to the curried `floatCol`/`aggregateCol`/`avgCol` surface.

## 0.109.0

### Changed

- **`FieldTable` runs on `table-layout: auto` — the width model IS the engine** (ruled 2026-07-21). Every column emits `width` = its MAX (auto layout's preferred width) and `min-width` = its MIN; the legacy auto algorithm distributes surplus over minimums ∝ (preferred − min), which is exactly the model's range-proportional rule. The table grows to Σmax and stops; between Σmin and Σmax variable columns shrink proportionally to their range; below Σmin the frame scrolls. Fixed layout (which cannot express min+max) and the 0.108.2 trailing spacer column are retired. Variable columns render their cells inside a size-contained clip block so nowrap content cannot inflate the minimum.
- **Fill mode is shrink-to-fit** (ruled 2026-07-21) — a fill-mode `FieldTable` (no `maxRows`) hugs its content height when the rows fit, and shrinks to the container (inner scroll, sticky header) only when they overflow. Previously the frame carried `flex:1` and stretched a 4-row table into a full-height, mostly-empty panel. Fill mode still expects a definite-height flex parent as its budget; **dside/thorcasting re-eyeball item — fill tables that relied on the frame visually stretching now hug their rows.**
- **Label floors budget the header tracking** (ruled 2026-07-21: headers ALWAYS keep the inter-column gap) — `BaseTable` headers render uppercase with `0.1em` letter-spacing (~0.17ch/glyph at the frame's mono basis) that the raw char-count floor never budgeted, so long-label fixed columns overflowed across the gap into the neighboring header ("CAPTURE EFFICIENCY" ran into "PROJECTED NOX"). The floor now costs labels at `ceil(length × 1.17)`. Label-floored columns are ~17% wider; header spill is structurally impossible.
- **`statusCol` geometry derives from its mapping** — content-fit fixed at the longest badge label plus an 18px badge-chrome budget (the sm badge's own padding/border/letter-spacing, which the flat 9ch geometry never included — a 9-glyph VIOLATION badge is 82px and clipped in its 67px content box). The static 9ch geo remains only as the `col(…, "status")` fallback.

### Added

- **`fields.enumCol(key, values, { tone?, header? })`** (ruled 2026-07-21) — a small fixed-set string column: because the value set is known at configure time, geometry is content-fit FIXED at the longest member (a Before/During/After enum sizes to 6ch instead of textCol's 8–40ch flex). Floored at the header label; left-aligned plain word (not intCol's numbers, not statusCol's badges); null blank; off-set values render muted; any member over 20 characters throws at configure time pointing to `textCol`.
- **Sized text set: `text5Col` / `text10Col` / `text15Col` / `text20Col`** (ruled 2026-07-21) — curried FIXED-width text columns for short strings whose length class is known (codes, phone numbers, short ids). Pick the smallest class the values fit, rounded up to the nearest 5; same ellipsis-with-tooltip cell as `textCol`, floored at the label.
- **Sized name set: `name10Col` … `name30Col` and `identityLink10Col` … `identityLink30Col`** (ruled 2026-07-21) — the same 5-ch ladder for name columns and identity links (the identity column is usually the link). When the name population is known, pick the nearest class ≥ the longest legitimate value; unknown populations keep the survey-driven 50ch `nameCol`/`identityLinkCol` default.
- **`col()` accepts the sized classes** — `"text5"`…`"text20"` and `"name10"`…`"name30"` join the escape hatch's named-geometry vocabulary (flowing alignment), so composite custom cells can be content-fit instead of riding the text flex.

### Fixed

- **Fill-mode `FieldTable` scrolls internally** — the `.sui-field-frame--fill` modifier makes the frame the definite-height flex context the composed fill table needs; the inner `ScrollFillColumn` is the single scroll owner (repro: NOx Report bottom bag table showed only its header).
- **`col()` aligns like the real factory of its geometry** — numeric customs right-align (a dotted-header metric column read differently from its plain floatCol siblings); date/dateTime/selection/chart center; flowing text stays left.

## 0.108.2

### Fixed

- **`FieldTable`: fixed columns stay fixed when the table stretches** — a trailing auto spacer column (empty header/cells, zero geometry) absorbs stretch slack; without it, `table-layout: fixed` inflated every width-carrying column proportionally (a stretched two-column table ballooned its 19ch timestamp). The spacer collapses to nothing at the table's minimum width.

## 0.108.1

### Fixed

- **Field-table headers never overlap their neighbors** (ruled 2026-07-21), three mechanisms:
  - **Label floor** — a column is never narrower than its own header label (`floorGeoAtLabel`; a "Postal Code" header over 5-digit data widens the column instead of painting over the next header). Every labeled factory floors its geometry.
  - **Sort-glyph budget** — sortable mode widens every sortValue-carrying column by the 2ch indicator allowance (`resolveFields(…, { sortable })`), so the ▲/⇅ glyph never rides past the label.
  - **Flexible width basis** — flexible (no-css) columns now emit their floored `minCh` (+ cell chrome) as a width; `table-layout: fixed` splits leftover space equally among width-less columns and ignores `minCh`, which made the floor invisible and ate the standard inter-column gap.
- **Dev catalog panes stretch tables to the available width** — inspection surface, not dashboard tiles; the library's Σmax "tile" cap is unchanged for consumers.

## 0.108.0

### Added

- **`fields.linkedCountCol(source, { href, header?, id?, tone? })`** (ruled 2026-07-20) — an integer drill-down count: a POSITIVE count links via `href`, zero/null renders the plain cell, never a dead link. Built as `withHref` over `intCol` (geometry, formatting, sort, null-blank, tone all inherited); the zero-has-no-destination gate is a count *semantic*, which is the scoped exception to the combinator-first ruling. Spec: `docs/superpowers/specs/2026-07-20-linked-count-col-design.md`.
- **`fields.withHref` / `withHint` / `withWhen` column combinators** (ruled 2026-07-20) — function-first decoration of ANY built column, dual form like `fn`: `withHref(href, col)` links the cell (nullish href → plain cell); `withHint(text, col)` grows a dotted-underline tooltip on the header; `withWhen(pred, col)` renders the cell only when the predicate holds — per-row colspan takeovers collapse to predicate-gated columns (a partial week blanks its stats and shows the row action instead).
- **`fields.group(label, [...members])`** (ruled 2026-07-20) — two-row spanned category headers as a fourth `FieldSpec` variant: the resolver stamps each member with the group label and BaseTable derives the colspan header row (ungrouped columns span both rows). The last "stays raw by design" demand falls — the JTF Table Catalog bench is 31/31 SUI-compliant.
- **`fields.aggregateCol`** (ruled 2026-07-20) — generic aggregate column: the math (sum/mean/custom) is named at configure time, emphasis at int geometry.
- **`EllipsisText` + `createTruncationObserver`** (ruled 2026-07-20) — "if and only if the ellipsis appears, there is a tooltip with the full value." A ResizeObserver-backed truncation hook re-measures on every reflow (the old mount/window-resize measurement went stale on container reflow); `LongTextCell`, `StringCell`, `IdCell`, and `listCol`'s +N-more all route through it.
- **`fn.flatMap`, `fn.prop`, `fn.length`, `fn.lengthOf` + direct application form** (ruled 2026-07-18) — every `fn` helper now applies directly as `map(f, arr)` alongside the curried `map(f)`; function-first property access joins the module.
- **`ACTION_ICONS`: `remove` → trash, `run_checks` → refresh** — the trailing remove-action and conditional run-action columns are now expressible with stock `actionCol`.
- **Health ratchets: `dotChains` + `collectionMethodCalls`** (ruled 2026-07-18) — method chaining and bare collection-method calls are counted and may only go down; `src/fn/` is the sanctioned home for the native calls. ~20 trickle commits migrated existing chains onto `fn` composition.

### Fixed

- **Field tables: right-edge column clipping** — the `<table>` element kept the sans font family, so its ch-based `min-width` resolved ~4.5% wider than the frame's identical budget; `table-layout: fixed` stretched every column past its geometry and the frame clipped the last column mid-glyph (also the cause of overlapping headers on narrow panes). The table element now shares the frame's ONE ch basis (12px mono).
- **`withHref`/`identityLinkCol`: nullish href renders the plain cell** — never a dead link (zero-count buckets, missing spreadsheet URLs).
- **`PopoverMenu`: panel portals to `document.body`** so an `overflow: hidden` ancestor can't clip it; header-slot tests query the portalled panel.
- **`Dropdown` self-themes via tokens** in component CSS.

### Changed

- **JTF Table Catalog bench: 31/31 SUI-compliant; the not-yet-curried demand rail is EMPTY.** The closing rulings (all 2026-07-20): row navigation collapses to the identity cell (`identityLinkCol` is the nav; FieldTable never grows `onRowClick`); per-row colspan collapses to `withWhen`-gated columns + a row action; the QaqcTriage "P% (N)" composite collapses to the linked count; NOx preview's added calls are REMOVED from the picker (they live in the bag table) so `createFieldSelection` covers selection entirely; a known-set string column is `statusCol`, never a flexing `textCol` — the identity column is the table's only flexible one.
- Bench replicas migrated to fields registries: QaqcAssetTriage, Weekly QA/QC, NOx preview + report bag, Cached Vessel Calls, HourLevelDataTable (grouped), HourlyDataTable, Durability, 1000-Hour Manifest, MetricsStatsTable, MinMaxTable, VesselCallNox/RogDetail, NoxWidgets, Fortnight list, PowerLogCacheView.

## 0.107.0

### Added

- **Table-level sorting** (ruled 2026-07-18) — **`SortableFieldTable`** (curried; or `sortable` on `FieldTable`): a sortable table makes every column sortable except types with no valid sort order (selection, actions, lists, charts); no per-column opt-out. Mechanics: `TableColumn.sortValue?: (row) => raw` — field accessors return JSX, so the comparator now reads the raw channel (this also fixes the silently broken sort on all pre-existing field columns); `fields.col()` takes `sortValue` as its 5th argument.
- **`TableQuickFilter`** (ruled 2026-07-18) — the client-side filter module extracted from `FilterableTable`, composable with ANY table: fixed toolbar (input + shown-of-total count), children receive the filtered-rows accessor once so the composed table never remounts while typing. `FilterableTable` is now `BaseTable` composed with it. (Sibling: the generic `QuickFilter` collection filter is unchanged.)
- **`fields.identityLinkCol(key, { href, glyph?, header? })`** (ruled 2026-07-18) — the IdentityLink cell: an entity with a detail page displays its name AS the link by default. Configure-time `href(row)`, optional `glyph(row)`, name geometry, accent ink, blank for empty names.
- **`fn` namespace** (ruled 2026-07-18) — data-last functional utilities + typed `pipe` (12-arity overloads, NO untyped rest fallback — a mis-wired pipe is a compile error): `map`, `filter` (type-guard narrowing), `pluck`, `sortBy` (stable, non-mutating), `sum`, `mean`, `join`, `groupBy`. Self-contained under `src/fn/` (liftable to its own package); 16 call sites migrated off dot-chains.
- **`fields.statusCol` / `fields.listCol` / `fields.avgCol`** (ruled 2026-07-18, shipped post-0.106) — curried badge-mapping cell, comma-list cell with +N-more overflow and full-list tooltip, and configured-keys row-mean cell (accent by default).

### Changed

- **Name columns are FIXED at 50ch** (ruled 2026-07-18) — names never get squeezed; `name`/`identityLink` geometry pins at the survey-backed 50ch cap and ellipsis clips only dirty data past it. The field frame now floors its table at the Σmin budget and scrolls the excess horizontally; the resolver's floor counts css-width columns at their full consumed width.
- **Blank empties in fields** (ruled 2026-07-18) — `textCol`/`nameCol`/`statusCol`/`listCol`/`avgCol` render nullish values as blank, never an em-dash or EMPTY badge; visible placeholders are opt-in only where they carry meaning.
- **Client guidance: curried variants ONLY** (ruled 2026-07-18) — every "use curried variants or `create*()`" note (26 barrels + AGENT_GUIDE) now reads curried variants only; the app-local factory path is removed from the docs. `create*` exports remain for existing consumers pending migration.
- jtf-ui migrated: ViolationsPreview (SortableFieldTable + TableQuickFilter + identityLinkCol vessel, data-layer compliance tones), MissingInfoPreview (statusCol/listCol), FortnightReportBody OCR table, power-log-ocr avgCol. JTF Table Catalog bench: 15 of 32 SUI — the fortnight route group is fully migrated.

## 0.106.0

### ⚠ Breaking

- **`fields.selectionCol` signature** — now takes a `FieldSelection` (from `createFieldSelection({ rows, key })`) instead of `(isSelected, toggle)` positional callbacks, in exchange for the select-all header and shift-range behavior. (The fields system was unreleased pre-0.106, so no production consumer breaks.)
- **`fields.floatCol` precision** — moved from a positional second argument into the options object: `floatCol(key, { precision, tone })`.

### Added

- **Table fields system promoted** (ruled 2026-07-17) — exported from the barrel as the `fields` namespace + top-level **`FieldTable`**. A table is an ordered gesture of field ids resolved against a plain registry object; field types own ALL geometry in ch/em; call sites never see width/align/CSS. `FieldTable` owns the width-budget frame internally and adds `emptyMessage` and a semantic `maxRows` scroll cap (em-based, zoom-proportional). Dedicated `Table Fields` showcase; workshop bench retired.
- **Tone treatment functions** (ruled 2026-07-17) — `intCol`/`floatCol`/`textCol` accept a configure-time `tone: (value, row) => Tone`; `Tone` (`default|success|warning|danger|accent|muted`) lives in `src/types.ts` as the shared semantic vocabulary. Clients name meanings; themes own colors.
- **Generic selection** (ruled 2026-07-17) — `fields.createFieldSelection({ rows, key })` + `selectionCol(selection)`: select-all/none header checkbox (indeterminate over a partial selection) and shift-click range selection across the current sort order (Gmail semantics, keyed anchor; shift-mousedown suppresses the native text-selection smear).
- **`Checkbox`: `indeterminate` prop** — semantic mixed-state for aggregate checkboxes; synced to the DOM property via ref, dash styling in every theme.
- **`ValueMatrix`** (ruled 2026-07-17) — a row-axis × column-axis grid of computed values (NOT a row table): `rows`, `cols`, `value(row, col)`, configure-time `tone(value, row, col)` and `selected(row, col)`, null → em-dash, selected cell wears weight + a soft halo. `createValueMatrix` curries the mapping surface (`rowAxisLabel`/`rowLabel`/`colLabel`/`format`/`tone`) into a domain matrix (jtf's ComplianceThresholdTable is now a thin wrapper; fits thorcasting's viable-price × salaries grid). Dedicated showcase.
- **`fields` humanize** — handles snake_case keys (`metric_id` → "Metric Id") alongside camelCase.

### Changed

- jtf-ui easy-tier tables migrated to `FieldTable`/fields registries (StatisticsSummary, MinMaxTable, ftir-gap-fill, power-log-ocr, FortnightReportBody's seven metric tables); every call-site width/align/color deleted. Field-type catalog for the remaining tiers: `docs/superpowers/plans/2026-07-17-field-type-catalog.md`.

## 0.105.0

### ⚠ Breaking

- **`HeatStack` renders rows in input order** (first item at top). It previously reversed the array ("earliest at bottom"); Peter ruled that a bug — visual order now matches array order. Consumers relying on the bottom-up stacking must reverse their input.
- **`TagInput` removed** — unused by every production consumer (dside, Amygdala, jtf, goose, wellappoint, thorcasting), pruned per the new production-repo prune rule.
- **`BigNumberInput`: deprecated `prefix`/`sign` static-glyph props removed** (superseded by currency masking; no production caller).
- **`MultiSelectFilter`: `optionWidthEstimate` tuning prop removed** (fit estimate fixed at ~90px/option; no production caller ever set it).

### Added

- **`ChartHeader`** — Composed (Depth 2), zero CSS. The standard chart title strip (mono accent title left, muted meta right, spread). `CompletionTimeline` now composes it, removing the last real inline-style cluster in src.
- **`createDropdown` + `InlineSubtleDropdown`** — Dropdown gains the Overrides/DataProps split (`size`/`subtle` curried); `InlineSubtleDropdown` (sm, subtle) is the compact inline-picker form thorcasting configures by hand today.
- **CONTEXT.md: `Structural` Primitive subkind** — chart/SVG-geometry primitives (axes, grids, series, bands) are now a defined third subkind alongside Atomic and Layout.
- **Gallery chrome: `.demo-frame` / `.demo-cols`** — dashed demo frames and comparison columns for visualizing invisible layout components; `stack.tsx` and `row.tsx` showcases recomposed onto them (21 → 2 inline styles).
- **`--sui-series-1..8` categorical data-viz palette** — every theme (default, HUD, bronze, colorblind) now declares eight fixed, CVD-validated series slots; callers colour chart series / legend swatches / category dots by `var(--sui-series-N)` instead of hardcoding hues. Eight is a hard cap; the status tokens (`--sui-success`/`--sui-warning`/`--sui-danger`) are reserved for meaning and never a series slot. See ADR 0003.
- **`BaseTable`: `onRowHover` callback** — fires with the hovered row for cross-highlighting between a table and a linked chart.
- **`Chart`: `responsive` prop** — fills the container width via a `viewBox` aspect ratio instead of a fixed pixel width.
- **Inline-style rubric linter (`scripts/style-rubric.mjs`) + ADR 0003** — a compiler-API walker classifies every `src` inline style against a category allow-list (`scripts/style-rubric.json`); a static-literal inline is now a `styleRubricViolations` health violation (ratcheted at 0). Curried variants in `variants.ts` are the sanctioned home for static presentational config.
- **Production usage manifest (`scripts/usage-manifest.mjs` + `docs/usage-manifest.json`)** — surveys which SUI exports each production consumer (dside, amygdala, jtf, goose, wellappoint, thorcasting) actually imports; `--check` guards the manifest against drift in the pre-push gate.
- **12 curried variants promoted for the jtf-ui migration** (real call sites, no new props/components). Text: **`EmphasisBody`** / **`AccentEmphasisBody`** (inline bold 600, plain + accent), **`NoteText`** (italic sublabel note), **`WarningBody`** / **`SuccessBody`** (status-tinted body, joining `DangerBody`), **`DangerSublabel`** (inline error caption), **`CaptionLabel`** / **`AccentCaptionLabel`** (uppercase letter-spaced section captions, secondary + accent), and **`TopicTitle`** (`title` variant, `as="h4"` — the h4 level of the `PageTitle`/`SectionTitle`/`SubsectionTitle` heading series). Button: **`SmallOutlinedButton`** (outlined, sm). Modal: **`PrimaryConfirmationModal`** (md, clip, primary) / **`LargePrimaryConfirmationModal`** (lg sibling).

### Changed

- **Workshop benches count toward showcase purity** (ruling reversal): benches use curried SUI layouts/text for chrome like any showcase; inline styles only for genuinely dynamic experiment geometry.

### Fixed

- **`StackedProgressBar` segments actually stack now.** Solid silently drops the first of two computed keys in a style object literal, so the cumulative `left`/`bottom` offset never rendered — every segment sat at the start edge, overlapping, since the component's inception (found by the new test batch, verified in Chrome). Fixed with explicit per-orientation style objects; regression test asserts the offsets.
- **`HotkeyButton.isEditableTarget`** now returns a real boolean (`isContentEditable ?? false`) instead of `undefined` for non-editable elements.

### Added

- **`npm run health`** — vision-adherence health check with a CI ratchet (`scripts/health.mjs` + `scripts/health-baseline.json`, new `health` job in ci.yml). Mechanical KPIs — bare hex colors in CSS/TSX, inline `style={{}}` counts in src and showcases, folders without tests, undocumented components, missing Depth headers — may only decrease; a deliberate increase requires committing an updated baseline. `--verbose` lists offenders, `--update-baseline` locks in improvements.

### Removed

- **`hopper.tsx` ("All Components") deleted from the gallery.** The legacy kitchen-sink showcase predated the workshop system; every component it demoed has a dedicated showcase.
- **`animation-experiments.tsx` moved to `workshop:animation-lab`** — the animation R&D lab is now a proper bench (`dev/showcases/workshop/animation-lab.tsx`) with a strict lab contract in its header (named isolated experiments, real library internals only, leaf module, extract-then-A/B). Workshop benches are labs and are now exempt from the showcase-purity health KPI.

### Fixed

- **Token purity extended to TSX/TS: all remaining bare hex colors removed from src.** `SidebarSelector` demo fixtures, `MetricValueCell`'s violation default, `ConversationTree` bubble colors, `WorkProgressCard`'s bar palette, and `WarningTitle` now use `--sui-*` tokens (originals kept as fallbacks); the health scan now covers `.ts` files too. Static inline styles in `Section`, `CensusView`, and the `SidebarSelector` demo moved to their component CSS.
- **`StatusCard` no longer crashes on mount when `ResizeObserver` is unavailable** (jsdom/SSR) — guarded like `MessageBubble`.
- **Test coverage: 23 previously-untested component folders now have tests** (+125 tests; issue #48 phase 4 batches 1-2). 46 component headers gained explicit kind/depth declarations; 27 uncataloged components documented in COMPONENTS.md; worst showcases (recent-starred, progress-card, checkbox) recomposed with curried vocabulary.

- **Token purity: all 25 bare hex colors removed from component CSS** (plus `GroupedTable`'s inline `#ff6b6b` → `var(--sui-danger)`). Every hardcoded color now derives from a `--sui-*` token with the original value as fallback: dark-text-on-accent → `var(--sui-bg-deep)` (Button/ActionRow/AssigneeChips, matching SegmentedControl's precedent), Alarm reds → `var(--sui-danger)`, MathFormula number gold and RecentStarred star colors → `var(--sui-warning)`, RecentStarred surface palette → bg/border/text tokens, Table info-tag blue → accent tokens, and derived shades (CashflowChart project/onetime bars, Table danger hover, Alarm count tint) via `color-mix()` on the token. Themes now retint these components; under the default theme values shift only marginally toward their semantic tokens.

- **`Sparkline`** — Atomic (Depth 1). Generic inline SVG polyline sparkline with `line` and `sawtooth` modes; color is prop-driven (`var(--sui-accent)` default). Complements `TrendSparkline` (trend-colored) and `HeartbeatSparkline` (0..1 health strips).

## 0.104.0

### Added

- **Choreography module (public API)** — `choreograph`/`step`/`weightedStep`/`commit` sequence named animation EFFECTS (`collapse`, `expand`, `fadeIn`, `fadeOut`, `slideDown`, `rollUp`, `glowIn`, `settleIn`) across components around an explicit state-commit point; targets are `data-anim` handles (spread via the `anim(handle)` helper). Weight-fractions of one timing budget; hidden-tab hardened. Exported from the root barrel.
- **`GhostRow` / `IndentedGhostRow`** — de-emphasized clickable row (dim unless `selected`, pointer only when clickable; indented form for rail children). `createGhostRow` factory.
- **`createIcon` + `InlineMetaIcon`** — Icon gains the Overrides/DataProps split (`variant`/`size` curried, `name` stays data); `InlineMetaIcon` (outline, xs) ships for icon-beside-sublabel meta rows.
- **`createThreePanelLayout`** — geometry props (panel widths, height, aside cap) become curry-able Overrides so apps bake their layout rulings once.
- **`NoWrapSublabel`** — Text variant with `white-space: nowrap` baked (trailing meta that must stay one line).

### Changed

- **Numeric counts roll by default.** `DigitRoller` now auto-tracks its previous value: a bare `<DigitRoller value={n}/>` rolls odometer-style (direction-aware) on every change — `previousValue` becomes an optional override for replaying a specific transition, and `animate` defaults to true (`animate={false}` opts out). `CountChip` and `TagPill` (purely-numeric plain labels) compose it internally, so every count in the library gets the roll with zero call-site changes. Caveat: the roll requires the component instance to SURVIVE the value change — lists that rebuild row objects each update must render with `<Index>`/stable keys, not `<For>` (see the new STYLE_GUIDE "List Identity" section).

## 0.103.0

### ⚠ BREAKING

- **Layout Purity migration — the entire library recomposed.** All 95 components were migrated to the new Layout Purity commandment (STYLE_GUIDE.md): no component owns box-model geometry (`flex`/`grid`/`gap`/`align`/`justify`/`overflow`) — everything composes named `Layout` variants. Public **props are byte-identical** (zero call-signature changes), but the rendered **DOM wrapper structure and internal class names changed across the library**: consumer CSS that targets a component's internal classes or relies on its exact element nesting may break. Off-scale internal gaps (6/12/16px) were snapped to the `xs(4)`/`sm(8)` scale, so small visual spacing shifts are expected.
- **`createBox`/`createStack`/`createRow` factories: caller `style` no longer clobbers baked style.** The factories previously shallow-merged, so a caller's `style` object wiped the variant's baked styles entirely — which shipped `ScrollYBox` (and every scroll variant) with its `overflow` silently deleted whenever a consumer passed `style={{ "max-height": … }}`. Styles now merge per-property (baked first, caller wins). Any consumer that depended on full-object clobbering will now see the variant's baked properties come through.

### Added

- **~28 new Layout variants + 2 primitives** — role-named vocabulary demanded by the migration, including `Grid`/`createGrid` and `AutoStackRow`/`AutoStackItem` (responsive 2-D primitives), `ClipBox`, `ScrollBox`, `ScrollFillBox`, `ScrollXBox`, `ScrollYBox`, `ScrollFillColumn`, `ClipFillColumnFlush`, `CenteredColumn`, `LabelValueGrid`, `ChipCluster`, `BaselineWrapRow`, `GrowClusterRow`, and more — each with a when-to-use comment in `Layout/variants.ts`.
- **`Icon`: `pause`, `agent`, `dependency` glyphs.** `agent` (robot head) is the automated counterpart to `user`, mirroring dside's `Species: Human | Agent`.
- **`HotkeyButton`: optional leading `icon` prop** (backwards compatible) — associates an action with its thematic glyph.
- **`typecheck:dev` gate** — `tsconfig.dev.json` now compiles the dev gallery, and CI enforces it, so the Overrides/DataProps currying rules are type-checked at every call site including showcases.

### Deprecated

- **`ButtonGroup`** — tagged `layout` but deprecated; migrate to the curried variants shipped alongside. No breaking change; existing call sites keep working.

### Fixed

- **`Divider` — rendered nothing.** The CSS set `border:none` and a 1px box but never a color, so solid dividers were transparent and dashed/dotted had no border style at all. Now draws `var(--sui-border)` in all orientation/variant combinations.
- **`Surface` — `active` state was invisible on variants with baked colors.** `bg`/`borderColor` are applied as inline styles, which silently overrode the `.surface--active` class, so `InteractiveCard active` (and any colored variant) never showed its selection. Active now owns background/border. Also themed the active colors (`--sui-accent` tokens replace hardcoded cyan).
- **`BaseTable` / `DataTableContainer` / `SelectableTable` — `maxHeight` scroll actually scrolls.** Consequence of the style-merge fix above; `SelectableTable` additionally had a latent regression (it read a no-longer-overflowing container style) that the migration restored.

## 0.102.0

### Added

- **`ScenarioGlyph`** — Atomic (Depth 1), Badge family. The accent-coloured, filled-or-hollow, **shaped** sibling of `ScenarioDot`: where `ScenarioDot` is always a circle, `ScenarioGlyph` renders any `ShapeGlyph` shape (`circle` / `chevron` / `diamond` / `square` / `pentagon` / …) so a scenario is recognisable by its **shape** as well as its colour — the same glyph on its chip, its calibrate column header, and its config-membership icons. `filled` → a solid glyph (the selected scenario / the drawn line); omitted → an outline only (unselected). Wraps the SVG-only `ShapeGlyph` primitive in an inline `<svg>` (with `overflow: visible` so a full-diameter hollow stroke never clips) so it drops into a text row exactly like `ScenarioDot`. Props: `color`, `shape`, `filled?`, `size?` (default 10), plus pass-through span attrs (`title` for hover). Data-only, no curried variant.

### Changed

- **`ShapeGlyph` — new built-in shapes + a `hollow` mode.** Added `diamond`, `square`, and `pentagon` to the built-in `Shape` union (centered in the 16×16 viewBox alongside `chevron`/`chevron-down`/`pin`). Added a `hollow?: boolean` prop that renders any shape — **including `circle`, which previously could not** — as an outline: no fill, the descriptor colour becomes a min-weight stroke. Strictly additive; existing filled call-sites (`PinMarkers`, `GhostPin`, chart markers) are unchanged.

## 0.101.0

### Added

- **`ServiceHealthDot`** — Composite (Depth 2). 6px dot + name label for app-shell navbar liveness clusters. Alive: success color, opacity decays `max(0.15, 1 − (ageMs/staleThresholdMs) × 0.85)` toward the staleness horizon. Dead (`ageMs` null/undefined or ≥ threshold): danger color at full opacity with a 1s pulse animation. Hover reveals a popover with service name, age label, a `HeartbeatSparkline` (`state="connected"|"error"`), and a `Xs ago / now` footer. No internal clock — pure render of caller-supplied `ageMs` + `samples`; the 1 Hz tick and history accumulation live in the caller. No curried variant (all props are data). Key props: `name`, `ageMs`, `staleThresholdMs` (default 15 000), `samples`. Ports the hand-rolled `ServiceDot` from rhinotools/AppNav.tsx with inline hex colors swapped to `--sui-success` / `--sui-danger` / `--sui-text-muted` tokens.

- **`CensusView`** — Composite (Depth 3). Bucketed census composition: tables grouped by size/access bucket, each rendered as a compact sticky-header `BaseTable`. Click-to-select opens a sticky `InfoPanel` detail rail with row counts (`NumberWithUnits`), field-type chips (`CountChip`), schema list, and an optional `actions` slot. Quick-filter (`QuickFilter`) narrows all buckets simultaneously. Gap column uses `GapCell`. Status badges mapped from `NormStatus` → `StatusBadge` variant. Exports: `CensusView`, `CensusTable`, `CensusColumn`, `NormStatus`, `CensusBucketId`, `CensusViewProps`, `CENSUS_BUCKETS`, `bucketOf`.

- **`GapCell` / `gapSeverity`** — Remaining-work table cell for census/migration gap columns: bold count + percentage + a 40×4 completion bar, colored by severity ramp (0%→success, ≤50%→warning, >50%→danger). Blank when uncounted. Pure `gapSeverity()` function exported for tests/reuse.

### Changed

- **Docs/showcase coverage** — Added `TrendSparkline` showcase (up/down/flat fixtures, `yDomain` shared-scale example, live-appending signal demo) and registered it in the dev gallery. Added `COMPONENTS.md` entries for `RingChart`, `WorkerCard`, and `TrendSparkline` with APIs sourced directly from component source files.

## 0.100.0

### Added

- **`AssigneeIcon` (`title` data prop)** — hover text carrying the FULL name (or a richer status line) behind the ambient initials; falls back to `initials` when omitted (previous behavior). Also feeds the `aria-label`. Initials are for the ambient display; `title` is for recovery — pass the full display name wherever a roster uses `deriveInitials`. Flows through `ActionListAssignee` (alias of `AssigneeIconProps`) with no ActionList change.

## 0.99.0

### Added

- **`AssigneeIcon` (`size` Override + `createAssigneeIcon`)** — the outline person/AI glyph gains its first presentational knob: `size` (glyph height in px; width keeps the 25:23 box, and the SVG viewBox scales stroke + initials with it). Per the currying rule it is an Override — freeze it with `createAssigneeIcon({ size })` (new factory, with `AssigneeIconOverrides`/`AssigneeIconDataProps` split); the bare `AssigneeIcon` export is unchanged: zero-config, 23px row default, data props only (`initials`/`kind`/`active`). Motivating caller: dside's navbar presence cluster, which needs the same glyphs as its ActionList rows, just bigger.
- **`composeTagPairs(tags, cfg)`** — pure, reusable helper in the Badge family (`src/components/Badge/tagPairs.ts`, exported from the family index and root barrel). Turns a flat list of `SourceTag` (`{ dim, value }`) into presentation-ready `ComposedTag`s for TagPill / ActionList tags. A pair rule (`{ parent, child }`) whose **both** dims are present collapses those two tags into ONE split lozenge of the two VALUES — the dim names drop out of sight but survive in the `title` for hover recovery (`customer:stax` + `project:jtf` → key `stax`, value `jtf`, title `customer: stax · project: jtf`, `sources` = `[parent, child]`). A dim present **without** its partner is not abbreviated and falls through to the labeled form (`key = dim`, `value = value`, title `dim: value`). Deterministic: pairs emit first in rule order, then the remaining labeled tags in input order — or by `cfg.order` (unknown dims after, stable) when given. Each source tag is consumed at most once; a duplicated dim pairs on its first occurrence and extras stay labeled. Pure, no DOM; empty inputs return `[]`.

## 0.97.1

### Fixed

- **`<Chart>` — drag that leaves the plot** — a click-drag range selection now (1) still ends and **commits** when the mouse button is released **outside** the chart, and (2) reads a drag past an edge as "dragged to the end of the chart" instead of freezing the selection at the last in-bounds pixel. The `<svg>` takes **pointer capture** on `pointerdown`, so `pointermove`/`pointerup` keep firing after the pointer leaves its bounds; `pointerleave` no longer cancels an in-progress drag while capture is held; and drag extension maps the pointer through a plot-**clamped** x (the crosshair keeps the nullable mapping, so hover still hides off-plot). All capture calls are optional-chained (jsdom implements none). Affects any chart composing `<DragRangeSelect>` / `<CommitOnReleaseDragRangeSelect>`.

## 0.97.0

### Added

- **Cashflow / money primitives** — new `ScenarioDot` badge, `ResponsiveMoney`, and an internal `money` formatting helper, plus refinements to `CashflowScrubChart`, `ScrubChart`, and `SplitQueueList` (decoupled balance line, scenario dots, responsive money rendering). Bundled into this release.
- **`EditableTitle` / `ActionListItem` / `ActionList` — `editTrigger: "clickSelected"`** (third mode; still strictly non-breaking). The file-list rename idiom: a click on the title opens the inline editor **only when the row is already selected** — the first click on an unselected row falls through to row selection, and a second click on the now-selected title edits. Modifier clicks (shift/ctrl/meta/alt) never edit (they stay selection gestures), and `stopPropagation` keeps the already-selected row from re-toggling. `ActionListItem` feeds the row's selection state to `EditableTitle` via the new `rowSelected?: boolean` prop; `ActionList` already threads `selected`, so consumers only opt in by passing `editTrigger="clickSelected"`. `"singleClick"` (default) and `"doubleClick"` are unchanged.

## 0.96.0

### Added

- **`ActionList` / `ActionListItem` / `EditableTitle`** — two opt-in, strictly non-breaking row affordances (consumers that pass neither prop see byte-identical behavior):
  - **`editTrigger?: "singleClick" | "doubleClick"`** (default `"singleClick"`, today's behavior), threaded `ActionList → ActionListItem → EditableTitle` (new exported type `EditTrigger`). In `"doubleClick"` mode the title renders as a non-`<button>` element (`<span role="button">`) so a **single click falls through to row selection** while a **double click opens the inline editor**; Enter/Space keep the editor keyboard-reachable, and the hover dotted-underline affordance plus Enter/blur-commit / Escape-cancel lifecycle are unchanged. In the default mode the title stays a `<button>` and a single click edits, exactly as before.
  - **`onOpen?: (id: string) => void`** on `ActionList` (`onOpen?: () => void` on `ActionListItem`). When provided, each row renders a small magnifying-glass icon button (inline SVG riding `currentColor`, matching the `StarToggle` icon idiom) in the meta cluster just left of the dismiss cap; clicking it calls `onOpen(id)` and never toggles row selection or opens the editor (`stopPropagation` + it is a `<button>`, already excluded from the row click target). It reveals on row hover via opacity only, honoring the geometry-stable hover invariant. Absent → no button renders.

## 0.94.2

### Fixed

- **`SplitQueueList` (`focusedKey`)** — selecting a row while no explicit `focusedKey` is supplied no longer paints the head of the list as focused. The `focusedKey` memo fell back to `keys[0]`, so a consumer that drives focus for only part of its state (e.g. a `null` focus when a committed item is selected) saw the top "to-configure" row light up as if selected. The focus fill is now strictly the explicit `focusedKey` (`null` when omitted); the head-of-list fallback is retained purely for the keyboard roving-tabindex tab stop, so ARIA/keyboard behavior is unchanged.

## 0.94.0

### Added

- **`deriveInitials(names)`** — pure, reusable helper in the ParticipantAvatar family (`src/components/ParticipantAvatar/initials.ts`, exported from the family index and root barrel). Returns a `Map<name, initials>` that disambiguates a roster instead of collapsing it to identical letters. Default is the first letter of the first word; a colliding name uses **as many letters as necessary** — the shallowest ladder rung (first initial → **word initials** → **first-word letters**) whose value stays globally unique (`Peter Stradinger` + `Peter Falk` → `PS` + `PF`; `Peter Falk` + `Paula Falk` → `Pe` + `Pa`). A name is never dragged deeper just because a neighbour must — in {Peter Stradinger, Peter Falk, Paula Falk, Peter Strong}, Peter Falk keeps its unique `PF` while Paula drops to `Pa`, and Falk is not merged into the Stradinger/Strong pair. Capped at 2 chars (AssigneeIcon's fit): names indistinguishable within the cap (`Peter Stradinger` + `Peter Strong`) share their longest common initials (`Pe`) and rely on the caller's `title`/tooltip for the full name. Deterministic and order-independent (a function of the name set); unicode-aware; identical full names get identical initials. Feed its values into `AssigneeIcon` / `ParticipantAvatar` `initials`.

## 0.93.0

### Added

- **`ActionList`** — selection-event metadata + range-select mode, closing two more gaps dside hit:
  - **`onSelectionChange` gains an optional second argument**, `meta?: ActionListSelectionMeta` (`{ kind: "toggle" | "range" | "clear" | "apply"; clickedId?: string; shiftKey?: boolean }`). It describes the gesture that drove the change — `clickedId` is the row the user interacted with (toggle/range) and `shiftKey` reflects whether Shift was held — so a consumer can, e.g., keep a vim `j`/`k` cursor in sync with mouse clicks. `toggle`/`range`/`clear`/`apply` all carry meta; a prune (a selected row leaving `items`) emits none. **Existing single-arg consumers are untouched** — the extra argument is simply ignored.
  - **`rangeSelectMode?: "extend" | "replace"`** (default `"extend"`, today's anchor-state-across-span merge). `"replace"` makes a shift-click produce exactly the `[anchor..clicked]` span, discarding any selection outside it (classic file-list semantics; dside's original behavior). Works in both controlled and uncontrolled modes. The fold logic lives in a pure, unit-tested `foldRange` helper alongside `idRange`.

  All additions are backward compatible.

## 0.90.0

### Added

- **`DagChart` (`gap`)** — new optional `gap?: [xGap, yGap]` prop controlling the spacing budgeted around each node, in screen axes (same orientation as `nodeSize`'s `[width, height]`). In a horizontal-flow DAG the inter-column corridor is `xGap`, so raise it when edges carry labels wide enough to collide with the node boxes (the corridor was previously pinned to the internal `[40, 40]` default and not configurable). Threaded through `computeLayout` and the fallback grid layout, and swapped into d3-dag's internal `[within-layer, between-layer]` axes exactly like `nodeSize`. Defaults to `[40, 40]` — no change for existing consumers.

## 0.89.1

### Changed

- **`Chart` (`YAxis`)** — the y-axis title now tracks the tick labels instead of sitting at a fixed 28px offset. It measures the widest tick label's rendered width via SVG glyph metrics (`getComputedTextLength`) and places the rotated title just past it (`label-x + max-label-width + gap`), so wide labels no longer overlap the title and narrow labels no longer leave a gaping margin. Falls back to a character-count estimate when DOM text metrics are unavailable (SSR / jsdom).

## 0.89.0

### Added

- **`ActionList`** — closes the gaps found when dside adopted the list:
  - **Controlled selection.** New `selectedIds?: string[]` makes selection fully controlled — the list ignores its internal state, renders exactly the passed ids as selected, and never mutates on its own; every interaction (toggle, shift-range, Escape, apply) is emitted as an intent via `onSelectionChange` for the consumer to honour. Uncontrolled mode (omit `selectedIds`) is unchanged.
  - **Shift-click range select.** Shift-clicking a row applies the anchor row's (last plain-clicked) current selected state across the whole contiguous span between anchor and click — select the anchor then shift-click to select the span, deselect it to deselect the span; the anchor stays put so a further shift-click re-ranges. Restores the range-select dside lost when it moved off its hand-rolled list. Range math lives in a pure, unit-tested `idRange` helper.
  - **`clearSelectionOnApply?: boolean`** (default `true`, today's behavior). Set `false` to keep the selection after an action fires — for in-place batch actions like claim/release.
  - **Multi-assignee.** `ActionListItemData` gains `assignees?: ActionListAssignee[]`, rendered as a tight roster of glyphs; the singular `assignee?` still works and plural wins when both are given.
  - **`onTagClick?: (item, tag) => void`.** When provided, tag pills become buttons — clicks fire the callback and never toggle row selection (`stopPropagation`), with a colour-only (geometry-stable) hover brighten. Without it, tags stay inert exactly as before.

  `ActionListItem` gains `assignees?` / `onTagClick?`, and its `onSelect` now receives the originating `MouseEvent` (for `shiftKey`). All additions are backward compatible.

## 0.88.0

### Added

- **`ActionList`** — multi-select. Passing `actions: ActionListAction[]` (`{ hotkey, label, onApply(selectedIds) }`) turns each row's non-interactive area into a click-to-toggle selection target and reveals an actions bar while the selection is non-empty. Clicks on a row's inner controls (title editor, status chip, dismiss ×) never toggle, so selection doesn't fight inline editing or drag-to-reorder. Selected rows light a persistent accent border + subtle accent wash (colour-only — geometry-stable, like hover). Each action renders as a reused `HotkeyButton` (the `[c]laim` affordance); pressing the bracketed hotkey or clicking the button applies it to the selected ids and then clears the selection. Escape clears the selection (unless an inline editor is focused). Selection is uncontrolled and observed via `onSelectionChange`. `ActionListItem` gains `selected?` / `onSelect?`; `HotkeyButton` now exports `isEditableTarget`.

## 0.87.0

### Added

- **`ActionList`** (Depth 3) — drop-in, data-driven list of editable action rows, graduated from the list-item workshop bench. Curried via `createActionList` with a single Override (`statusTones`, default `{ DONE: "dim", DOING: "highlight" }`, neutral fallback); the exported `ActionList` variant takes only data + callbacks: `items` (`{ id, name, status?, assignee?, tags? }`), `statusOptions`, `onSort`, `onDelete`, `onRename`, `onStatusChange`. Tone = whole-row opacity (dim 25%, neutral 50%, highlight 100%) over an all-accent foreground.
- **`ActionListItem`** (Depth 2) — the row composite: status chip, editable title, assignee icon, tag pills, and a hover-revealed semi-circular dismiss cap flush with the row edge. Hover never shifts geometry (opacity-only reveals over a transparent border).
- **`StatusChip`** (Depth 1, Badge family) — fixed-width editable status chip (width = longest option in ch, text centered): click the text to edit inline, click the hover-revealed caret to pick from `options`; Escape cancels without committing. The editable sibling of `StatusBadge`.
- **`TagPill`** (Depth 1, Badge family) — pill tag; `label` containing `:` (or the explicit `{ key, value }` form) renders a split lozenge with a bold namespace segment; `active` adds the accent fill. The free-text sibling of `StatusBadge`/`CountChip`.
- **`AssigneeIcon`** (Depth 1, ParticipantAvatar family) — person-silhouette / antennaed-robot-head outline glyph holding up to 2 centered initials, `currentColor`-driven; the outline sibling of `ParticipantAvatar`.
- **`EditableTitle`** (Depth 1) — hover-underlined click-to-edit text whose inline input is fitted to the rendered text via a hidden-replica grid; Enter/blur commits, Escape cancels.

### Changed

- **`SortableList`** — new optional `rowChrome?: "surface" | "bare"` (default `"surface"`, unchanged) and `gap?: number` (default `8`). `"bare"` strips the row wrapper's Surface chrome and hides the grip until row hover, for self-styled row content like `ActionListItem`.

## 0.86.0

### Added

- **CashflowScrubChart** — `CashflowChartMarker` gains `variant?: "flag" | "rule"` and `label?: string`. The default `"flag"` is the existing clickable instance marker (flag + dashed drop-rule + dot). The new `"rule"` renders a non-interactive full-height dotted reference rule with its label always visible at the plot top — for marking a date like "Today" rather than a selectable instance. No change for existing callers.

## 0.85.3

### Fixed

- **CashflowScrubChart** — the per-instance SVG `clipPath` id is now generated with Solid's `createUniqueId` (the mechanism **Chart** already uses) instead of `Math.random`, making it deterministic across server/client renders (no hydration-mismatch risk). No visual change.

### Internal

- **Shared chart helpers** — duplicated chart arithmetic consolidated into `src/internal/` (not re-exported from the public barrel; `dist/index.d.ts` byte-identical):
  - `internal/geometry/insetSpan` — the 1D "inset a total extent by leading/trailing amounts" plot-region identity previously recomputed by hand in **Chart** (`innerWidth`/`innerHeight`), **ScrubChart** (both plot-span triples), and **CashflowChart** (all `PAD` edge arithmetic, now routed through two span accessors).
  - `internal/format/number` — `formatGroupedNumber` + `formatCompactNumber` ("3.4k" / "1.2M"), the en-US grouping policy that appeared verbatim five times across the **ScrubChart** / **CashflowScrubChart** helpers (`defaultFormatY`, `fmtDollars`, `fmtAxisDollars`). Near-miss formatters with observably different output (**ThroughputChart**, **CompletionTimeline**, **CashflowChart**'s `formatDollars`) were deliberately left untouched — unifying them would be a visual change; they're catalogued in the module header.
- **Oversized-module splits** — no import-specifier, API, or behavior change; `src` now has no file over the repo's ~500-line guideline:
  - `internal/animation/trajectories.ts` (883 lines) → a `trajectories/` directory of 8 concern-sized modules (primitives, timing, math, slurp morph, layout snapshot, per-card builders, top-level builders, barrel).
  - `SwimlaneChart/geometry.ts` (643) → a `geometry/` directory with one module per `compute*` function (edge views, side badges, port assignments, boundary badges, view bounds) plus shared input types.
  - `SplitQueueList/flight.ts` (690) → a 229-line reactive controller plus `play.ts` (the forward/reverse flight orchestrators), `flip.ts` (FLIP snapshot), and `arrival.ts` (arrival bg-fade), split along the file's existing reactive-shell vs imperative-engine seam; the controller keeps sole ownership of the shared scroll lock (flights write it only through an injected setter).

## 0.85.2

### Internal

- **Test coverage** — no component API or runtime behavior change; a sweep adding tests to previously-untested components (149 new tests across the 0.85.x line; suite now 1351). Newly covered: **Modal**, **Select**, **TagInput**, **DateRangePicker** (+ its `calendarUtils` TZ-aware date math), **MultiSelectFilter**, **Heatmap**/**HeatmapMulti**, **WeekCalendar** (+ `parseWeekCalendarTime`), **Treemap**, **ProductGrid** (+ `isSolutionSatisfied` and the solution→need cross-highlighting), **ConversationTree** (grouping/threading/dividers), **HeatStream**, and **SidebarSelector** (+ `EpisodeCard`/`EpisodeSelection`). Also added a unit test for the shared `clamp` helper.

## 0.85.1

### Changed

- **Toolchain / dependencies** — no component API or runtime behavior change. Upgraded the build/test toolchain and bumped dependencies:
  - **TypeScript 5.9 → 6.0.** The config was already modern (`target`/`module` ESNext, `moduleResolution` bundler, `strict`), so only two `tsconfig.json` adjustments were needed: dropped the deprecated `baseUrl` (the unused `~/*` alias still resolves via `paths` under bundler resolution), and added `"types": ["node"]` since 6.0 changed the `types` default from "all `@types/*`" to none. Emitted declarations are byte-identical to the 5.9 output (535 `.d.ts` files).
  - **vite-plugin-dts 4 → 5**, **katex 0.16 → 0.17**, **@types/node 25 → 26**, plus minor bumps (`solid-js` 1.9.14, `vite` 6.4.3, `vitest` 4.1.9, `@kobalte/core` 0.13.12, `@tanstack/solid-virtual` 3.13.32, `d3-dag` 1.2.1, `vite-plugin-solid` 2.11.12). `jsdom` is intentionally held at 26 — 27 ships an ESM-only CSS engine that breaks vitest's forks pool.
  - **`katex` is now declared only as a direct `dependency`**, no longer duplicated in `peerDependencies` (it was in both). No action needed by consumers — it remains bundled as before.

### Internal

- **`clamp` helper** consolidated into `src/internal/math/clamp.ts` — replaced two identical local definitions and several inline `Math.max(min, Math.min(max, x))` sites across Dropdown, ScrubChart, SlotFillBar, SplitQueueList, Alarm, BatchBar, and Sidebar. No behavior change.
- **Test coverage** — added tests for two previously-untested interactive primitives: **Modal** (portal render/teardown, Escape/backdrop/close-button dismissal, body-scroll lock, size/variant classes, `createModal` curry) and **Select** (single/multi value rendering, placeholder, clear button, reactive updates).

## 0.85.0

### Changed

- **SplitQueueList** — the animated queue now **fills its parent's height when `height` is omitted**, instead of collapsing to a hardcoded 420px. The root renders at `height: 100%` and self-measures its parent-allotted box (reusing the existing `rootEl` `ResizeObserver` — no new observer), feeding that measured height into the pane layout so the panel stretches to the bottom of a flex / `height:100%` container and re-flows on resize. Passing an explicit `height` keeps the prior fixed-px behavior unchanged; 420 is now only the pre-measure / unmeasurable floor (e.g. jsdom, which reports 0 from `getBoundingClientRect`). Consumers that dropped the panel into a sized parent and relied on the 420 fallback should either pass an explicit `height` or ensure the parent is height-constrained. (`StaticSplitLayout` already had this fill behavior.)

## 0.84.2

### Changed

- **CSS lint** — no runtime or visual change; takes `src` to zero Biome diagnostics (from 78 at the start of the 0.84.x cleanup). Resolved the remaining CSS warnings case-by-case:
  - **`noImportantStyles`** — removed five `!important` declarations that were provably unnecessary (the rule already won by source order): `Surface --active` background/border-color, `BatchBar` and reduced-motion `transition`, and `HeatStreamGrid --all-selected` colours. Kept six with scoped `biome-ignore` + rationale where genuinely load-bearing: `MathFormula` (overrides KaTeX's own `.katex` span colours and host table row styling), `SlotFillBar` (cancels a per-instance **inline** transition, which only `!important` can beat), and `Cell` (keeps rows transparent regardless of theme-level `tr` rules).
  - **`noDescendingSpecificity`** — reordered six rules render-neutrally so a base rule precedes its modifier(s) (`List`, `Heatmap`, `Table` ×2, `HeatStreamGrid`); documented four with `biome-ignore` where reordering would fragment an intentional grouping or a load-bearing cascade (`SplitQueueList`, `Section`, `Toast`, `MathFormula`).

## 0.84.1

### Changed

- **Tooling / types** — no component API or runtime behavior change. Burned down lint and typing debt surfaced by Biome:
  - Eliminated every `noExplicitAny` warning in `src` (22 → 0). The `Table` components and `StatsTable` now bound their row generic with `object` (new exported `TableRow` type) instead of `Record<string, any>` — this still admits interface-typed rows, which a `Record<string, unknown>` bound would reject for lacking an index signature. `DagChart`'s d3-dag layering cast is now `as unknown as Layering` (the library's own exported operator type) rather than `as any`; `TabbedSidePanel` dropped an unnecessary `as any` on `style`; and the drag-and-drop test helpers (`DnDHierarchySortBar`, `SortableList`, `MutableList`) build typed synthetic events via `Object.assign(new Event(…), …)`.
  - **`BaseTable`** sort comparator refactored into a typed `sortKey` helper — no `any`, no bare `<`/`>` on `unknown`. Ordering is preserved (strings via `localeCompare`, numbers/Dates/booleans numerically, nulls last) and is now covered by new tests exercising each branch plus the asc → desc → cleared click cycle. The sort path previously had no test coverage.
  - Applied safe Biome autofixes across `src` (string concatenation → template literals, bracket → dot member access) and fixed two nonstandard `linear-gradient` directions in `Layout/Sidebar.css`: the `--sidebar-handle-dir` custom property was a no-op (the gradient is symmetric about its midpoint, so `to left` and `to right` render an identical centered line) and is replaced by a plain `to right`.

## 0.84.0

### Added / Changed

- **Accessibility** — keyboard and ARIA support across ~50 components; the Biome `a11y` rule group is now enforced at **error** for `src` (the `dev/` gallery stays exempt), so regressions fail the lint gate. Highlights, all behavior-preserving unless noted:
  - **Keyboard activation** for clickable elements that were mouse-only: heat/treemap cells (`Treemap`, `Heatmap`, `HeatStream`, `HeatStack`, `HeatStreamGrid`), cards/rows (`Card/StatusCard`, `ProductGridCard`, `SprintSelector`, `MessageBubble`), chart controls (`Chart` pins/series, `CashflowScrubChart` markers, `AnimatedSwimlaneChart` cards, `DagChart` edge actions), and axis cells. Each adds `role="button"`, `tabindex`, and an `onKeyDown` (Enter/Space) that fires the exact same action as the click — gated on the relevant callback prop so non-interactive instances stay out of the tab order.
  - **New keyboard resize** (feature): `Layout/Sidebar` and `ResizableContainer` drag handles now implement the window-splitter/separator pattern — focusable, with `aria-valuenow/min/max` and arrow-key resize (Shift = larger step, Home/End to bounds), persisted like the pointer drag.
  - **Form labels** associated with their controls via `createUniqueId()` (`Inputs/NameInput`, `ThemedInput`, `ThemedTextarea`); a consumer-supplied `id` still wins.
  - **`TruthIndicator`** now renders a native `<button>` when interactive (was a `<span role="button">`), gaining native focus/activation; read-only stays a `<span role="img">`.
  - `type="button"` added to action buttons (`Modal`, `Tabs`, `Section`, `RecentStarred`, several `Table` buttons); decorative chart SVGs get `role="img"` + `aria-label` or `aria-hidden`; redundant roles removed. Legitimate ARIA composites (calendar `grid` pickers, segmented `radiogroup`, `listbox`/`menu`, decorative SVG chrome) are documented with scoped `biome-ignore` rationale rather than altered.

## 0.83.2

### Changed

- **Tooling / repo** — no component API or runtime behavior change. Adopted **Biome** as the lint/format/typecheck gate for the published library, tuned to existing conventions (`noNonNullAssertion` off; cosmetic rules as warnings; correctness rules as errors). Added `lint`, `lint:fix`, `lint:all`, `format`, `format:write`, `typecheck`, and `check` scripts. Applied a one-time safe baseline: `import type` conversions and unused import/variable removal across `src`, plus hand-fixed correctness items (`isNaN` → `Number.isNaN`, optional chaining, an O(n²) `reduce`-spread in `AreaFocusGrid`, JSX comma-operator removal in the `Chart` unknown-lane warnings, `forEach` side-effect callbacks wrapped in blocks, and dead duplicate CSS declarations in `Treemap`). The 117 pre-existing accessibility findings are baselined as warnings — a tracked backlog to burn down and promote back to `error`.
- **Test setup** — `test-setup.ts` installs a minimal functional canvas 2D context, removing the per-run "getContext not implemented" jsdom spam and letting `ScrubChart` exercise its real label-measurement path. All 1193 tests pass.

## 0.83.1

### Changed

- **`SwimlaneChart`** — internal refactor, no API change. All the chart's pure geometry (edge routing, side/boundary badges, per-edge ports, and the content-bounds/viewBox aggregation) moved out of the 1000-line component into a dedicated, independently-tested `geometry.ts`; each component memo is now a thin wrapper. Adds the component's first test coverage — headless characterization suites (node/edge geometry, column positioning, routing styles, collapse-into-summary badges) plus direct unit tests for the bounds math. Component 1013 → 649 lines; behavior is unchanged (edge-path geometry is byte-identical under snapshot).

## 0.83.0

### Added

- **`Dropdown`** — full listbox keyboard navigation and ARIA semantics (no API change). The trigger now exposes `aria-haspopup="listbox"` / `aria-expanded` / `aria-controls`; the menu is a `role="listbox"` of `role="option"` items with `aria-selected`. A **roving tabindex** keeps one tab stop; **Arrow Up/Down · Home/End** move focus, **Enter/Space** select, **Escape** closes and refocuses the trigger, and **Tab** leaves the widget. Opening focuses the selected option (or first); selecting or closing returns focus to the trigger. Rendering is unchanged.

## 0.82.1

### Changed

- **`Table` cell renderers** — internal refactor, no API change. The 880-line `CellRenderers.tsx` was split by concern into sibling modules (`cellStyle`, `textCells`, `numericCells`, `dateCells`, `statusCells`, `createCellRenderer`) re-exported through an unchanged barrel, so every import keeps working. Added direct smoke-test coverage for all cell renderers, the styling HOCs, and the column factory (previously untested).
- **`ExtractionBoard`** — internal refactor, no API change. The presentational card vocabulary (columns, cards, bars, badges) moved out of the 737-line component into a self-contained `cards.tsx`, leaving the orchestrator at 407 lines.

## 0.82.0

### Added

- **`StaticSplitLayout`** — the non-animated "two stacked labeled sections with a seam" layout is now its own public component, replacing the `static` flag on `SplitQueueList`. It renders a read-only TOP list of recent items over an arbitrary BOTTOM block you compose, sharing SplitQueueList's chrome but none of its queue/animation/selection/keyboard machinery. Clean, self-contained props (`items`, `renderItem`, `bottomContent`, `label`, `emptyLabel`, `capRows`, `rowHeight`, `height`, `class`) so the queue-only and static-only props can't be mixed — invalid combinations are unrepresentable.

  ```tsx
  <StaticSplitLayout items={recent()} renderItem={(r) => <Row {...r} />} bottomContent={<Picker />} />
  ```

### Deprecated

- **`SplitQueueList`** — the `static` prop (and its `topItems` / `renderTop` / `bottomContent` companions) is deprecated in favor of the standalone `StaticSplitLayout`. It still works — it maps the old prop names onto the new component and delegates — but will be removed in the next major.

## 0.81.1

### Fixed

- **`SplitQueueList`** — the resolve/unresolve collapse animation now deep-clones the collapsing row's content (`cloneNode`) instead of round-tripping it through `innerHTML`, so nodes are copied verbatim (no re-parse, no injection surface) and richer `renderItem` output survives the animation intact. Separately, a row's `min-height` now uses the component's *measured* row height rather than the raw `rowHeight` prop, keeping each row's reserved slot consistent with the pane sizing (the two could previously disagree when the measured height differed from the prop).

## 0.81.0

### Added

- **`SplitQueueList`** — full keyboard operation and screen-reader semantics, with no API changes (existing consumers get this for free). Each pane is now a `role="listbox"` of `role="option"` rows with `aria-selected` reflecting `selectedKey`; a **roving tabindex** keeps exactly one tab stop at a time, **Enter/Space** select the focused row (mirroring a click), and **Arrow Up/Down · Home/End** move focus across both panes as one top-to-bottom sequence. A visually-hidden `aria-live` region announces the resolved/unresolved counts as the queue changes, and rows show a `:focus-visible` ring.

### Changed

- **`SplitQueueList`** — internal refactor, no behavior change. The ~1.2k-line component was split by concern into `flight.ts` (the resolve/unresolve animation engine), `animation.ts` (pure helpers), `keyboard.ts` (roving-tabindex state machine), `types.ts`, and a dedicated `StaticSplitLayout` component (down to a 316-line reactive shell). Forward/reverse flights now share deduped helpers, and `static` mode no longer spins up the FLIP/animation machinery it never used.

## 0.80.2

### Fixed

- **`Checkbox`** — completes the 0.80.1 fix: a label-less checkbox is *actually* clickable now. Overlaying the input with `inset:0` was not enough — the painted `.sui-checkbox__box` span is itself positioned (`position:relative`, for its `::after` checkmark) and follows the input in the DOM, so it painted on top and swallowed the click (`elementFromPoint` at the control center returned the box, not the input). The input now has `z-index:1` to sit above the box. Verified end-to-end with a real browser click toggling a table row-select checkbox.

## 0.80.1

### Fixed

- **`Checkbox`** — a checkbox with no `label` is clickable again. The hidden native input was `width:0;height:0`, leaving no hit target when there was no associated `<label>` to click (e.g. table row-select checkboxes), so toggling silently did nothing. The input now overlays its control (`inset:0; opacity:0; cursor:pointer`), restoring clicks with or without a label.

## 0.80.0

### Added

- **`Icon`** — added a `download` glyph.

## 0.79.2

### Fixed

- **`TitledTimeRangeHeader`** — fix the 0.79.1 type regression: widening `title` to `string | JSX.Element` collided with the DOM `title` attribute (typed `string`) inherited via `HTMLAttributes`, breaking `tsc`. The props now `Omit` the DOM `title`, so the rich-heading prop typechecks cleanly.

## 0.79.1

### Changed

- **`TitledTimeRangeHeader`** — `title` now accepts `JSX.Element` as well as `string`, so callers can render a rich heading (e.g. an icon beside the name) instead of plain text. Backward-compatible: existing string callers are unaffected.

  ```tsx
  <TitledTimeRangeHeader title={<VesselName type={t} name={n} />} start={s} end={e} />
  ```

- **`ProgressCard`** — recomposed from `Surface` + `Text` primitives instead of a hand-rolled card; same public API.

## 0.79.0

### Added

- **`SortableList`** — a generic vertical drag-to-reorder list of full-width rows, the reusable equivalent of dside's todo reorder. Data/callback-only API (`items` / `getId` / `onReorder` / `renderItem`, optional `label`); each row gets a drag grip and, while dragging, an explicit **placeholder gap** opens in the slot where the row will land (sized to the dragged row) and the list reflows live to preview the result — committing on drop. No curried variant (data-only).

  ```tsx
  <SortableList items={rows()} getId={(r) => r.id} onReorder={setOrder} renderItem={(r) => <Row {...r} />} />
  ```

- **`MutableList`** — `SortableList` specialized into editable cards: each card has an inline-editable name (click → input; Enter/blur commits `onRename`, Escape reverts) and a delete button revealed on hover at the right (`onDelete`). Data/callback-only (`items` / `getId` / `getName` / `onReorder` / `onRename` / `onDelete`, optional `renderDetail`). Delete fires directly — the consumer owns any confirmation.

- **`createDnDReorder`** (in `hooks`) — the headless engine behind the reorder components: native HTML5 DnD with the placeholder-drop-target pattern (dragged item spliced out and re-inserted at the live `insertPos`, container-level geometry hit-testing so cursor dead zones still track, and the SolidJS dragstart-defer handled). Axis-generic (`"x"` / `"y"`); reusable for building custom reorder UIs.

- **`DefaultButton`** — curried `variant: "default"` button, completing the curried Button set so call sites never need the bare `Button`.

### Changed

- **Layout gap scale trimmed to `"xs" | "sm"`** (BREAKING). `Stack` / `Row` / `ProportionalStack` (and `Sidebar` / `OverflowNav`) no longer accept `md` / `lg` / `xl` gaps — nothing in shipped UIs needed 16/24/32px gaps. Removed the dead variants `SpacedStack`, `SectionStack`, `SpacedClusterRow`. `FillColumn` / `PaneRow` (added in 0.78.5 at `md`) and `ProportionalStack`'s default now use `sm`. Consumers passing `gap="md|lg|xl"` must move to `sm`/`xs` or a local explicit style.
- **`DnDHierarchySortBar`** — rebuilt on `createDnDReorder`; the pill reorder now opens a placeholder gap that tracks the pointer across the whole row (replacing the old insert-and-shift-on-drop). Same public contract.

### Removed

- **`Surface` padding/radius trimmed** (BREAKING). `padding` is now `"none" | "sm" | "md"` (removed unused `xs` and `lg`); `radius` is now `"none" | "sm" | "md"` (removed unused `lg`). The unconsumed `paddingTop` prop and the `PanelSurface` variant are gone. `md` is retained (it is the default and the status surfaces' padding/radius).

## 0.78.5

### Added

- **`FillColumn` / `PaneRow` / `ScrollColumn`** — baked page-skeleton layout components so consumer apps stop hand-rolling `createStack`/`createRow` with `gap`/`fill`/`style` at call sites. `FillColumn` is the outermost route-body column — it **grows** to fill the remaining height of a flex-column parent (`flex:1; min-height:0`) rather than claiming `height:100%`, so it coexists correctly with a fixed header sibling (e.g. a page title) and still forwards a concrete height to a `fill` table/scroll child. `PaneRow` is a full-height two-pane row (`fill` + `flex:1; min-height:0`) for a sidebar+main split where each pane owns its own scroll. `ScrollColumn` is a flex column that scrolls its own overflow (`flex:1; min-width:0; overflow:auto`) — the main/detail pane beside a `Sidebar`.
- **`Sidebar`** — a fixed-width side column that is **drag-resizable**, with the chosen width **persisted in `localStorage`** keyed by `id` (per-machine, so different screens keep their own preference; restored on the client, SSR renders the canonical default). Drag the inner edge to resize (clamped 200–720px, default 300px); double-click the handle to reset. `handle="right"` (default) for a left-docked sidebar, `handle="left"` for a right-docked one. Bakes the width/`flex-shrink`/internal-scroll plumbing so call sites pass only `id`, optional `handle`/`gap`, and children:

  ```tsx
  <PaneRow>
    <Sidebar id="triage-calls" handle="right">…list…</Sidebar>
    <ScrollColumn>…detail…</ScrollColumn>
  </PaneRow>
  ```

## 0.78.4

### Fixed

- **`SplitQueueList`** — the static bottom panel now scrolls instead of clipping its overflow. The panel carried both `.sui-sql__static-bottom` and `.sui-sql__list--bottom`; at equal specificity (0,1,0) the later generic `.sui-sql__list--bottom { flex: 0 0 auto }` won, sizing the panel to its content so `overflow:auto` never engaged and content was cut off by the root `overflow:hidden`. The static-bottom rule is now scoped to `.sui-sql--static .sui-sql__static-bottom` (0,2,0) so it wins the cascade.

## 0.78.3

### Added

- **`HotkeyButton` / `createHotkeyButton`** — a button that renders its label with the hotkey character emphasized (e.g. "Done" with the **D** bold + underlined) and, when armed, fires `onTrigger` on a window `keydown` (guarded against modifier keys and focused inputs). Label/key/trailing content render tight on one line so the JSX compiler can't inject whitespace nodes (no "D one" gap).

## 0.78.1

### Added

- **`Surface`** — new `xs` (4px) padding token and a directional `paddingTop` override (`"none" | "xs" | "sm" | "md" | "lg"`). `paddingTop` is declared after the uniform padding rules so it wins, letting a surface keep its side/bottom padding while pulling a heading flush near the top for a terser layout (e.g. `createSurface({ padding: "lg", paddingTop: "xs" })`).

### Changed

- **`ThemedTextarea`** — dropped the fixed `min-height: 100px`; height now follows the `rows` attribute / content, so a textarea starts terse (single line with `rows={1}`, growing as needed) instead of always reserving ~4 lines. Consumers wanting a taller default set `rows` or a `min-height`.

## 0.78.0

### Added

- **`TimelineBar` gains `highlightedState`** — a group-highlight affordance. Unlike `selectedId`/`hoveredId` (single-bar), `highlightedState?: string | null` flags **every** bar whose `state` equals the value with `data-highlighted="true"`, so a legend hover or `onBarHover` reading `bar.state` can light up *all* segments of a given status at once (e.g. every `WARNING` bar across multiple lanes). Default `null` (nothing highlighted). Styling is left to the consumer via the data attribute; the chart stylesheet ships a reference treatment (`[data-highlighted="true"]` → brighter stroke + accent glow). The DotChart showcase wires a hoverable OK/WARNING/ALARM legend to demonstrate it.

## 0.76.1

### Added

- **`HeatStream`** — two new cell statuses, `empty` and `info`. `empty` renders a fully transparent cell (for grid positions that should read as blank rather than "missing"); `info` renders the informational blue (`--status-info`, default `#3b82f6`), complementing the existing `missing` red so a grid can show a neutral/positive baseline with red call-outs. Cell gap is now configurable via the `--jtf-hs-gap` custom property (default `1px`), and preview-row labels are wider to fit longer captions.

## 0.76.0

### Added

- **`SplitQueueList`** — a linked two-list "processing queue" in one fixed-height column: the **top** holds *resolved* (done) items, the **bottom** holds *unresolved* (to-process). Resolving moves a card up across the seam so recent work stays adjacent to what's next. Generic over the item type `T`; the consumer owns the data and the card content (`renderItem`), SUI owns the layout + animation. **It is fully controlled and driven by array mutation — there is no `resolve()` method:** moving a key `unresolved → resolved` (append) plays the forward animation, and `resolved → unresolved` (prepend) plays the mirrored reverse. The top pane is content-driven, measured in JS via `ResizeObserver` (pure CSS can't express it): `topFloorRows` (default **0**) collapses it to a header-only strip at 0 resolved and grows one row per card; `topCapRows` (default **3**) caps growth and then **scrolls** with the newest row flush at the seam; the bottom pane takes the remainder and absorbs slack when short. The resolve/unresolve motion is a height-collapse on the exiting side mirrored by a pane-grow (or capped scroll) on the entering side, with the panes always summing to the total height so the seam glides with no gap; the arriving card's background **fades in** on landing. **Selection is controlled and the detail panel is consumer-composed** — `onSelect(key)` fires on any row click (clicking no longer resolves), `selectedKey` rings the matching row in either panel, and `focusedKey`/`onFocusChange` drive the orange "current" highlight (the two compose). `topOnly` renders just the resolved panel. Honors `prefers-reduced-motion`. Key props: `resolved: T[]`, `unresolved: T[]`, `renderItem`, `keyOf`, `focusedKey?`, `onFocusChange?`, `selectedKey?`, `onSelect?`, `resolvedLabel`, `unresolvedLabel`, `allClearLabel?`, `topCapRows=3`, `topFloorRows=0`, `rowHeight=40` (initial estimate; measured), `height=420`, `animationMs=800`, `topOnly=false`. See `src/components/SplitQueueList/README.md` for the full usage guide. (`onResolve` from earlier drafts is deprecated/unused — resolve is array-driven.)

## 0.70.0

### Changed

- **`BatchBar` is now self-estimating — everything smart lives in SUI.** New declarative API: pass `batches: { rows: number; state: "pending" | "running" | "done" }[]` (`BatchSpec[]` — discrete states, **no fractions**) + `totalRows` + `committedRows`. BatchBar observes the batch lifecycle, measures each batch's wall-clock duration on `running → done`, folds the real `(rows, durationMs)` sample into an internal online linear regression (`T̂(rows) = base + perRow·rows`, seeded with a low-weight prior so batch #1 isn't garbage and the denominator is never singular), and eases each running batch's fill on an internal `requestAnimationFrame` loop — **race** (near-linear to ~90% at the estimate) → **creep** (decelerating, asymptotes below 1) → **snap** (a real `done` event tweens to 1.0 over ~180ms). The curve never self-reaches 1.0, so a real completion always finishes the bar. The fill renders via `scaleX` (compositor-only); the rAF loop starts on demand and stops itself when nothing is animating. All easing constants (`P_KNEE = 0.90`, `SNAP_MS`, the prior, τ) are encapsulated, not configurable. New `useBatchProgress()` returns a shared `ProgressController` so many bars can learn into one model (the whole board). New estimator/engine logic lives in `src/internal/progress/` with an injectable clock for deterministic tests.
- **`ExtractionBoard` adopts the declarative bar.** The board creates one shared progress engine per instance and hands every Doing bar (multi-batch and single-fill) the same learned model. `BoardTable.transferredRows` is now **committed rows only** (jumps on completion, not interpolated). Small (single-fill) tables drive one synthetic whole-table batch off `status` doing → done.

### Breaking

- `BoardTable.batches` changed from `{ total: number; done: number; inFlight: number[] }` (app-computed in-flight **fractions**) to `TableBatch[]` = `{ rows: number; state: "pending" | "running" | "done" }[]` (declarative, no fractions). The board now derives all fractions/estimates/durations/interpolation internally. **Migration:** emit `batches: { rows, state }[]`, set `transferredRows` to committed rows only, and delete any app-side `inFlight`/`interpolatedRows` computation. The legacy numeric `BatchBar` API (`donePct` / `inFlightPct` / `batches: number[]`) is kept (deprecated) for backward compatibility.

## 0.69.0

### Changed

- **Reconciled the divergent `feat/batch-bar` line into `main`.** The two lines had forked with parallel component sets — `main` carried `CurrencyInput` (0.68.0), `ExtractionBoard`, `ScrollRegion`; `feat/batch-bar` carried `BulkActionBar`, `FormComposite`, `MonthOfYearPicker`, `RangeAmountGroup`, `TrendSparkline` (+ `trendOf`), and `BaselineDot`, plus the `CashflowScrubChart` `scrub` prop and the `AppShell` `fixed` prop. This release **unifies both sets** so consumers no longer have to choose a line. No component or API was dropped: `CashflowScrubChart` keeps `scrub`, `AppShell` keeps `fixed`, and all the batch-bar components are exported alongside the main-line additions. Merge was a clean union (3 trivial conflicts: version, lockfile, one export block); full test suite (976) and build verified green post-merge.

## 0.68.0

### Added

- **`CurrencyInput`** — a curried variant of `ThemedNumberInput` for money amounts. Masks the value as USD currency (Kobalte `formatOptions: { style: "currency", currency }`) and caps its width to the widest expected value so it never stretches to fill its column. The cap is **derived, not magic**: `"$10,000,000,000.00"` is 18 characters → `18 × 0.62rem + 4rem` stepper/padding chrome = **15.16rem** (default). Tabular figures keep the masked digits from reflowing as you type. The full `ThemedNumberInput` API (value accessor, `onChange`, `name`, `label`, `min`/`max`, `step`, `errorMessage`, `description`) passes through unchanged; adds `maxValue?` (default `$10,000,000,000` — drives both the width cap and the numeric ceiling unless `max` is set) and `currency?` (ISO-4217, default `"USD"`). Exports the `currencyWidthRem(maxValue?)` helper for sharing the exact rem cap. This is the curried money field — do not configure `ThemedNumberInput` with `formatOptions` at the call site.
- **Fixed-width fields convention** (`src/internal/fieldWidth`) — a reusable rule for fields whose content has a known maximum width: `fieldWidthForChars(chars, chromeRem)` returns `chars × 0.62rem + chromeRem` (rounded up; `0.62rem` is a generous tabular-glyph advance at the body font size). Always pair the cap with `font-variant-numeric: tabular-nums`. Drives `CurrencyInput` and `MoneyCell`; `DatePicker`'s existing 10-char ISO cap is documented under the same convention (see COMPONENTS.md).

### Changed

- **`MoneyCell`** — gained the same width discipline as `CurrencyInput`: renders with **tabular figures + right alignment** and a **width cap** derived from a new `maxValue?` prop (default `$10B`; pass `maxValue={null}` to opt out). It is the display counterpart to `CurrencyInput`, so a money input and its column line up. Backward-compatible — existing `MoneyCell` usages get the cap at the default ceiling.

## 0.67.0

### Changed

- **`ThroughputChart`** — gained an opt-in **COMPLETION mode** (per-hour completed-item bars + a cumulative-% line on one shared 0–100 axis), selected by passing `completions` (raw events the chart buckets itself) instead of `dataPoints`. In completion mode the chart self-sizes (measures its own width via `ResizeObserver`, SSR/jsdom-safe). New optional props: `completions`, `now?`, `totalCount?`, `baselineCompleted?`, `barsLabel?`, `cumulativeLabel?`, `height?`, `initialWidth?`; `dataPoints` is now optional. **Fully backward-compatible** — with the completion props absent the chart renders the original rows/min area + line + average reference + crosshair exactly as before. Built for an ETL "tables done / hr + % complete" header.

### Removed

- **`CompletionChart`** (added in 0.66.0) — folded into `ThroughputChart`'s new COMPLETION mode so the progress chart is one component, not a near-duplicate. Migrate `<CompletionChart {...} />` → `<ThroughputChart {...} />` (identical completion props). 0.66.0 was published only briefly with no downstream consumers.

## 0.66.0

### Added

- **`ExtractionBoard`** — a composite swimlane board for an ETL extraction view. One swimlane per configured category, columns left → right `Summary │ Done │ Doing │ Todo │ +N`. The client supplies CONFIG (categories, data types + icons, column labels, multi-batch threshold, motion timing) and a reactive `tables: BoardTable[]` store; the board DERIVES the whole view as pure functions over `tables` (no simulation inside) — the Summary aggregate (counts + colsByType sum + monotonic status), the latest Done/Skipped card, the Doing card(s) (single fill bar ≤ threshold, multi-batch `BatchBar` above), the next Todo, and the +N lozenge. Lanes sort by Summary status (active → top, pending → middle, complete → bottom) with a debounced re-sort so a lane is seen completing before it sinks. Structural transitions animate via an internal FLIP engine (slurp the folded Done card into the Summary → slide the just-finished Doing card into Done → grow the next Todo out of the lozenge). Composes `Surface` / `Text` / `StatusBadge` / `CountChip` / `Icon` / `Tooltip` / `SlotFillBar` / `BatchBar` / `ProportionalStack`. Curried via `createExtractionBoard(config)` (bakes the config; the returned component takes `tables` only).
- **`CompletionChart`** — a sibling of `ThroughputChart` (same module) that plots PROGRESS rather than instantaneous rate: per-hour completed-item bars + a cumulative-% line on one shared 0–100 axis (bars scaled by the busiest bucket, so the two series coexist without a second axis). Data-only and self-sizing — the caller hands over raw completion events + the window/total, and the component buckets them itself and measures its own width with a `ResizeObserver` (SSR/test-safe fallback). Built for an ETL "tables done / hr + % complete" header but item-agnostic. Composes the `Chart` family + `Legend`. Public API: `{ completions, now, windowHours, totalCount, baselineCompleted?, height?, barsLabel?, cumulativeLabel? }`.

## 0.65.1

### Fixed

- **`AnimatedSwimlaneChart`** — resize handling no longer emits the benign `ResizeObserver loop completed with undelivered notifications` window error. The `ResizeObserver` callback previously wrote `stageWidth` synchronously during the observer dispatch, which mutated the observed subtree's layout (`stageWidth → maxDepth → lane rows`) mid-dispatch and made the browser defer remaining notifications. The width write is now coalesced into a single `requestAnimationFrame` (newest measured width wins; pending frame cancelled on cleanup), so the layout mutation happens after the dispatch completes. Public API/props are unchanged.

## 0.64.0

### Added

- **`ScrollRegion`** — a dynamic fade scroll-affordance component: a vertically-scrolling viewport whose top/bottom edges fade in only when there is more content to scroll toward (no fade at the true start/end), so users get a clear "there's more" cue. Curried via `createScrollRegion`; ships optional bounded presets `ScrollRegionMd` (~240px) and `ScrollRegionLg` (~360px) for non-flex contexts. The base `ScrollRegion` is height-agnostic and fills its flex parent — prefer it in flex layouts; the fade logic is identical either way.
- **`MathFormula` `wrap` variant** — opt-in `wrap?: boolean` prop (also a passthrough on `FormulaDecomposition`) that renders each top-level term as its own inline KaTeX element inside a `flex-wrap` row, so a formula too wide for its container breaks onto multiple lines at top-level operator boundaries. Pure CSS wrapping — no JS measuring, no shrink-to-fit, no horizontal scroll. Default behaviour is unchanged: without `wrap`, the historical single-line rendering is preserved.

### Fixed

- **`Panel`** — bottom corner brackets are now pinned to the visible frame on scroll instead of drifting with scrolled content, so the HUD corner brackets stay anchored to the panel edges.

## 0.61.5

### Added

- **Global themed thin scrollbars** — the self-contained themes (`hud`, `bronze`, `bronze-dark`) and the dev `_baseline` now style every scrollbar (`scrollbar-width: thin`; transparent track; thumb `--sui-border`, `--sui-border-bright` on hover; radius `--sui-radius-sm`), replacing native browser scrollbars in consuming apps.
- **`ChartCanvas` primitive** — curried canvas-in-frame for Chart.js consumers: `createChartCanvas({ height })` plus `ChartCanvasMd` (240px), `ChartCanvasLg` (300px), `ChartCanvasMlg` (350px), `ChartCanvasXl` (420px). `ref` forwards to the inner canvas; `children` is an absolutely-positioned overlay slot (e.g. `InlineChartErrorOverlay`).
- **`BaseTable` `spanRow`** — per-row tail-collapse hook (`spanRow?: (row, rowIndex) => TableRowSpan | null`): the row's leading cells render normally, then the remaining columns collapse into one spanning cell — for partial-data summary rows like "12 of 16 evaluated" + an action.
- **`InlineText`** — styleless inline text primitive for data-driven colored values.
- **`GrowBox`** — flex-grow child layout variant.
- **`SmallWarningButton`** — small warning-toned Button variant.
- **`PopoverMenu` `header` slot** — optional non-interactive header content rendered above the menu actions.

## 0.61.1

### Added

- **`BaseTable` `rowActions` prop** — `rowActions?: (row: T, rowIndex: number) => JSX.Element`. When provided, a tight, right-aligned trailing cell is rendered on every body row (with a matching empty trailing header cell so columns stay aligned). The action content is hidden by default and hover-revealed (`opacity` fade) on row hover, and always visible on keyboard `:focus-within` for a11y. Clicks inside the action cell stop propagation, so they never trigger `onRowClick`. Purely additive — tables without `rowActions` render exactly as before. The hover CSS lives in SUI (`.hud-table__actions-cell` / `.hud-table__actions-content` in `Table.css`), so no per-consumer CSS is needed. Passes through `FilterableTable` automatically.

  ```tsx
  <BaseTable
    data={rows}
    columns={cols}
    rowActions={(r) => (
      <Button variant="icon-only" onClick={() => onDelete(r)}>
        <Icon name="close" />
      </Button>
    )}
  />
  ```

## 0.61.0

### Removed

- **`OverrideToggle`** — dropped the domain-specific `AUTO | (PROD | OFF)` curried variant from the library. Per the "names shapes, not domains" rule, deployment/override jargon belongs in consumer apps, not SUI. `SegmentedControl` and the `createSegmentedControl` factory remain exported; rebuild the variant in your app's own `variants.ts`:

  ```ts
  import { createSegmentedControl } from "@primestageprime/solid-ui-components";

  export const OverrideToggle = createSegmentedControl({
    options: [
      { value: "auto", label: "Auto", group: "mode" },
      { value: "prod", label: "Prod", group: "override", color: "success" },
      { value: "off",  label: "Off",  group: "override", color: "danger"  },
    ],
  });
  ```

## 0.60.0

### Added

- **`SegmentedControl`** — a generic single-select segmented control for choosing across 3+ mutually-exclusive states. States can carry a `group` key (a divider renders at group boundaries) and a per-state `color` (with a control-level fallback). Controlled (`value` + `onValueChange`, fires only on change), radio-group a11y with full keyboard nav (arrows/Home/End, roving tabindex, disabled-skipping), per-segment and whole-control `disabled`. Ridged-groove seam between segments; fixed single (md) size; always content-width. Ships `createSegmentedControl` and exports `SegmentOption`, `SegmentedControlProps`, `SegmentedControlOverrides`, `SegmentedControlDataProps`.
- **`OverrideToggle`** — curried `SegmentedControl` for the `AUTO | (PROD | OFF)` case: `Auto` in its own group; `Prod`/`Off` in the override group; selected colors distinct (Auto accent, Prod success, Off danger).
- Dev showcase **SegmentedControl** — OverrideToggle, ungrouped control-level color, and disabled states.

## 0.59.0

### Added

- **`WorkProgressCard`** — a status-aware work card whose bottom progress bar is derived entirely from metadata. Data-only props (`status`, `title`, `claimedBy?`, `subtitle?`, `estimate?`, `actual?`); the library decides all colors/proportions, so callers never style it. Bar treatment: in-progress→blue, complete→forest green, over-budget→crimson (bar reproportioned to actual), unused budget→dark grey, blocked/question→⚠/? sign over the work-so-far, new/closed→empty.
- **Card-progress derivation helpers** (pure, unit-tested — exported for custom renderers): `deriveCardBar({ status, estimate?, actual? })` → `{ segments, sign }`; `statusAccent(status)`; `actualFromSegments(segments, now)` (Σ closed-segment durations + open segment to `now`, the live-actual formula); `isRunning(segments)`. Plus `CARD_BAR_COLOR` / `CARD_SIGN_COLOR` and types `WorkStatus`, `CardProgressInput`, `CardBar`, `CardBarSegment`, `CardSign`, `WorkSegment`.
- Dev showcase **WorkProgressCard** — the nine states (A–I) plus a live simulation (Play / Step / Reset) of three tasks accruing actual time from work segments off a clock.

## 0.58.2

### Fixed

- **`DateAxis` / `ScrubChart` recentre now honours a new selection made mid-animation.** Clicking a new spot while the view is still gliding toward the last click smoothly redirects to the new spot instead of finishing the old move. The programmatic smooth-scroll's own scroll events were being mistaken for user scrolls, re-arming the grace window and suppressing the next recentre.

## 0.58.1

### Fixed

- **`CashflowScrubChart` deviation band colours were reversed.** A `balanceSeries` `fill` now shades green where the series rises **above** its reference line and red where it dips below (previously the opposite). `positiveClass` / `negativeClass` semantics flip accordingly.

## 0.58.0

### Added

- **`CashflowScrubChart` now overlays multiple balance lines** via a new `balanceSeries` prop. Each series supplies its y-values through a `(cell, index) => number | null` accessor (a `null` breaks the line into a gap — e.g. a forecast that only renders after `today`) and styles itself with a CSS class. The primary running-balance line is unchanged; the y-domain auto-widens to span every series.
- **Deviation bands.** A `balanceSeries` entry may carry a `fill` to shade the deviation between itself and a reference line (the primary line by default): green where the reference runs above the series, red where it dips below. The band is split at every crossing so each region is one solid colour. Themeable via `--sui-cashflow-band-positive` / `--sui-cashflow-band-negative`.
- **Export `CashflowBalanceSeries` and `CashflowSeriesFill` from the package root** so consumers can type their `balanceSeries` arrays and `fill` descriptors.

## 0.57.0

### Added

- **Export `StatusFlowNode` and `RenderNodeContext` from the package root.** These are the consumer-facing types for building `SwimlaneChart` data (`nodes: StatusFlowNode[]`) and writing a custom `renderNode` card. They were reachable only internally before; consumers had to derive them from `SwimlaneChartDataProps`.

## 0.56.0

### Added

- **`SwimlaneChart` now sorts swimlanes into vertical status bands** — DOING (top) → TODO/mixed (middle) → DONE (bottom). Within a band, lanes order by recency of activity, so actively-worked and just-completed lanes float to the top. Lanes slide between bands via a CSS-transitioned transform.
- **Completion hold** — a lane moving down (e.g. into DONE) holds its position for `reorderHoldMs` (default 10000ms) so a finishing item can be appreciated before it re-sorts; upward moves are prompt.
- New optional timing knobs on `SwimlaneChart`/`createSwimlaneChart`: `laneSlideMs` (lane slide duration, default 420), `reorderHoldMs` (default 10000), `laneResizeSettleMs` (resize debounce, default 3000).

### Changed

- **Lanes shrinkwrap to their visible cards.** A lane is only as tall as its tallest currently-visible column instead of reserving a fixed multi-row block, and children top-align under the parent at 1rem spacing. Lanes grow immediately when a card appears but debounce shrinks (reset by any node movement) so cards finish moving before the lane tightens; lozenge-targeted arrows re-anchor as the lane resizes.

## 0.55.0

### Added

- **`SwimlaneChart` node cards now render `claimedBy`, `estimate`, and `actual`.** `StatusFlowNode` gained three optional fields: `claimedBy` (top-left of the card, status moves to the top-right), `estimate` (bottom-left), and `actual` (bottom-right, accent-colored). The default card layout is now `claimedBy ┄ status` on top, the title filling the middle (clamped to 3 lines, full text in the hover popover), and `estimate ┄ actual` pinned to the bottom. All three are optional and their lines are omitted when absent.

### Changed — BREAKING

- **`SwimlaneChart` / `AnimatedSwimlaneChart` are now curried (data-only).** The default-named exports no longer accept visual/layout overrides (`nodeSize`, `columns`, `centerStatus`, `terminalStatus`, `timing`, `routingStyle`, `breakpoints`, `renderNode`, `renderPopover`, gaps) at the call site — only `nodes` and `onNodeClick`. This brings the chart in line with the curried-only export convention (0.52.0).
  - Migrate call-site overrides into a curry: `<SwimlaneChart nodeSize={…} renderNode={…} nodes={…} />` → `const Chart = createSwimlaneChart({ nodeSize, renderNode }); <Chart nodes={…} />`.
- **Removed the `SwimlaneChartProps` / `SwimlaneChartOverrides` / `AnimatedSwimlaneChartProps` / `AnimatedSwimlaneChartOverrides` type exports.** Use `SwimlaneChartDataProps` (alias of `AnimatedSwimlaneChartDataProps`) for the data-prop type. The base component is no longer exported. See the "AnimatedSwimlaneChart (public `SwimlaneChart`)" entry in `COMPONENTS.md`.

## 0.54.0

### Removed — BREAKING

- **Removed the deprecated `HUDSection`, `HUDPanel`, and `HUDList` aliases** from the package root. These re-exported config-bearing base components and were the last base-export leaks after the 0.52.0 curried-only refactor. Migrate:
  - `HUDPanel` → a Panel variant (`InfoPanel`, `AccentPanel`, `DangerPanel`, `CompactPanel`, …) or `createPanel({ … })`; a plain default panel is `createPanel({})`.
  - `HUDSection` → a Section variant (`CollapsibleSection`, `DecoratedSection`, `BorderedSection`) or `createSection({})`.
  - `HUDList` → `ScrollList` (scrolling) or `createList({})` (plain). `ListItem` / `HUDListItem` are unchanged.
- `HUDModal`, `HUDTabs`, `HUDButtonGroup` already resolve to curried variants; `HUDPage`, `HUDListItem`, and `createHUDPanel` are unaffected. See the "Curried-only exports" section in `COMPONENTS.md` for the full migration guidance.

## 0.53.0

### Added

- **`ScrubChart` click-to-select on the chart body** — a click on the chart frame (no drag) now scrubs the selection to the cell at the pointer x, complementing the existing drag-to-pan gesture from 0.51.0. The pointer handler defers capture until movement crosses a 4-px threshold, so a clean tap resolves as `onScrub(idx)` while a drag activates pan as before. Releasing back near the start after a drag does **not** stray-fire `onScrub` — the pan flag is sticky once set. Cell-index mapping reads the chart frame's bounding box and subtracts `plotLeft`, so clicks on the y-axis label column don't get misread as "click on cell 0".

## 0.52.0

### Changed — BREAKING (API surface)

- **The package now exports only curried components.** Base components that carried visual/static configuration props (`variant` / `size` / `tone` / `glow` / `align` / `corners` / etc.) are no longer exported from the package root. Consumers must use the curried named variants or the `createX(...)` factories; the bare base components are now internal. This enforces the library directive that an exported component exposes only props knowable at runtime or configured by a specific client — every visual decision is baked at variant-definition time.
  - Affected components: `Button`, `StatusBadge`, `Panel`, `Surface`, `Text`, `StatusLight`, `ThreadGroup`, `MessageBubble`, `ParticipantAvatar`, `Section`, `List`, Layout's `Stack` / `Row` / `Box` / `AppHeader`, `ActionRow`, `AssigneeChips`, `Divider`, `ProgressCheck`, `ButtonGroup`, `Tabs`, `TruthIndicator`, `OverflowNav`, Feedback's `AlertBox` / `EmptyState`, Modal's `Modal` / `ConfirmationModal`, and `Toast`.
  - Each now exposes `createX(defaults)` + curried named variants + an `XDataProps` type. The base component value and the full `XProps` type are no longer part of the public surface.
  - Components with no design-config props (e.g. `CountChip`, `AppShell`, `AppMain`, `Page`, `Tooltip`, `ListItem`, `InlineChartErrorOverlay`) are unaffected and remain exported directly.
  - **Migration:** swap the configured base for the matching variant — `<Button variant="primary">` → `<PrimaryButton>`, `<StatusBadge variant="compliant">` → `<CompliantBadge>`, `<Stack>` → `<TightStack>` / `<ContentStack>` / etc., `<Modal size="lg">` → `<LargeModal>`. For combinations without a named variant, curry your own once with `createX({...})` and reuse it. `Toast` consumers keep using `showToast(...)` / `<ToastRegion>` (unchanged).
  - The legacy `HUD*` aliases that resolved to bases now resolve to the curried variants where one exists; `HUDSection`, `HUDPanel`, and `HUDList` still re-export base components and remain deprecated pending removal.

## 0.51.0

### Added

- **DateAxis drag-to-pan** — mouse/pen click-and-drag horizontally on the date ribbon now pans the visible window (changes `scrollLeft`) in addition to the existing scrollbar / wheel / programmatic-recentre paths. A 4-px movement threshold defers pointer capture, so a click without movement still resolves to the per-cell `onClick` (tap-to-select) — no regression for keyboard or touch flows. Touch is left to native horizontal scroll (`pointerType === "touch"` early-return) so phones / tablets keep pan-x. Cursor flips to `grab` to advertise the affordance.
- **DateAxis sticky month/year labels** — two small pills (`MAY 2026` / `JUN 2026`-style, theming via `--sui-bg-elevated` + `--sui-text-secondary`) overlay the left and right edges of the visible ribbon and update reactively as the viewport scrolls. The right label is hidden when it would match the left (single-month viewport), reducing visual clutter. Implemented by wrapping the scroll container in a new `.sui-date-axis-wrapper` positioned ancestor; the labels sit `position: absolute` outside the scroll context with `pointer-events: none` so they never block scrub/pan gestures on the cells below.

### Changed — BREAKING (behavioural)

- **`ScrubChart` chart-frame drag now pans the inner DateAxis** instead of changing the selection. Dragging anywhere on the line-chart area pulls the window-band overlay around the chart (and the cells under the axis along with it), at a rate where one cell of motion on the graph maps to one cell of motion on the axis (`axisScrollLeft += dx * (cellWidth / dayPitch)`). To change the selected day, click (or tap) a cell on the DateAxis — the existing auto-recentre then slides the axis so the selected cell sits at the centre of the viewport (and the window-band on the chart follows). The `onScrub` prop is unchanged in shape and is still fired by axis cell clicks; only the trigger source has changed (drag no longer fires it). Consumers that relied on chart-drag-to-scrub will see no `onScrub` calls during graph drags after upgrading — wire to axis clicks instead. The overlay cursor flips from `ew-resize` to `grab` / `grabbing` to advertise the new gesture.

## 0.48.0

### Added

- **ScrubChart axes** — `ScrubChart` (and the `CashflowScrubChart` composite that wraps it) now grows a built-in y-axis and x-axis chrome.
  - **Y-axis** activates when the new `yDomain?: [number, number]` prop is set. ScrubChart computes a shared d3 linear scale (nice'd), draws the axis line + tick marks + right-anchored labels, and exposes `ctx.yToPlot(value)` to the `renderChart` slot so consumer-drawn series automatically share the same scale. Tick count is tunable via `yTickCount?: number` (default `5`); labels format via `formatYLabel?: (v: number) => string`.
  - **Auto-sized y-axis column** — the label column width is measured from the longest formatted tick label (canvas `measureText`, with a per-character estimate fallback for SSR/test environments) plus an 8px gap, so the axis sits as close to the container edge as the data allows. No manual sizing. An optional `yAxisWidth?: number` escape hatch on bare `ScrubChart` is available for advanced alignment use cases (e.g. two charts sharing a column); `CashflowScrubChart` does not expose it.
  - **X-axis ticks** activate via `xTickCadence?: "none" | "auto" | "week" | "month" | "quarter" | "year"` (default `"none"`). `"auto"` walks the week → month → quarter → year ladder and picks the finest cadence whose tick count stays under `xMaxTicks` (default `12`); if even the coarsest exceeds the cap it strides by `ceil(count / max)`. Default per-cadence labels: `MMM d` (week), `MMM` with `'YY` on January transitions (month), `QN 'YY` (quarter), `YYYY` (year). Custom formatter receives `(cell, resolvedCadence)` so it can vary output by unit.
  - **`renderChart` ctx** grows `plotLeft` / `plotTop` / `plotRight` / `plotBottom` / `plotWidth` / `plotHeight` describing the inner drawing region (full frame minus reserved axis margins). `cellToX(i)` / `cellBounds(i)` are now offset by `plotLeft` so consumer-drawn series land inside the plot region without doing the math themselves. `ctx.width` / `ctx.height` remain the full frame dimensions (backward compatible).
- **CashflowScrubChart** now ships these axes out of the box — running-balance line gets a dollar y-axis (compact `$1.5M` / `$5k` / `−$200` labels) and an auto-cadence x-axis. The internal renderer was switched to `ctx.yToPlot` + `ctx.plotLeft/Right/Top/Bottom` so the line, zero-line, selected-rule, and dot all align to the shared scale automatically.

### Changed

- **ScrubChart `cellToX(i)` coordinate system** — values are now offset by `plotLeft` (which is `0` when no `yDomain` is supplied, so existing consumers are unaffected). The window-band overlay and pointer-scrub mapping respect the same offset. If you've been calling `cellToX` from a `renderChart` that draws into a sibling SVG covering the full frame (the normal pattern), no change is needed.
- **`ScrubChartContext`** type expanded with the plot-region + `yToPlot` fields above. Additive; existing consumers continue to compile.

## 0.47.1

### Added

- **`source` export condition** for `.`, `./styles.css`, `./themes/*.css` — opt-in path for local consumers (npm link / file: dep / workspace) to read SUI from `src/` instead of `dist/`. Enables readable component names + `autoname` signal labels in the consumer's Solid DevTools, plus instant HMR on SUI edits. Activate by adding `"source"` to the consumer's `resolve.conditions` in `vite.config`. Production consumers are unaffected — the condition only fires when explicitly listed. See `docs/local-development.md` for full setup.

## 0.47.0

### Added

- **CashflowScrubChart** — Domain Composite (Depth 3). Zero-config drop-in over `ScrubChart` that bakes in the cashflow day-cell renderer (date corner + diverging green/red bar + dollar amount) and the running-balance line drawing. Call site is `cells: CashflowCell[]` + `selected` + `onScrub` — no `renderChart` / `renderCell` boilerplate. Per-day payload `CashflowCell = Cell & { cashflowCents: number; balanceCents: number }`: net day flow (signed) + cumulative running balance. Theming hangs off `--sui-cashflow-positive` / `--sui-cashflow-negative` (bar + amount colour) and `--sui-cashflow-cell-positive-bg` / `--sui-cashflow-cell-negative-bg` (cell background tint); window-band tokens inherited from `ScrubChart`. For a different visualisation on the same cell shape, drop down to bare `ScrubChart` and supply your own render slots.
- **`CashflowCell` type** exported from the package root for callers building their own cell arrays.

## 0.46.0

### Added

- **Stack** / **Row** grow a `fill?: boolean` prop. `Stack fill` applies `height: 100%; min-height: 0`; `Row fill` applies `width: 100%; min-width: 0` — forwarding the parent's size through so a scrolling descendant (e.g. a `fill` BaseTable) has a concrete dimension to size against. Additive, no breaking change. `fill` is also a lockable override on `createStack` / `createRow`.

### Changed

- **BaseTable** `fill` now makes internal scrolling the default instead of a no-op. When `fill` is set (and `maxHeight` is not), the table fills its parent and scrolls its body with the sticky header pinned — no more `maxHeight="100%"` + manual flex-ancestor plumbing. Implemented by splitting the scroll container off the sticky-header wrapper: a new inner `.hud-table__scroll` `<div>` wraps the `<table>` and owns `overflow-y: auto`, while the outer `.hud-table--fill` becomes a clipping flex column. `maxHeight` is unchanged as the explicit "cap at Npx and scroll" escape hatch (its inline style now lands on the inner scroll region). **FilterableTable** `fill` passes through the same way (toolbar stays fixed, table fills + scrolls). The extra wrapper `<div>` is the only DOM change for existing tables; default and `maxHeight` tables render and scroll as before.

## 0.45.0

### Changed — BREAKING

- **ScrubChart** rewritten with a linear-scale + visible-axis-window model, replacing the original fisheye geometry. Every cell now sits at uniform pixel pitch (`width / cells.length`), and ScrubChart owns a translucent rect overlay that tracks the slice of cells currently visible in the inner DateAxis viewport — classic overview + detail. Click-and-drag on the chart maps each pointer x directly to a cell index; there's no anchored start-layout, no `selectedAnim` tween, no `requestAnimationFrame` loop.

  **Removed:** `selectedFraction`, `sideCompression`, `gutterHeight` props; the gutter SVG + diagonal connectors; the in-chart day-edge vertical lines; the `layoutCells` / `xToCell` exports (and the `scales.ts` module that backed them). The `selectedFraction`/`sideCompression` factory variants no longer exist.

  **Added to `ScrubChartContext`:** `dayPitch` (number, the linear cell width in chart px), `windowCells` (`[firstIdx, lastIdx]` of cells in the axis viewport), `windowBounds` (`[leftX, rightX]` in chart px covering that slice). `visibleCells` is gone — iterate `ctx.cells` directly and use `ctx.cellToX(i)` for positions.

  **Theme tokens:** new `--sui-scrub-chart-window-fill` and `--sui-scrub-chart-window-stroke` CSS variables let consumers re-skin the window-band overlay.

  **Migration:**

  ```tsx
  // Before (0.44.0 — fisheye)
  <ScrubChart
    cells={cells} selected={i} onScrub={setI}
    selectedFraction={0.67} sideCompression={28}
    renderCell={renderCell}
    renderChart={(ctx) => {
      const points = ctx.visibleCells.map((j) => `${ctx.cellToX(j)},${y(ctx.cells[j])}`).join(" ");
      return <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`}><polyline points={points} /></svg>;
    }}
  />

  // After (0.45.0 — linear + window)
  <ScrubChart
    cells={cells} selected={i} onScrub={setI}
    renderCell={renderCell}
    renderChart={(ctx) => {
      const points = ctx.cells.map((c, j) => `${ctx.cellToX(j)},${y(c)}`).join(" ");
      return <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`}><polyline points={points} /></svg>;
    }}
  />
  ```

  The fisheye model didn't read well in practice — cell widths morphed under the cursor in ways that fought the user. The overview-plus-detail framing matches how the component is actually used (chart is the big picture, axis is the zoomed-in detail), and the math is dramatically simpler.

## 0.44.0

### Added

- **ScrubChart** — Composite (Depth 2). Pairs `DateAxis` with a user-supplied chart slot via a 20 px SVG gutter that draws diagonal connectors between each cell's chart-side and axis-side bounds. The focused cell occupies a fixed fraction of chart width (default 2/3) and morphs smoothly when scrubbed; neighbours compress into the side bands (fisheye). Two scale knobs (`selectedFraction`, `sideCompression`) tune the geometry. Scrubbing supports axis-cell click and drag-on-chart; drags use `setPointerCapture` and anchor to a start-frozen layout so the pointer-to-cell mapping doesn't shift as the layout morphs. Internal fractional `selectedAnim` drives a 250 ms ease-out tween on programmatic change via `requestAnimationFrame`. Generic over `C extends Cell` so consumers attach payload directly. Ships `createScrubChart` factory (no concrete named variant yet — single known use case; add one when a second emerges) plus pure helpers `layoutCells` / `xToCell` for chart authors who want the fisheye math standalone.
- **DailyDateAxis** — Curried day-cell variant restoring the original DateAxis ergonomics on top of the cadence-generic surface: takes `start: Date`, `end: Date`, `selected?: Date`, `onDayClick?: (day: Date) => void`, and a `renderDay?` whose `DayCellContext` includes `isFirstOfMonth` / `isLastOfMonth`. Internally generates `dailyCells(start, end)` and maps the date-keyed selection back to integer indices.
- **Cell helpers** — Pure functions exported from `./components/DateAxis`: `dailyCells`, `weeklyCells` (Monday-anchored by default; pass `0` for Sunday), `monthlyCells` (1st-of-month UTC), `hourlyCells` (UTC-hour-anchored). Each returns `Cell[]` whose `[start, end)` cover the requested range.

### Changed — BREAKING

- **DateAxis** is now cadence-generic. The component takes `cells: C[]` (where `C extends Cell`) instead of `start` / `end`, an integer `selected?: number` instead of `selected?: Date`, an `onCellClick?: (index, cell) => void` instead of `onDayClick?: (day: Date) => void`, and a required `renderCell` instead of an optional `renderDay`. The cell context shrinks to `{ isToday, isSelected, index }` — month-edge detection (`isFirstOfMonth` / `isLastOfMonth`) is day-specific and moves to `DayCellContext`, surfaced by the new `DailyDateAxis` variant and the exported `dayCellContext` helper. New behaviour: when `selected` is provided, the axis scrolls smoothly to centre it (skipped while the user is actively panning manually). New optional prop `scrollableRef` lets `ScrubChart` subscribe to the axis's scroll position.

  **Migration to keep day-cell ergonomics:**

  ```tsx
  // Before
  <DateAxis start={start} end={end} selected={day} onDayClick={setDay} renderDay={renderDay} />

  // After — same API, just rename to DailyDateAxis
  <DailyDateAxis start={start} end={end} selected={day} onDayClick={setDay} renderDay={renderDay} />
  ```

  **Migration to use the new generic surface directly:**

  ```tsx
  import { DateAxis, dailyCells, dayCellContent } from "@primestageprime/solid-ui-components";

  const cells = dailyCells(start, end);
  <DateAxis cells={cells} selected={index} onCellClick={(i) => setIndex(i)} renderCell={dayCellContent} />
  ```

- The package root export `Cell` is now reserved by the existing table-cell component. The DateAxis time-bucket type is exported from the package root as **`DateAxisCell`** instead. Deep imports (`from "@primestageprime/solid-ui-components/components/DateAxis"`) still see it as `Cell`.

## 0.43.0

### Added

- **DateAxis** — Atomic (Depth 1). A standalone horizontal day-cell ribbon (one cell per calendar day, horizontal scroll for long ranges, today marker, month label above the number on the first/last day of each month). NOT the chart-internal `XAxis` — plain HTML, no scale or chart context, usable as a bottom-of-chart date header or a freestanding "rules" axis. Props: `start`/`end` (inclusive range), `today?`, `cellWidth?`, `selected?`, `onDayClick?` (clickable + keyboard-activatable days for scrubbing a linked view), and `renderDay?: (day, ctx) => JSX.Element` — a per-cell render prop where the caller owns each cell's content *and* size (the axis grows to fit and the scrollbar sits below). Ships `createDateAxis` (baking the `cellWidth` override) plus the pure helpers `eachDayOfRange` / `isSameCalendarDay`.

## 0.42.0

### Added

- **DnDHierarchySortBar** — Atomic (Depth 1). A drag-to-reorder horizontal row of dimension pills for reordering a tag hierarchy (extracted from dside's `DesignView` nest-order bar). Controlled: `items: { id, label }[]` + `onReorder: (nextOrderedIds) => void`, plus an optional `label` (default "nest by"). No curried variant — every prop is data/callback, so there's nothing presentational to freeze.

## 0.41.0

### Added

- **Fab** — floating action button (Composite, Depth 2). Composes `Button` + `Icon`; round 56px, default color, placement-agnostic (the container positions it — no `position`/`offset` props). Required `icon` + `label` (the accessible name). Ships a `createFab` factory and the `AddFab` curried variant (`createFab({ icon: "plus" })`) for drop-in add actions: `<AddFab label="Add item" onClick={fn} />`.
- **BottomSheet** — container-bounded bottom sheet (Atomic, Depth 1). Slides up from the bottom of its parent — NOT a viewport overlay like `Modal`: the scrim and sheet are `position: absolute` inside a `position: relative` parent with a 60% max-height, so it can never cover a sibling region above it. Controlled via `open` + `onClose`, with a grabber handle and scrim-click dismiss.

### Changed — BREAKING

- **AnimatedSwimlaneChart** (alias `SwimlaneChart`): status-driven rewrite. The component now takes a `StatusFlowNode[]` instead of positional `DAGNode<T>[]`, and ships the polished lozenge + slurp + orthogonal-arrows + arrow-settle + hover-popover animation that previously lived only in the workshop. Consumers only have to pass `nodes`; sizes, timing, lozenge geometry, routing, and breakpoints all have library defaults overridable once via the curry factory.

  **New minimum usage:**

  ```tsx
  import { createAnimatedSwimlaneChart } from "@primestageprime/solid-ui-components";

  const ProjectFlow = createAnimatedSwimlaneChart({});

  <ProjectFlow nodes={tasks} />
  ```

  `tasks` is `StatusFlowNode[]`: `{ id, title, status, parentId?, dependsOn?, subtitle? }`.

  **Migration from the old positional-DAG API:**
  1. Convert each `DAGNode<T>` into a `StatusFlowNode`. The `x`/`y`/`lane` positional fields are dropped; you supply `status` instead, and the chart computes column positions itself.
  2. If you previously used `lane` to group nodes into rows, set `parentId` on the children to the id of the lane's parent node, and add the parent node itself.
  3. Replace `<AnimatedSwimlaneChart {...positionalProps} />` with a curried `createAnimatedSwimlaneChart({})` and pass only `{ nodes }`.

  Old positional rendering is no longer available. If you need it back temporarily, pin the package to the previous version.

## 0.37.1

### Fixed

- **TabbedSidePanel**: `PaddedBody` now sets `min-width: 0` and `min-height: 0`. Without this, the CSS default `min-width: auto` on flex children let any descendant with intrinsic width (DAG SVG, wide tables, long words) propagate up through the panel and overflow its container. Symptom: side panel growing past its allocated flex width with horizontally clipped content. Promotes a downstream override that lived in `amygdala-ui/src/styles/sui-theme-overrides.css`.

## 0.36.0

### Added

- **TabbedSidePanel**: new `contentPadding` prop (`"none" | "sm" | "md"`, default `"sm"`). Adds a small inboard gap between the vertical tab strip and the body so content no longer visually collides with the strip labels. **Default-changing visual bump** — every existing consumer gains ~8px of inboard padding on the body. Pass `contentPadding="none"` to preserve the previous flush behavior. Threaded through `RightDetailTabbedPanel` and `LeftNavTabbedPanel` curried variants.

## 0.35.0

### Added

- **Bronze theme** — a light, serif (Lora), friendly variant. Lora is used for prose; Inter for utility text (buttons, badges, subtitles, list metadata). Warm bone background, rust accent.
- **Theme architecture** — extracted shared component CSS into `_baseline.css`, loaded once on app boot. Per-theme CSS files now declare only tokens plus theme-specific overrides. A new `manifest.ts` registry is the single source of truth driving the loader, the dev switcher, and package exports.
- New token `--sui-font-utility` for small-text components. Defaults to `--sui-font-family` via CSS var fallback, so existing themes need not declare it.

### Changed

- `default.css` is now **tokens-only**. Consumers using `loadTheme()` (the documented JS API) are unaffected. Consumers loading `@primestageprime/solid-ui-components/themes/default.css` directly by URL will see component CSS go missing — they must also load `@primestageprime/solid-ui-components/themes/_baseline.css` (or move to the JS API). See `src/themes/README.md` for details.
- The dev `ThemeSwitcher` is now a dropdown sourced from the manifest rather than a 2-state toggle.

### Dev / internal

- **DotChart showcase** rebuilt as a reference for the amygdala-ui dotchart pattern: two stacked `<TimelineBar>` strips anchored in the chart's bottom margin (`bandY={{ anchor: "margin-bottom" }}`) so they sit along the bottom of the x-axis, with tick marks pushed below the strips via `XAxis.tickOffset` / `labelOffset`. Includes a data-check panel (hover any bar to pop dashed reference lines at its `start`/`end` and highlight its row in a tabular dump of `id`, `lane`, formatted clock + offset times, duration, and raw epoch ms). Dev-only — no library exports changed.

### Breaking changes

**Domain-name rename pass.** SUI now names *shapes*; consumer apps name *domain concepts*. Three components carried maritime/engine-domain names that misrepresented their generic shape — they've been renamed (or removed) accordingly.

| Old | New | Migration |
|---|---|---|
| `VesselCard`, `VesselCardProps` | `RemovableItemCard`, `RemovableItemCardProps` | Find/replace symbol names. Props unchanged. No CSS-class changes — `RemovableItemCard` is zero-CSS and emits no own selectors. |
| `VesselCallHeader`, `VesselCallHeaderProps` | `TitledTimeRangeHeader`, `TitledTimeRangeHeaderProps` | Find/replace symbol names *and* prop names — see below. |
| `EngineDataSection`, `EngineDataSectionProps` | *(removed)* | Inline the pattern using existing Primitives — see below. |

**`TitledTimeRangeHeader` prop renames** (in addition to the component symbol):

| Old prop | New prop |
|---|---|
| `vesselName` | `title` |
| `connectedAt` | `start` |
| `disconnectedAt` | `end` |
| `assetId` | `assetLabel` |

The CSS class prefix changed in lockstep: `sui-vessel-call-header*` → `sui-titled-time-range-header*`. Consumers that target these classes directly need to update their selectors. The `badge`, `action`, and `href` props are unchanged.

**`EngineDataSection` replacement.** The component baked the "Add Power Log" warning copy and `defaultKw` / `auxEngineHref` props into a thin wrapper around existing Primitives. Inline the pattern at the call site:

```tsx
import { NarrowStack, TextTitle, TextBody, AlertBox, NumberWithUnits } from "@primestageprime/solid-ui-components";

<NarrowStack>
  <TextTitle>{heading}</TextTitle>
  {tableContent}
  <Show when={showWarning}>
    <AlertBox
      variant="warning"
      title="Power Log Required"
      action={<a href={auxEngineHref}>Add Power Log</a>}
    >
      <TextBody>
        Using default (<NumberWithUnits value={defaultKw} units="kW" precision={0} />).
        Add aux engine data to improve accuracy.
      </TextBody>
    </AlertBox>
  </Show>
</NarrowStack>
```

The inlined version drops the `EngineDataSection`'s own chrome — adjust spacing/typography wrappers at the call site if the visual result differs from the original.

## 0.26.0

Wave 2 composites/extensions drop: promotes patterns hand-rolled in
dside-ui (Plan/Focus/Retro modes) so other apps can reuse them.

### Added

- **`CollapsiblePanel`** (composed) — `<CollapsiblePanel side label
  persistKey? defaultCollapsed?>{children}</CollapsiblePanel>`. Renders an
  `<aside>` with a thin collapse chevron when expanded, and a ~24px
  vertical strip with a rotated label + expand chevron when collapsed.
  Mirrors collapse state to `localStorage` when `persistKey` is set.
  Includes `createCollapsiblePanel(defaults)` factory.
- **`WeekCalendar`** (composed) — `<WeekCalendar days startHour endHour
  pxPerHour? blocks renderBlock highlight? />`. Pure layout primitive:
  time gutter on the left, day columns each with absolute-positioned
  block slots. Time strings parse with the dside "1-8 means PM"
  convention via the exported `parseWeekCalendarTime` helper. Optional
  `highlight` adds a cyan glow on the matching slot. Includes
  `createWeekCalendar(defaults)` factory.
- **`ActionRow`** (composed) — `<ActionRow tone? leading? trailing?
  actions?>{children}</ActionRow>`. Hover-revealed action bar
  (visibility-toggled so layout doesn't shift); `tone` drives border +
  background accent (e.g. red for `danger`, cyan for `accent`). Action
  buttons accept their own `tone: "accent" | "muted" | "outline"`.
  Includes `createActionRow(defaults)` factory.
- **`AssigneeChips`** (atomic, promoted) — `<AssigneeChips ids
  resolveName size? />`. Filled cyan pill per id; `resolveName`
  resolver replaces the hard-coded `SAMPLE_TEAM` lookup used in the
  dside-ui original. Includes `createAssigneeChips(defaults)`.

### Changed

- **`BurndownChart`** gains `size?: "xs" | "sm" | "md"` (default `"md"`,
  backward-compatible). `"xs"` strips Grid / X-axis / Y-axis and shrinks
  the chart footprint to ~180×60 for inline card use.
- **`Button`** gains a first-class `tone?: "accent" | "outline" |
  "muted"` prop orthogonal to `variant`, mirroring the trio used by
  several inline button factories in dside-ui (`triageBtnStyle`,
  `standupBtn`, `focusBtn`, `carryoverBtn`, `planWeekBtnStyle`).
  Implemented as `sui-btn--tone-*` modifier classes; no existing
  variant/size styles change.
- **`ButtonGroup`** gains a matching `tone?` prop surfaced as
  `sui-btn-group--tone-*` for consumers that want to scope tone styles.

## 0.25.0

Wave 1 atoms drop: extracts patterns hand-rolled in dside-ui so other apps can
reuse them without re-implementing.

### Added

- **`Markdown`** (atomic) — `<Markdown source={string} />`. Renders h1–h3,
  unordered lists, **bold**, *italic*, `code`, and paragraph breaks via a
  small inline parser (no runtime dependency). Exports `renderMarkdownHtml`
  helper and `createMarkdown(defaults)` factory.
- **`MarkdownEditor`** (composed) — `<MarkdownEditor value onChange rows? />`.
  50/50 split textarea + live `<Markdown>` preview. `createMarkdownEditor`
  factory.
- **`Kbd`** (atomic) — keyboard hint chip. Two modes:
  - `<Kbd letter="C" rest="onfirm" />` renders an underlined letter followed
    by the rest of the word (for hotkey hints).
  - `<Kbd>Esc</Kbd>` renders literal children inside a styled `<kbd>`.
  - `createKbd(defaults)` factory.

### Changed

- **`Modal`** gains `size="fullscreen"` (90vw × 90vh, max 1400px wide,
  100vh tall) and a new `header?: JSX.Element` slot for custom header
  content. Existing `title`/`subtitle`/`size` usages remain valid.
- **`Toggle`** gains `variant="thematic"` — pill-switch design with cyan
  accent fill, sliding thumb, uppercase label, and soft glow when on.
  Default and minimal variants unchanged.

## 0.24.5

DagChart: fix layering direction so source nodes (no incoming edges) sit at the leftmost column in horizontal layouts

## 0.24.4

DagChart: highlightedEdges prop applies sui-dag__edge--highlighted class for per-edge emphasis

## 0.24.3

DagChart: switch to layeringLongestPath so source nodes (no incoming edges) always sit at the leftmost column

## 0.24.2

DagChart: edge endpoints now clipped to node borders (fixes short-edge midpoint sitting inside nodes); edge delete × button now correctly clickable (pointer-events fix)

## 0.24.1

DagChart: edge delete × badge always rendered (opacity-gated) and z-ordered above nodes — fixes click race and short-edge invisibility

## 0.24.0

DagChart: optional `onEdgeClick(source, target)` with hover delete badge on edges.

## v0.21.0 — ProductGrid

Promoted `ProductGrid` (Composed, Depth 2) into the library, extracted from
the sandbox `elements-grid` step. It lays items out as an (area × focus)
pivot with two zones split by a focus label band: above-the-line solutions
on top (work tracked through todo → doing → done) and below-the-line needs
underneath (auto-met when every solution they reference is fully done).
Composes `StackedProgressBar` for both per-card and per-focus aggregate
status bars.

Major lines (white) separate areas and rows; minor lines (toned-down)
separate sub-columns within an area. Selection is bidirectional: clicking a
need surfaces its solving solutions; clicking a solution surfaces every need
that depends on it; clicking a focus highlights its whole sub-column. The
component supports both controlled and uncontrolled selection, and accepts
an optional `work` map so consumers can animate the counts externally.

### Added

- **`ProductGrid`** (`ProductGrid/ProductGrid.tsx`) — props:
  - `items` — `ProductGridItem[]` (`id`, `area`, `focus`,
    `position: "above" | "below"`, `shortName`, `description`, optional
    `work`, optional `solvedBy`)
  - `areaOrder` — left-to-right ordering of areas (empty areas are dropped)
  - `work?` — `Record<id, { todo, doing, done }>`; overrides each item's
    static `work` field (used by consumers driving an animation tick)
  - `selection?` / `onSelectionChange?` — controlled selection of either an
    item or a focus column; omit both for internal-only state
  - `class?`, `style?`
- `isSolutionSatisfied(work?)` helper exported alongside the component.
- Showcase at `#/product-grid` with two datasets (elements / statements
  derived from the 100-statement vocabulary), a tab to switch between
  them, an animated work store advancing one unit per tick, and a
  selection-driven items table beneath the grid.

### Changed

- `dev/sandbox.tsx`: removed the now-promoted `elements-grid` step.

## v0.20.0 — SlotFillBar

Promoted `SlotFillBar` (Atomic, Depth 1) into the library, extracted from the
sandbox queue-animation step. It's a fill-from-left progress bar for an
ordered queue of equal-sized work slots that move through
`todo → doing → done`, with two distinct transition modes baked in:
**slide** for `todo → doing` (clip-path inset interpolated, colour snaps so
the slide reads as one solid wave) and **fade** for `doing → done` (overlay
background-colour transitions in place while the static fill grows by one
slot to absorb it). Honours `prefers-reduced-motion`.

### Added

- **`SlotFillBar`** (`SlotFillBar/SlotFillBar.tsx`) — props:
  - `slots` — total slot count
  - `done` — fully-completed slot count (drives the static fill)
  - `active` — `{ index, phase: "doing" | "done" } | null`
  - `height` (default 24), `maxWidth` (default 400, `null` to remove)
  - `todoColor` / `doingColor` / `doneColor` — CSS colour overrides
  - `label` — accessibility / hover title; defaults to `"<done>/<slots> done"`
- Showcase at `#/slot-fill-bar` with static, doing, and an animated
  example that walks a single fake task through the 20 phase-transitions
  of a 10-slot queue (1s tick).
- 7 SlotFillBar tests.

### Changed

- `dev/sandbox.tsx`: removed the now-unused `TransitionBar` and
  `TaskTransitionAnimation` helpers (single-task transition prototype
  superseded by `SlotFillBar`).

## v0.19.1 — Combobox: two-step backspace highlight-then-delete

### Fixed

- **`Combobox` (multi-mode)** — hitting Backspace on an empty input
  immediately deleted the last selected chip with no visual cue, so
  users trying to clear search text often lost a selection. New
  behavior matches Gmail's "to:" field and GitHub's label picker:
  1. Backspace on non-empty input → standard text deletion (no chip change)
  2. Backspace on empty input → highlight the last chip with a danger-tinted
     focus ring (no delete yet)
  3. Backspace again on empty input → delete the highlighted chip
  4. Escape or any printable key → clears the highlight (no delete)

### Implementation notes

- Disables Kobalte's built-in `removeOnBackspace` on the multi-mode root
  and owns the entire backspace contract in our wrapper.
- The state machine is extracted as a pure function (`backspace.ts`,
  `computeBackspaceAction`) and unit-tested without Solid rendering.
- Single-mode behavior is unchanged.

## v0.19.0 — More shell primitives + showcase coverage sweep

### Added

- **`AppNavLink`** (`Layout/AppNavLink.tsx`) — button-based top-bar nav link
  with an active state. Pair with `AppHeader`. Use over the `<a>`-based
  `NavLink` when the consumer dispatches navigation through a router
  callback rather than `<a href>`.
- **`SidebarPanel`** (`Layout/SidebarPanel.tsx`) — flexible-width sidebar
  with edge delineation + internal scroll. The non-mock counterpart to
  `DelineatedSidebar` (which is pinned at 400px for drafting). Takes
  `width` (default 280) and `side` (`"left"` | `"right"`).
- 11 new showcases that close the gap from `TODO.md`: `BurndownChart`,
  `CompletionTimeline`, `Dropdown`, `PopoverMenu`, `ProgressCheck`,
  `QuadrantGrid`, `RingChart`, `SprintSelector`, `TagInput`,
  `ThroughputChart`, `WorkerCard`.
- Tests for `AppNavLink` and `SidebarPanel`. 50 tests pass across 10 files.

## v0.18.0 — Shell primitives extracted from dside

Pulled recurring layout/UI patterns from the `dside-ui` consumer into the
library so the consumer can drop ~80 inline-style fragments and several
hand-rolled mini-components.

### Added

- **`AppShell`** + **`AppHeader`** + **`AppMain`** (`Layout/AppShell.tsx`) —
  full-viewport vertical column with non-shrinking header and flexing main.
  `AppHeader` has `size` (sm/md/lg padding) + `inline` mode for sub-bars
  inside the main area. Replaces hand-written `display: flex; flex-direction:
  column; height: 100vh` shells.
- **`CountChip`** (`Badge/CountChip.tsx`) — `<count> <LABEL>` pill that
  emphasizes itself when count > 0 and dims when zero. Replaces inline
  `inline-flex; padding 2px 8px; border 1px solid …` chips.
- **`StickyGroupHeader`** + **`SectionLabel`** (`Section/`) — sticky-positioned
  group divider for scrolling lists, plus the uppercased dimmed label
  typography that goes inside it. Replaces inline sticky styling for
  status-grouped sidebars.
- Showcases for `AppShell`/`AppHeader`/`CountChip`/`StickyGroupHeader`/
  `SectionLabel`, plus quick-win showcases for `Duration` and `StatusLight`
  (previously only mentioned inline elsewhere).
- Smoke tests for all new components — 45 tests across 10 files.

### Fixed

- `HeatStack` was missing from `src/index.ts` even though every other
  Heat\* component was exported. Now wired up.

## v0.17.0 — Audit pass: tests, conventions, monolith → Chart-family

Repo-wide cleanup pass driven by an analysis review. No public API changes
beyond two compatible renames.

### Added

- **Vitest baseline** — `vitest` + `jsdom` + `@solidjs/testing-library`
  wired up. 34 smoke tests across Button, Text, Layout (incl.
  ProportionalStack/Item), Surface, Toggle, TruthIndicator, QuickFilter.
  Scripts: `npm test`, `npm run test:watch`.
- `scripts/audit-inline-styles.mjs` + `npm run audit:styles` — surfaces
  inline `style={…}` repeats; recurring fragments are candidates for new
  curried variants.
- `README.md` — index pointing at each existing doc (COMPONENTS,
  STYLE_GUIDE, AGENT_GUIDE, DESIGN_LANGUAGE, CHANGELOG, TODO).
- Showcases for `TruthIndicator` and the generic `QuickFilter` atom.
- Showcase-coverage gap list captured in `TODO.md` (14 components).

### Changed — internal-only refactors (public API preserved)

- **`ThroughputChart`**, **`CompletionTimeline`**, **`BurndownChart`** now
  internally compose the `Chart` family (`<Chart>` + `<Grid>` + axes +
  `<LineSeries>` / `<AreaSeries>` / `<BarSeries>` / `<ReferenceLine>` +
  `<Crosshair>` + `<ChartTooltip>`). All three keep their pre-v0.17 prop
  surfaces — drop-in.
- **Sticky header by default** for `BaseTable` (carried over from v0.16).
- **Index re-exports normalized**: `Surface`, `Text`, and `Layout` now
  use `export * from "./variants"` instead of manually-listed variant
  names — adding a new variant in `variants.ts` is automatically public,
  no drift.
- **Duration**: switched to a named export (default re-export retained
  for back-compat; remove in next major).
- **MathFormula**: katex stylesheet side-effect import moved out of
  `MathFormula/index.ts` and into `MathFormula.tsx` so consumers that
  only touch the library root no longer ship KaTeX's CSS.
- Dev theme injection consolidated into a shared `dev/load-theme.ts`
  helper; `ThemeSwitcher` and `Sandbox` both call it.
- `Table/QuickFilter.tsx` file renamed to `Table/FilterableTable.tsx`
  to match the v0.16 export rename.

### Repo / build

- Settled on **npm**; removed `pnpm-lock.yaml`; added `packageManager`
  and `engines` fields to `package.json`.
- Documented the folder-naming convention in `STYLE_GUIDE.md` (singleton
  vs category folders) and flagged the four legacy mismatches
  (`Badge`/`Card`/`DragDrop`/`Selector`) for next-major rename.

## v0.16.0 — Sandbox harness; new atoms; chart family; vocabulary

A larger release than usual — the project picked up a mock-drafting harness
and a small vocabulary doc, plus several new components and a generic chart
family. The high-level theme: composability over monoliths.

### Added — components

- **`ConversationTree`** (Depth 3) — Multi-participant message thread,
  optionally threaded via `replyToId`. Deterministic muted cool-palette
  per-author color (HSL 185–260, S 32–45%, L 60–67%); initials avatar
  fallback. Consecutive same-author messages within `groupWithinMs` (default
  5min) fold into one block; day change or gap > `absoluteAfterMs` (default
  1h) inserts a labeled divider. Per-bubble full timestamp on hover.
  `currentUserId` flips alignment for the viewer's messages with stronger
  fill. Bubble cap 80ch; body 80% width with right-side bubbles overlapping
  the left. `clampLines` (default 5) collapses long messages behind
  `(more…)`; `maxLines` (default 20) caps the expanded height with internal
  scroll.
- **`HeartbeatSparkline`** (Depth 1) — Pure-SVG rectangular sparkline of
  `% of timeout consumed`. Variants `connected` (green), `disconnected`
  (grey), `error` (red, blinks). Caller-fed samples (0..1).
- **`LiveHeartbeatTrace`** (Depth 2) — Adds the tick timer + sample buffer
  + state derivation on top of `HeartbeatSparkline`.
- **`ConnectionStatus`** (Depth 3) — Stacked indicator: name on top,
  sparkline (or `StatusLight` dot) beneath. Reassuring when healthy — no
  time-since text.
- **`TruthIndicator`** (Depth 1) — Boolean indicator: green check for true,
  red prohibition (circle + slash) for false. `value`, `size` (sm/md/lg),
  optional `onClick` makes it a button.
- **`QuickFilter`** (Atomic, Depth 1, top-level) — Generic filter input
  over a list with a render-prop child. Tokenized AND-matching across
  whitespace-split tokens. Composes with list/table/tree.
- **`Chart` family** (Depth 2) — Slot-style composable chart:
  `<Chart>` + `<Grid>` + `<XAxis>` + `<YAxis>` + `<LineSeries>` +
  `<AreaSeries>` + `<PointSeries>` + `<BarSeries>` (stacked +/-) +
  `<ReferenceLine>` + `<Crosshair>` + `<ChartTooltip>` + `useChart()` +
  `linearScale` + `domainOf`. Reactive against any signals (`xDomain`,
  `yDomain`, `data`).
- **`ProportionalStack`** + **`ProportionalItem`** (primitives) — Flex
  container that always uses available space and splits among children by
  `weight`; oversized children scroll inside their slot.

### Added — curried variants

- Layout: `DelineatedSidebar`, `PageCanvas`, `ScrollPanel`.
- Text: `EllipsizedTitle`, `HintText`, `ScoreValue`, `MultiplierLabel`,
  `FormulaVar`.
- Toggle: `TruthToggle` and a new `createToggle()` factory.

### Added — dev / docs

- `dev/sandbox.tsx` — ephemeral page-mockup harness routed at
  `#/sandbox/<step-id>`. Steps live in source for HMR; an "+ add scratch
  step" button appends in-memory scratch steps. Default content is a
  `MockBaseline` (PageCanvas → DelineatedSidebar + ContentStack/SimplePanel)
  with parameterized empty-state hints. Five seed steps demonstrate the
  drafting vocabulary.
- `DESIGN_LANGUAGE.md` — vocabulary glossary mapping shorthand phrases
  ("the baseline", "shrink-wrapped delineated sidebar", "quickfilter",
  "detail area", "proportional stack") to their structural definitions and
  the curried variants that implement them.
- `dev/main.css` Sandbox harness styling (black chrome, `#333` mock frame,
  grid + step list + scratch-step add button).
- Sidebar filter input on the showcase nav.

### Changed

- `BaseTable` ships with **sticky header on by default** — table headers
  must never scroll off-screen. Opt out via `stickyHeader={false}`. The
  table wrapper's `overflow: hidden` is reset to `visible` when sticky is
  on so an outer scroll container (e.g. `ScrollPanel`) becomes the sticky
  reference.
- `Table/QuickFilter` (the table-bound Depth-2 wrapper) renamed to
  `FilterableTable` — frees the `QuickFilter` name for the new generic
  atom. File path also renamed: `Table/QuickFilter.tsx` →
  `Table/FilterableTable.tsx`.
- `HeartbeatSparkline` polyline no longer fills (variant fill was
  accidentally inheriting onto the line; now applies only to the trailing
  head dot).
- `Button`, `Stack`, `Row`, `Box`, `Text`, `Panel`, `Section`, `Surface`
  base components now re-exported from their respective `index.ts` files
  alongside the `createX` factories.
- `ConnectionStatus` and `ConversationTree` showcases use the standard
  Depth 2/3 two-column "composed from" layout.
- `Duration` switched from default export to named export (default still
  re-exported for back-compat; drop in next major).
- `MathFormula` no longer ships KaTeX's stylesheet to consumers that don't
  import it (side-effect imports moved into the component file).

### Repo / build

- Settled on npm; removed `pnpm-lock.yaml`; added `packageManager` and
  `engines` fields.

## v0.15.0 — ConnectionStatus family

New three-layer component family for service liveness indicators:

### Added

- **`HeartbeatSparkline`** (Atomic, Depth 1) — Pure SVG rectangular sparkline
  for "% of timeout consumed" over time. No timers, no business logic. Variants:
  `connected` (green), `disconnected` (grey), `error` (red, blinks). Caller-fed
  `samples: number[]` of values 0..1.
- **`LiveHeartbeatTrace`** (Composed, Depth 2) — Adds the tick timer + sample
  buffer + state derivation on top of `HeartbeatSparkline`. Caller passes
  `lastHeartbeatAt` + `timeoutMs` (+ optional `errorAt`); component derives
  state and pushes samples each tick.
- **`ConnectionStatus`** (Composed, Depth 3) — Stacked indicator: name label
  on top, sparkline (or `StatusLight` dot) beneath. No time-since readout —
  reassuring when healthy. Use for dispatcher / worker liveness rows.
- Re-exported `Button`, `Stack`, `Row`, `Box`, `Text`, `Panel`, `Section`,
  `Surface` base components from their respective `index.ts` files (previously
  only the `createX` factories were exposed; consumer code referencing the
  base components now type-checks).
- `dev/` showcase: filter input above the sidebar nav for fast component
  lookup; new `connection-status` showcase under Depth 3.

### Fixed

- Dev showcase entry imports for `Button`, `Stack`, `Text`, `Panel` no longer
  fail to resolve at the package boundary.

## v0.14.0 — DateTimeCell: time-zone, zone-abbrev suffix, plain empty variant

Three additive, opt-in capabilities on `DateTimeCell`. Zero breaking changes —
every existing call site renders byte-identical output because all new props
default to pre-0.14 behavior (host-local zone, no suffix, italic empty).

### Added

- **`timeZone?: string`** on `DateTimeCell` — IANA zone identifier
  (e.g. `"America/Los_Angeles"`). When set, the date is formatted in that zone
  via `Intl.DateTimeFormat({ timeZone }).formatToParts(...)`; when unset the
  renderer continues to use the host system's local zone via native `Date`
  getters (identical to pre-0.14 output). No Luxon dependency added.
- **`showZoneAbbreviation?: boolean`** on `DateTimeCell` — when `true`, appends
  a ` (PDT)`-style suffix to the formatted string, derived from
  `Intl.DateTimeFormat({ timeZone, timeZoneName: "short" })` using
  `formatToParts` to cleanly extract the abbreviation. Honors `timeZone` when
  provided, otherwise uses host-local zone. Default `false`. Chosen over a new
  format token because the boolean composes orthogonally with the existing
  `format` / `showSeconds` / `locale` API and matches `showSeconds`'s naming.
- **`emptyVariant?: "default" | "plain"`** on `DateTimeCell` — `"default"`
  (unchanged) renders the existing italic `—`; `"plain"` renders a non-italic
  `—` for downstream themes that prefer upright empty cells. Implemented as a
  new `.cell-empty--plain` class that flips `font-style: normal`.
- **CSS hook `--cell-empty-font-style`** on `.cell-empty` — the italic default
  is now `font-style: var(--cell-empty-font-style, italic)`, so an ancestor
  (table wrapper, theme root) can set `--cell-empty-font-style: normal` and
  restyle every empty-cell fallback globally without per-component props.

### Why this shape

Downstream `amygdala-ui` has a `DateRenderer` that formats ISO timestamps in
an IANA zone as `yyyy-MM-dd HH:mm:ss (ZZZZ)` (Luxon-backed) with a
non-italic empty fallback. Before 0.14 it could not wrap `DateTimeCell`
without losing zone handling, the zone abbreviation, or visual parity on the
empty state. After 0.14 the wrapper collapses to:

```tsx
<DateTimeCell
  value={props.timestamp}
  timeZone={props.timezone}
  showZoneAbbreviation
  emptyVariant="plain"
/>
```

and the Luxon dependency can drop out of that renderer.

### Behavior for existing consumers

None. All new props are optional and default to the pre-0.14 code path:
- `timeZone` unset → `Date` getters → host-local output (identical).
- `showZoneAbbreviation` unset → no suffix appended (identical).
- `emptyVariant` unset → class `cell-empty` only → italic fallback (identical).
- `.cell-empty` default `font-style` resolves to `italic` when
  `--cell-empty-font-style` is not set (identical).

## v0.13.0 — LongTextCell: clampLines + tooltip reveal

Additive extension to `LongTextCell`. No breaking changes — consumers
that pass only `maxLength` / `expandable` retain the exact current
behavior (char-count truncation with inline "more..."/"less" toggle).

### Added

- **`clampLines?: number`** — CSS `-webkit-line-clamp` truncation. When
  set, the full value is rendered and truncation is detected at runtime
  by comparing `scrollHeight` / `scrollWidth` against client dimensions.
  Overrides `maxLength`. Re-measures on window resize and when the value
  or `clampLines` changes.
- **`reveal?: "inline" | "tooltip"`** (default `"inline"`) — selects the
  reveal mechanism for the full value when truncated. `"tooltip"`
  composes the library's existing Kobalte-backed `Tooltip` (viewport-
  aware placement, auto-flips when overflowing) and shows the full value
  on hover instead of rendering an inline toggle button.
- **`tooltipPlacement?: "top" | "bottom" | "left" | "right"`** (default
  `"top"`) — preferred tooltip placement when `reveal="tooltip"`.

### Why

The downstream `StringRenderer` in amygdala-ui needed CSS line-clamp +
viewport-aware hover tooltip, which the previous char-count-only
`LongTextCell` couldn't express. With these additive props, downstream
projects can retire their local `useSmartTooltip` / `TruncationContext`
primitives and thin-wrap `LongTextCell` instead.

## v0.12.0 — `--sui-space-*` token scale

Exposes a dedicated spacing-token scale on both built-in themes.
Non-breaking — only adds new custom properties; no existing tokens were
renamed, removed, or changed. No upstream components were refactored to
adopt the tokens in this release (consumers and a future upstream
refactor sprint will migrate separately).

### Added

- **`--sui-space-*` scale** in `src/themes/default.css`,
  `src/themes/hud.css`, and `src/styles/global.css`. Eleven stops on a
  4px base grid with explicit half-steps at `0-5` (2px), `1-5` (6px),
  and `2-5` (10px). Token names follow Tailwind-style numeric suffixes
  so each integer step = 4px. Full scale:

  | Token | px |
  |-------|-----|
  | `--sui-space-0` | `0` |
  | `--sui-space-px` | `1px` |
  | `--sui-space-0-5` | `2px` |
  | `--sui-space-1` | `4px` |
  | `--sui-space-1-5` | `6px` |
  | `--sui-space-2` | `8px` |
  | `--sui-space-2-5` | `10px` |
  | `--sui-space-3` | `12px` |
  | `--sui-space-4` | `16px` |
  | `--sui-space-5` | `20px` |
  | `--sui-space-6` | `24px` |

- **`COMPONENTS.md` → Theming → Spacing Scale** table documenting
  typical use per stop.

### Rationale / data

Scale sized from a histogram of `padding|margin|gap|inset|top|right|bottom|left`
px literals across a downstream consumer repo (`amygdala-ui`,
`sui-migration-staging` branch — 175 files, CSS + inline JSX combined).
Top-9 values cover ~95% of occurrences:

| Rank | Value | Count | Maps to |
|------|-------|-------|---------|
| 1 | 8px | 181 | `--sui-space-2` |
| 2 | 4px | 130 | `--sui-space-1` |
| 3 | 12px | 97 | `--sui-space-3` |
| 4 | 6px | 82 | `--sui-space-1-5` |
| 5 | 16px | 77 | `--sui-space-4` |
| 6 | 2px | 50 | `--sui-space-0-5` |
| 7 | 10px | 38 | `--sui-space-2-5` |
| 8 | 24px | 34 | `--sui-space-6` |
| 9 | 20px | 32 | `--sui-space-5` |

### Omitted stops (and why)

- **No `--sui-space-7` / `32px`.** Only 1 occurrence in the sampled
  consumer. Callers needing it can round up to `--sui-space-6` or
  pass a literal; re-introduce if data changes.
- **No `48px` / `64px` jumbo stops.** Not seen in consumer data.
  Upstream adds them when a real page-gutter need arises — no
  speculative stops.
- **`7px` (11 occ.) and `14px` (7 occ.) not encoded.** Off-grid
  and infrequent; callers should round to `--sui-space-2` (8) or
  `--sui-space-4` (16). Flagged as rounding targets rather than
  adding `1-75` / `3-5` stops.
- **`1px` and `2px` in `border:` / `border-*:` properties.** Not
  counted as spacing — they remain literal per convention.
  `--sui-space-px` and `--sui-space-0-5` are for spacing-property
  use (e.g. `margin: 1px`, `top: 2px`).

### Known divergences from a pure 4px grid

`--sui-space-1-5` (6px) and `--sui-space-2-5` (10px) are explicit
half-steps. They exist because the consumer distribution showed
these values used heavily (82 + 38 occurrences) and rounding would
force a visible design shift. A future sprint may deprecate them
in favour of a strict 4px grid once downstream callers are
audited component-by-component.

## v0.11.1 — ThreePanelLayout column placement fix

CSS-only patch release.

### Fixed

- **Fix column placement when side panels are omitted.** Previously the
  center/right panels could land in the wrong grid track when `leftPanel`
  was absent: CSS grid auto-placement fills tracks in DOM order, so
  omitting the left cell pushed `center` into the `0px` first track and
  `right` into the `1fr` second track, producing overlap. Now
  `.sui-three-panel__left` / `__center` / `__right` carry explicit
  `grid-column: 1 / 2 / 3` so placement is role-based regardless of which
  siblings are rendered. The mobile (≤900 px) block resets all three back
  to `grid-column: 1` so the single-column stack is unaffected.

## v0.11.0 — Atomic primitive: ThreePanelLayout (Phase 1.8)

Ships the top-bar + three-column (left / center / right) page scaffold
identified by the migration audit's Phase 1.8 batch. This is the final
Veronica primitive of Phase 1 — with it merged, all upstream prerequisites
for the downstream alarm-lab / analysis-page migration are complete.

### Added

- **`ThreePanelLayout`** (`src/components/ThreePanelLayout/ThreePanelLayout.tsx`)
  — Atomic (Depth 1). Top-bar + three-column page scaffold. Owns
  `ThreePanelLayout.css`. Imports zero other library components (pure leaf
  primitive). Annotated `Component<ThreePanelLayoutProps>` for
  TS2742 / pnpm-portability. Exported types: `ThreePanelLayoutProps`.
- **Configurable panel widths.** `leftPanelWidth?` / `rightPanelWidth?`
  (defaults `"220px"` / `"240px"`) let callers pick column sizes per-page
  without needing a separate "variant" component. Omitted side-panel slots
  collapse their grid column to `0` so the center expands fully.
- **App-chrome-decoupled height.** `height?` (default `"100%"`) accepts any
  CSS length — callers that want "viewport minus app header" pass
  `"calc(100vh - var(--app-header-height, 64px))"` (or equivalent) from the
  host app. Upstream stays fully decoupled from app-specific header tokens.
  `fullHeight?` is kept as a backwards-compatible alias for `height="100%"`
  so existing downstream call sites (`<ThreePanelLayout fullHeight>`) migrate
  without an API rewrite — `height` wins if both are supplied.
- **Mobile collapse.** At `max-width: 900px` (matches the downstream
  `$mobile-width`) the content grid switches to a single column, side panels
  drop their border and cap at `200px` max-height. Breakpoint is hardcoded
  because the library has no `--sui-breakpoint-*` scale yet — revisit once a
  breakpoint scale lands.

### Tokens

- Colors / borders use the existing theme tokens:
  `--sui-bg-primary`, `--sui-text-primary`, `--sui-border`.
- Spacing (8 / 12 / 16 px gaps and paddings) is hardcoded to match the
  downstream `$gap-small` / `$gap-medium` / `$gap-large` and
  `$padding-small` / `$padding-medium` scales; the library has no
  `--sui-space-*` tokens yet. Follows the same pattern as `Divider.css`.
- No new tokens were introduced in `themes/hud.css` or `themes/default.css`.

### Divergences from the downstream driving site (intentional)

- Downstream `threePanelLayout.module.scss` uses `height: calc(100vh - $header-height)`
  where `$header-height` is an app-level SCSS variable. Upstream replaces this
  with a caller-supplied `height` prop to avoid leaking app-specific tokens
  into the library.
- Downstream hardcodes `grid-template-columns: 220px 1fr 240px`. Upstream
  exposes `leftPanelWidth` / `rightPanelWidth` props with those values as
  defaults.
- Downstream uses SCSS CSS modules; upstream uses a single plain CSS file
  with BEM-ish `.sui-three-panel__*` class names and `--sui-*` tokens.

## v0.10.0 — Composite primitive: DateRangePicker (Phase 1.7)

Ships the composed date-range picker identified by the migration audit's
Phase 1.7 batch. Folds the downstream `forms/DateRangePicker/` subdirectory
(root component + CalendarGrid + CalendarHeader + PresetButtons + TimeInputs +
`calendarUtils.ts`) into a single upstream composite with only the root
component exported. Phase 5 (Forms) can now delete the entire downstream
subdirectory and import `DateRangePicker` from the library.

### Added

- **`DateRangePicker`** (`src/components/DateRangePicker/DateRangePicker.tsx`)
  — Composite (Depth 2). Popover-anchored date-range picker built on
  `@kobalte/core/popover`. Owns `DateRangePicker.css`. Composes the upstream
  `Button` (Atomic) for preset chips. Internal `CalendarGrid`,
  `CalendarHeader`, `PresetButtons`, `TimeInputs` live as private files under
  the component directory and are NOT re-exported — zero-config at the call
  site (Decision 1a). Annotated `Component<DateRangePickerProps>` for
  TS2742 / pnpm-portability. Exported types: `DateRangePickerProps`,
  `DateRange`, `DateRangePreset`.
- **`timeZone?: string` prop on `DateRangePicker`.** Optional IANA TZ
  identifier (e.g. `"America/Los_Angeles"`, `"UTC"`). When set, the trigger
  label, month header, calendar-day highlighting, and committed time-of-day
  selections are all resolved in this TZ; when omitted, the component falls
  back to the browser's local TZ. Pre-empts Phase 5 migration mismatch: the
  downstream app pins operational timestamps to Pacific via
  `CellRenderers.tsx`, `OperationalEdgesTable.tsx`,
  `CandlestickRenderer.tsx`, `TimeRangeSelector.tsx` — forwarding the same
  IANA TZ here keeps the picker aligned with the surrounding UI at
  day-boundary transitions. Implementation uses a two-pass
  `zonedDateTimeToInstant` helper to resolve `HH:mm` + (year, month, day)
  into a committed UTC instant, and a cell-vs-instant comparison pair
  (`cellMatchesBoundary`, `cellInRange`) so the cell `Date` objects built
  by `getCalendarDays` line up with boundary instants observed in the
  target TZ.

### Behavioral delta vs project-local downstream

- **`class` now APPENDS to the default trigger class** (`sui-drp__trigger`)
  rather than replacing it. The project-local downstream substituted the
  caller's `class` for its internal `styles.trigger`; upstream layers the
  two via `["sui-drp__trigger", props.class].filter(Boolean).join(" ")`.
  Callers who previously passed `class` to customize the trigger keep
  default trigger styling and get their overrides layered on top. Phase 5
  migrations benefit automatically; any downstream consumer relying on the
  old replace-semantics must move trigger styles into a CSS override that
  coexists with `sui-drp__trigger`.

### Scope decisions

**Decision 1 — Sub-components private.** Only `DateRangePicker` is exported
from the library root. `CalendarGrid`, `CalendarHeader`, `PresetButtons`, and
`TimeInputs` are implementation details. Matches the audit's recommendation
and keeps the public surface minimal.

**Decision 2 — Vanilla `Date` + `Intl.DateTimeFormat`.** No Luxon, no
date-fns, no caller-supplied formatter contract. The downstream used Luxon
for weekday offsets and month/short-date formatting; all of that is replaced
with `new Date(year, month, 1).getDay()` + `Intl.DateTimeFormat` at zero
bundle cost. Keeps the library dep-light (Luxon would have added ~70 kB to
every consumer; requiring formatter props would have added 4–5 props to
every call site). Locale-aware formatting comes from the browser's built-in
i18n — no work for callers.

**Decision 3 — Presets caller-supplied.** `presets?: DateRangePreset[]`
matches the downstream contract. Omit or pass `[]` to suppress the preset
row. No built-in default preset set.

**Decision 4 — Browser-local timezone by default, opt-in `timeZone?` prop.**
The initial release shipped browser-local behavior only. Post-review
revision: added `timeZone?: string` (IANA identifier) so callers can pin
the picker to the same TZ the rest of their app renders in — preventing
off-by-one mismatches at TZ boundaries. Omitting the prop preserves
browser-local behavior; passing it threads TZ-aware comparison + formatting
through every touch point (trigger label, month header, calendar-cell
highlighting, committed `HH:mm` resolution).

### Kobalte — built from scratch, no `@kobalte/core/date-picker`

Kobalte does not ship a `date-picker` primitive (checked
`@kobalte/core/dist` subpaths). The picker is built on
`@kobalte/core/popover` plus hand-rolled calendar math and day buttons.
Popover is already covered by `vite.config.ts`'s `noExternal` pattern
(`/^@kobalte\//`), so no SSR config changes were needed.

### Divergences from downstream (intentional)

- Internal sub-components are not exported (downstream had them as separate
  files inside the feature folder; upstream treats them as private).
- Luxon replaced with vanilla `Date` + `Intl.DateTimeFormat`.
- SCSS CSS modules replaced with a plain `.css` file using BEM-ish
  `.sui-drp__*` class names and `--sui-*` theme tokens.
- `sanitizeMaxRangeDays` downgrades the dev-mode `throw` to a `console.error`
  + graceful fallback (`import.meta.env.DEV` is not available in this
  library's tsconfig/context; throwing in prod would have been worse than
  the downstream dev-only throw).

### Known gaps

- **No upstream test coverage for `calendarUtils`.** The downstream ships a
  Vitest `calendarUtils.test.ts` with month-boundary / range / clamp /
  sanitize coverage. Upstream has no test framework configured — tests are
  not ported in this release. Tracking follow-up: add Vitest to
  `solid-ui-components` so this and any future utility modules can ship
  with tests.

## v0.9.0 — Data primitives: ValueRenderer + ChangeRenderer + CandlestickRenderer (Phase 1.6)

Ships the three data-primitive components identified by the migration audit's
Phase 1.6 batch. Consolidates the downstream renderer family
(`ObjectRenderer` + `ChangeRenderer` + `ChangeObjectRenderer`) into a
`ValueRenderer` meta-primitive with a pluggable `renderValue` dispatcher plus
a `ChangeRenderer` composite that reuses the same dispatch on both sides.
`CandlestickRenderer` ships separately (OHLC shape does not fit the generic
dispatch).

### Added

- **`ValueRenderer`** (`src/components/ValueRenderer/ValueRenderer.tsx`) —
  Atomic (Depth 1). Labeled label/value layout with a hybrid dispatcher:
  zero-config for primitives (`string`, `number`, `boolean`, `null`/`undefined`),
  arrays, plain objects, and pre-rendered JSX; host supplies an optional
  `renderValue?: (v: unknown) => JSX.Element | undefined` to inject domain
  renderers (status badges, candlesticks, epoch-millis dates, etc.). Returning
  `undefined` from the override falls through to the default dispatcher. Object
  rendering recurses through the same pipeline so overrides apply at every
  nesting level. Owns `ValueRenderer.css`. Annotated `Component<ValueRendererProps>`
  for TS2742 / pnpm-portability. Exported types: `ValueRendererProps`,
  `RenderValueFn`.
- **`ChangeRenderer`** (`src/components/ChangeRenderer/ChangeRenderer.tsx`) —
  Depth 2 (Composite). Before/after pair with a directional arrow; both sides
  render through `ValueRenderer` so a single `renderValue` override applies
  consistently to both. Accepts optional custom `arrow` element. Owns
  `ChangeRenderer.css`. Annotated `Component<ChangeRendererProps>`.
- **`CandlestickRenderer`** (`src/components/CandlestickRenderer/CandlestickRenderer.tsx`) —
  Atomic (Depth 1). OHLC box visualization: open/close flanks, high/low stacked
  markers, mean inside the box. Default bullish/bearish coloring via
  `--sui-success`/`--sui-danger`; `getBoxColor` override for custom rules
  (e.g., doji detection). No component imports; owns `CandlestickRenderer.css`.
  Annotated `Component<CandlestickRendererProps>`. Exported types:
  `CandlestickRendererProps`, `Candlestick`.

### Scope decisions

**Decision 1 — Dispatch API shape.** Hybrid: minimal built-in default dispatch
for primitives and plain objects, with a `renderValue` prop as an explicit
extension hook. Ship no opinionated sub-renderers (e.g., status-keyword
detection, epoch-millis-as-date heuristics) — those are domain policies that
belong to the host. Objects on each side dispatch through `ValueRenderer` in
`ChangeRenderer`, which means a single host-supplied `renderValue` applies to
primitive values on both sides AND to nested values inside objects.

**Decision 2 — No sub-renderers upstream.** Downstream's
`String/Number/Duration/Date/StatusBadge` renderers carry
host-specific concerns (smart tooltip hook, alarm-color generation, Luxon
duration formatting, pacific-timezone format strings) that are not generic
enough for an atomic library. `ValueRenderer`'s default dispatcher renders
primitives inline without importing sub-atomics, honoring the "atomics must
NOT import other atomics" rule. Phase 7 can collapse the downstream
renderer files into call sites of `ValueRenderer` with a host-local
`renderValue` that wires in whatever domain atomics the app keeps around
(e.g., a project-local `StatusBadgeRenderer` + `DateRenderer` would stay
downstream as thin renderers; `ObjectRenderer.tsx` goes away entirely).

**Decision 3 — Single v0.9.0 release.** All three components share CSS
conventions (`--sui-*` tokens, label/value grid), ship together as the audit's
Phase 1.6 batch, and have low individual surface. One PR, one review, one
release. No batch chaining.

### Documented divergences

- **`ChangeRenderer` does not replicate downstream `ChangeObjectRenderer`'s per-key
  aligned grid.** When `before`/`after` are objects, each side renders through
  `ValueRenderer`'s default key/value entry list — the key-level diff (added /
  removed / changed / unchanged highlighting) remains a domain concern. If
  downstream needs that behavior, it stays as a domain component that
  composes `ValueRenderer` + custom per-key layout.
- **`CandlestickRenderer` does not embed a hover tooltip.** The downstream
  `useSmartTooltip`-based floating panel is host-specific. Callers wrap the
  base in the library `Tooltip` to reintroduce the behavior.

### CSS

- `src/components/ValueRenderer/ValueRenderer.css` — label/value grid, object
  entry list with alternating-row tint, primitive variants.
- `src/components/ChangeRenderer/ChangeRenderer.css` — pair layout, arrow
  styling, opacity-based before/after emphasis.
- `src/components/CandlestickRenderer/CandlestickRenderer.css` — OHLC box,
  absolute-positioned high/low markers, token-driven bullish/bearish fill.

### Component classification

- `ValueRenderer` — **Atomic (Depth 1)**. No component imports; owns CSS.
- `ChangeRenderer` — **Depth 2 (Composite)**. Composes `ValueRenderer`; owns
  its own CSS for the pair layout.
- `CandlestickRenderer` — **Atomic (Depth 1)**. No component imports; owns CSS.

The taxonomy is unchanged — `STYLE_GUIDE.md` already accommodates Depth 2
composites that own CSS for their own layout concerns on top of Atomic children.

### Phase 1.6 sequencing unblocks

These three exports plus `PivotTable` (still outstanding) complete the data
primitives batch. Phase 7 (downstream `renderers/*` migration) can now consume
`ValueRenderer`, `ChangeRenderer`, `CandlestickRenderer` directly from
`solid-ui-components`.

## v0.8.0 — Toast (Phase 1.5)

Wraps `@kobalte/core/toast` into an opinionated toast component plus the
provider atomics needed to host it. Completes the notification surface so
downstream's `amygdala-ui/src/components/toast/Toast.tsx` and the
`Routes.tsx` provider mount can both resolve from `solid-ui-components` at
Phase 8 swap time.

### Added

- **`Toast`** (`src/components/Toast/Toast.tsx`) — Themed toast with four
  variants (`info` | `success` | `warning` | `error`), optional
  `description`, `actions` (array of `ToastAction { label, onClick, variant? }`),
  `duration`, `persistent`. Extends `ToastRootProps` so any kobalte passthrough
  (priority, swipe handlers, etc.) still works. Annotated `Component<ToastProps>`
  for TS2742 / pnpm-portability.
- **`ToastRegion`** / **`ToastList`** — Curried atomics that wrap
  `@kobalte/core/toast`'s `Region` and `List` with baked-in styling. Mount once
  near the app root (inside a `Portal`) and call `showToast(...)` from
  anywhere.
- **`showToast(input)`** — Typed imperative helper. Returns
  `{ id: number, dismiss: () => void }`. Callers pass the same shape as
  `ToastProps` (minus `toastId`, which kobalte injects).
- **`toaster`** — Re-export of kobalte's raw toaster for `update` / `clear` /
  `promise` use cases not covered by `showToast`.
- Exported types: `ToastProps`, `ToastAction`, `ToastVariant`,
  `ToastRegionCurriedProps`, `ToastListCurriedProps`, `ShowToastInput`,
  `ToastHandle`.

### Provider surface decision

Ships a **two-option surface**:

1. `ToastRegion` + `ToastList` curried atomics — the 80% case; zero-config.
2. Raw `toaster` re-export — imperative escape hatch (`update` / `clear` /
   `promise`).

For callers that genuinely need `Toast.Root` / `Toast.Title` /
`Toast.Description` directly (rare — custom layouts, multi-region setups),
`@kobalte/core/toast` is already an installed peer and can be imported
directly. No upstream re-export is needed for that case.

Phase 8's `Routes.tsx` diff becomes a 1-line import swap —
`import { Toast } from "@kobalte/core/toast"` → `import { ToastRegion, ToastList }
from "solid-ui-components"` — plus renaming `<Toast.Region>` / `<Toast.List />`.

### Toaster API decision

Ships `showToast(input)` wrapper (typed to `ToastProps`) **and** re-exports the
raw `toaster` for `clear()` / `update()` / `promise()` edge cases. The wrapper
aligns with the new `Toast` prop shape so callers don't re-type the JSX at each
site; the raw re-export keeps every kobalte capability accessible.

### API divergences from downstream

- `toastId` is typed `number` (kobalte-native), not `string` as the audit
  sketch suggested.
- Variant set is `info | success | warning | error` (audit). Downstream's
  `"default"` maps to `"info"` — Phase 8 call-site rename.
- Action button styling is baked into `Toast.css` rather than composing the
  `Button` atomic (Atomic components may not import other Atomics per
  `STYLE_GUIDE.md`).
- Close-button glyph is inlined as a hardcoded `<svg>` in `Toast.tsx` rather
  than composing the `Icon` atomic — same rationale. Geometry mirrors the
  Icon atomic's `close` outline path so visual weight matches.

### Driving downstream sites

- `amygdala-ui/src/components/toast/Toast.tsx` (base component)
- `amygdala-ui/src/components/Routes.tsx` (`Toast.Region` + `Toast.List` mount)
- `amygdala-ui/src/contexts/VesselTypePromptProvider.tsx` (imperative
  `toaster.show` / `toaster.dismiss`)

### Unblocks

- Phase 8 `toast/` migration + `Routes.tsx` provider swap.

## v0.7.0 — ThemedNumberInput (Phase 1.4)

Rounds out the themed input family with a numeric field. Kobalte-backed
(`@kobalte/core/number-field`) — gets the stepper keyboard semantics, bounds
enforcement, and locale-aware formatting without re-implementing them.

### Added

- **`ThemedNumberInput`** (`src/components/ThemedNumberInput/`) — Themed
  numeric field with stacked increment/decrement triggers. Key props: `value`
  (`Accessor<number | undefined>`), `onChange`, `name`, `label`, `description`,
  `errorMessage`, `min`, `max`, `step?` (default `1`). Friendly `min`/`max`
  names map to kobalte's `minValue`/`maxValue`; all other `NumberFieldRootProps`
  forward via spread. Visual family with `ThemedInput` / `ThemedTextarea`
  (shared paddings, borders, focus ring).

### API divergences from downstream

- Downstream `amygdala-ui/src/components/forms/inputs/NumberInput.tsx` used
  `value?: number | Accessor<number | undefined>` and `onChange?: (value: number) => void`.
  Upstream tightens to `value?: Accessor<number | undefined>` (accessor-only —
  matches the rest of the library's reactive-prop convention) and changes
  `onChange` to `(value: number | undefined) => void` so callers don't need to
  guard on `NaN` when the field is cleared (kobalte emits `NaN`; we normalize
  to `undefined` at the boundary).
- Downstream surfaced `min` / `max` as its own props while the rest of the
  kobalte API was spread; upstream keeps that same friendly surface but
  explicitly `Omit`s `minValue` / `maxValue` from the forwarded kobalte props
  so the two spellings can't collide.

### Driving downstream site

- `amygdala-ui/src/components/forms/inputs/NumberInput.tsx` (sole call site).

### Unblocks

- Phase 5 forms — numeric threshold / bound fields (engine parameters, alarm
  thresholds, sampling rates).

## v0.6.0 — Selection Primitives (Phase 1.3)

Adds unified `Select` and `Combobox` primitives — each folds the single- and multi-mode downstream variants into a single upstream component via a `multiple?: boolean` literal that narrows `value` / `onChange`.

### Added

- **`Select`** (`src/components/Select/`) — Kobalte-backed single + multi select. Key props: `options`, `value`, `onChange`, `label`, `description`, `placeholder`, `id`, `multiple?`. All other `SelectRootProps` are forwarded. Multi-mode trigger renders a comma-joined preview + inline clear button; single-mode uses `disallowEmptySelection={false}`.
- **`Combobox`** (`src/components/Combobox/`) — Kobalte-backed single + multi combobox. Supports freeform creation on Enter via `onCreate`, per-chip removal via `onRemove` (multi-mode), input-change callback via `onInputChange`, and a `showChips` toggle (default `true` in multi-mode).

### Shared behavior

- Both components compose the existing `Icon` atomic (check / chevron-down / close) — no new iconography.
- Both CSS files use only `--sui-*` tokens; structural rules land in `dist/index.css`.
- Both ship in client + server bundles (SSR-safe via `vite-plugin-solid` `ssr: true` + kobalte `noExternal`, matching Tooltip's Phase 1.2 pattern).

### API divergences from downstream

- Single-site `onCreateNew` is renamed to `onCreate` for symmetry with the multi-site contract. Downstream call-site renames happen in a later phase.
- `showChips` defaults to `true` in multi-mode (was downstream-opt-in). Set `showChips={false}` to retain the listbox-only indicator behavior.

### Driving downstream sites

- Phase 5 forms (priority / status / tag pickers)
- Phase 8 `select` / `combobox` / `MultiCombobox` migrations

## v0.5.0 and earlier

See git log for prior history.
