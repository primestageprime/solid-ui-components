# Changelog

## [Unreleased]

### Added

- **Bronze theme** — a light, serif (Lora), friendly variant. Lora is used for prose; Inter for utility text (buttons, badges, subtitles, list metadata). Warm bone background, rust accent.
- **Theme architecture** — extracted shared component CSS into `_baseline.css`, loaded once on app boot. Per-theme CSS files now declare only tokens plus theme-specific overrides. A new `manifest.ts` registry is the single source of truth driving the loader, the dev switcher, and package exports.
- New token `--sui-font-utility` for small-text components. Defaults to `--sui-font-family` via CSS var fallback, so existing themes need not declare it.

### Changed

- `default.css` is now **tokens-only**. Consumers using `loadTheme()` (the documented JS API) are unaffected. Consumers loading `@primestageprime/solid-ui-components/themes/default.css` directly by URL will see component CSS go missing — they must also load `@primestageprime/solid-ui-components/themes/_baseline.css` (or move to the JS API). See `src/themes/README.md` for details.
- The dev `ThemeSwitcher` is now a dropdown sourced from the manifest rather than a 2-state toggle.

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
