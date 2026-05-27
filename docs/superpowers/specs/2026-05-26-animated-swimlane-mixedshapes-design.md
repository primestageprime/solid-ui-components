# AnimatedSwimlaneChart — promote MixedShapes animation to the library

**Date:** 2026-05-26
**Status:** Design approved; ready for implementation plan
**Affects:** `src/components/AnimatedSwimlaneChart/`, `src/internal/animation/`, `dev/showcases/animation-experiments.tsx`, `dev/showcases/workshop.tsx`

## Goal

Promote the polished "MixedShapes" animation flavour currently buried in `dev/showcases/animation-experiments.tsx` (`MixedShapesRow` / `MixedShapesLaneReactive`) into a first-class library component. Consumers should only have to pass node data — sizes, animation durations, lozenge geometry, routing style, and breakpoints all have library defaults and are overridable once via a curry factory.

Replace the current `AnimatedSwimlaneChart` outright: switch its layout model from positional `DAGNode[]` to status-driven `StatusFlowNode[]`, and switch its renderer to the lozenge + slurp + orthogonal-routing + arrow-settle + hover-popover flavour.

## Architecture

`AnimatedSwimlaneChart` is rewritten in place. Input shape becomes `StatusFlowNode[]` — the same node shape `StatusFlowChart` already takes — removing the positional `DAGNode[]` shape. Internally it composes:

- the existing pure trajectory module (`src/internal/animation/trajectories.ts`, `buildLaneTrajectory`) to drive every per-frame card / arrow geometry;
- a new `SwimlaneAnimatedLane` renderer extracted from `MixedShapesLaneReactive`;
- the existing orthogonal router (`src/internal/dag-svg`) and arrow markers.

Lane grouping is derived from the optional `parentId` field on each node. If no parents exist, the chart renders one lane. The data-only consumer experience: pass `nodes`, get the animation.

## Public API

```ts
// src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.tsx

export type AnimatedSwimlaneChartProps = {
  // ── REQUIRED ──
  nodes: StatusFlowNode[];          // optional parentId groups into lanes

  // ── OVERRIDABLE (all have library defaults) ──
  columns?: StatusFlowColumn[];     // default: [DONE, DOING, TODO]
  centerStatus?: string;            // default: "DOING"
  terminalStatus?: string;          // default: "DONE"
  nodeSize?: [number, number];      // default: [250, 84]
  columnGap?: number;               // default: 60 (edge-to-edge)
  rowGap?: number;                  // default: 16
  laneGap?: number;                 // default: 20
  lanePadding?: number;             // default: 16
  parentGap?: number;               // default: 16
  lozengeWidth?: number;            // default: 16
  lozengeGap?: number;              // default: 32
  maxDepth?: number | "responsive"; // default: "responsive" (derives from width)
  breakpoints?: StatusFlowBreakpoint[];   // default: built-in width→visibleCols table
  timing?: Partial<LaneTimingConfig>;     // default: slurpMs 600, moveMs 450, arrowSettleMs 200
  routingStyle?: "orthogonal" | "bezier"; // default: "orthogonal"
  renderNode?: (node, ctx) => JSX.Element;          // default: built-in TaskCard
  renderPopover?: (node) => JSX.Element | null;     // default: built-in hover popover; pass null to disable
  onNodeClick?: (id: string) => void;
};

export type AnimatedSwimlaneChartOverrides =
  | "columns" | "centerStatus" | "terminalStatus"
  | "nodeSize" | "columnGap" | "rowGap" | "laneGap" | "lanePadding" | "parentGap"
  | "lozengeWidth" | "lozengeGap" | "maxDepth" | "breakpoints"
  | "timing" | "routingStyle" | "renderNode" | "renderPopover";

export type AnimatedSwimlaneChartDataProps =
  Omit<AnimatedSwimlaneChartProps, AnimatedSwimlaneChartOverrides>; // → { nodes; onNodeClick? }

export function createAnimatedSwimlaneChart(
  defaults: Partial<Pick<AnimatedSwimlaneChartProps, AnimatedSwimlaneChartOverrides>>,
): Component<AnimatedSwimlaneChartDataProps>;
```

Minimum consumer usage:

```tsx
const ProjectFlow = createAnimatedSwimlaneChart({}); // all defaults

// or curry once with project styling:
const ProjectFlow = createAnimatedSwimlaneChart({
  nodeSize: [220, 72],
  timing: { slurpMs: 500 },
});

// in every page:
<ProjectFlow nodes={tasks} />
```

`<ProjectFlow nodes={tasks} />` is the entire data-side surface.

## Internal data flow

