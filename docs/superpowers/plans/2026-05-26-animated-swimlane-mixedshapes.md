# AnimatedSwimlaneChart MixedShapes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current positional `AnimatedSwimlaneChart` with a status-driven, data-only-API rewrite that ships the polished MixedShapes animation flavour (lozenge counts, slurp morphs, orthogonal arrows + arrow-settle, hover popover) as the library default — promoting code currently buried in `dev/showcases/animation-experiments.tsx`.

**Architecture:** Compose the existing pure trajectory module (`src/internal/animation/trajectories.ts → buildLaneTrajectory`) with a new `SwimlaneAnimatedLane` renderer extracted from `MixedShapesLaneReactive`. Group input nodes into lanes by `parentId`. All sizing/timing/routing knobs default to library values; consumers override via a curry factory.

**Tech Stack:** SolidJS, TypeScript, Vite, Vitest. Library lives in `src/`; showcase app in `dev/`.

**Spec:** `docs/superpowers/specs/2026-05-26-animated-swimlane-mixedshapes-design.md`

---

## Pre-flight notes

- This plan REPLACES `src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.tsx` outright. The current file (positional DAG flavour) is preserved in git history; do NOT keep a back-compat path.
- All TDD steps assume Vitest. Run a single file with `npx vitest run path/to.test.ts`.
- Run typecheck with `npx tsc --noEmit` before any commit that crosses module boundaries.
- Run the full test suite with `npm test -- --run` before final commits in Task 9 and 10.
- Commit per task (or per sub-step when a task is long). Use Conventional Commits prefixes (`feat:`, `refactor:`, `test:`, `docs:`).

---

## File map

**Created in `src/`:**
- `src/internal/animation/breakpoints.ts` — pure `LaneLayoutConfig`, `Breakpoint`, `computeBreakpoints`, `maxDepthForWidth` (moved from `dev/showcases/animation-experiments.tsx`).
- `src/internal/animation/breakpoints.test.ts` — pure tests.
- `src/components/AnimatedSwimlaneChart/lanes.ts` — `groupIntoLanes`.
- `src/components/AnimatedSwimlaneChart/lanes.test.ts` — pure tests.
- `src/components/AnimatedSwimlaneChart/defaults.ts` — `DEFAULT_LANE_LAYOUT_CONFIG`, `DEFAULT_BREAKPOINTS`, `DEFAULT_TIMING_PRESET`, `defaultRenderNode`, `defaultRenderPopover`.
- `src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.tsx` — extracted from `MixedShapesLaneReactive`.
- `src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.css` — lane / lozenge / card classes.

**Rewritten:**
- `src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.tsx` — orchestration only.
- `src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.test.tsx` — new contract.
- `src/components/AnimatedSwimlaneChart/index.ts` — same export names; new type shapes.

**Updated showcases:**
- `dev/showcases/animated-swimlane-chart.tsx` — NEW data-only demo.
- `dev/showcases/animation-experiments.tsx` — `MixedShapesLaneReactive` replaced with import of `SwimlaneAnimatedLane`; in-file `LaneLayoutConfig`/`Breakpoint`/`computeBreakpoints`/`maxDepthForWidth` replaced with imports from `src/internal/animation/breakpoints`.
- `dev/showcases/workshop.tsx` — unchanged import path.
- `dev/main.tsx` — register new showcase in the routing array.
- `dev/showcases/animation-breakpoints.test.ts` — repoint imports.

**Docs:**
- `CHANGELOG.md` — breaking-change entry + one-shot migration sketch.

---

## Task 1: Move breakpoints math into `src/internal/animation/`

**Files:**
- Create: `src/internal/animation/breakpoints.ts`
- Create: `src/internal/animation/breakpoints.test.ts`

The current `LaneLayoutConfig`, `Breakpoint`, `computeBreakpoints`, `maxDepthForWidth` live at `dev/showcases/animation-experiments.tsx:998-1084`. They are pure. Move them as-is (no behaviour change).

- [ ] **Step 1: Write the failing test**

```ts
// src/internal/animation/breakpoints.test.ts
import { describe, it, expect } from "vitest";
import {
  computeBreakpoints,
  maxDepthForWidth,
  DEFAULT_LANE_LAYOUT_CONFIG,
  type LaneLayoutConfig,
} from "./breakpoints";

describe("breakpoints", () => {
  const cfg: LaneLayoutConfig = {
    cardWidth: 250,
    cardGap: 60,
    lozengeWidth: 16,
    lozengeGap: 32,
    padding: 32,
  };

  it("computeBreakpoints emits depths 0..N with strictly-increasing minWidth", () => {
    const rows = computeBreakpoints(cfg, 3);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 3]);
    expect(rows.map((r) => r.visibleCols)).toEqual([1, 3, 5, 7]);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].minWidth).toBeGreaterThan(rows[i - 1].minWidth);
    }
  });

  it("maxDepthForWidth(huge) ≥ maxDepthForWidth(tiny)", () => {
    expect(maxDepthForWidth(2000, cfg)).toBeGreaterThanOrEqual(
      maxDepthForWidth(400, cfg),
    );
  });

  it("maxDepthForWidth uses the exported default config when none passed", () => {
    expect(maxDepthForWidth(2000)).toBeGreaterThanOrEqual(0);
  });

  it("DEFAULT_LANE_LAYOUT_CONFIG.cardWidth is 250", () => {
    expect(DEFAULT_LANE_LAYOUT_CONFIG.cardWidth).toBe(250);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/internal/animation/breakpoints.test.ts`
Expected: FAIL — `Cannot find module './breakpoints'`.

- [ ] **Step 3: Create the module**

```ts
// src/internal/animation/breakpoints.ts
/**
 * Pure horizontal-fit math shared by AnimatedSwimlaneChart and the
 * workshop. Moved here from dev/showcases/animation-experiments.tsx
 * so the library can own the breakpoint contract.
 */

export interface LaneLayoutConfig {
  /** Card width in px. */
  cardWidth: number;
  /** Gap between adjacent card EDGES (not centers). */
  cardGap: number;
  /** Lozenge bar width in px. */
  lozengeWidth: number;
  /** Gap between outer card and lozenge in px. */
  lozengeGap: number;
  /** Outer padding each side of the stage in px. */
  padding: number;
}

export interface Breakpoint {
  /** 0, 1, 2, … */
  depth: number;
  /** 2·depth + 1 → 1, 3, 5, 7, 9 … */
  visibleCols: number;
  /** Smallest stageWidth where this depth fits with the configured padding. */
  minWidth: number;
}

export const DEFAULT_LANE_LAYOUT_CONFIG: LaneLayoutConfig = {
  cardWidth: 250,
  cardGap: 60,
  lozengeWidth: 16,
  lozengeGap: 32,
  padding: 32,
};

export function computeBreakpoints(
  config: LaneLayoutConfig,
  maxDepth: number,
): Breakpoint[] {
  const colCenterGap = config.cardWidth + config.cardGap;
  const baseContent =
    2 * (config.cardWidth / 2 + config.lozengeGap + config.lozengeWidth);
  const rows: Breakpoint[] = [];
  for (let d = 0; d <= maxDepth; d++) {
    rows.push({
      depth: d,
      visibleCols: 2 * d + 1,
      minWidth: baseContent + 2 * d * colCenterGap + 2 * config.padding,
    });
  }
  return rows;
}

export function maxDepthForWidth(
  stageWidth: number,
  config: LaneLayoutConfig = DEFAULT_LANE_LAYOUT_CONFIG,
): number {
  const colCenterGap = config.cardWidth + config.cardGap;
  const baseContent =
    2 * (config.cardWidth / 2 + config.lozengeGap + config.lozengeWidth);
  const step = 2 * colCenterGap;
  const usable = stageWidth - baseContent - 2 * config.padding;
  if (usable < 0) return 0;
  return Math.floor(usable / step);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/internal/animation/breakpoints.test.ts`
