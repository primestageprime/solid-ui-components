# Spec — optional labels on chart lines and markers

Status: **SHIPPED in 0.156.0 on 2026-09-01.** Peter confirmed the prop
expansion, `feat/chart-line-labels` merged to `main`, and the package published.
This file is kept as the record of how the feature is built and what it cost,
not as a task list.

**One item is still open:** verify against `thorcasting-ui`, which is npm-linked
in SOURCE mode and now also has 0.156.0 available from the registry.

**Read §9 before you run any gate on this repo.** It was wrong during this work
and the corrections cost a red `main` and a broken feature that a green suite
did not catch.
Written 2026-08-31. Supersedes the scratchpad handoff of the same date.
Target: `CashflowScrubChart` and `ScrubChart` in this repo.

`ThresholdRail` became `BandRail` in `6e8b8ad`, from a separate work stream
sharing this branch. Read §11's closing note before you edit or run gates.

---

## 1. What this delivers

A caller labels any line or marker on `CashflowScrubChart`. The component
places every label so it overlaps no other text and no drawn series. A label
that fits nowhere is dropped in silence.

Three consumer blockers close together, all requested by `thorcasting-ui`:

| # | Blocker | Change |
|---|---|---|
| 1 | A caption on a horizontal rule does not render | The label feature below |
| 2 | Every marker dot lands on the primary balance line | `CashflowChartMarker.valueCents` |
| 3 | Both rules share one CSS class, so styling one recolours the other | `CashflowChartMarker.class` |

All three ship in one release. Items 2 and 3 are small and independent of the
placement algorithm. Do them first — they are the cheap half.

### Not in scope

- Labels on the LEFT of the plot. The y-axis tick labels own that side.
- A label on any component other than `CashflowScrubChart`.
- A console warning when a label drops. Silence is the specified behaviour.

---

## 2. The prop gate — CLEARED, and how

**Peter confirmed the expansion on 2026-09-01, and 0.156.0 shipped with it.**
The rule below still binds the next person who adds a prop here, which is why
it stays.

`AGENT_GUIDE.md:156-172`, § *Enforcement — expansion requires confirmation*:

> **If you expand the set of variants / sizes / tokens / props, you MUST confirm
> with Peter first** — explaining *why* you're expanding and *why it's
> important*. This is a hard gate, not a suggestion.
>
> **Test-only and showcase-only usage does NOT count as demand.** A showcase
> that exercises every size, or a test that asserts on a tone, is not a shipped
> consumer. Only a real consumer app that actually renders the new variant in
> product justifies the expansion. No real consumer → no expansion.

This work adds four props, and `thorcasting-ui` renders all four in product, so
the consumer half of the gate was met from the start. Peter confirmed the other
half. The case that was put to him, kept because it is the shape a future
request should take:

| Prop | Consumer need |
|---|---|
| `CashflowBalanceSeries.labelPlacement` | The floor rule's caption must clear the plotted lines |
| `CashflowChartMarker.labelPlacement` | Same, per marker |
| `CashflowChartMarker.valueCents` | A dot at an arbitrary (x, y), not on the balance line |
| `CashflowChartMarker.class` | Style the crossing rule blue without recolouring TODAY |

`CashflowBalanceSeries.label` is **not** a new prop. It is declared at
`CashflowScrubChart/types.ts:63-93`, documented at `:66` as "legend / a11y",
and no `.tsx` reads it. Rendering it needs no expansion approval.

---

## 3. The API — ruled, do not re-litigate

`AGENT_GUIDE.md` §1 says "Never pass visual/layout props inline. Always use or
create curried variants." A placement zone looks like a layout prop, so the
scratchpad handoff flagged this as an unresolved fork. **It is resolved: the
zone rides on the data, not on a curried variant.**

The repo draws this line consciously, twice, inside the chart family:

- `ScrubChart/types.ts:175-178`, above `ScrubChartOverrides`:
  > Props that are visual / structural overrides — locked at variant-definition
  > time. Just the sizing knobs; everything else is data or a callback.
