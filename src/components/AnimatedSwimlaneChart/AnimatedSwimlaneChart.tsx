/**
 * AnimatedSwimlaneChart — drop-in animated variant of `SwimlaneChart`.
 *
 * Public API is intentionally identical to `<SwimlaneChart>` so consumers
 * can swap the component name and nothing else (see the SwimlaneChartProps
 * re-export). The behavioural difference: when `nodes` changes reference,
 * cards animate between their previous and next positions using the
 * trajectory engine from `src/internal/animation/trajectories.ts` rather
 * than snapping into place.
 *
 * Rendering strategy:
 *   - At REST (no animation in flight, or initial render), this component
 *     delegates entirely to `<SwimlaneChart>`. That guarantees pixel-perfect
 *     parity with the non-animated variant: boundary badges, pan/zoom,
 *     summary collapsing — everything SwimlaneChart does, we do too.
 *   - During a TRANSITION, the chart renders its own SVG using the
 *     trajectory engine. Cards are positioned by `rectAt(t)`; arrows
 *     route between `anchorAt(t)` endpoints. The `renderNode` prop slot
 *     paints each card body — the animation system only controls geometry.
 *   - When `t` reaches 1 the component falls back to the delegated
 *     SwimlaneChart render, so the final DOM is exactly what SwimlaneChart
 *     would have produced for the new `nodes`/`edges`.
 *
 * The trajectory engine is internal; consumers don't see it.
 */
import {
  createMemo,
  createSignal,
  createEffect,
  on,
  onCleanup,
  For,
  Show,
  Match,
  Switch,
  mergeProps,
  type JSX,
} from "solid-js";
import type { DAGNode, DAGEdge, NodeRenderState } from "../DagChart/types";
import {
  SwimlaneChart,
  type SwimlaneChartProps,
} from "../SwimlaneChart/SwimlaneChart";
import { computeSwimlaneLayout } from "../SwimlaneChart/layout";
import {
  DagSvgNode,
  orthogonalAvoidingObstacles,
  type ObstacleRect,
} from "../../internal/dag-svg";
import {
  buildLaneTrajectoryFromSnapshots,
  dashednessAt,
  type CardTrajectory,
  type FramePosition,
  type FrameSnapshot,
  type LozengeRects,
  type Rect,
} from "../../internal/animation/trajectories";
import "../SwimlaneChart/SwimlaneChart.css";

// Re-export the SwimlaneChart prop types so this component is a true
// drop-in surface — consumers can import either name from the package
// root and the type aliases line up.
export type AnimatedSwimlaneChartProps<T> = SwimlaneChartProps<T>;

const DEFAULT_SIZE: [number, number] = [180, 60];

/**
 * Build a `FrameSnapshot` from a SwimlaneChart-style input. We piggy-back
 * on the canonical `computeSwimlaneLayout` so the resting positions exactly
 * match what `<SwimlaneChart>` produces — no risk of "the animated path
 * lands one pixel off-grid" drift.
 *
 * For hidden nodes (`|col| > maxDepth`) we record their col but no rect,
 * mirroring `snapshotFrame`'s contract: arrow endpoints can still resolve
 * to a lozenge anchor without needing a real position.
 */
function buildSnapshotFromLayout<T>(
  nodes: DAGNode<T>[],
  edges: DAGEdge[],
  opts: {
    swimlaneFor: (n: DAGNode<T>) => number;
    nodeSize: (n: DAGNode<T>) => [number, number];
    maxDepth: number;
    columnGap: number;
    rowGap: number;
    centerCol: number;
  },
): FrameSnapshot {
  const layout = computeSwimlaneLayout(nodes, edges, opts);
  const byId = new Map<string, FramePosition>();
  for (const n of nodes) {
    const col = opts.swimlaneFor(n);
    const pos = layout.positions.get(n.id);
    if (pos) {
      byId.set(n.id, {
        id: n.id,
        col,
        visible: true,
        isParent: false,
        rect: {
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
        },
      });
    } else {
      byId.set(n.id, {
        id: n.id,
        col,
        visible: false,
        isParent: false,
      });
    }
  }
  return { byId };
}

/**
 * Compute the lozenge rects for a given layout. The lozenges represent
 * "the bag of hidden nodes on each side"; trajectories use them as
 * anchors for slurp morphs. The rect is positioned just outside the
 * outermost visible column on each side, vertically centered on the
 * chart's content area.
 *
 * When a layout has no visible nodes on a side, the lozenge still needs
 * a coherent location — we fall back to a position one column-gap past
 * the chart's centre.
 */
