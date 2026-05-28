// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
/**
 * SwimlaneChart — Atomic Primitive (Depth 1).
 *
 * Owns its own CSS (`SwimlaneChart.css`) and consumes shared SVG render
 * utilities from `src/internal/dag-svg` — a utility module, not a
 * Primitive. The type-only imports and `createPanZoom` helper from
 * `../DagChart` are data/type imports, permitted by the Primitive rule
 * (which forbids cross-Primitive *component* imports, not data/types).
 */
import {
  createMemo,
  createEffect,
  createSignal,
  mergeProps,
  on,
  For,
  onMount,
  onCleanup,
  type JSX,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type { DAGNode, DAGEdge, NodeRenderState } from "../DagChart/types";
import { createPanZoom } from "../DagChart/pan-zoom";
import {
  DagArrowMarker,
  DagSvgNode,
  DagSvgEdge,
  bezierAvoidingObstacles,
  orthogonalAvoidingObstacles,
  type ObstacleRect,
} from "../../internal/dag-svg";
import { computeSwimlaneLayout } from "./layout";
import "./SwimlaneChart.css";

export type SwimlaneChartProps<T> = {
  nodes: DAGNode<T>[];
  edges: DAGEdge[];
  /**
   * Returns the column for a node — any signed integer. The chart picks
   * the center automatically (median of the col range). Passing 0/1/2
   * still works for legacy 3-lane kanban (center = 1).
   */
  swimlaneFor: (node: DAGNode<T>) => number;
  /**
   * Render callback. Receives the node and its render state.
   * For summary nodes the state is `{ kind: "collapsed", collapsedCount }`
   * and `node.data` is `{}` cast to T — consumers should render a stub
   * (e.g. "+3") in that case.
   */
  renderNode: (node: DAGNode<T>, state: NodeRenderState) => JSX.Element;
  /** Optional node size. Defaults to [180, 60]. */
  nodeSize?: (node: DAGNode<T>) => [number, number];
  /** Max graph distance from DOING for visibility. Default 2. */
  maxDepth?: number;
  /** Horizontal gap between column centers. Default 260. */
  columnGap?: number;
  /** Vertical gap between node centers within a column. Default 80. */
  rowGap?: number;
  onNodeClick?: (nodeId: string) => void;
  /** Render arrowheads. Default true. */
  arrows?: boolean;
  /** Enable pan/zoom interaction. Default true. */
  interactive?: boolean;
  /**
   * Which logical column should sit at the chart's horizontal center.
   * Default 0. Pass a moving value (e.g. follow the DOING column) to
   * have the chart slide its content under a static viewport.
   */
  centerCol?: number;
  /**
   * When false, ignore the container-width-driven depth reduction and
   * always render at `maxDepth`. Use this when you want a stable visible
   * set across status / col changes (e.g. an animated chain demo).
   */
  responsiveCollapse?: boolean;
  /**
   * Edge routing style. Default `"orthogonal"` — strict right-angle
   * routing with 3-segment Z paths (5-segment U over obstacles), hard
   * 90° corners, cardinal-direction arrowheads, and per-edge ports so
   * parallel connections fan instead of stacking. `"bezier"` keeps the
   * smooth-curve variant for callers who prefer it.
   */
  routingStyle?: "bezier" | "orthogonal";
};

const DEFAULT_SIZE: [number, number] = [180, 60];

export function SwimlaneChart<T>(props: SwimlaneChartProps<T>) {
  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  const [containerWidth, setContainerWidth] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);

  const { transformString, centerOnPoint, fitToView, pointerHandlers, onWheel } = createPanZoom();

  const nodeSize = (node: DAGNode<T>): [number, number] =>
    props.nodeSize ? props.nodeSize(node) : DEFAULT_SIZE;

  // Responsive sizing constants. Arrows compress until they hit the
  // minimum visible length, then we start collapsing outer-ring nodes
  // into summary stubs via maxDepth reduction.
  const MIN_ARROW_PX = 50;
  const H_PADDING_PX = 32;
  const DEPTH_STEP_PX = 100; // each ring of collapse buys ~100px

  const widestNodeWidth = createMemo(() => {
    let max = 0;
    for (const n of props.nodes) {
      const [w] = nodeSize(n);
      if (w > max) max = w;
    }
    return max || DEFAULT_SIZE[0];
  });

  // Width required to display `depth` rings on each side of center.
  // DOING is anchored to the viewport center; layout positions nodes by
  // col VALUE (not by index into occupied cols), so the chart always
  // reserves symmetric space — `depth` gaps on each side, plus a node
  // and a badge slot at each outer edge, plus padding. This is purely
  // a function of `depth` and the fixed node width — no data lookup.
  const BADGE_EXTENT = 50; // STUB_LENGTH (28) + 2*BADGE_RADIUS (22)

  const widthForDepth = (depth: number) => {
    const nw = widestNodeWidth();
    const minGap = nw + MIN_ARROW_PX;
    return 2 * depth * minGap + nw + 2 * BADGE_EXTENT + 2 * H_PADDING_PX;
  };

  // Largest depth that fits in the container, capped at userMaxDepth.
  // Discrete: step down by 1 until we fit (or hit 0).
  const effectiveMaxDepth = createMemo(() => {
    const userMax = props.maxDepth ?? 2;
    // Consumers can opt out of the container-width-driven collapse;
    // useful for animations where stable visibility matters more than
    // fitting every node onscreen.
    if (props.responsiveCollapse === false) return userMax;
    const cw = containerWidth();
    if (cw === 0) return userMax;
    for (let d = userMax; d > 0; d--) {
      if (cw >= widthForDepth(d)) return d;
    }
    return 0;
  });

  const effectiveColumnGap = createMemo(() => {
    const cw = containerWidth();
    const nw = widestNodeWidth();
    const userDefault = props.columnGap ?? 260;
    if (cw === 0) return userDefault;
    const depth = effectiveMaxDepth();
    const minGap = nw + MIN_ARROW_PX;
    if (depth <= 0) return minGap;
    // Symmetric layout: 2*depth gaps span from outer-left node center
    // to outer-right node center. The remaining width pays for one
    // full node (the outer node's far half on each side adds to one
    // node width total) plus badge slots and padding.
    const fittable = (cw - nw - 2 * BADGE_EXTENT - 2 * H_PADDING_PX) / (2 * depth);
    return Math.max(minGap, Math.min(fittable, userDefault));
  });
  // Retained for forward compat; not used in the new discrete algorithm.
  void DEPTH_STEP_PX;

  const tallestNodeHeight = createMemo(() => {
    let max = 0;
    for (const n of props.nodes) {
      const [, h] = nodeSize(n);
      if (h > max) max = h;
    }
    return max || DEFAULT_SIZE[1];
  });

  // Vertical analogue of effectiveMaxDepth: how many rows fit in the
  // container height. Columns with more nodes than this collapse their
  // overflow into the side "+N" lozenge (see layout.ts maxRows). Opt out
  // with responsiveCollapse=false. `undefined` = no cap.
  const V_PADDING_PX = 24;
  const effectiveMaxRows = createMemo(() => {
    if (props.responsiveCollapse === false) return undefined;
    const ch = containerHeight();
    if (ch === 0) return undefined;
    const rowGap = props.rowGap ?? 80;
    const usable = ch - 2 * V_PADDING_PX - tallestNodeHeight();
    return Math.max(1, Math.floor(usable / rowGap) + 1);
  });

  const layout = createMemo(() => {
    try {
      return computeSwimlaneLayout(props.nodes, props.edges, {
        swimlaneFor: props.swimlaneFor,
        nodeSize,
        maxDepth: effectiveMaxDepth(),
        columnGap: effectiveColumnGap(),
        rowGap: props.rowGap ?? 80,
        centerCol: props.centerCol ?? 0,
        maxRows: effectiveMaxRows(),
      });
    } catch (err) {
      console.error("[SwimlaneChart] layout failed:", err);
      return { positions: new Map(), edges: [], totalWidth: 0, totalHeight: 0, summaries: [], centerCol: props.centerCol ?? 0 };
    }
  });

  // Visible items: real nodes whose IDs appear in layout.positions, plus synthetic summary nodes.
  type Item = {
    id: string;
    node: DAGNode<T>;
    x: number;
    y: number;
    width: number;
    height: number;
    state: NodeRenderState;
  };

  const items = createMemo((): Item[] => {
    const positions = layout().positions;
    const out: Item[] = [];
    for (const node of props.nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;
      out.push({
        id: node.id,
        node,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        state: { kind: "normal" },
      });
    }
    // Summaries are NOT rendered as node boxes — they become boundary
    // badges on the arrows. See boundaryBadges() below.
    return out;
  });

  // `items` recomputes brand-new Item objects on every layout change,
  // which would force <For> to remount every foreignObject — defeating
  // any CSS transition on x / y. We mirror items() into a keyed store
  // so each id has a STABLE reference across renders; reconcile only
  // mutates the properties that actually changed, and the SVG element
  // can interpolate between its old and new attribute values.
  const [itemsStore, setItemsStore] = createStore<Item[]>([]);
  createEffect(() => {
    setItemsStore(reconcile(items(), { key: "id" }));
  });

  // Animation layer: items that just disappeared keep rendering with
  // `leaving=true` for one animation cycle before being dropped from the
  // DOM; items that just appeared render with `entering=true` so their
  // CSS animation runs from "outside" into place.
  const NODE_LEAVE_MS = 360; // matches the compress keyframe in CSS
  const NODE_ENTER_MS = 360; // mirror of leave — same duration so the two
                              // animations run in sync (one node compresses
                              // into its badge while another grows out of
                              // the opposite-side badge).
  const [leavingItems, setLeavingItems] = createSignal<Item[]>([]);
  const [enteringIds, setEnteringIds] = createSignal<Set<string>>(new Set());

  createEffect(
    on(items, (current, prev) => {
      if (!prev) return;
      const currentIds = new Set(current.map((i) => i.id));
      const prevIds = new Set(prev.map((i) => i.id));

      // Leavers: in prev but not in current.
      const newlyLeft = prev.filter((p) => !currentIds.has(p.id));
      if (newlyLeft.length > 0) {
        setLeavingItems((prevLeaving) => {
          const stillLeaving = prevLeaving.filter((p) => !currentIds.has(p.id));
          const stillLeavingIds = new Set(stillLeaving.map((p) => p.id));
          const fresh = newlyLeft.filter((n) => !stillLeavingIds.has(n.id));
          return [...stillLeaving, ...fresh];
        });
        const removedIds = new Set(newlyLeft.map((n) => n.id));
        setTimeout(() => {
          setLeavingItems((prevLeaving) =>
            prevLeaving.filter((p) => !removedIds.has(p.id)),
          );
        }, NODE_LEAVE_MS);
      }

      // Enterers: in current but not in prev. Skip if the item is also
      // currently in the leaving set (it's re-appearing — let it just
      // slide back without a hard re-enter).
      const newlyEntered = current
        .filter((c) => !prevIds.has(c.id))
        .map((c) => c.id);
      if (newlyEntered.length > 0) {
        setEnteringIds((existing) => {
          const next = new Set(existing);
          for (const id of newlyEntered) next.add(id);
          return next;
        });
        setTimeout(() => {
          setEnteringIds((existing) => {
            const next = new Set(existing);
            for (const id of newlyEntered) next.delete(id);
            return next;
          });
        }, NODE_ENTER_MS);
      }
    }),
  );

  // Side-aware badge positions. The boundary badge sits OUTSIDE the
  // outermost visible node on its side at (anchorOuterX + dir·(STUB +
  // BADGE_RADIUS)). edgeViews and boundaryBadges both read from here so
  // a visible→hidden edge terminates exactly where the badge renders.
  const STUB_LENGTH = 28;
  const BADGE_RADIUS = 11;
  const sideBadgePositions = createMemo(() => {
    const positions = layout().positions;
    // First pass: find the outermost x on each side.
    let leftMinX = Infinity;
    let rightMaxX = -Infinity;
    for (const [id, p] of positions) {
      if (id.startsWith("__collapsed_")) continue;
      if (p.x < leftMinX) leftMinX = p.x;
      if (p.x > rightMaxX) rightMaxX = p.x;
    }
    // Second pass: collect every visible node sharing that outermost x,
    // and compute (avgY, topY, bottomY). The pill badge sits at the avg
    // center; topY/bottomY define the pill's vertical span so it reads
    // as "this badge collects the hidden neighbors of these nodes."
    const collect = (targetX: number) => {
      const matches: { id: string; x: number; y: number; width: number; height: number }[] = [];
      for (const [id, p] of positions) {
        if (id.startsWith("__collapsed_")) continue;
        if (Math.abs(p.x - targetX) < 0.5) matches.push({ id, ...p });
      }
      if (matches.length === 0) return undefined;
      const avgY = matches.reduce((s, m) => s + m.y, 0) / matches.length;
      const topY = Math.min(...matches.map((m) => m.y - m.height / 2));
      const bottomY = Math.max(...matches.map((m) => m.y + m.height / 2));
      const ref = matches[0];
      return { ref, y: avgY, topY, bottomY };
    };
    type Side = { x: number; y: number; topY: number; bottomY: number; anchorId: string };
    const out: { left?: Side; right?: Side } = {};
    const left = leftMinX < Infinity ? collect(leftMinX) : undefined;
    if (left) {
      out.left = {
        x: left.ref.x - left.ref.width / 2 - STUB_LENGTH - BADGE_RADIUS,
        y: left.y,
        topY: left.topY,
        bottomY: left.bottomY,
        anchorId: left.ref.id,
      };
    }
    const right = rightMaxX > -Infinity ? collect(rightMaxX) : undefined;
    if (right) {
      out.right = {
        x: right.ref.x + right.ref.width / 2 + STUB_LENGTH + BADGE_RADIUS,
        y: right.y,
        topY: right.topY,
        bottomY: right.bottomY,
        anchorId: right.ref.id,
      };
    }
    return out;
  });

  // Per-edge port assignment for orthogonal routing. For each visible
  // node, in/out edges get distinct y positions spread evenly along the
  // node's vertical extent so parallel connections fan instead of
  // stacking at the same anchor. Built once per layout pass.
  const portAssignments = createMemo(() => {
    const positions = layout().positions;
    // Ordered: edges with smaller (source.y) or (target.y) get earlier ports
    // so visually the fan reads top-to-bottom.
    const incoming = new Map<string, { edgeKey: string; otherY: number }[]>();
    const outgoing = new Map<string, { edgeKey: string; otherY: number }[]>();
    for (const e of layout().edges) {
      if (e.synthetic) continue;
      const key = `${e.sourceId}|${e.targetId}`;
      const s = positions.get(e.sourceId);
      const t = positions.get(e.targetId);
      if (s && positions.has(e.targetId)) {
        const arr = outgoing.get(e.sourceId) ?? [];
        arr.push({ edgeKey: key, otherY: t!.y });
        outgoing.set(e.sourceId, arr);
      }
      if (t && positions.has(e.sourceId)) {
        const arr = incoming.get(e.targetId) ?? [];
        arr.push({ edgeKey: key, otherY: s!.y });
        incoming.set(e.targetId, arr);
      }
    }
    const portY = new Map<string, { from: number; to: number }>();
    const assign = (
      side: "in" | "out",
      list: Map<string, { edgeKey: string; otherY: number }[]>,
    ) => {
      for (const [nodeId, edges] of list) {
        const p = positions.get(nodeId);
        if (!p) continue;
        edges.sort((a, b) => a.otherY - b.otherY);
        const n = edges.length;
        const top = p.y - p.height / 2;
        const h = p.height;
        edges.forEach((e, i) => {
          const y = top + (h * (i + 1)) / (n + 1);
          const cur = portY.get(e.edgeKey) ?? { from: p.y, to: p.y };
          if (side === "out") cur.from = y;
          else cur.to = y;
          portY.set(e.edgeKey, cur);
        });
      }
    };
    assign("out", outgoing);
    assign("in", incoming);
    return portY;
  });

  const edgeViews = createMemo(() => {
    const positions = layout().positions;
    const centerColVal = props.centerCol ?? 0;
    const summariesById = new Map(
      layout().summaries.map((s) => [s.id, s] as const),
    );
    const badges = sideBadgePositions();
    const isOrthogonal = (props.routingStyle ?? "orthogonal") === "orthogonal";
    const ports = portAssignments();
    // Build the obstacle list once per layout — every visible node is a
    // potential obstacle for any edge that isn't anchored on it.
    const allRects: ObstacleRect[] = [];
    for (const [id, p] of positions) {
      if (id.startsWith("__collapsed_")) continue;
      allRects.push({ id, x: p.x, y: p.y, width: p.width, height: p.height });
    }
    const routeEdge = (
      from: { x: number; y: number; width: number; height: number },
      to: { x: number; y: number; width: number; height: number },
      obstacles: ObstacleRect[],
      edgeKey: string,
    ): string => {
      if (isOrthogonal) {
        const p = ports.get(edgeKey);
        return orthogonalAvoidingObstacles(from, to, obstacles, {
          fromPortY: p?.from,
          toPortY: p?.to,
        });
      }
      return bezierAvoidingObstacles(from, to, obstacles);
    };
    /** Variant that takes explicit port overrides — used for badge edges
     *  where the pill side wants its port-y anchored to the connected
     *  visible node, not to the badge's vertical center. */
    const routeEdgeWithPorts = (
      from: { x: number; y: number; width: number; height: number },
      to: { x: number; y: number; width: number; height: number },
      obstacles: ObstacleRect[],
      edgeKey: string,
      fromPortY: number | undefined,
      toPortY: number | undefined,
    ): string => {
      if (isOrthogonal) {
        const p = ports.get(edgeKey);
        return orthogonalAvoidingObstacles(from, to, obstacles, {
          fromPortY: fromPortY ?? p?.from,
          toPortY: toPortY ?? p?.to,
        });
      }
      // Bezier doesn't take port overrides — adjust the from/to y instead.
      const f = fromPortY !== undefined ? { ...from, y: fromPortY } : from;
      const t = toPortY !== undefined ? { ...to, y: toPortY } : to;
      return bezierAvoidingObstacles(f, t, obstacles);
    };
    const all = layout().edges.flatMap((e) => {
      // Skip synthetic anchor→summary edges — the boundary-badge memo
      // renders those independently as the side stub. Only real data
      // edges should produce dashed lines to/from the badges.
      if (e.synthetic) return [];

      // Hidden → visible: the original source was a hidden node and
      // its dependent is visible. Draw a dashed line from the side
      // badge to the visible target's anchor.
      if (
        e.sourceId.startsWith("__collapsed_") &&
        !e.targetId.startsWith("__collapsed_")
      ) {
        const sum = summariesById.get(e.sourceId);
        if (!sum) return [];
        const t = positions.get(e.targetId);
        if (!t) return [];
        const side = sum.column > centerColVal ? badges.right
          : sum.column < centerColVal ? badges.left
          : undefined;
        if (!side) return [];
        // Pill badge spans (side.topY..side.bottomY). For port-y on the
        // badge side, anchor at the target's y so the dashed line emerges
        // from the pill at the same row it lands on the visible node.
        const pillHeight = side.bottomY - side.topY;
        const pillMidY = (side.topY + side.bottomY) / 2;
        const synthSource = { x: side.x, y: pillMidY, width: BADGE_RADIUS * 2, height: pillHeight };
        const obstacles = allRects.filter((r) => r.id !== e.targetId);
        const key = `${e.sourceId}|${e.targetId}`;
        // Both endpoints anchor at the visible node's row y. Bypassing
        // port-assignment on both sides keeps the corridor on the
        // correct side (above vs below the obstacle) instead of flipping
        // because port spreading offset one end.
        const rowY = t.y;
        const fromPortY = Math.max(side.topY + 4, Math.min(side.bottomY - 4, rowY));
        return [{
          d: routeEdgeWithPorts(synthSource, t, obstacles, key, fromPortY, rowY),
          isSummary: true,
          key,
        }];
      }
      // Hidden → hidden: both endpoints inside the same (or different)
      // summary — render nothing; the summary badges already convey
      // existence.
      if (
        e.sourceId.startsWith("__collapsed_") &&
        e.targetId.startsWith("__collapsed_")
      ) {
        return [];
      }
      const s = positions.get(e.sourceId);
      if (!s) return [];

      // Visible → collapsed-summary: route to the side-badge position,
      // not the layout's hidden-col placeholder. Summary side comes
      // from the summary's `column` (relative to centerCol), so a
      // hidden b6 on the right always lands at the right-side badge
      // even if its layout-anchor is a node on the left.
      // (Dedup happens after the flatMap — the layout emits a
      // synthetic anchor→summary edge alongside the real rewritten
      // edge, which would otherwise produce a duplicate path.)
      if (e.targetId.startsWith("__collapsed_")) {
        const sum = summariesById.get(e.targetId);
        if (!sum) return [];
        const side = sum.column > centerColVal ? badges.right
          : sum.column < centerColVal ? badges.left
          : undefined;
        if (!side) return [];
        // Synthetic target rect matching the badge geometry so the
        // router treats it like any other endpoint.
        const pillHeight = side.bottomY - side.topY;
        const pillMidY = (side.topY + side.bottomY) / 2;
        const t = { x: side.x, y: pillMidY, width: BADGE_RADIUS * 2, height: pillHeight };
        const obstacles = allRects.filter((r) => r.id !== e.sourceId);
        const key = `${e.sourceId}|${e.targetId}`;
        // Anchor both ports at the visible source's row y so corridor-
        // side selection stays in sync with the actual visual layout.
        const rowY = s.y;
        const toPortY = Math.max(side.topY + 4, Math.min(side.bottomY - 4, rowY));
        return [{
          d: routeEdgeWithPorts(s, t, obstacles, key, rowY, toPortY),
          isSummary: true,
          key,
        }];
      }

      const t = positions.get(e.targetId);
      if (!t) return [];
      const obstacles = allRects.filter(
        (r) => r.id !== e.sourceId && r.id !== e.targetId,
      );
      // Path follows the edge's data direction (source -> target) so the
      // arrowhead (marker-end) lands at the target = dependent.
      const key = `${e.sourceId}|${e.targetId}`;
      return [{
        d: routeEdge(s, t, obstacles, key),
        isSummary: false,
        key,
      }];
    });
    // Dedup paths by key — the layout emits both the rewritten real
    // edge and a synthetic anchor→summary edge for boundary badges,
    // and we want exactly one path per (source, target) pair.
    const seen = new Set<string>();
    const out: { d: string; isSummary: boolean; key: string }[] = [];
    for (const ev of all) {
      if (seen.has(ev.key)) continue;
      seen.add(ev.key);
      out.push(ev);
    }
    return out;
  });

  // Mirror edgeViews into a keyed store so each <path> keeps its DOM
  // identity across re-renders and CSS transitions on `d` can fire.
  type EdgeView = { d: string; isSummary: boolean; key: string };
  const [edgesStore, setEdgesStore] = createStore<EdgeView[]>([]);
  createEffect(() => {
    setEdgesStore(reconcile(edgeViews(), { key: "key" }));
  });

  // Boundary badges: one short stub + count circle per summary group.
  // Replaces the previous "summary node" boxes. Position is the outer
  // edge of the visible anchor in the direction of the collapsed nodes.
  // (STUB_LENGTH and BADGE_RADIUS are declared earlier alongside
  // sideBadgePositions so edgeViews can reuse them.)

  // Aggregate summaries by SIDE (left vs right of center). All hidden
  // nodes on a given side count into one badge — even if their nearest
  // visible neighbor (and thus their layout-anchor) is a node on the
  // opposite side via a cross-side edge. The badge anchors to the
  // OUTERMOST visible node on the matching side so the stub points from
  // the chart edge outward.
  const boundaryBadges = createMemo(() => {
    const positions = layout().positions;
    const edges = layout().edges;
    const gap = effectiveColumnGap();
    const centerColVal = props.centerCol ?? 0;

    // Pick the outermost visible node on each side from layout positions.
    let leftAnchorId: string | undefined;
    let rightAnchorId: string | undefined;
    let leftMinX = Infinity;
    let rightMaxX = -Infinity;
    for (const [id, pos] of positions) {
      if (id.startsWith("__collapsed_")) continue;
      if (pos.x < leftMinX) { leftMinX = pos.x; leftAnchorId = id; }
      if (pos.x > rightMaxX) { rightMaxX = pos.x; rightAnchorId = id; }
    }

    // Sum collapsed counts per side. A summary's side comes from its own
    // column relative to centerCol (NOT its anchor), so a hidden node on
    // the LEFT can never spill into a RIGHT badge just because the only
    // visible neighbor it has via deps happens to be on the right.
    let leftCount = 0;
    let rightCount = 0;
    for (const s of layout().summaries) {
      if (s.column < centerColVal) {
        leftCount += s.collapsedCount;
      } else if (s.column > centerColVal) {
        rightCount += s.collapsedCount;
      } else {
        // Tie at centerCol — fall back to the original edge-direction
        // heuristic so the badge still picks a sensible side.
        const edge = edges.find(
          (e) => e.sourceId === s.id || e.targetId === s.id,
        );
        const dir = edge && edge.targetId === s.anchorId ? -1 : 1;
        if (dir === -1) leftCount += s.collapsedCount;
        else rightCount += s.collapsedCount;
      }
    }
    void gap;

    type Aggregated = { anchorId: string | undefined; dir: -1 | 1; count: number; key: string };
    const sides: Aggregated[] = [];
    if (leftCount > 0) {
      sides.push({ anchorId: leftAnchorId, dir: -1, count: leftCount, key: "side|-1" });
    }
    if (rightCount > 0) {
      sides.push({ anchorId: rightAnchorId, dir: 1, count: rightCount, key: "side|+1" });
    }

    // Viewport edges in content coords. The centering effect pins col 0
    // (x=0) to the viewport horizontal center at scale 1, so the visible
    // content x-range is [-cw/2, +cw/2]. A side with collapsed nodes but NO
    // visible anchor (a disconnected subtree, or nothing visible at all)
    // pins its lozenge just inside the matching viewport edge so the count
    // is ALWAYS shown — the "edge lozenge whenever a node is invisible"
    // behavior, even when there are zero visible nodes.
    const cw = containerWidth();
    const vpLeftX = -cw / 2 + H_PADDING_PX + BADGE_RADIUS;
    const vpRightX = cw / 2 - H_PADDING_PX - BADGE_RADIUS;

    const sidePos = sideBadgePositions();
    return sides.flatMap((g) => {
      const dir = g.dir;
      const anchorPos = g.anchorId ? positions.get(g.anchorId) : undefined;
      const sideInfo = dir === -1 ? sidePos.left : sidePos.right;
      // Vertical placement: follow the anchor column's span when present,
      // else sit at content y=0 (which the centering effect maps to the
      // viewport vertical center when there are no visible nodes).
      const sideY = sideInfo?.y ?? anchorPos?.y ?? 0;
      const pillTopY = sideInfo?.topY ?? sideY - BADGE_RADIUS;
      const pillBottomY = sideInfo?.bottomY ?? sideY + BADGE_RADIUS;

      // Preferred X: just outside the outermost visible node on this side.
      // But the lozenge must ALWAYS stay inside the viewport — clamp it to
      // the viewport edge when the anchor is off-screen (a tall/parallel
      // column pushed past the edge) or absent (nothing visible). Without
      // this, off-screen collapsed counts vanished with their off-screen
      // anchor. cw===0 only on the first paint, before the ResizeObserver.
      let badgeX: number;
      if (anchorPos) {
        const anchorOuterX = anchorPos.x + dir * (anchorPos.width / 2);
        badgeX =
          dir === -1
            ? anchorOuterX - STUB_LENGTH - BADGE_RADIUS
            : anchorOuterX + STUB_LENGTH + BADGE_RADIUS;
      } else {
        if (cw === 0) return [];
        badgeX = dir === -1 ? vpLeftX : vpRightX;
      }
      if (cw > 0) {
        badgeX = dir === -1 ? Math.max(badgeX, vpLeftX) : Math.min(badgeX, vpRightX);
      }
      return [{ key: g.key, d: "", badgeX, badgeY: sideY, pillTopY, pillBottomY, count: g.count }];
    });
  });

  // Keyed-store mirror so badge SVG elements (path, circle, text) retain
  // their identity and can CSS-transition their attribute values when
  // the simulation advances.
  type BoundaryBadge = {
    key: string;
    d: string;
    badgeX: number;
    badgeY: number;
    pillTopY: number;
    pillBottomY: number;
    count: number;
  };
  const [badgesStore, setBadgesStore] = createStore<BoundaryBadge[]>([]);
  createEffect(() => {
    setBadgesStore(reconcile(boundaryBadges(), { key: "key" }));
  });

  // Bounding box of all positioned content (real nodes + boundary badges).
  // Extra vertical padding inside the SVG view box so corridor edges
  // routed above the topmost row (or below the bottommost row) don't
  // get clipped at the chart's top/bottom edge. Matches the
  // orthogonal router's OBSTACLE_MARGIN (~32) plus a few px of slack.
  const EDGE_GUTTER = 40;
  const viewBounds = createMemo(() => {
    const positions = layout().positions;
    if (positions.size === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0, width: 0, height: 0 };
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of positions.values()) {
      minX = Math.min(minX, p.x - p.width / 2);
      maxX = Math.max(maxX, p.x + p.width / 2);
      minY = Math.min(minY, p.y - p.height / 2);
      maxY = Math.max(maxY, p.y + p.height / 2);
    }
    for (const b of boundaryBadges()) {
      minX = Math.min(minX, b.badgeX - BADGE_RADIUS);
      maxX = Math.max(maxX, b.badgeX + BADGE_RADIUS);
      minY = Math.min(minY, b.pillTopY);
      maxY = Math.max(maxY, b.pillBottomY);
    }
    // Extend vertically so corridor routes above/below have room.
    minY -= EDGE_GUTTER;
    maxY += EDGE_GUTTER;
    return {
      minX, maxX, minY, maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: maxX - minX,
      height: maxY - minY,
    };
  });

  // Always pin DOING (x=0) to the viewport horizontal center at scale 1.
  // Node sizes are bounded below by their natural dimensions — we never
  // scale the chart down to fit a too-narrow container; instead the chart
  // overflows the container (clipped by CSS overflow:hidden), or the user
  // pans interactively.
  void fitToView;
  createEffect(
    on(
      () => [viewBounds(), containerWidth(), containerHeight()] as const,
      ([bounds, cw, ch]) => {
        if (cw === 0 || ch === 0) return;
        // Anchor DOING (col 0, x=0) to the viewport center. Off-screen
        // overflow is handled by effectiveMaxDepth(): when the container
        // shrinks, outer-ring nodes collapse into boundary badges before
        // they'd ever reach the viewport edge.
        centerOnPoint(0, bounds.centerY, cw, ch);
      },
    ),
  );

  const interactive = () => props.interactive !== false;
  const arrows = () => props.arrows !== false;

  // Wheel listener with { passive: false } so preventDefault works. Skipped when non-interactive.
  onMount(() => {
    const svg = svgRef;
    if (!svg) return;
    if (!interactive()) return;
    const handler = onWheel as EventListener;
    svg.addEventListener("wheel", handler, { passive: false });
    onCleanup(() => svg.removeEventListener("wheel", handler));
  });

  // ResizeObserver — capture container size for centering math.
  onMount(() => {
    if (!containerRef) return;
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerWidth(width);
      setContainerHeight(height);
    });

    observer.observe(containerRef);
    onCleanup(() => observer.disconnect());
  });

  const handleNodeClick = (nodeId: string) => {
    props.onNodeClick?.(nodeId);
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <svg
        ref={svgRef}
        class="sui-swimlane"
        onPointerDown={interactive() ? pointerHandlers.onPointerDown : undefined}
        onPointerMove={interactive() ? pointerHandlers.onPointerMove : undefined}
        onPointerUp={interactive() ? pointerHandlers.onPointerUp : undefined}
      >
        <defs>
          <DagArrowMarker id="sui-swimlane-arrow" pathClass="sui-swimlane__arrow" />
        </defs>
        <g transform={transformString()}>
          {/* Edges */}
          <For each={edgesStore}>
            {(edge) => (
              <DagSvgEdge
                class={`sui-swimlane__edge${
                  edge.isSummary ? " sui-swimlane__edge--summary" : ""
                }`}
                d={edge.d}
                arrowMarkerId={arrows() ? "sui-swimlane-arrow" : undefined}
              />
            )}
          </For>

          {/* Boundary badges — vertical pills at the outer edge of the
              outermost visible column. The pill spans the column's
              vertical range so dashed connecting lines to/from hidden
              nodes can anchor at each visible neighbor's row instead
              of stacking at the column's avg-y. Count text sits at
              the pill's midpoint. */}
          <For each={badgesStore}>
            {(b) => (
              <g class="sui-swimlane__boundary">
                <rect
                  class="sui-swimlane__boundary-badge"
                  x={b.badgeX - BADGE_RADIUS}
                  y={b.pillTopY}
                  width={BADGE_RADIUS * 2}
                  height={Math.max(BADGE_RADIUS * 2, b.pillBottomY - b.pillTopY)}
                  rx={BADGE_RADIUS}
                  ry={BADGE_RADIUS}
                />
                <text
                  class="sui-swimlane__boundary-badge-text"
                  x={b.badgeX}
                  y={(b.pillTopY + b.pillBottomY) / 2}
                  text-anchor="middle"
                  dominant-baseline="central"
                >
                  +{b.count}
                </text>
              </g>
            )}
          </For>

          {/* Nodes (real only — summaries become boundary badges).
              Newly-appeared items slide in from outside; leaving items
              keep their last position while sliding out. */}
          <For each={itemsStore}>
            {(item) => {
              const entering = () => enteringIds().has(item.id);
              /* Enter is the time-mirror of leave: the node grows out
                 of the boundary badge on its OWN side. Left-side
                 enterers (item.x < 0) start at the left badge — outer
                 edge offset by -(STUB_LENGTH + BADGE_RADIUS). Right
                 side mirrors. Magnitude matches the leave reach so the
                 two animations trace the same path in opposite time. */
              const enterOffsetX = item.x < 0
                ? -(STUB_LENGTH + BADGE_RADIUS)
                : item.x > 0
                  ? STUB_LENGTH + BADGE_RADIUS
                  : 0;
              return (
                <DagSvgNode
                  node={item.node}
                  state={item.state}
                  x={item.x}
                  y={item.y}
                  width={item.width}
                  height={item.height}
                  wrapperClass="sui-swimlane__node-wrapper"
                  onClick={handleNodeClick}
                  renderNode={props.renderNode}
                  entering={entering()}
                  enteringOffsetX={enterOffsetX}
                />
              );
            }}
          </For>
          <For each={leavingItems()}>
            {(item) => {
              /* Leave slide TOWARD the boundary badge. After this
                 tick, the new outer-visible anchor slides INTO the
                 leaving node's old slot, and the badge sits just
                 outside that slot — STUB_LENGTH + BADGE_RADIUS past
                 the anchor's outer edge. So the leaver only needs to
                 translate its outer edge by that much to land on the
                 badge. Combined with transform-origin: outer-edge,
                 the rect collapses straight into the badge. */
              const reach = STUB_LENGTH + BADGE_RADIUS;
              const leaveOffsetX = item.x < 0
                ? -reach
                : item.x > 0
                  ? reach
                  : 0;
              return (
                <DagSvgNode
                  node={item.node}
                  state={item.state}
                  x={item.x}
                  y={item.y}
                  width={item.width}
                  height={item.height}
                  wrapperClass="sui-swimlane__node-wrapper"
                  renderNode={props.renderNode}
                  leaving
                  leavingOffsetX={leaveOffsetX}
                />
              );
            }}
          </For>
        </g>
      </svg>
    </div>
  );
}

