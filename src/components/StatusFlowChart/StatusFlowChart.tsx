// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
import {
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Component,
  type JSX,
} from "solid-js";
import { SwimlaneChart } from "../SwimlaneChart";
import type { DAGNode, NodeRenderState } from "../DagChart/types";
import {
  assignColumns,
  pickVisibleCols,
  resolveParentStatuses,
  type StatusFlowBreakpoint,
  type StatusFlowColumn,
  type StatusFlowNode,
} from "./columns";
import "./StatusFlowChart.css";

export type {
  StatusFlowNode,
  StatusFlowColumn,
  StatusFlowBreakpoint,
} from "./columns";

/**
 * Render context passed to a consumer's `renderNode`.
 *
 * `effectiveStatus` may differ from `node.status` when the node is a
 * parent whose children are all terminal (auto-flipped by the component).
 *
 * `collapsedChildCount` is set on parents whose children have been hidden
 * — render a `+N` badge to indicate the collapsed children.
 */
export type StatusFlowRenderContext = {
  effectiveStatus: string;
  collapsedChildCount: number | undefined;
  /** True when this node is acting as a visual parent (has children, or had them before collapse). */
  isParent: boolean;
};

export type StatusFlowChartProps = {
  nodes: StatusFlowNode[];
  /** Ordered left-to-right (e.g. [DONE, DOING, TODO]). */
  columns: StatusFlowColumn[];
  /** The status that anchors the chart's center column. */
  centerStatus: string;
  /** When all children of a parent reach this status, the parent flips
   *  to this status and its children collapse into a `+N` badge. */
  terminalStatus: string;
  nodeWidth: number;
  nodeHeight: number;
  /** Minimum horizontal gap reserved for an arrow between two adjacent
   *  node centers — used by SwimlaneChart to budget the column gap. */
  minArrowWidth: number;
  /** Vertical gap (center-to-center) between nodes that stack inside the
   *  same column. Default 80 to match SwimlaneChart; pass a smaller
   *  value (e.g. nodeHeight + 8) to fit more stacked nodes per col. */
  rowGap?: number;
  /** Width-driven visible-column breakpoints. Largest matching minWidth
   *  wins. `visibleCols` should be odd (1, 3, 5, …) so the chart stays
   *  symmetric around the center column. */
  breakpoints: StatusFlowBreakpoint[];
  /** Custom node renderer. Defaults to a title + subtitle + status pill. */
  renderNode?: (node: StatusFlowNode, ctx: StatusFlowRenderContext) => JSX.Element;
  /**
   * Optional per-node column override. When provided, overrides the
   * default status-based column assignment. Returning `undefined` falls
   * back to the status-based col. Useful for chain layouts where each
   * node should occupy its own col regardless of how many siblings
   * share its status.
   */
  colFor?: (node: StatusFlowNode) => number | undefined;
  onNodeClick?: (id: string) => void;
  /** Pass through to SwimlaneChart. Default `"bezier"`. */
  routingStyle?: "bezier" | "orthogonal";
};

type EnrichedNode = StatusFlowNode & {
  effectiveStatus: string;
  collapsedChildCount: number | undefined;
  isParent: boolean;
};

const defaultRender = (node: StatusFlowNode, ctx: StatusFlowRenderContext): JSX.Element => (
  <div class="sui-statusflow__card" data-status={ctx.effectiveStatus} data-parent={ctx.isParent ? "" : undefined}>
    <div class="sui-statusflow__card-status">{ctx.effectiveStatus}</div>
    <div class="sui-statusflow__card-title">{node.title}</div>
    {node.subtitle && <div class="sui-statusflow__card-subtitle">{node.subtitle}</div>}
    {ctx.collapsedChildCount !== undefined && (
      <div class="sui-statusflow__badge">+{ctx.collapsedChildCount}</div>
    )}
  </div>
);

/**
 * Status-aware flow chart. Caller passes nodes with `status` (no positional
 * hints); the component computes columns from `breakpoints` + container
 * width, lays out nodes by status, and auto-flips parents to terminal when
 * all their children are terminal (collapsing the children into a `+N`
 * badge on the parent).
 *
 * Reuses SwimlaneChart for the actual chart rendering (mirrored compress
 * animation, per-row layout, depth-window collapse to side badges).
 */
