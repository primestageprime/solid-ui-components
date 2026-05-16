# DotChart Slot Unification — Design

**Date:** 2026-05-15
**Status:** Draft (brainstorm output, pending review before implementation plan)
**Authors:** Adlai Arnold (w/ Claude)

## Context

Two codebases overlap on charting:

- **amygdala-ui** ships `DotChart` — a ~1.1k-LOC Solid component plus ~3.1k LOC of d3-driven utilities. Imperative SVG-group orchestration. Tightly coupled to alarm-domain concepts (`factAppearance`, alarm timeline types, `AUTO_CORRELATE_OFFSET_MS`). Hard-coded colors. No SUI integration.
- **solid-ui-components (SUI)** ships a slot-based chart family: `Chart` root + `XAxis` / `YAxis` / `Grid` / `PointSeries` / `LineSeries` / `AreaSeries` / `BarSeries` / `Tooltip` / `Crosshair` / `ReferenceLine`. Declarative Solid composition, CSS-var theming, custom scale impl. Zero d3 in core charts today (`DagChart` already uses `d3-dag` as a peer dep).

**Goal:** lift dotchart's feature surface into SUI as **independent slot primitives**. Each consumer (amygdala first; future projects after) composes their own dotchart from SUI parts. Convenience composites (e.g. a preset `<DotChart>`) can ship later once usage shakes out.

## Decisions

### D1. Shape: slot decomposition (not monolithic port)

Each dotchart feature becomes a standalone child of `<Chart>`. No SUI-side composite in v1. Amygdala will assemble its dotchart from SUI slots.

### D2. d3 stance

Add **`d3-scale`** and **`d3-shape`** as peer deps. Pure math and path-builder libs (~7kb gz total). **No `d3-selection`** — Solid renders. Matches the existing `d3-dag` peer-dep precedent.

### D3. Slot model

Slots are declarative Solid components that read `useChart()` for shared state (scales, hoverX, etc.) and return JSX. **No refs cross slot boundaries.** Refs are allowed *inside a slot* only when the browser forces them: measurement (`getBBox`, `getBoundingClientRect`), focus management, canvas/WebGL escape hatch, or an animation lib that drives elements directly. Cross-slot coordination → context + signals.

### D4. Domain decoupling

**Descriptor-in-data** is the default pattern. Consumer maps domain → visual descriptor at the call site; the slot is a pure renderer of descriptors.

SUI ships a closed shape enum:

```ts
type Shape = 'circle' | 'triangle' | 'square' | 'diamond' | 'chevron' | 'pin' | { path: string };
type Descriptor = { color: string; shape: Shape; size?: number };
```

Render-prop (`renderPin`, `renderBar`, …) exists as an **escape hatch** for cases the descriptor can't express. Same pattern SUI's `DagChart` already uses (`renderNode`).

All colors flow through SUI CSS vars (`--sui-accent`, `--sui-warning`, etc.). No hard-coded hex inside SUI.

### D5. Reactivity model

Slot props are **plain values**, not `Accessor<T>` wrappers. Solid props are reactive automatically; the existing SUI Chart family uses this style. Consumer writes `xDomain={range()}`, not `xDomain={() => range()}`.

### D6. Time scale

`xDomain` is widened to `[number, number] | [Date, Date]`. `<Chart>` discriminates at runtime and selects `linearScale` (existing custom impl) or `scaleTime` (from `d3-scale`). The `Scale` interface downstream stays uniform. Tick formatting for time delegated to d3.

### D7. ChartContext additions

Minimal additions:

- `dragRange: Accessor<{ start: number; end: number } | null>`
- `setDragRange(range | null): void`

Selection/hover IDs stay as per-slot props (avoid context bloat).

### D8. Curried variants (ADR 0001)

New slots get curried variants alongside the standard export, consistent with the recent Cell/Layout sweep.

## v1 Slot Inventory

| Slot | Status | Source (amygdala) |
|---|---|---|
| `HighlightSegments` | NEW | `utils/highlightSegments.ts` |
| `TimelineBar` | NEW | `utils/timeline.ts` |
| `PinMarkers` | NEW | `utils/indicators.ts` (pin part) |
| `GhostPin` | NEW | `utils/indicators.ts` (ghost part) |
| `EdgeHighlight` | NEW | `utils/indicators.ts` (edge part) |
| `DragRangeSelect` | NEW | inline drag logic |
| `CurrentValueIndicator` | NEW | `utils/dataPoints.ts` (current value part) |
| `ReferenceLine` | EXTEND existing | `utils/referenceLines.ts` parity check |
| `Crosshair` | EXTEND if needed | `utils/indicators.ts` (hover line parity) |

**Deferred (vNext or later):** `OverlayPoints`, `CorrelationBand` (needs `AUTO_CORRELATE_OFFSET_MS` decoupling), `ChevronSeries` (subsumed by `Shape` enum value).

## Architecture

### File layout

```
src/components/Chart/
  Chart.tsx                    (extend xDomain types, dispatch scale)
  context.ts                   (add dragRange + setDragRange)
  scales.ts                    (add scaleTime wrapper via d3-scale)
  shapes.ts                    NEW — descriptor → SVG element/path
  Axes.tsx                     (extend tick formatting for time)
  Grid.tsx                     (no change)
  Series.tsx                   (no change in v1)
  Tooltip.tsx                  (no change)
  Crosshair.tsx                (extend if parity gap found)
  ReferenceLine.tsx            (split from Series.tsx if size warrants)
  HighlightSegments.tsx        NEW
  TimelineBar.tsx              NEW
  PinMarkers.tsx               NEW
  GhostPin.tsx                 NEW
  EdgeHighlight.tsx            NEW
  DragRangeSelect.tsx          NEW
  CurrentValueIndicator.tsx    NEW
  index.ts                     (export additions)
```