- `Chart/PinMarkers.tsx:84` — `PinMarkersOverrides` holds `size` and `class`
  only, while `lane?: PinMarkersLane` (`:68`) stays a render-time prop. `lane`
  is a vertical stacking slot: the closest structural analog to a zone.

A chart component curries **frame sizing** and passes **per-datum placement** as
data. Further precedent: `Table/types.ts:23` (`align` per column),
`BucketQueue/types.ts:63` (`fill` per bucket),
`Chart/HighlightSegments.tsx:48` (`lane` per segment),
`Dropdown/Dropdown.tsx:35` (`shape` per item).

Locking the zone at variant-definition time would force every label on one
chart into one zone, which defeats the feature.

### Copy `BandRail.side` for the shape

`BandRail/types.ts:8-9` and `:28-29`:

```ts
/** Which way a threshold's tick points off the rail. */
export type ThresholdSide = "above" | "below";

/** Which side of the rail the tick and its label take. Defaults to "above". */
side?: ThresholdSide;
```

An optional field, a named type, a documented default, resolved by the
component at `BandRail/helpers.ts:227-245` with `threshold.side ?? "above"`.

Every strong per-item field in this repo carries a doc comment arguing **why**
the knob is per-item. `labelPlacement` carries one too.

### The declarations

In `src/components/CashflowScrubChart/types.ts`:

```ts
/**
 * Where a label prefers to sit. A caller cannot see the data, the container
 * width or the theme's font, so a caller cannot know what fits — this is a
 * preference, not a lock. The component walks body → right → below and takes
 * the first zone the label fits. Defaults to "auto", which starts at the top.
 *
 * Per-datum and not a curried variant: one chart's labels routinely need
 * different zones, and a variant would force them all into one.
 */
export type CashflowLabelZone = "auto" | "body" | "right" | "below";
```

Add to `CashflowBalanceSeries`:

```ts
/** Where this series' `label` prefers to sit. Defaults to "auto". */
labelPlacement?: CashflowLabelZone;
```

Add to `CashflowChartMarker` (`types.ts:96-110`):

```ts
/** Where this marker's `label` prefers to sit. Defaults to "auto". */
labelPlacement?: CashflowLabelZone;
/**
 * The marker's y value. Without it the dot lands on the primary balance
 * line, which is where every marker sat before this field existed.
 */
valueCents?: number;
/** Extra class on this marker's own line and dot, for per-marker styling. */
class?: string;
```

---

## 4. Geometry — the constraint that actually shapes the code

The scratchpad handoff names DOM measurement as the shaping constraint and
proposes rendering twice. **That is wrong, and the double render is not
needed.** The real constraint is that the gutters feed the scales.

### 4.1 Measurement is already solved

`ScrubChart/helpers.ts:43` exports `measureLabelWidth(text: string): number`.
It uses an offscreen HTML5 canvas 2D context's `ctx.measureText(text).width`,
memoised module-locally. It needs no text in the DOM, so **placement runs in
one pass, before paint.** The left gutter already uses it
(`ScrubChart.tsx:136-147`).

**Under test the width is `text.length * 7`, not `text.length * 6.5`.** An
earlier draft of this spec said jsdom has no canvas and the `* 6.5` fallback
runs. That is wrong. `src/test-setup.ts` installs a stub 2D context whose
`measureText` returns `{ width: text.length * 7 }`, on purpose, so the real
canvas path runs and the fallback never fires. Widths are deterministic. Assert
against `length * 7`.

Do not add `getComputedTextLength()`. Do not render twice.

### 4.2 A preference is what buys space

`plotRight` feeds the x scale (`ScrubChart.tsx:150-159`). `xAxisHeight` feeds
the y scale (`ScrubChart.tsx:111-122`). So a gutter cannot be sized from the
ladder's output — the ladder needs the very scales the gutter would change.

Reserve-then-release does not escape it either: releasing gutter widens the
plot, which moves every series point, which invalidates every label already
placed against the old points.

**The rule that breaks the circle: an explicit preference reserves space; an
`"auto"` label never reserves any.**

- `labelPlacement: "right"` on at least one label reserves a right gutter.
  Its width is `max(measureLabelWidth(label))` over the right-preferring labels,
  plus `LABEL_GUTTER_GAP`. **Zero labels prefer right → the gutter is zero and
  no existing chart moves by one pixel.** Assert this in a test.
