// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// AnimatedSwimlaneChart — Composite (Depth 2). Composes SwimlaneAnimatedLane (Depth 1).
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
import {
  phasesFor,
  type LaneTimingConfig,
} from "../../internal/animation/trajectories";
import { ANIMATED_SWIMLANE_DEFAULTS, type RenderNodeContext } from "./defaults";
import { groupIntoLanes, visibleChildRowCount } from "./lanes";
import { SwimlaneAnimatedLane } from "./SwimlaneAnimatedLane";
import "./AnimatedSwimlaneChart.css";
import { observeSize } from "../../internal/dom/observeSize";

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
export const AnimatedSwimlaneChartBase: Component<
  AnimatedSwimlaneChartProps
> = (rawProps) => {
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
    // Writing setStageWidth synchronously inside the observer dispatch mutates
    // the observed subtree's layout DURING dispatch (stageWidth → maxDepth →
    // lane rows) and re-fires the observer in the same frame. This component
    // grew that coalescing privately; it now uses the shared primitive (see
    // internal/dom/observeSize).
    onCleanup(
      observeSize(containerRef, (size) => {
        if (size.width > 0) setStageWidth(Math.max(400, size.width));
      }),
    );
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
    if (props.breakpoints === ANIMATED_SWIMLANE_DEFAULTS.breakpoints)
      return null;
    const cols = pickVisibleCols(stageWidth(), props.breakpoints);
    return Math.max(0, Math.floor((cols - 1) / 2));
  });
  const effectiveMaxDepth = () =>
    responsiveDepthFromBreakpoints() ?? maxDepth();

  const lanes = createMemo(() => groupIntoLanes(props.nodes));

  // Shrinkwrap: a lane is only as tall as the cards currently visible in it —
  // its tallest visible column (≥1 row whenever the lane has any children, so
  // the side-lozenge still has somewhere to sit). Lanes grow/shrink as cards
  // appear and collapse, and the slide transition reflows the lanes below.
  const laneRowCount = (laneNodes: StatusFlowNode[], hasParent: boolean) => {
    const childCount = laneNodes.length - (hasParent ? 1 : 0);
    if (childCount === 0) return 0;
    return Math.max(1, visibleChildRowCount(laneNodes, effectiveMaxDepth()));
  };

  const laneHeightForRows = (rows: number, hasParent: boolean) => {
    const childRowH =
      rows > 0 ? rows * props.nodeSize[1] + (rows - 1) * props.rowGap : 0;
    const parentRowH = hasParent ? props.nodeSize[1] + props.parentGap : 0;
    return props.lanePadding * 2 + parentRowH + childRowH;
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

  // `displayedRows` is the row count a lane is *sized* for right now, which can
  // lag the live count. Growing (a card appears) applies immediately so the
  // new card has somewhere to land; SHRINKING (a card moves out / collapses,
  // e.g. DOING→DONE) is DEBOUNCED: any node movement in the lane resets the
  // timer, so the lane only tightens after `laneResizeSettleMs` with nothing
  // moving — the card always finishes moving first, and a burst of moves
  // collapses into one resize. `prevStatusForResize` powers the move test.
  const displayedRows = new Map<string, number>();
  const rowHoldTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let prevStatusForResize = new Map<string, string>();

  const clearTimer = (
    map: Map<string, ReturnType<typeof setTimeout>>,
    id: string,
  ) => {
    const t = map.get(id);
    if (t !== undefined) {
      clearTimeout(t);
      map.delete(id);
    }
  };
  const clearHold = (id: string) => clearTimer(holdTimers, id);

  createEffect(() => {
    const groups = lanes();
    const holdMs = timing().reorderHoldMs ?? 10000;
    const settleMs = timing().laneResizeSettleMs ?? 3000;
    const nextStatus = new Map<string, string>();
    for (const g of groups) {
      const hasParent = !!g.parentId;

      // Did any node in THIS lane change status this frame? (Resets the
      // shrink debounce.)
      let moved = false;
      for (const n of g.nodes) {
        nextStatus.set(n.id, n.status);
        const prev = prevStatusForResize.get(n.id);
        if (prev !== undefined && prev !== n.status) moved = true;
      }

      // ── Band position (DOING/TODO/DONE) — up prompt, down held ~10s. ──
      const actual = laneBandRank(g.nodes, hasParent);
      const shown = displayedBand.get(g.id);
      if (shown === undefined) {
        displayedBand.set(g.id, actual); // first sight — no slide
      } else if (actual === shown) {
        clearHold(g.id);
      } else if (actual < shown) {
        clearHold(g.id);
        displayedBand.set(g.id, actual);
        setDisplayBump((v) => v + 1);
      } else if (!holdTimers.has(g.id)) {
        const handle = setTimeout(() => {
          holdTimers.delete(g.id);
          const grp = lanes().find((x) => x.id === g.id);
          if (!grp) return;
          displayedBand.set(g.id, laneBandRank(grp.nodes, !!grp.parentId));
          setDisplayBump((v) => v + 1);
        }, holdMs);
        holdTimers.set(g.id, handle);
      }

      // ── Row count / lane height — grow prompt, SHRINK debounced. ──
      const rows = laneRowCount(g.nodes, hasParent);
      const shownRows = displayedRows.get(g.id);
      if (shownRows === undefined) {
        displayedRows.set(g.id, rows); // first sight — size to fit
      } else if (rows > shownRows) {
        // Grow now so an appearing card has room to land.
        clearTimer(rowHoldTimers, g.id);
        displayedRows.set(g.id, rows);
        setDisplayBump((v) => v + 1);
      } else if (rows === shownRows) {
        clearTimer(rowHoldTimers, g.id); // no shrink pending
      } else if (moved || !rowHoldTimers.has(g.id)) {
        // Shrink pending. (Re)start the debounce — a fresh move resets it, so
        // the lane only tightens after settleMs of stillness.
        clearTimer(rowHoldTimers, g.id);
        const handle = setTimeout(() => {
          rowHoldTimers.delete(g.id);
          const grp = lanes().find((x) => x.id === g.id);
          if (!grp) return;
          displayedRows.set(g.id, laneRowCount(grp.nodes, !!grp.parentId));
          setDisplayBump((v) => v + 1);
        }, settleMs);
        rowHoldTimers.set(g.id, handle);
      }
    }
    prevStatusForResize = nextStatus;
  });

  onCleanup(() => {
    for (const t of holdTimers.values()) clearTimeout(t);
    for (const t of rowHoldTimers.values()) clearTimeout(t);
    holdTimers.clear();
    rowHoldTimers.clear();
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
      const rows = displayedRows.get(g.id) ?? laneRowCount(g.nodes, hasParent);
      return {
        group: g,
        inputIndex,
        hasParent,
        rows,
        height: laneHeightForRows(rows, hasParent),
        band,
      };
    });

    // Sorted order: by band; within a band, most recently active first
    // (recency descending), with input order as the final stable tiebreak.
    const sorted = [...measured].sort(
      (a, b) =>
        a.band - b.band ||
        (laneActivity.get(b.group.id) ?? 0) -
          (laneActivity.get(a.group.id) ?? 0) ||
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
        rows: m.rows,
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
    <div
      ref={containerRef}
      class="sui-animated-swimlane-chart"
    >
      <svg
        width={stageWidth()}
        height={lanesWithY().totalH}
        role="img"
        aria-label="Swimlane chart"
        viewBox={`0 0 ${stageWidth()} ${lanesWithY().totalH}`}
        class="sui-animated-swimlane-chart__svg"
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
              rowCount={item().rows}
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
