# A mark is a pure core with one thin adapter per chart context

Status: ACCEPTED by Adlai, 2026-09-11. Proposed 2026-09-10. Numbered after
ADR 0009, which decides a separate y-domain question. Decides dside `sui` #45161, and unblocks #45162,
#45164, #45165, #45169 and #45170.

Line numbers were re-checked on this branch after the wave landed on
2026-09-11, NOT on `223ef9d`. The clip work and the wave moved several of them.

## The problem

`Chart` gives a caller slot children. Each child reads what it needs from
`useChart`. `ctx.clip`, `ReferenceLine`, `Crosshair` and `PinMarkers` all work
that way.

`ScrubChart` gives the opposite. Its only extension points are three opaque
render callbacks — `renderChart`, `renderChartOverlay` and `renderHoverOverlay`
at `src/components/ScrubChart/types.ts:193`, `:197` and `:206`. Each hands the
caller some numbers and an empty SVG. `ScrubChart` exposes geometry (`cellToX` at
`types.ts:117`, `yToPlot` at `:143`) but draws nothing and offers no vocabulary
for a caller to say what to draw.

So a consumer that wants a rule, a label, a band or a crosshair draws it by
hand. `CashflowScrubChart` did that thirteen times. Several of those marks
already exist, written correctly, one altitude down in `Chart`.

## A caller cannot simply reach for the `Chart` primitive

Measured on `main` at `223ef9d`, and confirmed by two independent reviewers.

`ChartContext.Provider` mounts in exactly one place: `Chart.tsx:302`, closing at
`:373`. `ScrubChart` imports no `Chart`; it owns its own frame and raw `<svg>`
children, and it invokes the three callbacks at `ScrubChart.tsx:637`, `:734` and
`:772` inside its own JSX. Solid resolves `useContext` through the owner chain,
which runs consumer → `CashflowScrubChart` → `ScrubChart`. No `Chart` sits on
it. `ReferenceLine`'s `useChart()` at `Series.tsx:426` therefore hits the throw
at `context.ts:122-124`.

It does not render wrong. **It throws.**

The coordinates disagree as well. `ReferenceLine` emits plot-local coordinates
(`x1=0`, `x2=ctx.innerWidth()`) and depends on `Chart`'s margin translate.
`ScrubChart`'s `yToPlot` (`:450`), `plotLeft` and `plotRight` are
frame-absolute. An `x1` of `0` lands at the frame's left edge, left of the
y-axis column.

## The options

**A. Bridge.** Mount a `ChartContext.Provider` inside `ScrubChart`, built from
its existing memos. Cheap, and every `Chart` primitive works unchanged.

Rejected. `ChartContextValue` (`context.ts:87-116`) also demands drag, emphasis,
clip and overlay sub-contexts that `ScrubChart` has no analogue for. They become
inert stubs. A `Chart` child that uses one — `Crosshair`, a tooltip — then
silently no-ops instead of throwing. **A context that lies about what it
provides is worse than no context**, because the current failure is loud and the
bridged failure is silent.

**B. Native vocabulary.** `ScrubChartReferenceLine`, `ScrubChartMarkers`,
`ScrubChartLabels`, `ScrubChartCrosshair`, each reading `cellToX` and `yToPlot`
from `ScrubChartContext`.

Honest, and it is what #45161 originally asked for. But taken alone it
duplicates the drawing code that `Chart` already has, which is the very
complaint the ticket opens with.

**C. Pure core, one thin adapter per context.** Chosen.

## Decision

A mark is **two modules, not one**.

1. A **core**: a pure function that takes explicit geometry and returns the
   marks to draw. It reads no context, touches no cell, and knows no unit. Its
   interface is the geometry it needs and nothing else.
2. An **adapter** per chart context: a thin component that reads that context
   and calls the core. `Chart`'s adapter reads `useChart`. `ScrubChart`'s
   adapter reads `ScrubChartContext`.

The seam sits between the core and the adapters.

### A core returns DATA, not JSX

This is the load-bearing half of the rule. A core that returned JSX would read
its context to build that JSX, and the seam would be gone.

The repo already answers it, in the same two modules that prove the pattern:

| Core | Returns |
|---|---|
| `buildDeviationBand<T>` | `BandRun[]` |
| `placeLabels` | `readonly LabelPlacementResult[]` |