function lozengeRectsFor(positions: ReadonlyMap<string, { x: number; y: number; width: number; height: number }>, columnGap: number): LozengeRects {
  let leftMinX = Infinity;
  let rightMaxX = -Infinity;
  let topY = Infinity;
  let bottomY = -Infinity;
  let nodeW = DEFAULT_SIZE[0];
  for (const [id, p] of positions) {
    if (id.startsWith("__collapsed_")) continue;
    if (p.x < leftMinX) leftMinX = p.x;
    if (p.x > rightMaxX) rightMaxX = p.x;
    if (p.y - p.height / 2 < topY) topY = p.y - p.height / 2;
    if (p.y + p.height / 2 > bottomY) bottomY = p.y + p.height / 2;
    nodeW = p.width;
  }
  if (leftMinX === Infinity) {
    leftMinX = -columnGap;
    rightMaxX = columnGap;
    topY = -30;
    bottomY = 30;
  }
  const cy = (topY + bottomY) / 2;
  const halfH = Math.max(40, (bottomY - topY) / 2);
  const LOZ_W = 16;
  const PAD = 32;
  return {
    left: {
      x: leftMinX - nodeW / 2 - PAD - LOZ_W / 2,
      y: cy,
      width: LOZ_W,
      height: halfH * 2,
    },
    right: {
      x: rightMaxX + nodeW / 2 + PAD + LOZ_W / 2,
      y: cy,
      width: LOZ_W,
      height: halfH * 2,
    },
  };
}