- `labelPlacement: "below"` on at least one label reserves one below row.
  `xAxisHeight` grows by `BELOW_ROW_HEIGHT` per reserved row, capped at 2 rows.
- An `"auto"` label uses a reserved gutter or row if one exists. It never
  creates one. If it reaches the bottom of the ladder and no row was bought, it
  is dropped.

This keeps the handoff's rule intact. An explicit `"right"` label can still
fall to `below` when the gutter cannot hold it. An `"auto"` label can still
reach `right` on gutter that another label bought.

**A consequence worth knowing before you design a chart's labels.** The gutter
is sized from the widest label that ASKED for it. So an `"auto"` label can only
use that gutter if it is **no wider** than the explicit label that bought it. A
longer `"auto"` label does not widen the gutter — it is dropped.

Measured while building the showcase: `"Pessimistic"` at 77px against
`"Optimistic"` at 70px is dropped; `"Target"` fits with room to spare. If a
caller wants a long caption in the gutter, that caption is the one that must
name `"right"`.

This follows from §4.2 rather than contradicting it, but it is not obvious from
the rule, and it decides which of a chart's labels should carry the explicit
zone.

### 4.3 Numbers, verified 2026-08-31

`ScrubChart/helpers.ts:30-37`:

```
DEFAULT_CHART_WIDTH = 1200
DEFAULT_CHART_HEIGHT = 200
DEFAULT_CELL_WIDTH = 40
DEFAULT_X_AXIS_HEIGHT = 22
DEFAULT_Y_TICK_COUNT = 5
DEFAULT_X_MAX_TICKS = 12
Y_LABEL_GAP = 8
```

- `ScrubChart.tsx:150-153` — `hSpan = insetSpan(chartWidth(), yAxisWidth(), 0)`.
  The trailing `0` is the right gutter. Replace it.
- `ScrubChart.tsx:111-114` — `vSpan = insetSpan(chartHeight(), 0, xAxisHeight())`.
- `ScrubChart.tsx:89-92` — `xAxisHeight` is `DEFAULT_X_AXIS_HEIGHT` when
  `xTickCadence !== "none"`, else `0`.
- `internal/geometry/insetSpan.ts:26-33` —
  `insetSpan(total: number, before: number, after: number): { start, end, size }`.
- `ScrubChartAxes.tsx:158-166` — x tick text at `plotBottom() + 6`,
  `dominant-baseline="hanging"`. A below row starts under that text's height.
- Scales: `dayPitch` `:156-158`, `indexToX` `:159`, exposed as `ctx.cellToX`
  at `:308`. `yScale` `:118-122`, `yToPlot` `:302-305`.

`ScrubChart` gains two new inputs so `CashflowScrubChart` can buy space:

```ts
/** Width reserved past the plot's right edge. Zero when nothing asks. */
rightGutter?: number;
/** Extra height under the x-axis tick labels. Zero when nothing asks. */
xAxisExtraHeight?: number;
```

Both are sizing knobs on the frame, so both belong on `ScrubChartOverrides`
under the §1 rule — the opposite of where `labelPlacement` goes, and for the
same reason.

`ScrubChartOverrides` today is exactly `chartHeight | cellWidth | yAxisWidth |
xAxisHeight`. `yAxisWidth` is the precedent for `rightGutter`: it overrides a
gutter the component otherwise measures. Note that `xAxisHeight` already exists
there and **sets** the axis height, while `xAxisExtraHeight` **adds** to it.
Name the new field so the two cannot be confused.

---

## 5. The placement ladder

A pure module, `src/components/CashflowScrubChart/labelPlacement.ts`, beside
its own `labelPlacement.test.ts`. Mirror `deviationBand.ts` (145 lines) and
`deviationBand.test.ts` (89 lines): the module takes scales and boxes and
returns positions, so it touches no DOM.

Input: the plot rectangle, the drawn series polylines, and one measured box per
label with its preferred zone. Output: one resolved position per label, or a
drop.

