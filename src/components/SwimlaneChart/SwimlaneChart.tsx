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
import type { DAGNode } from "../DagChart/types";
import { createPanZoom } from "../DagChart/pan-zoom";
import { DagArrowMarker, DagSvgEdge } from "../../internal/dag-svg";
import { computeSwimlaneLayout } from "./layout";
import { map, filter, pluck } from "../../fn";
import {
  computeBoundaryBadges,
  computeEdgeViews,
  computePortAssignments,
  computeSideBadges,
  computeViewBounds,
  type BoundaryBadge,
  type EdgeView,
} from "./geometry";
import {
  DEFAULT_SIZE,
  STUB_LENGTH,
  BADGE_RADIUS,
  type SwimlaneChartProps,
  type SwimlaneChartDataProps,
  type SwimlaneChartOverrides,
  type SwimlaneItem,
  type SwimlaneBottomBadge,
} from "./types";
import { SwimlaneBoundaryBadges, SwimlaneBottomBadges } from "./badges";
import { SwimlaneNodes, SwimlaneLeavingNodes } from "./nodes";
import {
  widestNodeWidth,
  tallestNodeHeight,
  fitDepth,
  fitColumnGap,
  fitRows,
  H_PADDING_PX,
} from "./helpers";
import "./SwimlaneChart.css";

export type {
  SwimlaneChartProps,
  SwimlaneChartOverrides,
  SwimlaneChartDataProps,
} from "./types";