Expected: PASS, all 4 cases.

- [ ] **Step 5: Repoint workshop callers and delete the moved code**

Edit `dev/showcases/animation-experiments.tsx`:
- Remove the local definitions of `LaneLayoutConfig`, `Breakpoint`, `DEFAULT_LANE_LAYOUT_CONFIG`, `computeBreakpoints`, `maxDepthForWidth` (lines ~998-1084).
- Add at the top of the imports block:
  ```ts
  import {
    computeBreakpoints,
    maxDepthForWidth,
    DEFAULT_LANE_LAYOUT_CONFIG,
    type LaneLayoutConfig,
    type Breakpoint,
  } from "../../src/internal/animation/breakpoints";
  ```

Edit `dev/showcases/animation-breakpoints.test.ts`:
- Change the imported module path from `./animation-experiments` to `../../src/internal/animation/breakpoints`.
- Keep the test body unchanged.

- [ ] **Step 6: Run typecheck + repointed tests**

Run: `npx tsc --noEmit && npx vitest run dev/showcases/animation-breakpoints.test.ts src/internal/animation/breakpoints.test.ts`
Expected: typecheck clean; both test files PASS.

- [ ] **Step 7: Commit**

```bash
git add src/internal/animation/breakpoints.ts src/internal/animation/breakpoints.test.ts \
  dev/showcases/animation-experiments.tsx dev/showcases/animation-breakpoints.test.ts
git commit -m "refactor(animation): move breakpoints math into src/internal/animation"
```

---

## Task 2: Add `groupIntoLanes` helper

**Files:**
- Create: `src/components/AnimatedSwimlaneChart/lanes.ts`
- Create: `src/components/AnimatedSwimlaneChart/lanes.test.ts`

This splits the flat `StatusFlowNode[]` input into per-lane node arrays based on `parentId`. Each lane gets its parent node (if any) prepended.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/AnimatedSwimlaneChart/lanes.test.ts
import { describe, it, expect } from "vitest";
import { groupIntoLanes } from "./lanes";
import type { StatusFlowNode } from "../StatusFlowChart";