1. **body** — the label sits beside its own line, inside the plot. It fits when
   its box overlaps no other placed box **and no drawn series**. Test against
   the series, not only against other labels: a caption crossing a polyline is
   unreadable even though no text collides.
2. **right** — the label sits past `plotRight`, at its series' final y. Labels
   whose boxes overlap vertically take separate lanes.
3. **below** — the label sits under the x-axis tick labels, centred on its x and
   clamped into the plot's width. Overlapping labels take a second row.

A label that fits in no zone is dropped. Nothing is logged.

### 5.1 The three helpers are already lifted — DONE, use them

**This step is complete and merged.** It was future work when this spec was
written. Do not lift anything; import what is here.

The scratchpad handoff sends the reader to a mockup HTML file for prior art.
SUI already implements this. Commit `0039068`
("fix(ThresholdRail): keep tick labels clear of the thumb and of each other")
solved the same problem last release, and commits `06e653c` and `afcd2c9`
moved the result out of the rail into a shared module.

`src/internal/geometry/labelLayout.ts` holds all three, exported:

```ts
// :19
export type LabelAnchor = "start" | "middle" | "end";
// :26
fitAnchor(x: number, width: number, lo: number, hi: number): LabelAnchor
// :39
anchoredSpan(x: number, width: number, anchor: LabelAnchor): readonly [number, number]
// :56
interface LaneBox { readonly x: number; readonly span: readonly [number, number] }
// :62
interface LanePacking { readonly maxLanes: number; readonly gutter: number }
// :81
laneOf<Box extends LaneBox>(boxes: readonly Box[], packing: LanePacking):
  readonly (Box & { lane: number })[]
```

`fitAnchor` clamps a label into a range and returns the `text-anchor` that suits
the clamped position. `anchoredSpan` returns the box a label occupies once
anchored. `laneOf` assigns non-overlapping lanes.

`laneOf` is generic over `LaneBox`, so a caller keeps its own richer type in the
return. `LanePacking` is the seam that makes one function serve different
callers: pass a different `maxLanes` per call rather than forking the function.
The right zone and the below zone are two calls with different packings, not two
algorithms.

`labelLayout.test.ts` covers all three in 24 cases, including the lane cap, a
one-lane packing, a zero gutter, unsorted input and empty input. Read it before
you write against these — it is the contract.

`laneOf` keeps an explicit loop rather than a combinator. That is deliberate:
`collectionMethodCalls` and `dotChains` are ratcheted metrics and a rewrite
raises them. Do not "modernise" it.

**`laneOf` PERMITS OVERLAP PAST ITS CAP, and this ladder forbids overlap.** The
line is `const placed = Math.min(lane, packing.maxLanes)`. A box that finds no
free lane is forced into the outermost one and may collide. Its doc comment
records that as a considered trade for the rail, which prefers a crowded label
to a label leaving its frame. §5 of this spec makes the opposite choice: a
label that cannot be placed cleanly is dropped, not overlapped.

`labelPlacement.ts` therefore wraps `laneOf` in `splitLaneOverflow`, which sends
a colliding box down the ladder instead of letting it share the outermost lane.
Do not remove that wrapper on the belief that `laneOf` already guarantees
separation. It does not.

`BandRail/helpers.ts` (renamed from `ThresholdRail` in `6e8b8ad`) re-exports
`fitAnchor` and `anchoredSpan` as bare bindings, and `BandRail/types.ts`
re-exports `LabelAnchor`. Import from `src/internal/geometry/labelLayout.ts`
directly, not through the rail.

**Do not copy `lanes()` from the mockup.** It tries four lanes and then forces
the mark into lane 3 without re-checking, so it permits the overlap this spec
forbids. `fit()` from the mockup estimates width from character count, which
`measureLabelWidth` already beats.

For the LOOK, chart `#v2a` in the mockup is the reference. Note that `#v2a`
calls neither `fit()` nor `lanes()` — its labels are fixed pixel nudges (`-4`,
`+4`, `-6`) tuned to its fixture, and it finishes with a `deconflict()` pass
that walks overlapping text up or down in 11px steps. Copy its appearance only.

### 5.2 Clamping is already written twice — lift one helper