/** Props that are visual/layout overrides — locked at variant-definition time.
 *  A curried variant freezes these so every consumer-app instance renders the
 *  same way, while still exposing data + behavior props (nodes, edges, etc.). */
export type SwimlaneChartOverrides =
  | "maxDepth"
  | "columnGap"
  | "rowGap"
  | "nodeSize"
  | "arrows"
  | "interactive"
  | "centerCol"
  | "responsiveCollapse";

/** Props that remain available to consumers of a curried SwimlaneChart variant. */
export type SwimlaneChartDataProps<T> = Omit<SwimlaneChartProps<T>, SwimlaneChartOverrides>;

/**
 * Curried-variant factory for SwimlaneChart. Bakes layout/visual defaults
 * into a named component (per ADR-0001). Consumers import the named variant
 * (e.g. `LinearFlowSwimlaneChart`) and pass only data + render callbacks —
 * the variant's visual configuration cannot drift across consumer apps.
 */
export function createSwimlaneChart<T>(
  defaults: Partial<Pick<SwimlaneChartProps<T>, SwimlaneChartOverrides>>,
): (props: SwimlaneChartDataProps<T>) => JSX.Element {
  return (props) => <SwimlaneChart {...mergeProps(defaults, props) as SwimlaneChartProps<T>} />;
}
