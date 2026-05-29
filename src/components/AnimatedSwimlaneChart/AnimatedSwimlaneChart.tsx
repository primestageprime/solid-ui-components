// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.tsx
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Index,
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

// Internal base: accepts the full prop surface (data + every override). This
// is exported for white-box tests/internal currying only — it is intentionally
// NOT re-exported by index.ts, so it never reaches the package surface.
// Consumers use the curried `AnimatedSwimlaneChart` (data-only) or
// `createAnimatedSwimlaneChart(defaults)` to bake overrides.
export const AnimatedSwimlaneChartBase: Component<AnimatedSwimlaneChartProps> = (
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

  // Vertical status band for a lane: DOING (0, top) → TODO/mixed (1, middle)
  // → DONE (2, bottom). A lane is DOING if any of its work items is in the
  // center status; DONE only when every item is terminal; otherwise middle.
  // For a parented lane the "work items" are the children; otherwise the
  // lane's own nodes (so a childless/default lane sorts by its own status).
  const laneBandRank = (laneNodes: StatusFlowNode[], hasParent: boolean) => {
    const work = hasParent ? laneNodes.slice(1) : laneNodes;
    const pool = work.length > 0 ? work : laneNodes;
    if (pool.some((n) => n.status === props.centerStatus)) return 0; // DOING → top
    if (pool.length > 0 && pool.every((n) => n.status === props.terminalStatus))
      return 2; // DONE → bottom
    return 1; // TODO / mixed-not-done → middle
  };

  // Per-lane recency tracking. `laneActivity` maps lane id → a monotonically
  // increasing sequence stamped whenever ANY node in the lane changes status
  // between frames (an item starts, finishes, etc.). Within a band, lanes
  // sort by this DESCENDING — the most recently worked-on lane floats to the
  // top of its band, and lanes that just moved into DONE sit at the top of
  // the DONE band. Idempotent across re-runs: once prevStatusByNode is
  // updated to the current frame, a re-run sees no change and won't re-stamp.
  let activitySeq = 0;
  const laneActivity = new Map<string, number>();
  let prevStatusByNode = new Map<string, string>();

  const recordActivity = (groups: ReturnType<typeof groupIntoLanes>) => {
    const next = new Map<string, string>();
    for (const g of groups) {
      let changed = false;
      for (const n of g.nodes) {
        next.set(n.id, n.status);
        const prev = prevStatusByNode.get(n.id);
        if (prev !== undefined && prev !== n.status) changed = true;
      }
      // First frame: no prev → nothing "changed" → lane stays at 0, so the
      // initial within-band order falls back to input order.
      if (changed) laneActivity.set(g.id, ++activitySeq);
      else if (!laneActivity.has(g.id)) laneActivity.set(g.id, 0);
    }
    prevStatusByNode = next;
  };

  // Hold-before-resort. `displayedBand` is the band a lane is *positioned* in
  // right now, which can lag its real band. Moving UP (toward DOING) applies
  // immediately — work becoming active should re-sort promptly. Moving DOWN
  // (toward DONE on completion) is held for `reorderHoldMs` so the finishing
  // item can be appreciated in place before it slides away. `displayBump` is
  // a reactive nudge so lanesWithY recomputes when a hold timer fires.
  const displayedBand = new Map<string, number>();
  const holdTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const [displayBump, setDisplayBump] = createSignal(0);

  const clearHold = (id: string) => {
    const t = holdTimers.get(id);
    if (t !== undefined) {
      clearTimeout(t);
      holdTimers.delete(id);
    }
  };

  createEffect(() => {
    const groups = lanes();
    const holdMs = timing().reorderHoldMs ?? 10000;
    for (const g of groups) {
      const actual = laneBandRank(g.nodes, !!g.parentId);
      const shown = displayedBand.get(g.id);
      if (shown === undefined) {
        displayedBand.set(g.id, actual); // first sight — no slide
        continue;
      }
      if (actual === shown) {
        clearHold(g.id); // settled
        continue;
      }
      if (actual < shown) {
        // Moving up (more active) — promptly.
        clearHold(g.id);
        displayedBand.set(g.id, actual);
        setDisplayBump((v) => v + 1);
        continue;
      }
      // Moving down (completing/deprioritizing) — hold, then re-sort.
      if (!holdTimers.has(g.id)) {
        const handle = setTimeout(() => {
          holdTimers.delete(g.id);
          const grp = lanes().find((x) => x.id === g.id);
          if (!grp) return;
          displayedBand.set(g.id, laneBandRank(grp.nodes, !!grp.parentId));
          setDisplayBump((v) => v + 1);
        }, holdMs);
        holdTimers.set(g.id, handle);
      }
    }
  });

  onCleanup(() => {
    for (const t of holdTimers.values()) clearTimeout(t);
    holdTimers.clear();
  });

  const lanesWithY = createMemo(() => {
    displayBump(); // recompute when a hold timer releases a lane
    const groups = lanes();
    recordActivity(groups);

    // Measure + classify every lane in INPUT order. We keep this order for
    // the emitted `items` so the <Index> below (keyed by position) never
    // re-mounts a lane — only each lane's `laneY` changes, and the lane
    // slides to it. The vertical band ORDER lives entirely in laneY.
    const measured = groups.map((g, inputIndex) => {
      const hasParent = !!g.parentId;
      // Use the displayed (possibly held) band for positioning, falling back
      // to the live band before the effect has seen this lane.
      const band = displayedBand.get(g.id) ?? laneBandRank(g.nodes, hasParent);
      return {
        group: g,
        inputIndex,
        hasParent,
        height: laneHeightFor(g.nodes, hasParent),
        band,
      };
    });

    // Sorted order: by band; within a band, most recently active first
    // (recency descending), with input order as the final stable tiebreak.
    const sorted = [...measured].sort(
      (a, b) =>
        a.band - b.band ||
        (laneActivity.get(b.group.id) ?? 0) - (laneActivity.get(a.group.id) ?? 0) ||
        a.inputIndex - b.inputIndex,
    );

    // Walk the sorted order to assign each lane its vertical offset.
    const yById = new Map<string, number>();
    let runningY = 0;
    for (const m of sorted) {
      yById.set(m.group.id, runningY);
      runningY += m.height + props.laneGap;
    }

    // Emit in input order with the sorted laneY.
    const out = measured.map((m) => {
      const parentNode = m.hasParent ? m.group.nodes[0] : undefined;
      const children = m.hasParent ? m.group.nodes.slice(1) : m.group.nodes;
      return {
        group: m.group,
        laneY: yById.get(m.group.id)!,
        spec: {
          id: m.group.id,
          parentTitle: parentNode?.title,
          parentSubtitle: parentNode?.subtitle,
          children,
        } as import("./SwimlaneAnimatedLane").SwimlaneAnimatedLaneSpec,
      };
    });
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
        {/* Index, not For: lanesWithY rebuilds its items array on every
            `nodes` change, so a For would re-mount every lane on every
            tick and discard the per-lane animation state. Index keys by
            position and forwards the new item via a reactive accessor,
            so SwimlaneAnimatedLane stays mounted and its createEffect
            sees `nodes` change → animation runs. */}
        <Index each={lanesWithY().items}>
          {(item) => (
            <SwimlaneAnimatedLane
              spec={item().spec}
              nodes={item().group.nodes}
              laneY={item().laneY}
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
        </Index>
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
    <AnimatedSwimlaneChartBase
      {...(mergeProps(defaults, props) as AnimatedSwimlaneChartProps)}
    />
  );
}

export { phasesFor };