- `CashflowScrubChart.tsx:318-324` clamps an over-top label x to
  `[plotLeft + 28, plotRight - 28]`.
- `CashflowScrubChart.tsx:449-452` clamps a rule label to
  `[plotLeft + 18, plotRight - 18]`.

Do not add a third. `fitAnchor` from §5.1 replaces both.

### 5.3 A mark shortens to clear its own label

`CashflowScrubChart.tsx:456-469` already does this: the rule's text sits at
`plotTop + 8`, and the line then starts at `plotTop + (m.label ? 15 : 0)`. A
below-zone label needs the same move. Follow the existing code.

---

## 6. Rendering

Add a **new** label layer. Do not borrow an overlay slot.

`ScrubChart/types.ts:86` declares `renderChartOverlay` and `:95` declares
`renderHoverOverlay`. `CashflowScrubChart.tsx:613-617` passes both already —
markers into one, hover into the other. Neither is free.

Paint order is document order, not z-index. `layer: "under"` is implemented by
emitting a polyline before or after the primary line
(`CashflowScrubChart.tsx:211, 221-222, 365, 374`). A label layer appended after
`CashflowScrubChart.tsx:414` paints on top and reorders nothing.

### Tokens

The consumer runs the `hud` theme. Reference every colour through `var()`.

- `--sui-text-secondary` (hud `#7aa8c0`) — the caption colour. `CaptionLabel` in
  `Text/variants.ts` uses it, and a chart caption matches.
- `--sui-text-muted` (hud `#5d86a2`)
- `--sui-accent` (default `#3b82f6`, hud `#00d4ff`)
- `--sui-accent-dim` (hud `#0a9dbe`) — the text-safe accent

`bareHexCss` and `bareHexTsx` are ratcheted. A literal hex fails the build.

---

## 7. Tests

Baseline before you start: 317 files, 3433 tests, all passing. Vitest under
jsdom, tests colocated as `Component.test.tsx`.

`ScrubChart/ScrubChart.test.tsx` shows how to assert a geometry contract. It
stubs the rect on the element under test and reads `ScrubChartContext` fields
through the `renderChart` render-prop:

```tsx
import { pointer, rectOf } from "../../test-utils";
const PLOT_RECT = rectOf({ left: 0, top: 0, width: 1200, height: 200 });
// per test, on the element under test:
overlay.getBoundingClientRect = () => PLOT_RECT;
```

`deviationBand.test.ts` shows how a pure geometry module is tested — identity
scales isolate the maths:

```ts
const cellToX = (i: number) => i;
const yToPlot = (v: number) => v;
```

Required assertions:

1. **Zero labels prefer right → `rightGutter` is 0 and `plotRight ===
   chartWidth`.** This is the regression that protects every existing chart.
2. Zero labels prefer below → `xAxisHeight` stays 22.
3. Two body labels that would overlap → one moves to the next rung.
4. A label whose box crosses a drawn polyline does not stay in body.
5. Two right-zone labels at the same y take separate lanes.
6. A label that fits in no zone is dropped, and nothing is written to the
   console. Spy on `console.warn` and `console.error` and assert zero calls.
7. `valueCents` places a marker dot off the balance line; omitting it keeps the
   old behaviour of reading `lineCells()[m.index].balanceCents`
   (`CashflowScrubChart.tsx:475-478`).
8. A marker's `class` lands on that marker only.

---

## 8. The ratchets will fail your build — all three of them

`AGENT_GUIDE.md:397-425` is load-bearing. Read it. The summary:

**There are THREE ratchets, and `npm run health` runs only the first.**

| Ratchet | Where it runs | Baseline |
|---|---|---|
| `scripts/health.mjs` metrics | `health` job | `scripts/health-baseline.json` |
| bundle size | its own `bundle-budget` job | — |
| `componentsNeverExecuted` | **hidden inside `test`** | `scripts/execution-baseline.json` |

A green `npm run health` says nothing about the third.

**A metric that improves also fails, if the ceiling is not tightened.** Run
`npm run health -- --update-baseline` and commit the baseline **with** your
change. Bare `--update-baseline` only lowers ceilings. Raising one needs the
metric named and a reason:
`--update-baseline=dotChains --reason="…"`, recorded under `_raises`.