Both hand back geometry. Neither imports Solid. So a core is unit-testable with
plain numbers, and the adapter is the only module that knows what an SVG
element is.

That split also decides where the coordinate difference is absorbed. A core
takes the geometry it is given and does arithmetic on it. The adapter supplies
plot-local numbers from `Chart`, or frame-absolute numbers from `ScrubChart`,
and renders whatever comes back.

### Why this seam and not another

*One adapter means a hypothetical seam. Two adapters means a real one.* Here
there are exactly two, and they already exist and already differ: `Chart`'s
context is plot-local and value-addressed; `ScrubChart`'s is frame-absolute and
index-addressed. The seam is not speculative.

The core is **deep**: a caller learns a small geometry interface and gets the
whole mark. The adapters are deliberately **shallow** — that is what an adapter
is for. Depth lives in the core, where both charts collect it.

The coordinate mismatch stops being a blocker and becomes the adapter's job.
Converting plot-local to frame-absolute is exactly the difference the two
adapters exist to absorb.

### The repo already proves the pattern twice

This is not a new idea here. It is the shape this codebase already converged on,
by hand, in the two places the altitude audit rates highest:

- `buildDeviationBand<T>` (`CashflowScrubChart/deviationBand.ts:113` at decision time; now
  `Chart/deviationBand.ts:131`) already
  takes `items`, `cellToX`, `yToPlot` and two accessors. It is a core today. Its
  ticket, #45165, says it "is generic today" — the only fault is that it is
  filed under the wrong directory.
- `placeLabels(labels, plot, polylines, space)`
  (`CashflowScrubChart/labelPlacement.ts` at decision time; now
  `Chart/labelPlacement.ts:447`) touches no cell, no cents and no
  Solid. `labelBoxes.ts` is the same. Over 400 lines of tested geometry, already
  pure. #45164 calls it "the highest-value item on the altitude audit" and says
  the only thing in the way is a NAME.

Both are cores wearing a cashflow directory. This ADR says that was right, and
names the pattern so the next mark follows it on purpose.

### The deletion test

Delete a core and the complexity reappears in every chart that draws that mark —
which is the state #45161 documents, thirteen times over. Delete an adapter and
one chart loses one mark. That asymmetry is the point.

## What this does not decide

- The core's exact geometry interface per mark — WHICH numbers it takes. That
  is per-ticket work. What it RETURNS is decided above: data.
- Whether `ScrubChart`'s three render callbacks are retired. They stay for now;
  adapters mount inside them.
- Whether `Chart`'s existing children are refactored onto cores immediately. A
  mark moves to a core when a second chart needs it, not before. #45162's
  reference line is the first such case.

## Consequences

- #45162 is **not** the cheap win the audit thought. It needs a
  `ReferenceLine` core plus two adapters before a duplicate can be deleted.
  Re-sized from small to medium.
- #45164 and #45165 get a landing place: the modules move, and gain a
  `ScrubChart` adapter and a `Chart` adapter.
- #45169's crosshair and #45170's label emphasis need `ScrubChart` to expose
  hover state, which it holds at `ScrubChart.tsx:177` and currently returns as
  `null`. That is a separate, smaller decision from this one.
- A stub-filled `ChartContext` must not appear in `ScrubChart`. If someone
  proposes one later, this ADR is the reason it was rejected.

## Implemented

The five tickets landed on `feat/altitude-unblocked-wave` on 2026-09-11. The
cores live under `src/components/Chart/`: `referenceLine.ts`,
`deviationBand.ts`, `labelPlacement.ts`, `labelBoxes.ts`, `gutterPacking.ts`,
`labelPairing.ts`, `crosshairMark.ts` and `tooltipPlacement.ts`. The
`ScrubChart` adapters live under `src/components/ScrubChart/`:
`ScrubChartReferenceLine`, `ScrubChartBand`, `ScrubChartLabels`,
`ScrubChartCrosshair`, `ScrubChartTooltip` and `createScrubChartEmphasis`.
`ScrubChartContext` gained `liveHoverIndex`, a fine-grained accessor, so the
base context keeps `hoverIndex: null` and `renderChart` does not re-run on
pointer move. #45170 kept the DOM stroke read-back, generalised into
`ScrubChart/emphasisColor.ts`; the ticket records why the two alternatives lost.