```
AnimatedSwimlaneChart(props)
   │
   ├─ resolveDefaults(props)         ── merges library defaults
   ├─ groupIntoLanes(nodes)          ── splits by parentId; emits MixedLaneSpec[]
   ├─ ResizeObserver → stageWidth    ── responsive (same as MixedShapesRow today)
   ├─ maxDepthForWidth(stageWidth)   ── pure fn, moved out of workshop
   │
   └─ For each lane:
        <SwimlaneAnimatedLane                       ── NEW, extracted from MixedShapesLaneReactive
            spec
            nodes={current frame for this lane}
            layoutConfig                            ── derived from resolved props
            timing
            onCardHover />
              │
              ├─ buildLaneTrajectory(prev, next)   ── existing pure module
              ├─ requestAnimationFrame loop        ── existing pattern
              ├─ <Lozenge left/right with counts>
              ├─ <For each card>
              │     trajectory.cards.get(id).modeAt(t)
              │        ├─ "card"  → renderNode(node, ctx)
              │        ├─ "morph" → slurp <path>
              │        └─ "gone"  → skip (counted by lozenge)
              ├─ <For each edge>
              │     orthogonalAvoidingObstacles(...) + arrow-settle window
              └─ <HoverPopover>                    ── renderPopover(node)
```

`props.nodes` is the **next** frame. Internal `prevFrameRef` is the previous one. On `props.nodes` reference change, a tick animation runs from `t=0` to `t=1` over `phasesFor(timing).total` ms. Layout-only changes (resize, knob nudge) snap to `t=1` without replaying — same behaviour as `MixedShapesLaneReactive` today.

## Edge cases

- Empty `nodes`: render an empty SVG with reserved one-lane height (don't collapse to zero — keeps surrounding layout stable while data loads).
- Single node, no parent: single lane, no parent row, lozenges still reserved.
- Node with `parentId` referencing a missing parent: treat as standalone (no parent row); log warning in dev only.
- `props.nodes` reference unchanged but contents mutated: do NOT re-animate. Animation triggers on reference change only — this is the existing trajectory module's contract and consumers must follow it (immutable updates).

## Files

### New (in `src/`)

- `src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.tsx` — extracted/cleaned from `MixedShapesLaneReactive` (~430 lines today).
- `src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.css` — lane / lozenge / card classes.
- `src/components/AnimatedSwimlaneChart/defaults.ts` — `DEFAULT_LANE_LAYOUT_CONFIG`, default `breakpoints`, default `TaskCard`, default `HoverPopover`.
- `src/components/AnimatedSwimlaneChart/lanes.ts` — `groupIntoLanes(nodes)` + tests.
- `src/internal/animation/breakpoints.ts` — `computeBreakpoints`, `maxDepthForWidth` (moved from workshop; pure).

### Rewritten

- `src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.tsx` — orchestration only; heavy renderer is now `SwimlaneAnimatedLane`.
- `src/components/AnimatedSwimlaneChart/index.ts` — same export surface (curry factory + types).

### Showcases

- `dev/showcases/animated-swimlane-chart.tsx` — NEW. Data-only usage demo with the bucket-song fixture.
- `dev/showcases/workshop.tsx` + `dev/showcases/animation-experiments.tsx` — `MixedShapesRow` becomes a thin wrapper around the public component + the knob panel. The lab continues to exist for animation iteration, now driving the library component instead of an in-file copy.

### Index re-exports

`src/index.ts` still re-exports `AnimatedSwimlaneChart as SwimlaneChart` — that alias becomes the breaking-shape change for downstream consumers.

### Removed

- The inline `MixedShapesLaneReactive` definition in `animation-experiments.tsx` (replaced by the public component).

## Testing

- Rewrite `src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.test.tsx` for the new contract (status-driven, lozenge counts, animation tick).
- Pure tests on `lanes.ts` (`groupIntoLanes`) and `breakpoints.ts` (`computeBreakpoints`, `maxDepthForWidth`).
- Regression test that `phasesFor(DEFAULT_TIMING).total` matches the workshop tick-interval expectation.
- `dev/showcases/animation-breakpoints.test.ts` — keep; point at the new module path.
- Snapshot/DOM test: render `<AnimatedSwimlaneChart nodes={fixture} />` with no other props; assert at least one SVG, one lozenge group, one card group.

## Breaking changes & migration

`AnimatedSwimlaneChart`'s prop shape changes (positional `DAGNode[]` → status-driven `StatusFlowNode[]`). Inside this repo the only consumer is the component's own test + showcase. Downstream apps that consume `AnimatedSwimlaneChart` (rhinotools, thorcasting, jtf-ui, dside) need a migration.

Bump the package minor (or major — to be decided at release time). `CHANGELOG.md` gets a note with a one-shot migration sketch: how to convert `DAGNode[]` (with `x`, `y`, `lane`) into `StatusFlowNode[]` (with `status`, optional `parentId`, optional `dependsOn`).

## Out of scope

- Smaller named experiments (slurp-out, slurp-in, slurp-with-dep, two-frame arrow demo) stay in the workshop; they're not promoted to library components.
- No `animation: "slide" | "slurp"` switch. The new flavour is the only flavour.
- No bezier-routing parity for the arrow-settle phase; bezier still works but the settle window assumes orthogonal endpoints (documented).
