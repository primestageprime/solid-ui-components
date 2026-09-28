# amygdala-ui chart assemblies — audit (2026-09-27)

Scope, per Peter's ruling on 2026-09-27: read-only against amygdala-ui, looking
for every file that assembles ≥3 of the 17 `Chart` family parts documented
this same PR (`AreaSeries`, `BarSeries`, `LineSeries`, `PointSeries`, `XAxis`,
`YAxis`, `Grid`, `ReferenceLine`, `Crosshair`, `ChartTooltip`,
`CurrentValueIndicator`, `HighlightSegments`, `TimelineBar`, `GhostArc`,
`GhostPin`, `PinMarkers`, `DragRangeSelect`) inside a `<Chart>`, to flag as a
missing composite. Nothing in amygdala-ui was modified; nothing was run there
beyond read-only inspection — `git status`, `git log`, `git branch`,
`git merge-base`, `git ls-tree`, `git show <ref>:<path>`, `grep`, `cat` —
against refs already fetched onto this machine.

## A process note first, because it cost most of this audit's time

The local clone at `/Users/peter/Documents/clients/PrimeStage/amygdala/amygdala-ui`
had its `main` checked out **420 commits behind `origin/main`**
(`git status`: "Your branch is behind 'origin/main' by 420 commits"). Reading
the checked-out working tree — which is what "read-only against amygdala-ui"
means by default — gave a materially wrong picture: its `DotChart.tsx` looked
like a hand-rolled D3 chart with zero SUI imports, none of the paths
`docs/usage-manifest.json` cites existed, and every "Direct consumer:
amygdala-ui" fact in this PR's `COMPONENTS.md` bullets looked contradicted.

None of that was true of amygdala-ui's real `main`. `origin/main` was already
fetched (this is what let `git status` compute the 420-commit gap at all), so
reading it costs nothing and changes nothing — `git show origin/main:<path>`
— and doing that reversed every one of those findings. **The lesson: "read
the repo" for a consumer audit means the remote tip, not whatever the local
clone happens to have checked out; check `git status`'s ahead/behind line
before trusting a local clone's working tree for anything.**

## The real state, read from `origin/main` (tip `e844cd17`, 2026-09-25)

`amygdala-ui/package.json` at `origin/main` pins
`"solid-ui-components": "npm:@primestageprime/solid-ui-components@0.135.0"`
— 64 minor releases behind this repo's `0.199.0`, not the far larger gap the
stale local clone implied. Most of the 17 parts predate 0.135.0 by a wide
margin (`catalog.json` `since`: `AreaSeries`/`BarSeries`/`LineSeries` at
`v0.16.0`, `DragRangeSelect` at `0.97.1`, `GhostPin`/`PinMarkers` at
`0.102.0`, `TimelineBar` at `0.35.0`); `HighlightSegments` reads `since:
0.135.0` — right at amygdala's pin, worth confirming with a changelog check
before assuming it's safely available — and `GhostArc`/`CurrentValueIndicator`
have no recorded `since` at all, so their actual availability at 0.135.0
isn't confirmed here. Either way amygdala-ui's version pin is a much smaller
gap than the stale local clone implied, and DotChart's own imports (below)
already prove most of these parts work at whatever version it's built
against today.

`docs/usage-manifest.json`'s entries for amygdala-ui turn out to be
**accurate for `origin/main`** — every cited file and every "Direct consumer:
amygdala-ui" fact in this PR's `COMPONENTS.md` bullets checks out once read
against the real tip:

```
git show origin/main:src/components/charts/DotChart/DotChart.tsx | \
  grep -n 'solid-ui-components' -A20
```

shows a genuine, large import from `solid-ui-components`:
`Chart, ChartTooltip, Crosshair, CurrentValueIndicator, DragRangeSelect,
GhostPin, Grid, HighlightSegments, PinMarkers, PointSeries, ReferenceLine,
ShapeGlyph, TimelineBar, XAxis, YAxis` — **13 of the 17 parts**, plus `GhostArc`
one level down through two of its own bridge components. The manifest's
`bridges/`, `composites/`, `mappers/`, `tooltips/` subdirectories it names all
exist (`git ls-tree -r origin/main -- src/components/charts/DotChart/`).