What this change must satisfy:

- **`componentsWithoutShowcase`** (baseline 0) — a changed exported component
  must be *rendered* under `dev/`. Extend
  `dev/showcases/cashflow-scrub-chart.tsx` (487 lines) and confirm it is
  registered in `dev/main.tsx:36,289-291`.
- **`undocumentedExports`** (baseline 157) — every exported name must appear
  somewhere in `COMPONENTS.md`. Any mention counts; a full section is not
  required. `CashflowLabelZone` is a new export, so add it.
- **`componentsNeverRendered`** (baseline 17) — a test must both import the
  module and call `render()` on it.
- **`bareHexCss` / `bareHexTsx` / `inlineStyleSrc` / `inlineStyleShowcases` /
  `dotChains` / `collectionMethodCalls` / `cssTypedProps` /
  `styleRubricViolations` / `showcaseStyleRubricViolations`** — none may rise.
  The placement module iterates over labels, so watch `collectionMethodCalls`
  and `dotChains`.

`docs/adr/0008-deliberately-unfixed.md` mentions `ScrubChart` once, at `:29-30`
— `yAxisWidth`'s `ticks.reduce` is a justified exception. **No ADR rules on
label overlap.** Nothing here is deliberately unfixed.

### Module size

`CashflowScrubChart.tsx` is 631 lines and `ScrubChart.tsx` is 571. Both are
already past the 500-line guidance. Do not grow either one. The placement
module and the label layer go in new files.

---

## 9. Verification gates

**CI RUNS SEVEN COMMANDS, NOT FIVE.** An earlier version of this section listed
five and omitted `typecheck:dev`. On 2026-09-01 that gap pushed a red `main`:
`dev/showcases/band-rail.tsx` imported a type the barrel never exported, and no
gate on the short list could see it. Run every line below.

```
npm run lint:ci        # lint-ci.mjs lint src --error-on-warnings
npm run typecheck      # tsc --noEmit          — src ONLY
npm run typecheck:dev  # tsc -p tsconfig.dev.json — dev/, the showcases
npm run test           # vitest run
npm run health         # scripts/health.mjs
npm run build          # build:client && build:server
npm run bundle-budget  # scripts/bundle-budget.mjs
npx biome format       # NOT in CI. See the format trap below.
git status --short     # only the files you meant to change
```

CI's `test` job runs `test:coverage` and `execution-coverage` rather than plain
`test`; `execution-coverage` is the hidden third ratchet, `componentsNeverExecuted`.
`strict: true`, so a PR must be up to date with `main` before it merges.

**Four traps when you run these.**

**`npm run typecheck` DOES NOT COMPILE `dev/`.** `tsconfig.json` has
`"include": ["src/**/*"]`. Only `typecheck:dev` compiles the showcases, through
`tsconfig.dev.json`. A showcase that imports a missing type passes `typecheck`
and fails CI. If you touch anything under `dev/`, `typecheck:dev` is the gate
that matters.

`npm run bundle-budget` builds the library ITSELF. Its first output line is
"Building the library (use --skip-build to reuse dist/)…", so `--skip-build` is
the opt-OUT that reuses an existing `dist/`. A cold run is correct and
self-sufficient. Do not tell anyone it needs `npm run build` first.

**Never pipe a gate through `tail` or `grep`.** `cmd | tail` reports the PIPE's
exit code, not the gate's, so `&&` chains and `$?` both read `tail`. A red gate
reads as green. Redirect to a file and echo `$?`:

```
npm run test > /tmp/t.log 2>&1; echo "exit=$?"; tail -20 /tmp/t.log
```

**A ratchet trap.** `dotChains` and `collectionMethodCalls` count NATIVE method
chains — `x().filter(...)`, `x().map(...)`, `[...set].sort(...)`. They do not
count the repo's own combinators. Import `filter`, `map` and `sortBy` from
`src/fn` instead of raising a baseline. A loop is not a chain and does not
count, which is why `laneOf` keeps one.