500-LOC rule: each new slot lands 100–300 LOC. If a slot threatens 500, split by concern.

### Slot API sketch

```tsx
<Chart width={W} height={H} xDomain={[t0, t1]} yDomain={[0, 100]}>
  <XAxis />
  <YAxis />
  <Grid />

  <HighlightSegments
    data={segments}              // { id, start, end, color, label?, opacity? }
    selectedIds={selectedSet}
    onClick={seg => …}
    onHover={seg => …}
  />

  <TimelineBar
    data={bars}                  // { id, start, end, lane, color, state? }
    lanes={['scheduled', 'detected']}
    selectedId={…}
    hoveredId={…}
    onBarClick={bar => …}
  />

  <PinMarkers
    data={pins}                  // { id, x, descriptor: Descriptor }
    selectedId={…}
    onClick={pin => …}
    onDelete={pin => …}
    renderPin={…}                // escape hatch
  />

  <GhostPin
    descriptor={ghostShape}      // null → hidden
    visible={annotationMode}
  />

  <EdgeHighlight time={edgeT} color="var(--sui-warning)" />

  <DragRangeSelect
    onRange={(start, end) => …}
    minPixelDelta={5}
  />

  <CurrentValueIndicator point={{ x, y, label? }} />

  <ReferenceLine
    orientation="horizontal"
    value={threshold}
    label="threshold"
    dashed
  />

  <Crosshair />
  <Tooltip>{…}</Tooltip>
</Chart>
```

### Data flow

1. Consumer holds domain data; maps to slot props (descriptors).
2. `<Chart>` builds scales (linear or time) and provides via context.
3. `<Chart>` attaches one pointer listener at SVG level → updates `hoverX` and `dragRange` signals.
4. Slots subscribe via `useChart()` and render JSX.
5. Slot-level callbacks (`onClick`, `onBarClick`, …) fire up to consumer with domain-typed args.

### Theming

All colors via SUI CSS vars. Slot color props accept `string` (literal or `var(--sui-…)`). No hex in SUI source.

### Coupling-removal map

| Amygdala-coupled bit | Removal strategy |
|---|---|
| `factAppearance` | Consumer maps `fact → Descriptor` at call site. SUI sees descriptors only. |
| Alarm timeline types | Slot props accept generic shapes (`{ id, start, end, lane, color, state? }`). |
| `AUTO_CORRELATE_OFFSET_MS` | N/A — correlation feature deferred. Future `CorrelationBand` slot takes it as a prop. |
| Hard-coded colors (`IN_BOUNDS_COLOR`, pin RGB) | Replaced with CSS vars or slot props. |

## Testing

Per slot, vitest coverage:

- **Pure rendering** — snapshot JSX for representative props.
- **Reactivity** — signal change triggers expected DOM mutation.
- **Callbacks** — synthesized pointer events fire callbacks with correct domain-typed args.
- **Edge cases** — empty data, single-point data, range collisions, viewport clamping.

Amygdala's existing utility tests (`referenceLines.test.ts`, `overlayPoints.test.ts`, `timeline.test.ts`) are ported / rewritten against the new SUI slot APIs where coverage overlaps.

## Non-goals (v1)

- No SUI-side `<DotChart>` composite. Amygdala assembles. Composite ships only after a second consumer needs it.
- No animation-system rewrite. Use existing CSS transitions or `solid-transition-group` per slot if needed.
- No `OverlayPoints`, `CorrelationBand`, `ChevronSeries`.
- No new theme primitives. Reuse `--sui-*` tokens.
- No migration of amygdala consumers in this v1. Amygdala continues shipping its current `DotChart`; the rewrite is a separate workstream once v1 lands.

## Risks

- **Time-tick formatting parity** — d3's `scaleTime.ticks()` defaults are sensible but format strings may need tuning to match amygdala visuals.
- **Pin label collision avoidance** — requires `getBBox` measurement after first paint. Likely needs a second-pass `createEffect`. Defer optimization until correctness ships.
- **Gesture conflict** — `DragRangeSelect` and `Crosshair` both consume pointer events. Resolved by single root listener dispatching via context, not per-slot listeners.
- **Bundle delta** — `d3-scale` + `d3-shape` add ~7kb gz to SUI consumers. Acceptable.
- **Solid + d3 mental-model split** — contributors must know "d3 = math only, Solid = render." Documented in new ADR + CONTEXT.md.

## Open questions

None outstanding from the brainstorm.

## CONTEXT.md glossary additions

- **Slot (chart)** — A declarative Solid child of `<Chart>` that reads chart context and renders JSX into the chart's SVG. Slots do not own DOM refs that cross their own boundary; cross-slot coordination uses context + signals.
- **Descriptor (visual)** — A closed-shape data object (`{ color, shape, size? }`) the consumer produces per datum. The slot's render contract is `Descriptor → JSX`.

## ADR follow-ups

- New ADR: "Charts use `d3-scale` + `d3-shape` as peer deps; no `d3-selection`. Slots own rendering via Solid."
- Update CONTEXT.md glossary with the two new terms above.