## The assemblies — one row per file with ≥3 parts inside a `<Chart>`

| File | Parts assembled (inside one `<Chart>`) | What the screen shows | Closest finished SUI chart | The gap |
|---|---|---|---|---|
| `src/components/charts/DotChart/DotChart.tsx` (527 lines; read in full — the JSX body, lines ~210-460 — not just grepped; imports 13 of the 17 parts, plus `GhostArc` via `bridges/GhostArcBridge.tsx` + `GhostArcsBridge.tsx`) | `Grid`, `YAxis`, `XAxis` ×1 each; `ReferenceLine` at **4** separate call sites (a `<For>` over caller-supplied threshold lines, a `<For>` over legacy `verticalIndicatorData`, an edge-highlight cue for candidate alarm edges, and the live-preview guide inside the ghost-pin block); `HighlightSegments` ×1 direct (alarm bands) — plus a SECOND, independent composition of `HighlightSegments`+`ReferenceLine` one level down inside the conditionally-rendered `<CorrelationBand />` (the auto-correlate window cue — a distinct usage, not the same call); `TimelineBar` ×2 (scheduled-strip + detected-strip, each its own lane pinned below the x-axis); `PointSeries` ×1 direct (in-bounds dots, `emphasizeNearestX`) plus a second instance inside its own `composites/OverlayPoints.tsx` (an optional "patterns-lens spike preservation" overlay layer); `PinMarkers` ×2 (out-of-bounds chevron pins in the plot lane, plus a second clickable/hoverable/deletable consumer-pin set in the reserved annotation lane); `GhostPin` ×2 (a live hover-tracking preview, plus a legacy `ghostPinFactId`-driven fallback for callers that haven't migrated); `GhostArc` via `GhostArcsBridge` (persistent committed arcs) + `GhostArcBridge` (one in-flight preview arc); `DragRangeSelect` (drag-to-zoom, cleared by its own `bridges/DragRangeAutoClear.tsx`); `CurrentValueIndicator` (the code's own comment: "Current value indicator (large dot at last sample)"); `Crosshair`; `ChartTooltip` (`maxWidth={320}`, a `fallback` for hovering an alarm band with no sample under it, composing its own `CrosshairTooltip` + `HoverDetail`) | amygdala's primary asset-metric time-series chart: in/out-of-bounds dots, dual alarm-state timeline strips, correlation-window shading, click-to-annotate pins (clickable and deletable, not drag-repositionable — dragging a placed pin isn't wired here), drag-to-zoom, and one merged hover popup (point readout + whatever annotation the cursor is over) | **None.** `ThroughputChart` (the closest shape in this repo: `Grid`+axes+`AreaSeries`/`BarSeries`/`LineSeries`+`ReferenceLine`+`Crosshair`+`ChartTooltip`) is a fixed-shape single-metric chart (`ThroughputChartProps`: one `dataPoints: ThroughputPoint[]` series in RATE mode, or one `completions` series in COMPLETION mode) — no `PointSeries`/scatter mark, no pins, no drag-zoom, no ghost-preview vocabulary at all | Everything past the axis/grid/reference-line core. This is the single largest and clearest case in this audit: one file already proves an entire feature set — annotated scatter + dual alarm-state timelines + drag-zoom + hover/click pins + ghost previews — that no SUI composite offers today, built by composing 13 of the 17 Depth-1 parts directly (thousands of lines across `DotChart.tsx` + its `bridges/`/`composites/`/`mappers/`/`tooltips/` helpers) because no Depth-2/3 chart covers it. |
| `src/pages/data-quality/MultiSeriesLineChart.tsx` (imports `Chart`, `Grid`, `LineSeries`, `ReferenceLine`, `XAxis`, `YAxis`) | `Grid`, `YAxis`, `XAxis`, `ReferenceLine`, one `LineSeries` per asset | A multi-series line comparison for the data-quality page; the file's own doc comment: *"Multi-series line chart: one `<LineSeries>` per asset inside a single SUI `<Chart>`. There is no existing multi-line primitive in the app, so this composes the base chart layers directly — the same approach DotChart takes for its point/timeline layers."* | **Not `ThroughputChart`** — checked its props (`ThroughputChartProps`), and it's a fixed-shape SINGLE-metric chart (one `dataPoints` series in RATE mode, or one `completions` series in COMPLETION mode), not an N-series comparison; it cannot take a variable list of asset lines, so it is not a drop-in here | A genuine, author-confirmed gap — the smallest and cleanest in this audit. A `MultiSeriesLineChart`-shaped composite (axes+grid+N-line-series+reference-line, no bars/area/pins) is the cheapest real promotion here. |
| `src/pages/data-quality/DailyBarChart.tsx` (imports `Chart`, `Grid`, `ReferenceLine`, `XAxis`, `YAxis`, `useChart` — **not** `BarSeries`) | `Grid`, `YAxis`, `XAxis`, `ReferenceLine`, plus grouped bars painted by hand as `<rect>`s via `useChart()` (the file's own comment: "Grouped (side-by-side) bars painted directly as `<rect>`s via `useChart()`") | Grouped, side-by-side daily bars for the data-quality page | `BarSeries` (`segments`) already supports stacked/signed segments, but this file wants **grouped** (side-by-side, not stacked) bars — a shape `BarSeries` doesn't have | A real primitive gap, not just an unassembled composite: `BarSeries` has no grouped-bar mode, so this consumer reimplemented bars by hand rather than reach for it. Worth a separate look at whether `BarSeries` should grow a grouped layout before promoting anything here. |
| `src/components/charts/AlarmOperationalTimelineBar/AlarmOperationalTimelineBar.tsx` and `src/components/charts/HighlightLine/HighlightLine.tsx` | `Chart` + `TimelineBar` only (2 parts each) | Standalone alarm-state / highlight strips used alongside `DotChart` | — | Below the ≥3-part threshold, not a promotion candidate on their own — but both are evidence that `TimelineBar` is already a well-fitting, independently-reached-for primitive; no gap here. |

`composites/CorrelationBand.tsx` (`HighlightSegments` + `ReferenceLine`, 2
parts) is DotChart's own internal decomposition of one mark, not a
second top-level assembly — it's already counted inside DotChart's row above.

## Ranked list — what would most obviously become one thing

1. **`DotChart.tsx` → a new Depth-2/3 composite.** By far the highest-value
   promotion candidate: one real consumer file already proves the exact
   feature set (annotated scatter + alarm-state timeline + drag-zoom +
   hover/click pins + ghost previews) that no SUI chart offers, composing 13
   of the 17 Depth-1 parts to get it. This should be built to `DotChart`'s
   *observed behavior* (its own tests/showcases), not ported line-by-line —
   it is a real Solid component (not D3), so a port is plausible, but the
   scope (527 lines plus 5 helper subdirectories) makes this a multi-week
   design effort in its own right, not a quick promotion.
2. **`MultiSeriesLineChart.tsx`** — smallest, cleanest gap; the author already
   named it ("no existing multi-line primitive"). Cheapest real win once (1)
   is scoped, and worth checking against `ThroughputChart` first in case it's
   already covered.
3. **`DailyBarChart.tsx`'s grouped-bar gap** — not a composite-promotion
   question at all, but a primitive one: `BarSeries` has no grouped
   (side-by-side) layout, only stacked/signed segments, and this consumer
   built its own `<rect>`s rather than reach for it. Worth Peter's ruling on
   whether `BarSeries` should grow that mode before any composite is built on
   top of it.
4. **`AlarmOperationalTimelineBar.tsx` / `HighlightLine.tsx`** — no action;
   listed only as evidence that `TimelineBar` already fits real usage well.

This is Peter's call to rule on, not a decision made here — no component was
created and amygdala-ui was not touched.
