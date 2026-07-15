// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// SwimlaneAnimatedLane — Structural (Depth 1). SVG lane renderer; composes no library components.
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
  /** Rows the lane is sized for. Owned by the chart (it lags shrinks behind
   *  the card move), so the rect/lozenge resize in lockstep with laneY. */
  rowCount: number;
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

  // Shrinkwrap height is owned by the chart (props.rowCount): it grows
  // immediately but lags shrinks until the card has finished moving, so the
  // lane never snaps smaller mid-move.
  const visibleRows = () => props.rowCount;
  const childRowH = () =>
    visibleRows() > 0
      ? visibleRows() * props.cardHeight + (visibleRows() - 1) * props.rowGap
      : 0;
  const parentRowH = () =>
    hasParent() ? props.cardHeight + props.parentGap : 0;
  const laneHeight = () => props.lanePadding * 2 + parentRowH() + childRowH();

  // Internal coordinates are lane-relative (origin at the lane's own top).
  // The lane's absolute vertical position comes from a CSS-transitioned
  // group transform (translateY(props.laneY)) below, so the whole lane
  // *slides* when it's re-sorted into a new status band — without rebuilding
  // the card trajectory (which is laneY-independent).
  const parentRowCenterY = () => props.lanePadding + props.cardHeight / 2;
  const childRowCenterY = () =>
    props.lanePadding + parentRowH() + childRowH() / 2;
  // Center Y of the first (top) child row — children stack downward from here.
  const childStackTopY = () =>
    props.lanePadding + parentRowH() + props.cardHeight / 2;
  const colTopY = () => childRowCenterY() - childRowH() / 2;
  const colBottomY = () => childRowCenterY() + childRowH() / 2;
  const lozMidY = () => childRowCenterY();
  const leftLozengeX = () =>
    centerX() -
    props.maxDepth * colCenterGap() -
    cardW() / 2 -
    lozGap() -
    lozW();
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
    childStackTopY: childStackTopY(),
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
  let prevRowsRef = props.rowCount;
  let rafHandle: number | undefined;

  createEffect(() => {
    const incoming = props.nodes;
    const sw = props.stageWidth;
    const md = props.maxDepth;
    const cfg = props.layoutConfig;
    const timing = props.timing;
    const rows = props.rowCount;
    const nodesChanged = incoming !== prevFrameRef;
    const widthChanged = sw !== prevWidthRef;
    const depthChanged = md !== prevMaxDepthRef;
    const configChanged = cfg !== prevConfigRef;
    const timingChanged = timing !== prevTimingRef;
    const otherLayoutChanged =
      widthChanged || depthChanged || configChanged || timingChanged;
    // A row SHRINK pulls the lozenge rects up, so the trajectory's baked
    // lozenge anchors must be rebuilt or arrows keep pointing at the lozenge's
    // old (taller) position — exactly the "leftover arrow" stranded below the
    // lane. Shrinks fire at rest via the resize debounce, so a static rebuild
    // is safe. A row GROW rides along with a card move (handled by
    // nodesChanged) and only makes the lane taller, so it needs no separate
    // rebuild — and skipping it avoids snapping the in-flight animation.
    const rowsShrank = rows < prevRowsRef;
    if (!nodesChanged && !otherLayoutChanged && rows === prevRowsRef) return;
    if (!nodesChanged && !otherLayoutChanged && !rowsShrank) {
      prevRowsRef = rows; // grow only — nothing to re-anchor
      return;
    }
    const layoutOnly = !nodesChanged && (otherLayoutChanged || rowsShrank);
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
    prevRowsRef = rows;
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
    <g
      style={{
        transform: `translateY(${props.laneY}px)`,
        transition: `transform ${props.timing.laneSlideMs ?? 420}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
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
        y={0}
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
          const fromCard = (): CardTrajectory | undefined =>
            traj().cards.get(arrow.fromId);
          const toCard = (): CardTrajectory | undefined =>
            traj().cards.get(arrow.toId);
          const bothHidden = () =>
            fromCard()?.modeAt(currentT()) === "gone" &&
            toCard()?.modeAt(currentT()) === "gone";
          const src = () => fromCard()?.anchorAt(currentT());
          const tgt = () => toCard()?.anchorAt(currentT());
          const dashedness = () =>
            dashednessAt(arrow, traj().cards, currentT());
          const dashArray = () => {
            const d = dashedness();
            if (d <= 0.001) return undefined;
            return `4 ${(d * 3).toFixed(2)}`;
          };
          const stroke = () => (dashedness() < 0.5 ? accentStroke : greyStroke);
          const obstacles = () => {
            const list: Array<
              { id: string } & ReturnType<NonNullable<CardTrajectory["rectAt"]>>
            > = [];
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
              const fromOuterX = goingRight
                ? s.x + s.width / 2
                : s.x - s.width / 2;
              const toOuterX = goingRight
                ? tg.x - tg.width / 2
                : tg.x + tg.width / 2;
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
              ? {
                  id,
                  title: props.spec.parentTitle!,
                  subtitle: props.spec.parentSubtitle,
                  status: status(),
                }
              : undefined);
          return (
            <Switch>
              <Match when={mode() === "card" && rect() && node()}>
                {/* biome-ignore lint/a11y/useSemanticElements: native <button> is not valid inside SVG; role="button" on <foreignObject> is the correct affordance */}
                <foreignObject
                  x={rect()!.x - cardW() / 2}
                  y={rect()!.y - props.cardHeight / 2}
                  width={cardW()}
                  height={props.cardHeight}
                  role="button"
                  tabIndex={0}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      props.onCardClick?.(id);
                    }
                  }}
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