**A format trap. CI DOES NOT RUN THE FORMATTER, so nothing catches drift.**
Biome is the formatter — there is no Prettier in this repo, and a report that
"Prettier is clean" is a report about a tool that is not installed. `biome.json`
sets `lineWidth: 80` over `src/**`, `dev/**` and `scripts/**`. Release 0.156.0
left seven files unformatted, six of which were clean before it. Run
`npx biome format <your files>` before you commit, and `--write` to fix.

Note that `npm run lint` and `lint:ci` cover `src` ONLY. `npx biome lint` with
no path covers the whole repo and reports 27 errors and 61 warnings in `dev/`
and `scripts/` that predate this work. Do not try to drive that to zero — the
repo enforces `src`, and `docs/adr/0008-deliberately-unfixed.md` is the place
that question belongs.

Verify against the consumer before you bump the version. `thorcasting-ui` is
npm-linked in SOURCE mode, so it sees your edits without a publish.

---

## 10. Release path

**SHIPPED. `0.156.0` published on 2026-09-01** from `14e3d3d`, carrying this
work, the `BandRail` rename with bands, and the `ScrubChart` gridlines. The
instruction below to hold the version is spent; it is kept only so the record
reads straight.

> DO NOT BUMP THE VERSION. The user ruled on 2026-08-31 that this work and the
> `BandRail` work both finish first, and everything then releases under one
> bump.

That is what happened. `## 0.156.0` in `CHANGELOG.md` was written by the work
as it landed; there is no `[Unreleased]` heading and that convention is not
active here. State your reading of the §1 / data-prop fork in a CHANGELOG entry,
as §3 above sets it out.

### How the release actually went, for the next person

`publish.yml` runs on `workflow_run` after CI passes on `main`, and publishes
only when `package.json` carries a version the registry lacks. So a merged bump
publishes itself, and a re-run on an already-published version prints
"already published — skipping" rather than failing.

`enforce_admins` is `false`, so a direct push to `main` bypasses branch
protection and reports "Bypassed rule violations — 5 of 5 required status checks
are expected". CI still runs afterwards and still gates the publish, so a red
`main` does not reach the registry — but it does mean a bad push lands on the
default branch. Prefer a PR.

**Never tag a release on an unmerged branch** — `AGENT_GUIDE.md` calls tagging
the one step with no cheap undo.

`publish.yml` runs on `workflow_run` after CI passes on `main`, so a version
bump merged to `main` publishes itself. That is exactly why the bump waits.
**Never tag a release on an unmerged branch** — `AGENT_GUIDE.md` calls tagging
the one step with no cheap undo.

---

## 11. Order of work

Branch `feat/chart-line-labels`. Steps 2, 3, 4 and 6 are DONE and merged.

1. **OPEN** — Peter's confirmation on the four props (§2). The user ruled that
   the code proceeds and the MERGE waits on this, not the start. Do not merge
   to `main` without it.
2. ~~`CashflowChartMarker.class`.~~ DONE — `d58c155`.
3. ~~`CashflowChartMarker.valueCents`.~~ DONE — `6927835`. The old path still
   runs when the field is absent.
4. ~~Lift `fitAnchor` / `anchoredSpan` / `laneOf`.~~ DONE — `06e653c`,
   `afcd2c9`. They live in `src/internal/geometry/labelLayout.ts`. See §5.1.
5. ~~Write `labelPlacement.ts` + its test.~~ DONE — merged at `ebc72e2`. It
   exports `reserveLabelSpace(labels): ReservedSpace`,
   `placeLabels(labels, plot, polylines, space): readonly LabelPlacementResult[]`
   and `belowExtraHeight(rows)`. The box maths sits beside it in
   `labelBoxes.ts`. 46 tests across the two files.
6. ~~`rightGutter` / `xAxisExtraHeight` on `ScrubChartOverrides`.~~ DONE —
   `676f0c4`, `a898217`. The zero-reservation regression test is in place.
