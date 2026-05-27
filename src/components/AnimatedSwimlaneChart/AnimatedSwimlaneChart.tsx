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