export const StatusFlowChart: Component<StatusFlowChartProps> = (props) => {
  const [width, setWidth] = createSignal(0);
  let containerRef: HTMLDivElement | undefined;
  onMount(() => {
    if (!containerRef) return;
    setWidth(containerRef.clientWidth);
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(containerRef);
    onCleanup(() => ro.disconnect());
  });

  // visibleCols → maxDepth (symmetric, so maxDepth = (visibleCols - 1) / 2).
  // SwimlaneChart's internal responsiveCollapse is OFF — the breakpoints
  // drive collapse directly, not the chart's width-budget formula.
  const visibleCols = createMemo(() => pickVisibleCols(width(), props.breakpoints));
  const maxDepth = createMemo(() => Math.max(0, Math.floor((visibleCols() - 1) / 2)));

  // Effective statuses + collapsed-parent map. Computed together so we
  // only sweep the children index once per render cycle.
  const resolved = createMemo(() => {
    const effective = resolveParentStatuses(props.nodes, props.centerStatus);
    const childrenByParent = new Map<string, StatusFlowNode[]>();
    for (const n of props.nodes) {
      if (n.parentId) {
        const list = childrenByParent.get(n.parentId) ?? [];
        list.push(n);
        childrenByParent.set(n.parentId, list);
      }
    }
    const collapsedParents = new Map<string, number>();
    for (const [pid, children] of childrenByParent) {
      const eff = effective.get(pid);
      if (eff === props.terminalStatus) {
        // Parent flipped to terminal — collapse children into a +N badge.
        collapsedParents.set(pid, children.length);
      }
    }
    return { effective, collapsedParents, childrenByParent };
  });

  // Visible nodes after parent collapse hides children. The parent
  // itself stays visible — it sits on top of its children's row inside
  // the lane (the bounding box wraps both).
  const visibleNodes = createMemo<EnrichedNode[]>(() => {
    const { effective, collapsedParents, childrenByParent } = resolved();
    const out: EnrichedNode[] = [];
    for (const n of props.nodes) {
      if (n.parentId && collapsedParents.has(n.parentId)) continue;
      out.push({
        ...n,
        effectiveStatus: effective.get(n.id) ?? n.status,
        collapsedChildCount: collapsedParents.get(n.id),
        isParent: childrenByParent.has(n.id),
      });
    }
    return out;
  });

  // Column assignment runs against EFFECTIVE status so a parent that
  // flipped to terminal lands in the terminal column. When the caller
  // provides `colFor`, that overrides the status-based result per node
  // (an `undefined` from colFor falls back to status-based).
  const cols = createMemo(() => {
    const ns = visibleNodes().map((n) => ({ ...n, status: n.effectiveStatus }));
    const base = assignColumns(ns, props.columns, props.centerStatus, visibleCols());
    if (!props.colFor) return base;
    const out = new Map(base);
    const halfWindow = Math.floor(visibleCols() / 2);
    for (const n of ns) {
      const override = props.colFor(n);
      if (override === undefined) continue;
      out.set(n.id, {
        col: override,
        visible: Math.abs(override) <= halfWindow,
        side: override < 0 ? "left" : override > 0 ? "right" : "center",
      });
    }
    return out;
  });

  // Single-parent demo: identify THE parent (if any) and split it from
  // the chart contents. The parent renders as a header above the chart;
  // the children render inside SwimlaneChart. Multi-parent support
  // (multiple stacked lanes) is future work.
  const parent = createMemo<EnrichedNode | undefined>(() => {
    const { childrenByParent } = resolved();
    return visibleNodes().find((n) => childrenByParent.has(n.id));
  });

  // Parent's status-based column (e.g. TODO → +1, DOING → 0, DONE → -1).
  // The parent header tracks this column horizontally so it always sits
  // in its own status column — same convention the children follow.
  const parentCol = createMemo(() => {
    const p = parent();
    if (!p) return 0;
    return cols().get(p.id)?.col ?? 0;
  });

  const chartChildren = createMemo<EnrichedNode[]>(() => {
    const p = parent();
    return p ? visibleNodes().filter((n) => n.id !== p.id) : visibleNodes();
  });

  // SwimlaneChart node shape: { id, data }. We stash the enriched node
  // in `data` so the renderNode callback can read effectiveStatus etc.
  const swimlaneNodes = createMemo((): DAGNode<EnrichedNode>[] =>
    chartChildren().map((n) => ({ id: n.id, data: n })),
  );

  // Build edges from each chart child's `dependsOn`. Drop edges that
  // reference a hidden node (parent collapsed its children → those ids
  // aren't rendered, so an arrow to them would dangle).
  const swimlaneEdges = createMemo(() => {
    const visibleIds = new Set(chartChildren().map((n) => n.id));
    const edges: { source: string; target: string }[] = [];
    for (const n of chartChildren()) {
      for (const src of n.dependsOn ?? []) {
        if (visibleIds.has(src)) edges.push({ source: src, target: n.id });
      }
    }
    return edges;
  });

  // Shared inner renderer — used both by SwimlaneChart's renderNode and
  // by the parent header. Strips the enrichment off `data` before
  // handing to the consumer's renderer.
  const renderInnerForData = (data: EnrichedNode): JSX.Element => {
    const ctx: StatusFlowRenderContext = {
      effectiveStatus: data.effectiveStatus,
      collapsedChildCount: data.collapsedChildCount,
      isParent: data.isParent,
    };
    const { effectiveStatus: _e, collapsedChildCount: _c, isParent: _p, ...pure } = data;
    void _e; void _c; void _p;
    const render = props.renderNode ?? defaultRender;
    return render(pure as StatusFlowNode, ctx);
  };

  const renderInner = (node: DAGNode<EnrichedNode>, state: NodeRenderState): JSX.Element => {
    if (state.kind === "collapsed") {
      return (
        <div class="sui-statusflow__card sui-statusflow__card--depth-collapsed">
          <div class="sui-statusflow__badge">+{state.collapsedCount}</div>
        </div>
      );
    }
    return renderInnerForData(node.data);
  };

  // Column gap derived from nodeWidth + minArrowWidth — keeps the
  // arrow long enough to read while the rest of the budget goes to the
  // node itself. SwimlaneChart's internal column-gap calc may shrink
  // this further on narrow viewports.
  const columnGap = createMemo(() => props.nodeWidth + props.minArrowWidth);
  const rowGap = createMemo(() => props.rowGap ?? 80);

  const renderChart = (): JSX.Element => (
    <div class="sui-statusflow__chart">
      <SwimlaneChart
        nodes={swimlaneNodes()}
        edges={swimlaneEdges()}
        swimlaneFor={(n) => cols().get(n.id)?.col ?? 0}
        renderNode={renderInner}
        nodeSize={() => [props.nodeWidth, props.nodeHeight]}
        maxDepth={maxDepth()}
        columnGap={columnGap()}
        rowGap={rowGap()}
        responsiveCollapse={false}
        interactive={false}
        arrows={true}
        routingStyle={props.routingStyle}
        onNodeClick={props.onNodeClick}
      />
    </div>
  );

  return (
    <div ref={containerRef} class="sui-statusflow">
      {parent() ? (
        <div class="sui-statusflow__lane-box">
          <div class="sui-statusflow__parent-header">
            <div
              class="sui-statusflow__parent-slot"
              style={{
                width: `${props.nodeWidth}px`,
                height: `${props.nodeHeight}px`,
                // Track the parent's status column: TODO → +1 (right of
                // center), DOING → 0 (center), DONE → -1 (left). Same
                // convention the children follow. Animates smoothly so
                // the parent slides between columns when its effective
                // status changes.
                transform: `translateX(${parentCol() * columnGap()}px)`,
                transition: "transform 0.55s ease-out",
              }}
            >
              {renderInnerForData(parent()!)}
            </div>
          </div>
          {renderChart()}
        </div>
      ) : (
        renderChart()
      )}
    </div>
  );
};