7. ~~Add the label layer to `CashflowScrubChart`.~~ DONE — merged at `a85fefe`.
   `labelLayer.tsx` holds it. `reserveLabelSpace` runs in a memo over props
   alone and feeds `rightGutter` and `xAxisExtraHeight`; `placeLabels` runs
   inside `renderBalanceChart`. The layer paints outside the clip group,
   because the right and below zones sit outside the plot rectangle.
   `CashflowLabelZone` now lives in `types.ts` and is re-exported from
   `labelPlacement.ts`.
8. ~~Showcase, `COMPONENTS.md`, CHANGELOG.~~ DONE in the same merge. No
   baseline moved, so `scripts/health-baseline.json` is untouched.
9. ~~Run the gates.~~ DONE. ~~Peter's confirmation.~~ GIVEN.
   ~~Merge and release.~~ SHIPPED as 0.156.0.
10. **STILL OPEN** — verify in `thorcasting-ui`.

Final state at release: 321 test files, 3583 tests, every CI gate exit 0, health
at baseline on every metric, `typicalAppKb` 31974 B — byte-identical to before
this work, so labels cost a consumer nothing.

### THE BUG A GREEN SUITE DID NOT CATCH — read this before trusting a gate

The feature shipped to a browser BROKEN once, with 3552 tests passing.

`runRightRung` refused any label whose row crossed `plot.top` or `plot.bottom`.
A series that ends at the y-domain maximum ends at `plot.top` EXACTLY, so the
top line's label — the very one whose width bought the gutter — was refused
every time. The chart reserved 59px of frame width and drew nothing in it. That
is worse than the feature not working: it is a silent layout tax.

**Why every test passed.** `reserveLabelSpace` reads WIDTHS and cannot see where
a line ends. `placeLabels` then applied a VERTICAL condition the reservation
never charged for. Every test checked ONE function against fixed numbers, so
both sides were internally consistent and jointly wrong.

`BandRail` hit the identical shape the same day — `bandStackReach` and
`bandGeometry` computed the same quantity from different bases and disagreed by
15.5 units, with all 110 of its tests green.

**The rule this earns.** When one function computes a quantity a second function
consumes, a test that checks each against fixed numbers proves nothing. Feed the
first function's output into the second and assert they AGREE, including at the
exact-equality boundary where an off-by-one hides. `labelPlacement.test.ts` now
does this in 15 cases, all of which fail against the pre-fix code.

**And open the browser.** The defect took ninety seconds to see and no test to
find. A gate that measures everything except whether the thing appears on screen
is not measuring the feature.

### One behaviour worth knowing

A marker joins the ladder only when it names an EXPLICIT zone. An `"auto"`
`"rule"` marker keeps the top-of-plot caption and the shortened line it always
had, so no existing chart moves. Give a rule marker an explicit zone and the
caption joins the ladder and the rule gets its full height back. This departs
from "`auto` starts at the top of the ladder" for that one marker kind, and it
is deliberate: the alternative moves every existing rule caption.

### `npm run build` FAILS IN A WORKTREE — not your code

The worktree `node_modules` is empty, and `vite.config.ts` copies
`katex.min.css` by an absolute path built from the project root. The bundle and
the declaration files build; only the post-bundle copy fails with
`ENOENT ... copyfile`. Run `build` and `bundle-budget` in the main checkout, or
fix the copy to resolve against the package.

Commit at each step. One commit at the end leaves nothing to inspect.

**`ThresholdRail` is now `BandRail`.** Another work stream renamed the whole
directory in `6e8b8ad` and shares this branch. Before you edit anything under
`src/components/BandRail/`, check whether that session is mid-change. Run your
gates in a worktree, not in the main checkout — a `git mv` landing under a test
run voids it.

**Line numbers in this spec predate the merges above.** Paths are current.
Offsets in `CashflowScrubChart.tsx`, `ScrubChart.tsx` and their `types.ts` have
moved, because steps 2, 3 and 6 edited all of them. Grep for the symbol; do not
trust an offset.

---

## 12. One thing to carry

Two agents on the consumer side refused work in the session that produced the
source handoff, and both were right. One declined to build rail ticks whose
cost an ADR forbids. One declined to delete a control while the page could not
answer for an edge case.

A well-argued refusal with its evidence is worth more than a plausible
implementation. If §4.2's rule turns out not to hold, say so and stop — do not
work around it.