export function SwimlaneChart<T>(props: SwimlaneChartProps<T>) {
  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  const [containerWidth, setContainerWidth] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);

  const {
    transformString,
    centerOnPoint,
    fitToView,
    pointerHandlers,
    onWheel,
  } = createPanZoom();

  const nodeSize = (node: DAGNode<T>): [number, number] =>
    props.nodeSize ? props.nodeSize(node) : DEFAULT_SIZE;

  // Responsive sizing memos. The pure math (arrow compression → depth
  // collapse → row collapse, all closed-form functions of pixel size and
  // node box) lives in ./helpers; each memo here just wires a reactive
  // source into the matching helper.
  const widestNode = createMemo(() => widestNodeWidth(props.nodes, nodeSize));
  const tallestNode = createMemo(() =>
    tallestNodeHeight(props.nodes, nodeSize),
  );

  // Largest depth that fits in the container, capped at userMaxDepth.
  // Consumers can opt out of the container-width-driven collapse via
  // responsiveCollapse=false (useful for animations where stable
  // visibility matters more than fitting every node onscreen).
  const effectiveMaxDepth = createMemo(() => {
    const userMax = props.maxDepth ?? 2;
    if (props.responsiveCollapse === false) return userMax;
    return fitDepth(userMax, containerWidth(), widestNode());
  });

  const effectiveColumnGap = createMemo(() => {
    const cw = containerWidth();
    const userDefault = props.columnGap ?? 260;
    if (cw === 0) return userDefault;
    return fitColumnGap(effectiveMaxDepth(), cw, widestNode(), userDefault);
  });

  // Vertical analogue of effectiveMaxDepth: how many rows fit in the
  // container height. Columns with more nodes than this collapse their
  // overflow into the side "+N" lozenge (see layout.ts maxRows). Opt out
  // with responsiveCollapse=false. `undefined` = no cap.
  const effectiveMaxRows = createMemo(() => {
    if (props.responsiveCollapse === false) return undefined;
    const ch = containerHeight();
    if (ch === 0) return undefined;
    return fitRows(ch, props.rowGap ?? 80, tallestNode());
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
      return {
        positions: new Map(),
        edges: [],
        totalWidth: 0,
        totalHeight: 0,
        summaries: [],
        rowOverflows: [],
        centerCol: props.centerCol ?? 0,
      };
    }
  });

  // Visible items: real nodes whose IDs appear in layout.positions, plus synthetic summary nodes.
  type Item = SwimlaneItem<T>;

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
      const newlyEntered = pluck(
        "id",
        filter((c) => !prevIds.has(c.id), current),
      );
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

  // Side-aware badge positions. STUB_LENGTH / BADGE_RADIUS (imported from
  // ./types) place the boundary badge OUTSIDE the outermost visible node on
  // its side at (anchorOuterX + dir·(STUB + BADGE_RADIUS)); edgeViews and
  // boundaryBadges both read from there so a visible→hidden edge terminates
  // exactly where the badge renders.

  // Boundary-badge positions + per-edge ports — pure geometry (see ./geometry).
  const sideBadgePositions = createMemo(() =>
    computeSideBadges(layout().positions, STUB_LENGTH, BADGE_RADIUS),
  );
  const portAssignments = createMemo(() =>
    computePortAssignments(layout().positions, layout().edges),
  );

  // Routed SVG path per visible edge — pure geometry (see ./geometry).
  const edgeViews = createMemo(() =>
    computeEdgeViews({
      positions: layout().positions,
      summaries: layout().summaries,
      edges: layout().edges,
      centerCol: props.centerCol ?? 0,
      isOrthogonal: (props.routingStyle ?? "orthogonal") === "orthogonal",
      badges: sideBadgePositions(),
      ports: portAssignments(),
      badgeRadius: BADGE_RADIUS,
    }),
  );

  // Mirror edgeViews into a keyed store so each <path> keeps its DOM
  // identity across re-renders and CSS transitions on `d` can fire.
  const [edgesStore, setEdgesStore] = createStore<EdgeView[]>([]);
  createEffect(() => {
    setEdgesStore(reconcile(edgeViews(), { key: "key" }));
  });

  // Boundary badges: one short stub + count circle per summary group.
  // Replaces the previous "summary node" boxes. Position is the outer
  // edge of the visible anchor in the direction of the collapsed nodes.
  // (STUB_LENGTH and BADGE_RADIUS are declared earlier alongside
  // sideBadgePositions so edgeViews can reuse them.)

  // Side "+N" boundary badges for collapsed columns — pure geometry (./geometry).
  const boundaryBadges = createMemo(() =>
    computeBoundaryBadges({
      positions: layout().positions,
      edges: layout().edges,
      summaries: layout().summaries,
      centerCol: props.centerCol ?? 0,
      containerWidth: containerWidth(),
      hPadding: H_PADDING_PX,
      badgeRadius: BADGE_RADIUS,
      stubLength: STUB_LENGTH,
      sideBadges: sideBadgePositions(),
    }),
  );

  // Keyed-store mirror so badge SVG elements (path, circle, text) retain
  // their identity and can CSS-transition their attribute values when
  // the simulation advances.
  const [badgesStore, setBadgesStore] = createStore<BoundaryBadge[]>([]);
  createEffect(() => {
    setBadgesStore(reconcile(boundaryBadges(), { key: "key" }));
  });

  // Bottom row-overflow placeholders: a "+N" pill beneath a column whose
  // nodes exceed the height cap (maxRows). Distinct from the side boundary
  // badges — those absorb HORIZONTAL/depth overflow, these show VERTICAL/
  // height overflow at the bottom of the affected column.
  type BottomBadge = SwimlaneBottomBadge;
  const bottomBadges = createMemo<BottomBadge[]>(() =>
    map(
      (o) => ({
        key: `rowoverflow|${o.column}`,
        x: o.x,
        y: o.bottomY + STUB_LENGTH + BADGE_RADIUS,
        count: o.count,
      }),
      layout().rowOverflows ?? [],
    ),
  );
  const [bottomBadgesStore, setBottomBadgesStore] = createStore<BottomBadge[]>(
    [],
  );
  createEffect(() => {
    setBottomBadgesStore(reconcile(bottomBadges(), { key: "key" }));
  });

  // Bounding box of all positioned content (real nodes + boundary badges).
  // Extra vertical padding inside the SVG view box so corridor edges
  // routed above the topmost row (or below the bottommost row) don't
  // get clipped at the chart's top/bottom edge. Matches the
  // orthogonal router's OBSTACLE_MARGIN (~32) plus a few px of slack.
  const EDGE_GUTTER = 40;
  // Content bounding box (nodes + badges) — pure geometry (see ./geometry).
  const viewBounds = createMemo(() =>
    computeViewBounds({
      positions: layout().positions,
      boundaryBadges: boundaryBadges(),
      bottomBadges: bottomBadges(),
      badgeRadius: BADGE_RADIUS,
      edgeGutter: EDGE_GUTTER,
    }),
  );

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
    <div ref={containerRef} class="sui-swimlane-container">
      <svg
        ref={svgRef}
        class="sui-swimlane"
        role="img"
        aria-label="Swimlane chart"
        onPointerDown={
          interactive() ? pointerHandlers.onPointerDown : undefined
        }
        onPointerMove={
          interactive() ? pointerHandlers.onPointerMove : undefined
        }
        onPointerUp={interactive() ? pointerHandlers.onPointerUp : undefined}
      >
        <defs>
          <DagArrowMarker
            id="sui-swimlane-arrow"
            pathClass="sui-swimlane__arrow"
          />
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
              the pill's midpoint. (Keyed store passed through so the
              extracted fragment runs its own <For>.) */}
          <SwimlaneBoundaryBadges
            badges={badgesStore}
            badgeRadius={BADGE_RADIUS}
          />

          {/* Bottom row-overflow placeholders — "+N" pill beneath a column
              whose node count exceeds the height cap. */}
          <SwimlaneBottomBadges
            badges={bottomBadgesStore}
            badgeRadius={BADGE_RADIUS}
          />

          {/* Nodes (real only — summaries become boundary badges).
              Newly-appeared items slide in from outside; leaving items
              keep their last position while sliding out. `isEntering` is
              passed as a function so the enter flag stays reactive to
              this component's enteringIds signal. */}
          <SwimlaneNodes
            items={itemsStore}
            isEntering={(id) => enteringIds().has(id)}
            onNodeClick={handleNodeClick}
            renderNode={props.renderNode}
          />
          <SwimlaneLeavingNodes
            leaving={leavingItems()}
            renderNode={props.renderNode}
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * Curried-variant factory for SwimlaneChart. Bakes layout/visual defaults
 * into a named component (per ADR-0001). Consumers import the named variant
 * (e.g. `LinearFlowSwimlaneChart`) and pass only data + render callbacks —
 * the variant's visual configuration cannot drift across consumer apps.
 */
export function createSwimlaneChart<T>(
  defaults: Partial<Pick<SwimlaneChartProps<T>, SwimlaneChartOverrides>>,
): (props: SwimlaneChartDataProps<T>) => JSX.Element {
  return (props) => (
    <SwimlaneChart
      {...(mergeProps(defaults, props) as SwimlaneChartProps<T>)}
    />
  );
}