export function AnimatedSwimlaneChart<T>(
  props: AnimatedSwimlaneChartProps<T>,
): JSX.Element {
  // Animation state ───────────────────────────────────────────────────────
  // `prevNodes` is the data snapshot the chart was last "at rest" on.
  // When `props.nodes` changes reference, we build a trajectory from
  // prevNodes → nodes and tick `t` from 0 → 1 over the trajectory's
  // duration. Once t === 1 we drop back to the delegated SwimlaneChart
  // render — that yields full visual parity with the non-animated variant
  // at rest.
  const [prevNodes, setPrevNodes] = createSignal<DAGNode<T>[] | null>(null);
  const [prevEdges, setPrevEdges] = createSignal<DAGEdge[]>([]);
  const [currentT, setCurrentT] = createSignal(1);
  const [animating, setAnimating] = createSignal(false);

  const nodeSize = (node: DAGNode<T>): [number, number] =>
    props.nodeSize ? props.nodeSize(node) : DEFAULT_SIZE;
  const maxDepth = () => props.maxDepth ?? 2;
  const columnGap = () => props.columnGap ?? 260;
  const rowGap = () => props.rowGap ?? 80;
  const centerCol = () => props.centerCol ?? 0;

  // Trajectory rebuilds when nodes change. We only animate AFTER the
  // first render — initial mount goes straight to t=1 so the chart
  // appears in its rest state without a confusing "everything slurps
  // in" intro the consumer didn't ask for.
  let rafHandle: number | undefined;
  createEffect(
    on(
      () => props.nodes,
      (nextNodes, prev) => {
        // First render: no animation, just seed prev state.
        if (prev === undefined) {
          setPrevNodes(nextNodes);
          setPrevEdges(props.edges);
          setCurrentT(1);
          setAnimating(false);
          return;
        }
        // Same reference: nothing changed (Solid's reactive layer may
        // re-run on unrelated prop changes; bail to avoid an extra rAF).
        if (nextNodes === prev) return;

        // Start a fresh transition.
        if (rafHandle !== undefined) cancelAnimationFrame(rafHandle);
        setAnimating(true);
        setCurrentT(0);
        const start =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        const duration = traj()?.durationMs ?? 1650;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setCurrentT(t);
          if (t < 1) {
            rafHandle = requestAnimationFrame(tick);
          } else {
            rafHandle = undefined;
            // Settle: promote next → prev so the delegated SwimlaneChart
            // renders against the new data.
            setPrevNodes(nextNodes);
            setPrevEdges(props.edges);
            setAnimating(false);
          }
        };
        if (typeof requestAnimationFrame !== "undefined") {
          rafHandle = requestAnimationFrame(tick);
        } else {
          // jsdom / test envs without rAF: snap directly to rest.
          setCurrentT(1);
          setPrevNodes(nextNodes);
          setPrevEdges(props.edges);
          setAnimating(false);
        }
      },
    ),
  );

  onCleanup(() => {
    if (rafHandle !== undefined) cancelAnimationFrame(rafHandle);
  });

  // Trajectory + lozenges. Both recompute when prev or current data
  // changes; consumers don't see these — they're internal scaffolding
  // for the in-flight render path.
  const layoutOpts = () => ({
    swimlaneFor: props.swimlaneFor,
    nodeSize,
    maxDepth: maxDepth(),
    columnGap: columnGap(),
    rowGap: rowGap(),
    centerCol: centerCol(),
  });

  const prevSnapshot = createMemo(() => {
    const pn = prevNodes();
    if (!pn) return null;
    return buildSnapshotFromLayout(pn, prevEdges(), layoutOpts());
  });
  const nextSnapshot = createMemo(() =>
    buildSnapshotFromLayout(props.nodes, props.edges, layoutOpts()),
  );

  const lozenges = createMemo<LozengeRects>(() => {
    // Use the next layout's positions for lozenge placement — that's
    // where the chart is heading and where the static SwimlaneChart
    // would put its boundary badges.
    const layout = computeSwimlaneLayout(
      props.nodes,
      props.edges,
      layoutOpts(),
    );
    return lozengeRectsFor(layout.positions, columnGap());
  });

  const edgePairs = createMemo((): Array<[string, string]> => {
    const seen = new Set<string>();
    const out: Array<[string, string]> = [];
    const add = (s: string, t: string) => {
      const k = `${s}->${t}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push([s, t]);
    };
    for (const e of prevEdges()) add(e.source, e.target);
    for (const e of props.edges) add(e.source, e.target);
    return out;
  });

  const traj = createMemo(() => {
    const prev = prevSnapshot();
    const next = nextSnapshot();
    if (!prev) return null;
    return buildLaneTrajectoryFromSnapshots({
      prev,
      next,
      lozengeRects: lozenges(),
      edges: edgePairs(),
    });
  });

  // Bounding box for the animated SVG view — encompasses both prev and
  // next layouts so cards don't pop out at the edges mid-flight.
  const viewBounds = createMemo(() => {
    const t = traj();
    if (!t) return { x: 0, y: 0, width: 800, height: 400 };
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    const include = (r: Rect) => {
      minX = Math.min(minX, r.x - r.width / 2);
      maxX = Math.max(maxX, r.x + r.width / 2);
      minY = Math.min(minY, r.y - r.height / 2);
      maxY = Math.max(maxY, r.y + r.height / 2);
    };
    for (const card of t.cards.values()) {
      // Include rects at both t=0 and t=1 so the view box fits the full
      // animation span. anchorAt is always defined and gives a usable
      // bounding rect at the relevant endpoints.
      include(card.anchorAt(0));
      include(card.anchorAt(1));
    }
    include(lozenges().left);
    include(lozenges().right);
    if (minX === Infinity) return { x: 0, y: 0, width: 800, height: 400 };
    const PAD = 40;
    return {
      x: minX - PAD,
      y: minY - PAD,
      width: maxX - minX + 2 * PAD,
      height: maxY - minY + 2 * PAD,
    };
  });

  const handleNodeClick = (id: string) => {
    props.onNodeClick?.(id);
  };

  // While ANIMATING, render the trajectory-driven SVG ourselves. At
  // REST, delegate to <SwimlaneChart> for full feature parity (boundary
  // badges, pan/zoom, etc.).
  const renderAnimating = (): JSX.Element => {
    const t = traj();
    if (!t) return null;
    const tNow = currentT();
    const bounds = viewBounds();

    // Static obstacle list for arrow routing: visible non-morph cards
    // at the current t. Recomputed on every t tick (cheap; small N).
    const obstaclesAt = (
      exceptFrom: string,
      exceptTo: string,
    ): ObstacleRect[] => {
      const out: ObstacleRect[] = [];
      for (const [id, card] of t.cards) {
        if (id === exceptFrom || id === exceptTo) continue;
        if (card.modeAt(tNow) !== "card") continue;
        const r = card.rectAt(tNow);
        if (!r) continue;
        out.push({ id, x: r.x, y: r.y, width: r.width, height: r.height });
      }
      return out;
    };

    return (
      <div style={{ width: "100%", height: "100%" }}>
        <svg
          class="sui-swimlane"
          viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Arrows FIRST — drawn behind cards so opaque card backgrounds
              cleanly hide any routed lines passing behind them. */}
          <For each={t.arrows}>
            {(arrow) => {
              const fromCard = (): CardTrajectory | undefined =>
                t.cards.get(arrow.fromId);
              const toCard = (): CardTrajectory | undefined =>
                t.cards.get(arrow.toId);
              const bothHidden = () =>
                fromCard()?.modeAt(tNow) === "gone" &&
                toCard()?.modeAt(tNow) === "gone";
              const src = () => fromCard()?.anchorAt(tNow);
              const tgt = () => toCard()?.anchorAt(tNow);
              const dashedness = () => dashednessAt(arrow, t.cards, tNow);
              const dashArray = () => {
                const d = dashedness();
                if (d <= 0.001) return undefined;
                return `4 ${(d * 3).toFixed(2)}`;
              };
              return (
                <Show when={!bothHidden() && src() && tgt()}>
                  <path
                    class={`sui-swimlane__edge${
                      dashedness() > 0.001
                        ? " sui-swimlane__edge--summary"
                        : ""
                    }`}
                    d={orthogonalAvoidingObstacles(
                      src()!,
                      tgt()!,
                      obstaclesAt(arrow.fromId, arrow.toId),
                    )}
                    stroke-dasharray={dashArray()}
                  />
                </Show>
              );
            }}
          </For>

          {/* Cards — painted on TOP of arrows. modeAt(t) controls
              whether we draw the rect (card slot via renderNode), a
              slurp morph path, or nothing. The renderNode prop drives
              card body content; the animation only controls geometry. */}
          <For each={Array.from(t.cards.keys())}>
            {(id) => {
              const card = (): CardTrajectory | undefined => t.cards.get(id);
              const mode = () => card()?.modeAt(tNow) ?? "gone";
              const rect = () => card()?.rectAt(tNow) ?? null;
              // Find the data node — prefer the current nodes, fall back
              // to prev for cards that are leaving.
              const dataNode = (): DAGNode<T> | undefined => {
                return (
                  props.nodes.find((n) => n.id === id) ||
                  prevNodes()?.find((n) => n.id === id)
                );
              };
              return (
                <Switch>
                  <Match when={mode() === "card" && rect() && dataNode()}>
                    <DagSvgNode
                      node={dataNode()!}
                      state={{ kind: "normal" } as NodeRenderState}
                      x={rect()!.x}
                      y={rect()!.y}
                      width={rect()!.width}
                      height={rect()!.height}
                      wrapperClass="sui-swimlane__node-wrapper"
                      onClick={handleNodeClick}
                      renderNode={props.renderNode}
                    />
                  </Match>
                  <Match when={mode() === "morph" && card()?.pathAt(tNow)}>
                    <path
                      d={card()!.pathAt(tNow)!}
                      fill="var(--sui-bg, #16202a)"
                      stroke="var(--sui-border, rgba(255,255,255,0.45))"
                      stroke-width="1"
                    />
                  </Match>
                </Switch>
              );
            }}
          </For>
        </svg>
      </div>
    );
  };

  return (
    <Show when={animating()} fallback={<SwimlaneChart {...props} />}>
      {renderAnimating()}
    </Show>
  );
}

/** Props that are visual/layout overrides — locked at variant-definition
 *  time. Matches `SwimlaneChartOverrides` exactly so a curried
 *  AnimatedSwimlaneChart variant freezes the same knobs. */
export type AnimatedSwimlaneChartOverrides =
  | "maxDepth"
  | "columnGap"
  | "rowGap"
  | "nodeSize"
  | "arrows"
  | "interactive"
  | "centerCol"
  | "responsiveCollapse";

/** Props that remain available to consumers of a curried variant. */
export type AnimatedSwimlaneChartDataProps<T> = Omit<
  AnimatedSwimlaneChartProps<T>,
  AnimatedSwimlaneChartOverrides
>;

/** Curried-variant factory mirroring `createSwimlaneChart`. */
export function createAnimatedSwimlaneChart<T>(
  defaults: Partial<
    Pick<AnimatedSwimlaneChartProps<T>, AnimatedSwimlaneChartOverrides>
  >,
): (props: AnimatedSwimlaneChartDataProps<T>) => JSX.Element {
  return (props) => (
    <AnimatedSwimlaneChart
      {...(mergeProps(defaults, props) as AnimatedSwimlaneChartProps<T>)}
    />
  );
}