describe("groupIntoLanes", () => {
  it("returns a single lane with id 'default' when no parentId is used", () => {
    const nodes: StatusFlowNode[] = [
      { id: "a", title: "A", status: "TODO" },
      { id: "b", title: "B", status: "DOING" },
    ];
    const lanes = groupIntoLanes(nodes);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].id).toBe("default");
    expect(lanes[0].parentId).toBeUndefined();
    expect(lanes[0].nodes.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("splits children into lanes by parentId; parent node is prepended", () => {
    const nodes: StatusFlowNode[] = [
      { id: "p1", title: "Parent 1", status: "TODO" },
      { id: "p2", title: "Parent 2", status: "TODO" },
      { id: "c1", title: "Child 1", status: "TODO", parentId: "p1" },
      { id: "c2", title: "Child 2", status: "DOING", parentId: "p1" },
      { id: "c3", title: "Child 3", status: "DOING", parentId: "p2" },
    ];
    const lanes = groupIntoLanes(nodes);
    expect(lanes.map((l) => l.id)).toEqual(["p1", "p2"]);
    expect(lanes[0].parentId).toBe("p1");
    expect(lanes[0].nodes.map((n) => n.id)).toEqual(["p1", "c1", "c2"]);
    expect(lanes[1].nodes.map((n) => n.id)).toEqual(["p2", "c3"]);
  });

  it("children with a missing parentId fall into the default lane", () => {
    const nodes: StatusFlowNode[] = [
      { id: "orphan", title: "Orphan", status: "TODO", parentId: "ghost" },
      { id: "p1", title: "Parent", status: "TODO" },
      { id: "c1", title: "Child", status: "TODO", parentId: "p1" },
    ];
    const lanes = groupIntoLanes(nodes);
    const def = lanes.find((l) => l.id === "default");
    expect(def).toBeDefined();
    expect(def!.nodes.map((n) => n.id)).toContain("orphan");
  });

  it("preserves input order across lanes", () => {
    const nodes: StatusFlowNode[] = [
      { id: "p2", title: "Parent 2", status: "TODO" },
      { id: "c2", title: "Child 2", status: "TODO", parentId: "p2" },
      { id: "p1", title: "Parent 1", status: "TODO" },
      { id: "c1", title: "Child 1", status: "TODO", parentId: "p1" },
    ];
    const lanes = groupIntoLanes(nodes);
    expect(lanes.map((l) => l.id)).toEqual(["p2", "p1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AnimatedSwimlaneChart/lanes.test.ts`
Expected: FAIL — `Cannot find module './lanes'`.

- [ ] **Step 3: Implement**

```ts
// src/components/AnimatedSwimlaneChart/lanes.ts
import type { StatusFlowNode } from "../StatusFlowChart";

export interface LaneGroup {
  /** Lane id — the parent's id when grouped, "default" for ungrouped. */
  id: string;
  /** Present when the lane has a parent node at the top. */
  parentId?: string;
  /** Nodes in this lane, parent first (if any), then children in input order. */
  nodes: StatusFlowNode[];
}

/**
 * Split a flat StatusFlowNode list into lanes by parentId.
 *
 *   - Nodes referenced by some child's `parentId` become lane heads.
 *   - Children are grouped under their parent (parent prepended).
 *   - Nodes with neither role, or with a parentId that doesn't resolve
 *     to a known node, fall into a "default" lane.
 *
 * Lane ordering follows first-appearance of each lane's parent in the
 * input array; the "default" lane (when present) keeps its position
 * relative to the first orphan/standalone it contains.
 */
export function groupIntoLanes(nodes: StatusFlowNode[]): LaneGroup[] {
  const ids = new Set(nodes.map((n) => n.id));
  const parentIds = new Set<string>();
  for (const n of nodes) {
    if (n.parentId && ids.has(n.parentId)) parentIds.add(n.parentId);
  }

  const laneOrder: string[] = [];
  const buckets = new Map<string, StatusFlowNode[]>();

  const ensure = (laneId: string): StatusFlowNode[] => {
    let arr = buckets.get(laneId);
    if (!arr) {
      arr = [];
      buckets.set(laneId, arr);
      laneOrder.push(laneId);
    }
    return arr;
  };

  for (const n of nodes) {
    if (parentIds.has(n.id)) {
      ensure(n.id).unshift(n); // parent first
      continue;
    }
    if (n.parentId && parentIds.has(n.parentId)) {
      ensure(n.parentId).push(n);
      continue;
    }
    ensure("default").push(n);
  }

  return laneOrder.map((laneId) => ({
    id: laneId,
    parentId: laneId === "default" ? undefined : laneId,
    nodes: buckets.get(laneId)!,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AnimatedSwimlaneChart/lanes.test.ts`
Expected: PASS, all 4 cases.

- [ ] **Step 5: Commit**

```bash
git add src/components/AnimatedSwimlaneChart/lanes.ts src/components/AnimatedSwimlaneChart/lanes.test.ts
git commit -m "feat(AnimatedSwimlaneChart): add groupIntoLanes helper"
```

---

## Task 3: Library defaults

**Files:**
- Create: `src/components/AnimatedSwimlaneChart/defaults.ts`
- Create: `src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.css`

Pulls the previously-hardcoded defaults out of the workshop renderer and into a single module the component reads from.

- [ ] **Step 1: Create the CSS file (empty stub; populated in Task 4)**

```css
/* src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.css */
/* Populated in Task 4 alongside SwimlaneAnimatedLane.tsx. */
```

- [ ] **Step 2: Write the defaults module**

```ts
// src/components/AnimatedSwimlaneChart/defaults.ts
import type { JSX } from "solid-js";
import type { StatusFlowNode, StatusFlowColumn, StatusFlowBreakpoint } from "../StatusFlowChart";
import { DEFAULT_LANE_LAYOUT_CONFIG, computeBreakpoints, type LaneLayoutConfig } from "../../internal/animation/breakpoints";
import { DEFAULT_TIMING, type LaneTimingConfig } from "../../internal/animation/trajectories";

/**
 * What a card renderer is handed: the node plus animation-derived state
 * (current rect, current status — may differ from node.status while a
 * card is mid-tick and a parent is auto-flipping).
 */
export interface RenderNodeContext {
  /** Effective status this tick (resolved parent status etc.). */
  effectiveStatus: string;
  /** True when this card sits on the parent row of its lane. */
  isParent: boolean;
}

export interface AnimatedSwimlaneDefaults {
  columns: StatusFlowColumn[];
  centerStatus: string;
  terminalStatus: string;
  nodeSize: [number, number];
  columnGap: number;
  rowGap: number;
  laneGap: number;
  lanePadding: number;
  parentGap: number;
  lozengeWidth: number;
  lozengeGap: number;
  breakpoints: StatusFlowBreakpoint[];
  timing: LaneTimingConfig;
  routingStyle: "orthogonal" | "bezier";
  renderNode: (node: StatusFlowNode, ctx: RenderNodeContext) => JSX.Element;
  renderPopover: ((node: StatusFlowNode) => JSX.Element | null) | null;
}

export const DEFAULT_COLUMNS: StatusFlowColumn[] = [
  { label: "DONE", statuses: ["DONE"] },
  { label: "DOING", statuses: ["DOING"] },
  { label: "TODO", statuses: ["TODO"] },
];

/**
 * Width-driven visible-col table. Derived from `computeBreakpoints`
 * against the default layout config and capped at depth 4 (9 visible
 * cols) which is more than any realistic chart needs.
 */
export const DEFAULT_BREAKPOINTS: StatusFlowBreakpoint[] =
  computeBreakpoints(DEFAULT_LANE_LAYOUT_CONFIG, 4).map((b) => ({
    minWidth: b.minWidth,
    visibleCols: b.visibleCols,
  }));

/**
 * Pre-knob default + an arrow-settle window. This mirrors the workshop's
 * MixedShapesRow boot config so the production component looks exactly
 * like the workshop preview.
 */
export const DEFAULT_TIMING_PRESET: LaneTimingConfig = {
  ...DEFAULT_TIMING,
  arrowSettleMs: 200,
  arrowPathMs: 0,
};

/** Built-in card renderer — minimal opaque status pill + title + subtitle. */
export const defaultRenderNode = (
  node: StatusFlowNode,
  ctx: RenderNodeContext,
): JSX.Element => (
  <div
    class="sui-asc__card"
    data-status={ctx.effectiveStatus}
    data-parent={ctx.isParent ? "" : undefined}
  >
    <div class="sui-asc__card-status">{ctx.effectiveStatus}</div>
    <div class="sui-asc__card-title">{node.title}</div>
    {node.subtitle && <div class="sui-asc__card-subtitle">{node.subtitle}</div>}
  </div>
);

/** Built-in popover: title + status. Consumers pass `null` to opt out. */
export const defaultRenderPopover = (node: StatusFlowNode): JSX.Element => (
  <div class="sui-asc__popover">
    <div class="sui-asc__popover-status">{node.status}</div>
    <div class="sui-asc__popover-title">{node.title}</div>
    {node.subtitle && <div class="sui-asc__popover-subtitle">{node.subtitle}</div>}
  </div>
);

export const ANIMATED_SWIMLANE_DEFAULTS: AnimatedSwimlaneDefaults = {
  columns: DEFAULT_COLUMNS,
  centerStatus: "DOING",
  terminalStatus: "DONE",
  nodeSize: [DEFAULT_LANE_LAYOUT_CONFIG.cardWidth, 84],
  columnGap: DEFAULT_LANE_LAYOUT_CONFIG.cardGap,
  rowGap: 16,
  laneGap: 20,
  lanePadding: 16,
  parentGap: 16,
  lozengeWidth: DEFAULT_LANE_LAYOUT_CONFIG.lozengeWidth,
  lozengeGap: DEFAULT_LANE_LAYOUT_CONFIG.lozengeGap,
  breakpoints: DEFAULT_BREAKPOINTS,
  timing: DEFAULT_TIMING_PRESET,
  routingStyle: "orthogonal",
  renderNode: defaultRenderNode,
  renderPopover: defaultRenderPopover,
};

/** Map a partial `LaneLayoutConfig` override back together with the defaults. */
export function resolveLayoutConfig(
  overrides: Partial<LaneLayoutConfig> = {},
): LaneLayoutConfig {
  return { ...DEFAULT_LANE_LAYOUT_CONFIG, ...overrides };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/AnimatedSwimlaneChart/defaults.ts src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.css
git commit -m "feat(AnimatedSwimlaneChart): library defaults module"
```

---

## Task 4: Extract `SwimlaneAnimatedLane` renderer from the workshop

**Files:**
- Create: `src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.tsx`
- Modify: `src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.css`

This is the single biggest mechanical step. We're copying the body of `MixedShapesLaneReactive` from `dev/showcases/animation-experiments.tsx:1140-1554` into a new library file, swapping the in-line `TaskCard` for the consumer-provided `renderNode`, and wiring the popover through `renderPopover`. The CSS is initialised here as well.

- [ ] **Step 1: Read the source and prepare imports**

Read `dev/showcases/animation-experiments.tsx:1140-1554` and note these dependencies the new file will need:
- `buildLaneTrajectory`, `phasesFor`, `dashednessAt`, `DEFAULT_TIMING`, types `CardTrajectory`, `LaneTimingConfig`, `LaneTrajectory`, `LayoutParams as TrajLayoutParams`, `LozengeRects` from `../../internal/animation/trajectories`.
- `orthogonalAvoidingObstacles` from `../../internal/dag-svg`.
- `StatusFlowNode` from `../StatusFlowChart`.
- `RenderNodeContext` from `./defaults`.

- [ ] **Step 2: Write the component file**

```tsx
// src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.tsx
import {
  createEffect,
  createSignal,
  onCleanup,
  For,
  Match,
  Show,
  Switch,
  type Component,
  type JSX,
} from "solid-js";
import {
  buildLaneTrajectory,
  dashednessAt,
  type CardTrajectory,
  type LaneTimingConfig,
  type LaneTrajectory,
  type LayoutParams as TrajLayoutParams,
  type LozengeRects,
} from "../../internal/animation/trajectories";
import { orthogonalAvoidingObstacles } from "../../internal/dag-svg";
import type { StatusFlowNode } from "../StatusFlowChart";
import type { LaneLayoutConfig } from "../../internal/animation/breakpoints";
import type { RenderNodeContext } from "./defaults";
import "./SwimlaneAnimatedLane.css";

export interface SwimlaneAnimatedLaneSpec {
  id: string;
  /** Parent display title; when undefined the lane has no parent row. */
  parentTitle?: string;
  parentSubtitle?: string;
  /** Child nodes (not including the parent). */
  children: StatusFlowNode[];
}

export interface SwimlaneAnimatedLaneProps {
  spec: SwimlaneAnimatedLaneSpec;
  /** The current frame of children for this lane. Reference-equal to last
   *  tick → no animation; new reference → tick animation. */
  nodes: StatusFlowNode[];
  laneY: number;
  stageWidth: number;
  maxDepth: number;
  layoutConfig: LaneLayoutConfig;
  /** Vertical knobs (don't influence breakpoint math). */
  cardHeight: number;
  rowGap: number;
  parentGap: number;
  lanePadding: number;
  timing: LaneTimingConfig;
  renderNode: (node: StatusFlowNode, ctx: RenderNodeContext) => JSX.Element;
  renderPopover: ((node: StatusFlowNode) => JSX.Element | null) | null;
  onCardClick?: (id: string) => void;
}

interface HoverInfo {
  node: StatusFlowNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SwimlaneAnimatedLane: Component<SwimlaneAnimatedLaneProps> = (
  props,
) => {
  const cardW = () => props.layoutConfig.cardWidth;
  const lozW = () => props.layoutConfig.lozengeWidth;
  const lozGap = () => props.layoutConfig.lozengeGap;
  const colCenterGap = () =>
    props.layoutConfig.cardWidth + props.layoutConfig.cardGap;
  const centerX = () => props.stageWidth / 2;
  const hasParent = () => !!props.spec.parentTitle;

  const childCount = () => props.spec.children.length;
  const initialRoots = () =>
    props.spec.children.filter((c) => !c.dependsOn || c.dependsOn.length === 0).length;
  const reservedStack = () =>
    Math.max(1, initialRoots(), Math.min(childCount(), 3));
  const reservedChildRowH = () =>
    reservedStack() * props.cardHeight + (reservedStack() - 1) * props.rowGap;
  const parentRowH = () => (hasParent() ? props.cardHeight + props.parentGap : 0);
  const laneHeight = () =>
    props.lanePadding * 2 + parentRowH() + reservedChildRowH();

  const parentRowCenterY = () =>
    props.laneY + props.lanePadding + props.cardHeight / 2;
  const childRowCenterY = () =>
    props.laneY + props.lanePadding + parentRowH() + reservedChildRowH() / 2;
  const colTopY = () => childRowCenterY() - reservedChildRowH() / 2;
  const colBottomY = () => childRowCenterY() + reservedChildRowH() / 2;
  const lozMidY = () => childRowCenterY();
  const leftLozengeX = () =>
    centerX() - props.maxDepth * colCenterGap() - cardW() / 2 - lozGap() - lozW();
  const rightLozengeX = () =>
    centerX() + props.maxDepth * colCenterGap() + cardW() / 2 + lozGap();

  const leftLozRect = () => ({
    x: leftLozengeX() + lozW() / 2,
    y: lozMidY(),
    width: lozW(),
    height: colBottomY() - colTopY(),
  });
  const rightLozRect = () => ({
    x: rightLozengeX() + lozW() / 2,
    y: lozMidY(),
    width: lozW(),
    height: colBottomY() - colTopY(),
  });

  const trajLayoutParams = (): TrajLayoutParams => ({
    maxDepth: props.maxDepth,
    centerX: centerX(),
    parentRowCenterY: parentRowCenterY(),
    childRowCenterY: childRowCenterY(),
    cardWidth: cardW(),
    cardHeight: props.cardHeight,
    colCenterGap: colCenterGap(),
    rowGap: props.rowGap,
  });
  const lozengeRects = (): LozengeRects => ({
    left: leftLozRect(),
    right: rightLozRect(),
  });

  const [traj, setTraj] = createSignal<LaneTrajectory>(
    buildLaneTrajectory({
      prevFrame: props.nodes,
      nextFrame: props.nodes,
      layoutParams: trajLayoutParams(),
      lozengeRects: lozengeRects(),
      timing: props.timing,
    }),
  );
  const [currentT, setCurrentT] = createSignal(1);
  const [hover, setHover] = createSignal<HoverInfo | null>(null);
  let prevFrameRef = props.nodes;
  let prevWidthRef = props.stageWidth;
  let prevMaxDepthRef = props.maxDepth;
  let prevConfigRef = props.layoutConfig;
  let prevTimingRef = props.timing;
  let rafHandle: number | undefined;

  createEffect(() => {
    const incoming = props.nodes;
    const sw = props.stageWidth;
    const md = props.maxDepth;
    const cfg = props.layoutConfig;
    const timing = props.timing;
    const nodesChanged = incoming !== prevFrameRef;
    const widthChanged = sw !== prevWidthRef;
    const depthChanged = md !== prevMaxDepthRef;
    const configChanged = cfg !== prevConfigRef;
    const timingChanged = timing !== prevTimingRef;
    if (!nodesChanged && !widthChanged && !depthChanged && !configChanged && !timingChanged)
      return;
    const layoutOnly =
      !nodesChanged && (widthChanged || depthChanged || configChanged || timingChanged);
    const newTraj = buildLaneTrajectory({
      prevFrame: layoutOnly ? incoming : prevFrameRef,
      nextFrame: incoming,
      layoutParams: trajLayoutParams(),
      lozengeRects: lozengeRects(),
      timing,
    });
    prevFrameRef = incoming;
    prevWidthRef = sw;
    prevMaxDepthRef = md;
    prevConfigRef = cfg;
    prevTimingRef = timing;
    setTraj(newTraj);
    setCurrentT(layoutOnly ? 1 : 0);
    if (rafHandle !== undefined) cancelAnimationFrame(rafHandle);
    if (layoutOnly) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / newTraj.durationMs);
      setCurrentT(t);
      if (t < 1) rafHandle = requestAnimationFrame(tick);
      else rafHandle = undefined;
    };
    rafHandle = requestAnimationFrame(tick);
  });

  onCleanup(() => {
    if (rafHandle !== undefined) cancelAnimationFrame(rafHandle);
  });

  const lozengeCounts = () => {
    const t = currentT();
    let left = 0;
    let right = 0;
    for (const c of traj().cards.values()) {
      if (c.modeAt(t) !== "gone") continue;
      if (c.anchorAt(t).x < centerX()) left++;
      else right++;
    }
    return { left, right };
  };

  const greyStroke = "rgba(255,255,255,0.45)";
  const accentStroke = "var(--sui-accent, #00d4ff)";

  // Per-lane unique marker id so multiple lanes on the page don't collide.
  const markerId = `asc-arrow-${props.spec.id}`;

  return (
    <g>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>
      <rect
        x={props.lanePadding / 2}
        y={props.laneY}
        width={props.stageWidth - props.lanePadding}
        height={laneHeight()}
        rx={8}
        class="sui-asc__lane-bg"
      />
      <Show when={lozengeCounts().left > 0}>
        <rect
          x={leftLozengeX()}
          y={colTopY()}
          width={lozW()}
          height={colBottomY() - colTopY()}
          rx={lozW() / 2}
          ry={lozW() / 2}
          class="sui-asc__lozenge"
        />
        <text
          x={leftLozengeX() + lozW() / 2}
          y={lozMidY()}
          text-anchor="middle"
          dominant-baseline="central"
          class="sui-asc__lozenge-count"
        >
          {lozengeCounts().left}
        </text>
      </Show>
      <Show when={lozengeCounts().right > 0}>
        <rect
          x={rightLozengeX()}
          y={colTopY()}
          width={lozW()}
          height={colBottomY() - colTopY()}
          rx={lozW() / 2}
          ry={lozW() / 2}
          class="sui-asc__lozenge"
        />
        <text
          x={rightLozengeX() + lozW() / 2}
          y={lozMidY()}
          text-anchor="middle"
          dominant-baseline="central"
          class="sui-asc__lozenge-count"
        >
          {lozengeCounts().right}
        </text>
      </Show>
      <For each={traj().arrows}>
        {(arrow) => {
          const fromCard = (): CardTrajectory | undefined => traj().cards.get(arrow.fromId);
          const toCard = (): CardTrajectory | undefined => traj().cards.get(arrow.toId);
          const bothHidden = () =>
            fromCard()?.modeAt(currentT()) === "gone" &&
            toCard()?.modeAt(currentT()) === "gone";
          const src = () => fromCard()?.anchorAt(currentT());
          const tgt = () => toCard()?.anchorAt(currentT());
          const dashedness = () => dashednessAt(arrow, traj().cards, currentT());
          const dashArray = () => {
            const d = dashedness();
            if (d <= 0.001) return undefined;
            return `4 ${(d * 3).toFixed(2)}`;
          };
          const stroke = () => (dashedness() < 0.5 ? accentStroke : greyStroke);
          const obstacles = () => {
            const list: Array<{ id: string } & ReturnType<NonNullable<CardTrajectory["rectAt"]>>> = [];
            for (const [id, c] of traj().cards) {
              if (id === arrow.fromId || id === arrow.toId) continue;
              if (c.isParent) continue;
              if (c.modeAt(1) !== "card") continue;
              const r = c.rectAt(1);
              if (!r) continue;
              list.push({ id, ...r });
            }
            return list;
          };
          const arrowPath = () => {
            const s = src()!;
            const tg = tgt()!;
            if (currentT() < 1) {
              const goingRight = tg.x >= s.x;
              const fromOuterX = goingRight ? s.x + s.width / 2 : s.x - s.width / 2;
              const toOuterX = goingRight ? tg.x - tg.width / 2 : tg.x + tg.width / 2;
              const channelX = goingRight
                ? Math.max(fromOuterX + 4, toOuterX - 15)
                : Math.min(fromOuterX - 4, toOuterX + 15);
              return [
                `M ${fromOuterX} ${s.y}`,
                `L ${channelX} ${s.y}`,
                `L ${channelX} ${tg.y}`,
                `L ${toOuterX} ${tg.y}`,
              ].join(" ");
            }
            return orthogonalAvoidingObstacles(s, tg, obstacles());
          };
          return (
            <Show when={!bothHidden() && src() && tgt()}>
              <path
                d={arrowPath()}
                fill="none"
                stroke={stroke()}
                stroke-width="1.5"
                stroke-dasharray={dashArray()}
                marker-end={`url(#${markerId})`}
                style={{
                  color: stroke(),
                  transition: `d ${props.timing.arrowPathMs ?? 0}ms ease-out`,
                }}
              />
            </Show>
          );
        }}
      </For>
      <For each={Array.from(traj().cards.keys())}>
        {(id) => {
          const card = (): CardTrajectory | undefined => traj().cards.get(id);
          const t = () => currentT();
          const mode = () => card()?.modeAt(t()) ?? "gone";
          const rect = () => card()?.rectAt(t()) ?? null;
          const status = () => card()?.statusAt(t()) ?? "TODO";
          const node = (): StatusFlowNode | undefined =>
            props.nodes.find((n) => n.id === id) ??
            (props.spec.parentTitle && id === props.spec.id
              ? { id, title: props.spec.parentTitle!, subtitle: props.spec.parentSubtitle, status: status() }
              : undefined);
          return (
            <Switch>
              <Match when={mode() === "card" && rect() && node()}>
                <foreignObject
                  x={rect()!.x - cardW() / 2}
                  y={rect()!.y - props.cardHeight / 2}
                  width={cardW()}
                  height={props.cardHeight}
                  onMouseEnter={() => {
                    if (!props.renderPopover) return;
                    setHover({
                      node: node()!,
                      x: rect()!.x - cardW() / 2,
                      y: rect()!.y - props.cardHeight / 2,
                      width: cardW(),
                      height: props.cardHeight,
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => props.onCardClick?.(id)}
                >
                  {props.renderNode(node()!, {
                    effectiveStatus: status(),
                    isParent: !!card()?.isParent,
                  })}
                </foreignObject>
              </Match>
              <Match when={mode() === "morph" && card()?.pathAt(t())}>
                <path
                  d={card()!.pathAt(t())!}
                  class="sui-asc__morph"
                  data-status={status()}
                />
              </Match>
            </Switch>
          );
        }}
      </For>
      <Show when={hover() && props.renderPopover}>
        {(_) => {
          const h = hover()!;
          return (
            <foreignObject
              x={h.x + h.width + 8}
              y={h.y}
              width={280}
              height={140}
              class="sui-asc__popover-host"
            >
              {props.renderPopover!(h.node)}
            </foreignObject>
          );
        }}
      </Show>
    </g>
  );
};
```

- [ ] **Step 3: Populate the CSS file**

```css
/* src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.css */
.sui-asc__lane-bg {
  fill: rgba(255, 255, 255, 0.02);
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 1;
}

.sui-asc__lozenge {
  fill: rgba(255, 255, 255, 0.04);
  stroke: rgba(255, 255, 255, 0.4);
  stroke-width: 1;
}

.sui-asc__lozenge-count {
  fill: rgba(255, 255, 255, 0.55);
  font-size: 9px;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.sui-asc__morph {
  fill: var(--sui-surface, rgba(0, 0, 0, 0.2));
  stroke: var(--sui-accent, #00d4ff);
  stroke-width: 1;
}
.sui-asc__morph[data-status="DONE"] {
  stroke: var(--sui-success, #4ade80);
}
.sui-asc__morph[data-status="TODO"] {
  stroke: rgba(255, 255, 255, 0.45);
}

.sui-asc__card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--sui-surface, rgba(0, 0, 0, 0.2));
  border: 1px solid var(--sui-accent, #00d4ff);
  box-sizing: border-box;
}
.sui-asc__card[data-status="DONE"] {
  border-color: var(--sui-success, #4ade80);
}
.sui-asc__card[data-status="TODO"] {
  border-color: rgba(255, 255, 255, 0.45);
}
.sui-asc__card[data-parent] {
  background: rgba(0, 0, 0, 0.35);
}
.sui-asc__card-status {
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  color: var(--sui-accent, #00d4ff);
  margin-bottom: 4px;
}
.sui-asc__card-title {
  font-size: 12px;
  color: var(--sui-text, #e6ecf5);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.sui-asc__card-subtitle {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 2px;
}

.sui-asc__popover-host {
  pointer-events: none;
}
.sui-asc__popover {
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--sui-text, #e6ecf5);
}
.sui-asc__popover-status {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 10px;
  color: var(--sui-accent, #00d4ff);
  margin-bottom: 4px;
}
.sui-asc__popover-subtitle {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.55);
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.tsx \
  src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.css
git commit -m "feat(AnimatedSwimlaneChart): extract SwimlaneAnimatedLane renderer"
```

---

## Task 5: Rewrite `AnimatedSwimlaneChart.tsx` (orchestrator)

**Files:**
- Modify (full rewrite): `src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.tsx`
- Modify: `src/components/AnimatedSwimlaneChart/index.ts`

The component is now thin: resolve defaults, group lanes, observe container width, hand off to `SwimlaneAnimatedLane` per lane.

- [ ] **Step 1: Replace `AnimatedSwimlaneChart.tsx` wholesale**

```tsx
// src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.tsx
import {
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  For,
  mergeProps,
  type Component,
  type JSX,
} from "solid-js";
import type {
  StatusFlowNode,
  StatusFlowColumn,
  StatusFlowBreakpoint,
} from "../StatusFlowChart";
import { pickVisibleCols } from "../StatusFlowChart/columns";
import {
  DEFAULT_LANE_LAYOUT_CONFIG,
  maxDepthForWidth,
  type LaneLayoutConfig,
} from "../../internal/animation/breakpoints";
import { phasesFor, type LaneTimingConfig } from "../../internal/animation/trajectories";
import {
  ANIMATED_SWIMLANE_DEFAULTS,
  type RenderNodeContext,
} from "./defaults";
import { groupIntoLanes } from "./lanes";
import { SwimlaneAnimatedLane } from "./SwimlaneAnimatedLane";

export type AnimatedSwimlaneChartProps = {
  // ── REQUIRED ──
  nodes: StatusFlowNode[];

  // ── OVERRIDABLE ──
  columns?: StatusFlowColumn[];
  centerStatus?: string;
  terminalStatus?: string;
  nodeSize?: [number, number];
  columnGap?: number;
  rowGap?: number;
  laneGap?: number;
  lanePadding?: number;
  parentGap?: number;
  lozengeWidth?: number;
  lozengeGap?: number;
  maxDepth?: number | "responsive";
  breakpoints?: StatusFlowBreakpoint[];
  timing?: Partial<LaneTimingConfig>;
  routingStyle?: "orthogonal" | "bezier";
  renderNode?: (node: StatusFlowNode, ctx: RenderNodeContext) => JSX.Element;
  renderPopover?: ((node: StatusFlowNode) => JSX.Element | null) | null;
  onNodeClick?: (id: string) => void;
};

export type AnimatedSwimlaneChartOverrides =
  | "columns"
  | "centerStatus"
  | "terminalStatus"
  | "nodeSize"
  | "columnGap"
  | "rowGap"
  | "laneGap"
  | "lanePadding"
  | "parentGap"
  | "lozengeWidth"
  | "lozengeGap"
  | "maxDepth"
  | "breakpoints"
  | "timing"
  | "routingStyle"
  | "renderNode"
  | "renderPopover";

export type AnimatedSwimlaneChartDataProps = Omit<
  AnimatedSwimlaneChartProps,
  AnimatedSwimlaneChartOverrides
>;

export const AnimatedSwimlaneChart: Component<AnimatedSwimlaneChartProps> = (
  rawProps,
) => {
  const props = mergeProps(
    {
      columns: ANIMATED_SWIMLANE_DEFAULTS.columns,
      centerStatus: ANIMATED_SWIMLANE_DEFAULTS.centerStatus,
      terminalStatus: ANIMATED_SWIMLANE_DEFAULTS.terminalStatus,
      nodeSize: ANIMATED_SWIMLANE_DEFAULTS.nodeSize,
      columnGap: ANIMATED_SWIMLANE_DEFAULTS.columnGap,
      rowGap: ANIMATED_SWIMLANE_DEFAULTS.rowGap,
      laneGap: ANIMATED_SWIMLANE_DEFAULTS.laneGap,
      lanePadding: ANIMATED_SWIMLANE_DEFAULTS.lanePadding,
      parentGap: ANIMATED_SWIMLANE_DEFAULTS.parentGap,
      lozengeWidth: ANIMATED_SWIMLANE_DEFAULTS.lozengeWidth,
      lozengeGap: ANIMATED_SWIMLANE_DEFAULTS.lozengeGap,
      maxDepth: "responsive" as number | "responsive",
      breakpoints: ANIMATED_SWIMLANE_DEFAULTS.breakpoints,
      timing: {} as Partial<LaneTimingConfig>,
      routingStyle: ANIMATED_SWIMLANE_DEFAULTS.routingStyle,
      renderNode: ANIMATED_SWIMLANE_DEFAULTS.renderNode,
      renderPopover: ANIMATED_SWIMLANE_DEFAULTS.renderPopover,
    },
    rawProps,
  );

  const timing = createMemo<LaneTimingConfig>(() => ({
    ...ANIMATED_SWIMLANE_DEFAULTS.timing,
    ...props.timing,
  }));

  const layoutConfig = createMemo<LaneLayoutConfig>(() => ({
    ...DEFAULT_LANE_LAYOUT_CONFIG,
    cardWidth: props.nodeSize[0],
    cardGap: props.columnGap,
    lozengeWidth: props.lozengeWidth,
    lozengeGap: props.lozengeGap,
  }));

  let containerRef: HTMLDivElement | undefined;
  const [stageWidth, setStageWidth] = createSignal(800);
  onMount(() => {
    if (!containerRef) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setStageWidth(Math.max(400, Math.floor(e.contentRect.width)));
      }
    });
    ro.observe(containerRef);
    onCleanup(() => ro.disconnect());
  });

  const maxDepth = createMemo<number>(() => {
    if (typeof props.maxDepth === "number") return props.maxDepth;
    return maxDepthForWidth(stageWidth(), layoutConfig());
  });

  // pickVisibleCols isn't currently consumed (renderer reads maxDepth
  // directly) but we wire it for parity with StatusFlowChart's breakpoint
  // contract so consumer-supplied breakpoints still drive the visible
  // window when maxDepth = "responsive". Override: if props.breakpoints
  // is set and props.maxDepth is "responsive", use pickVisibleCols.
  const responsiveDepthFromBreakpoints = createMemo<number | null>(() => {
    if (props.maxDepth !== "responsive") return null;
    if (props.breakpoints === ANIMATED_SWIMLANE_DEFAULTS.breakpoints) return null;
    const cols = pickVisibleCols(stageWidth(), props.breakpoints);
    return Math.max(0, Math.floor((cols - 1) / 2));
  });
  const effectiveMaxDepth = () =>
    responsiveDepthFromBreakpoints() ?? maxDepth();

  const lanes = createMemo(() => groupIntoLanes(props.nodes));

  const laneHeightFor = (laneNodes: StatusFlowNode[], hasParent: boolean) => {
    const childCount = laneNodes.length - (hasParent ? 1 : 0);
    const rootCount = laneNodes
      .filter((n) => (hasParent ? !!n.parentId : true))
      .filter((n) => !n.dependsOn || n.dependsOn.length === 0).length;
    const reservedStack = Math.max(1, rootCount, Math.min(childCount, 3));
    const reservedChildRowH =
      reservedStack * props.nodeSize[1] + (reservedStack - 1) * props.rowGap;
    const parentRowH = hasParent ? props.nodeSize[1] + props.parentGap : 0;
    return props.lanePadding * 2 + parentRowH + reservedChildRowH;
  };

  const lanesWithY = createMemo(() => {
    let runningY = 0;
    const out: Array<{
      group: ReturnType<typeof groupIntoLanes>[number];
      laneY: number;
      spec: import("./SwimlaneAnimatedLane").SwimlaneAnimatedLaneSpec;
    }> = [];
    for (const g of lanes()) {
      const hasParent = !!g.parentId;
      const laneY = runningY;
      const parentNode = hasParent ? g.nodes[0] : undefined;
      const children = hasParent ? g.nodes.slice(1) : g.nodes;
      out.push({
        group: g,
        laneY,
        spec: {
          id: g.id,
          parentTitle: parentNode?.title,
          parentSubtitle: parentNode?.subtitle,
          children,
        },
      });
      runningY += laneHeightFor(g.nodes, hasParent) + props.laneGap;
    }
    return { items: out, totalH: runningY };
  });

  return (
    <div ref={containerRef} class="sui-animated-swimlane-chart" style={{ width: "100%" }}>
      <svg
        width={stageWidth()}
        height={lanesWithY().totalH}
        viewBox={`0 0 ${stageWidth()} ${lanesWithY().totalH}`}
        style={{ display: "block", overflow: "visible" }}
      >
        <For each={lanesWithY().items}>
          {(item) => (
            <SwimlaneAnimatedLane
              spec={item.spec}
              nodes={item.group.nodes}
              laneY={item.laneY}
              stageWidth={stageWidth()}
              maxDepth={effectiveMaxDepth()}
              layoutConfig={layoutConfig()}
              cardHeight={props.nodeSize[1]}
              rowGap={props.rowGap}
              parentGap={props.parentGap}
              lanePadding={props.lanePadding}
              timing={timing()}
              renderNode={props.renderNode}
              renderPopover={props.renderPopover}
              onCardClick={props.onNodeClick}
            />
          )}
        </For>
      </svg>
    </div>
  );
};

/** Curried-variant factory. Pass overrides once; consumers pass only data. */
export function createAnimatedSwimlaneChart(
  defaults: Partial<
    Pick<AnimatedSwimlaneChartProps, AnimatedSwimlaneChartOverrides>
  >,
): Component<AnimatedSwimlaneChartDataProps> {
  return (props) => (
    <AnimatedSwimlaneChart
      {...(mergeProps(defaults, props) as AnimatedSwimlaneChartProps)}
    />
  );
}

// Re-export for back-compat: AnimatedSwimlaneChart is also exported as
// SwimlaneChart from src/index.ts.
export { phasesFor };
```

- [ ] **Step 2: Update `index.ts` to match**

```ts
// src/components/AnimatedSwimlaneChart/index.ts
export {
  AnimatedSwimlaneChart,
  createAnimatedSwimlaneChart,
} from "./AnimatedSwimlaneChart";
export type {
  AnimatedSwimlaneChartProps,
  AnimatedSwimlaneChartOverrides,
  AnimatedSwimlaneChartDataProps,
} from "./AnimatedSwimlaneChart";
export type { RenderNodeContext } from "./defaults";
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean — no errors. If the existing `AnimatedSwimlaneChart.test.tsx` errors, ignore for now; it's rewritten in Task 6.

- [ ] **Step 4: Commit**

```bash
git add src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.tsx \
  src/components/AnimatedSwimlaneChart/index.ts
git commit -m "feat(AnimatedSwimlaneChart): status-driven rewrite with data-only API"
```

---

## Task 6: Rewrite `AnimatedSwimlaneChart` tests

**Files:**
- Modify (full rewrite): `src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.test.tsx`

Old tests assumed positional `DAGNode[]`. New tests assert the status-driven contract.

- [ ] **Step 1: Replace the test file**

```tsx
// src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.test.tsx
import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@solidjs/testing-library";
import { AnimatedSwimlaneChart, createAnimatedSwimlaneChart } from "./AnimatedSwimlaneChart";
import type { StatusFlowNode } from "../StatusFlowChart";

beforeAll(() => {
  // jsdom doesn't ship ResizeObserver. Provide a no-op so onMount doesn't throw.
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

const FIXTURE: StatusFlowNode[] = [
  { id: "a", title: "Alpha", status: "DOING" },
  { id: "b", title: "Bravo", status: "TODO", dependsOn: ["a"] },
  { id: "c", title: "Charlie", status: "DONE" },
];

describe("AnimatedSwimlaneChart (status-driven)", () => {
  it("renders an SVG with no required props besides nodes", () => {
    const { container } = render(() => <AnimatedSwimlaneChart nodes={FIXTURE} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("renders one card per node by default", () => {
    const { container } = render(() => <AnimatedSwimlaneChart nodes={FIXTURE} />);
    const cards = container.querySelectorAll(".sui-asc__card");
    expect(cards.length).toBe(FIXTURE.length);
  });

  it("groups by parentId into separate lanes", () => {
    const nodes: StatusFlowNode[] = [
      { id: "p1", title: "Parent 1", status: "TODO" },
      { id: "p2", title: "Parent 2", status: "TODO" },
      { id: "c1", title: "C1", status: "TODO", parentId: "p1" },
      { id: "c2", title: "C2", status: "TODO", parentId: "p2" },
    ];
    const { container } = render(() => <AnimatedSwimlaneChart nodes={nodes} />);
    // One lane background rect per lane.
    const lanes = container.querySelectorAll(".sui-asc__lane-bg");
    expect(lanes.length).toBe(2);
  });

  it("uses a custom renderNode when provided", () => {
    const { container } = render(() => (
      <AnimatedSwimlaneChart
        nodes={FIXTURE}
        renderNode={(n) => <div class="custom-card">{n.id}</div>}
      />
    ));
    expect(container.querySelectorAll(".custom-card").length).toBe(FIXTURE.length);
    expect(container.querySelectorAll(".sui-asc__card").length).toBe(0);
  });

  it("createAnimatedSwimlaneChart returns a component that takes only data props", () => {
    const Curried = createAnimatedSwimlaneChart({
      nodeSize: [180, 60],
      timing: { slurpMs: 100, moveMs: 100, arrowSettleMs: 0, arrowPathMs: 0 },
    });
    const { container } = render(() => <Curried nodes={FIXTURE} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders an empty SVG when nodes is empty (does not throw)", () => {
    const { container } = render(() => <AnimatedSwimlaneChart nodes={[]} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.test.tsx`
Expected: PASS, all 6 cases.

If any test fails because the rendered DOM differs from the assertions (e.g. card class mismatch), update the test selector — not the production code — to match what the component actually renders. The contract under test is "one card-classed element per node," and the class name is owned by the production code.

- [ ] **Step 3: Commit**

```bash
git add src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.test.tsx
git commit -m "test(AnimatedSwimlaneChart): rewrite for status-driven contract"
```

---

## Task 7: Repoint the workshop showcase to the library component

**Files:**
- Modify: `dev/showcases/animation-experiments.tsx`

`MixedShapesLaneReactive` was the in-file copy of what's now `SwimlaneAnimatedLane`. Replace it with the import. The knob panel (`LayoutKnobsPanel`) and `MixedShapesRow` orchestrator stay — the lab keeps the same UI, just powered by the library.

- [ ] **Step 1: Replace the renderer**

In `dev/showcases/animation-experiments.tsx`:

- Add import at the top of the file:
  ```ts
  import { SwimlaneAnimatedLane } from "../../src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane";
  import type { RenderNodeContext } from "../../src/components/AnimatedSwimlaneChart/defaults";
  ```
- Delete the entire `function MixedShapesLaneReactive(...) { ... }` block (lines ~1140 through ~1554, the function body from the `function MixedShapesLaneReactive` signature down to its closing brace).
- At every call site that previously rendered `<MixedShapesLaneReactive ... />`, render `<SwimlaneAnimatedLane ... />` instead. The prop shape change:
  - REMOVE: `onCardHover`
  - ADD: `cardHeight={MS_CARD_H}`, `rowGap={MS_ROW_GAP}`, `parentGap={MS_PARENT_GAP}`, `lanePadding={MS_LANE_PAD}`, `renderNode={(n, ctx) => <TaskCard ... />}` (use the existing in-file `TaskCard` so the workshop's bucket-song theming survives), `renderPopover={null}` (the workshop already renders its own hover state via `setHovered`; keep that flow with `onCardClick` if desired, or simply pass `null` to disable the lib popover).

There are two call sites: `MixedShapesRow` and `TwoFrameArrowDemoRow`. Patch both.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. If errors mention removed exports, you forgot to delete a reference.

- [ ] **Step 3: Run the dev server + manually verify the workshop**

Run (in another shell): `npm run dev`

Open `http://localhost:6006/`, navigate to the Workshop, and confirm:
- `MixedShapesRow` still animates lanes through the bucket-song state machine on Next/Play.
- `TwoFrameArrowDemoRow` still toggles between frames.
- Lozenge counts on the sides update at phase boundaries.

If anything's visually off vs. pre-task screenshots, the most likely culprits are: (a) you removed `MS_CARD_H` literals from the call site, (b) the popover hover handler was wired to old `onCardHover`. Fix and re-verify.

- [ ] **Step 4: Commit**

```bash
git add dev/showcases/animation-experiments.tsx
git commit -m "refactor(workshop): drive MixedShapesRow with the library SwimlaneAnimatedLane"
```

---

## Task 8: New `dev/showcases/animated-swimlane-chart.tsx` (data-only demo)

**Files:**
- Create: `dev/showcases/animated-swimlane-chart.tsx`
- Modify: `dev/main.tsx`

The point of this showcase: prove the "consumers only pass data" claim. No knobs, no internal types — just `<ProjectFlow nodes={tasks} />`.

- [ ] **Step 1: Write the showcase**

```tsx
// dev/showcases/animated-swimlane-chart.tsx
/**
 * The data-only demo. Pass `nodes`, get the animation. The "Next"
 * button mutates `nodes` to a new reference; the chart animates.
 *
 * Notice what this showcase does NOT do: it never imports
 * LaneLayoutConfig, LaneTimingConfig, SwimlaneAnimatedLaneSpec, or any
 * internal type. The library's defaults cover everything.
 */
import { createSignal, type Component } from "solid-js";
import { createAnimatedSwimlaneChart } from "../../src/components/AnimatedSwimlaneChart";
import { advanceChildren } from "./workshop-layout";
import type { StatusFlowNode } from "../../src/components/StatusFlowChart";

const ProjectFlow = createAnimatedSwimlaneChart({});

const INITIAL: StatusFlowNode[] = [
  { id: "p", title: "Build the deck", status: "TODO" },
  { id: "saw", title: "Saw planks to length", status: "TODO", parentId: "p" },
  { id: "drill", title: "Drill pilot holes", status: "TODO", parentId: "p", dependsOn: ["saw"] },
  { id: "screw", title: "Screw planks down", status: "TODO", parentId: "p", dependsOn: ["drill"] },
  { id: "stain", title: "Stain the deck", status: "TODO", parentId: "p", dependsOn: ["screw"] },
];

export const AnimatedSwimlaneChartShowcase: Component = () => {
  const [nodes, setNodes] = createSignal<StatusFlowNode[]>(INITIAL);
  const next = () => setNodes((cur) => advanceChildren(cur));
  const reset = () => setNodes(INITIAL);

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "12px", padding: "24px" }}>
      <div style={{ "font-size": "14px", color: "rgba(255,255,255,0.7)" }}>
        Data-only consumer. Pass nodes, get animation. Click Next to mutate the
        node array; the chart animates the transition.
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={next}>Next</button>
        <button type="button" onClick={reset}>Reset</button>
      </div>
      <ProjectFlow nodes={nodes()} />
    </div>
  );
};
```

- [ ] **Step 2: Register the showcase**

In `dev/main.tsx`:

- Add the import alongside the other showcase imports:
  ```ts
  import { AnimatedSwimlaneChartShowcase } from "./showcases/animated-swimlane-chart";
  ```
- Add an entry to the routing items array (next to similar chart entries):
  ```ts
  { id: "animated-swimlane-chart", label: "AnimatedSwimlaneChart", component: AnimatedSwimlaneChartShowcase, tags: ["chart"] },
  ```
  If the existing array uses different keys (look at `WorkshopShowcase` registration at `dev/main.tsx:120`), match that exact shape rather than the example above.

- [ ] **Step 3: Verify in the browser**

Run (in another shell): `npm run dev`

Open the new showcase, click Next a few times, confirm:
- Cards animate between columns when their status flips on each Next.
- Lozenge counts appear when nodes scroll out of the visible window.
- Reset returns to the initial state.

- [ ] **Step 4: Commit**

```bash
git add dev/showcases/animated-swimlane-chart.tsx dev/main.tsx
git commit -m "feat(dev): AnimatedSwimlaneChart data-only showcase"
```

---

## Task 9: Full-suite verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Full test suite**

Run: `npm test -- --run`
Expected: all tests pass. Any failures point to either (a) snapshot tests elsewhere that depended on the old `AnimatedSwimlaneChart` DOM — update the snapshot only after eyeballing the diff and confirming it's the intended new output, or (b) downstream consumers of `AnimatedSwimlaneChart` inside this repo — search with `grep -rn "AnimatedSwimlaneChart\|createAnimatedSwimlaneChart" src/ dev/` and migrate to the new shape per Task 10's `CHANGELOG`.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: both `build:client` and `build:server` succeed.

- [ ] **Step 4: Manual sanity in the browser**

Run: `npm run dev` (skip if already running).

Hit each of:
- `/` → Workshop → confirm MixedShapesRow still animates correctly.
- `/animated-swimlane-chart` (or whatever path the new showcase mounted at) → confirm Next animates.

- [ ] **Step 5: Commit if anything was tweaked during verification**

Only commit if Step 2 or Step 4 surfaced edits. Otherwise skip.

---

## Task 10: CHANGELOG + final commit

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Prepend the new entry**

Open `CHANGELOG.md` and add a new entry at the top (under the heading, above the most recent prior entry). Follow the file's existing format. Content:

```markdown
## Unreleased — BREAKING

### AnimatedSwimlaneChart — status-driven rewrite

`AnimatedSwimlaneChart` (and its alias `SwimlaneChart` exported from the
package root) now takes a status-driven node list instead of positional
DAG nodes. The new flavour ships the polished lozenge + slurp + orthogonal
arrows + arrow-settle + hover popover animation that previously lived
only in the workshop.

**New minimum usage:**

    import { createAnimatedSwimlaneChart } from "@primestageprime/solid-ui-components";

    const ProjectFlow = createAnimatedSwimlaneChart({});

    <ProjectFlow nodes={tasks} />

`tasks` is a `StatusFlowNode[]`: `{ id, title, status, parentId?, dependsOn?, subtitle? }`.
All sizing, timing, lozenge geometry, routing, and breakpoint defaults are
library-owned; override them by passing them once to `createAnimatedSwimlaneChart`.

**Migration from the old positional-DAG API:**

1. Convert each `DAGNode<T>` into a `StatusFlowNode`. The `x`/`y`/`lane`
   positional fields are dropped; you supply `status` instead, and the
   chart computes column positions itself.
2. If you previously used `lane` to group nodes into rows, set `parentId`
   on the children to the id of the lane's parent node, and add the
   parent node itself.
3. Replace `<AnimatedSwimlaneChart {...positionalProps} />` with a curried
   `createAnimatedSwimlaneChart({})` and pass only `{ nodes }`.

Old positional rendering is no longer available. If you need it back
temporarily, pin the package to the previous version.
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): AnimatedSwimlaneChart status-driven rewrite"
```

---

## Done criteria

- All Vitest tests pass (`npm test -- --run`).
- `npx tsc --noEmit` clean.
- `npm run build` clean.
- Workshop's MixedShapesRow visually unchanged.
- New `AnimatedSwimlaneChartShowcase` renders, animates on Next, and resets.
- `CHANGELOG.md` documents the breaking change + migration sketch.
- The string `MixedShapesLaneReactive` no longer appears anywhere in the repo (`grep -r MixedShapesLaneReactive .` returns nothing under `src/` or `dev/`).
