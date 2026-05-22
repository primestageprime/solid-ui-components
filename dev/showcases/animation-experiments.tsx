/**
 * Animation experiments. Each experiment is a small isolated demo
 * exercising one effect, named so we can refer to it later. The pattern:
 *
 *   1. Pick a primitive (birth grow, genie extrude, turtle edge draw, …)
 *   2. Build it in CSS first; once it feels right we can A/B against
 *      a Motion One version of the same trigger.
 *   3. Compose primitives into the final SwimlaneChart animation pipeline.
 *
 * Add new experiments by appending to EXPERIMENTS — they render in a
 * 2-column grid below the description.
 */
import { Component, createSignal, createEffect, For, JSX, onMount, Show } from "solid-js";
import { orthogonalAvoidingObstacles } from "../../src/internal/dag-svg";
import type { StatusFlowNode } from "../../src/components/StatusFlowChart";
import { resolveParentStatuses } from "../../src/components/StatusFlowChart";
import {
  computeColFor as computeColForLib,
  advanceChildren as advanceChildrenLib,
  promoteReady,
  isAllDone,
} from "./workshop-layout";

interface Experiment {
  /** Short slug, used in the heading and as a stable id. */
  id: string;
  /** Full human-readable label. */
  label: string;
  /** One-sentence summary of what we're trying to see. */
  description: string;
  /** The demo itself. */
  Demo: Component;
}

// ─── genie geometry ─────────────────────────────────────────────────────────
//
// Layout inside the demo's SVG. Coordinates are SVG units (1:1 to CSS px).
//
// Lozenge sits at the left, narrow and tall (1rem ≈ 16px tall to match the
// "starting height" of the genie). The node's final rest position sits to
// the right with a small gap. During the animation the node OVERLAPS the
// lozenge — its trailing edge anchors INSIDE the lozenge at all times until
// the very last beat when it slides to its final offset position.
const STAGE_W = 320;
const STAGE_H = 110;
const LOZENGE_X = 20; // left x of lozenge
const LOZENGE_W = 16;
const LOZENGE_H = 60;
const LOZENGE_CY = STAGE_H / 2;
const NODE_W = 140;
// Bumped so the shared 4-line TaskCard fits inside the path's rest
// silhouette (line1 + 2-line title + line4 + padding = 68 min).
const NODE_H = 84;
const NODE_FINAL_LEFT_X = LOZENGE_X + LOZENGE_W + 32; // gap between lozenge and node at rest
const NODE_REST_TRAILING_HEIGHT = NODE_H; // settled height of the trailing edge

// Build the genie path at parameter t ∈ [0, 1].
//
// Width invariant: the rect's width (leadingX − trailingX) is ALWAYS ≤
// NODE_W. The leading edge sweeps out from the lozenge first; once the
// projected width would exceed NODE_W the trailing edge starts moving
// forward in lock-step so the width caps at NODE_W. This means the
// trailing edge automatically reaches its rest column at the same t
// where the leading edge does (t = 0.55 = 495 ms with the 900 ms total),
// and the trailing height continues to fill to full size until t = 0.88
// (≈ 790 ms) — leaving ~300 ms between "settled in column" and "filled
// to full height," as requested.
//
//   leadingX  0.00 → 0.55  (0   – 495 ms)  — front sweeps out
//   leadingH  0.00 → 0.55  (0   – 495 ms)  — front grows to full height
//   trailingX  derived       — follows leadingX once width hits NODE_W
//   trailingH 0.40 → 0.88  (360 – 790 ms)  — fills last, ~300 ms after
//                                            the position lands
const GENIE_SLIT_HEIGHT = 16; // 1rem

function windowProgress(t: number, start: number, end: number): number {
  if (t <= start) return 0;
  if (t >= end) return 1;
  return (t - start) / (end - start);
}

// slurp-out: node emerges from the lozenge (t=0 → t=1)
function slurpOutGeometry(t: number): {
  leadingX: number;
  leadingH: number;
  trailingX: number;
  trailingH: number;
} {
  const clamp = Math.max(0, Math.min(1, t));
  const lozengeRightX = LOZENGE_X + LOZENGE_W;
  const leadingX0 = lozengeRightX;
  const leadingX1 = NODE_FINAL_LEFT_X + NODE_W;
  const leadingX = lerp(leadingX0, leadingX1, ease(windowProgress(clamp, 0.0, 0.55)));
  const trailingX = Math.max(lozengeRightX, leadingX - NODE_W);
  return {
    leadingX,
    leadingH: lerp(GENIE_SLIT_HEIGHT, NODE_H, ease(windowProgress(clamp, 0.0, 0.55))),
    trailingX,
    trailingH: lerp(GENIE_SLIT_HEIGHT, NODE_H, ease(windowProgress(clamp, 0.4, 0.88))),
  };
}

// slurp-in: node retreats into the lozenge — slurp-out played backwards.
function slurpInGeometry(t: number) {
  return slurpOutGeometry(1 - t);
}

// Mirror an X coordinate around the stage's vertical center so we can
// reuse the LTR geometry for a right-to-left stage.
function mirrorX(x: number): number {
  return STAGE_W - x;
}

function mirrorGeometry(g: ReturnType<typeof slurpOutGeometry>) {
  // After mirroring, leading and trailing swap their roles: the leading
  // edge is now the SMALLER X (further left). So we mirror both X
  // values; the path builder uses min/max where it needs to.
  return {
    leadingX: mirrorX(g.leadingX),
    leadingH: g.leadingH,
    trailingX: mirrorX(g.trailingX),
    trailingH: g.trailingH,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function ease(t: number): number {
  // Cubic ease-out: leading edge moves fast, settles slow.
  return 1 - Math.pow(1 - t, 3);
}

function geometryToPath(g: {
  leadingX: number;
  leadingH: number;
  trailingX: number;
  trailingH: number;
}): string {
  const cy = LOZENGE_CY;
  const lTop = cy - g.leadingH / 2;
  const lBot = cy + g.leadingH / 2;
  const tTop = cy - g.trailingH / 2;
  const tBot = cy + g.trailingH / 2;
  // Cubic bezier connecting trailing→leading. Control points ride along
  // each edge's mid-x to give the trumpet flare its smooth taper.
  const c1x = lerp(g.trailingX, g.leadingX, 0.5);
  return [
    `M ${g.trailingX} ${tTop}`,
    `C ${c1x} ${tTop}, ${c1x} ${lTop}, ${g.leadingX} ${lTop}`,
    `L ${g.leadingX} ${lBot}`,
    `C ${c1x} ${lBot}, ${c1x} ${tBot}, ${g.trailingX} ${tBot}`,
    "Z",
  ].join(" ");
}

// ─── task data + theming ───────────────────────────────────────────────────
//
// Sample task graph drawn from the children's song "There's a hole in the
// bucket" — a real-feeling cyclic dependency chain that mirrors the shape
// of a SwimlaneDAG dataset. Each panel below renders ONE of these as the
// emerging / source node so the animations exercise varied titles and
// owners rather than the same placeholder.
//
//   fix-bucket ←── mend-hole ←── cut-straw ←── sharpen-axe ←── wet-stone ←── fetch-water
//                                                                          (cycles back)
interface TaskData {
  id: string;
  owner: string;
  status: "TODO" | "DOING" | "DONE";
  title: string;
  est: string;
  actual: string;
}

const TASKS: Record<string, TaskData> = {
  fixBucket: {
    id: "fix-bucket",
    owner: "henry",
    status: "DOING",
    title: "Fix the hole in the bucket — water keeps leaking out before we can use it",
    est: "2h",
    actual: "1h 12m",
  },
  mendHole: {
    id: "mend-hole",
    owner: "henry",
    status: "TODO",
    title: "Mend the hole in the bucket with straw — dear Liza said straw should hold",
    est: "45m",
    actual: "—",
  },
  cutStraw: {
    id: "cut-straw",
    owner: "henry",
    status: "TODO",
    title: "Cut the straw down to the right length with the axe before we can mend",
    est: "20m",
    actual: "—",
  },
  sharpenAxe: {
    id: "sharpen-axe",
    owner: "henry",
    status: "TODO",
    title: "Sharpen the dull axe with the stone — the blade is too blunt to cut",
    est: "15m",
    actual: "—",
  },
  wetStone: {
    id: "wet-stone",
    owner: "henry",
    status: "TODO",
    title: "Wet the stone with water from the well so it can sharpen the axe",
    est: "5m",
    actual: "—",
  },
  fetchWater: {
    id: "fetch-water",
    owner: "liza",
    status: "TODO",
    title: "Fetch some water from the well in the bucket… wait, the bucket has a hole",
    est: "10m",
    actual: "—",
  },
};

// Status-keyed palette so cards (and source labels) look right whether
// rendered for a DOING/TODO/DONE node. Tracks the SwimlaneChart's
// existing convention: TODO grey, DOING cyan, DONE green.
function statusTheme(status: TaskData["status"]) {
  switch (status) {
    case "DOING":
      return {
        stroke: "var(--sui-accent, #00d4ff)",
        fill: "rgba(0,212,255,0.10)",
        text: "var(--sui-accent, #00d4ff)",
      };
    case "DONE":
      return {
        stroke: "rgba(95,179,124,0.6)",
        fill: "rgba(95,179,124,0.10)",
        text: "rgba(95,179,124,0.85)",
      };
    case "TODO":
    default:
      return {
        stroke: "rgba(255,255,255,0.45)",
        fill: "rgba(255,255,255,0.04)",
        text: "rgba(255,255,255,0.7)",
      };
  }
}

const CARD_FADE_MS = 300;

function TaskCard(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  task: TaskData;
  /**
   * When provided, TaskCard surrenders popover rendering to the
   * caller — the popover is reported via callback instead of
   * being drawn inline. Use this in dense chart views where SVG
   * foreignObject paint order would otherwise hide the popover
   * behind later-painted cards.
   */
  onHoverChange?: (hovered: boolean) => void;
}): JSX.Element {
  const [hovered, setHovered] = createSignal(false);
  const theme = () => statusTheme(props.task.status);
  const liftedPopover = !!props.onHoverChange;
  const setHover = (h: boolean) => {
    setHovered(h);
    props.onHoverChange?.(h);
  };
  return (
    <foreignObject
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      overflow="visible"
      // Smooth transitions when reactive x/y change between layout
      // recomputes (e.g. a child moves col as its status flips).
      style={{ transition: "x 0.45s ease-out, y 0.45s ease-out" }}
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        onPointerEnter={() => props.visible && setHover(true)}
        onPointerLeave={() => setHover(false)}
        style={{
          position: "relative",
          width: `${props.width}px`,
          height: `${props.height}px`,
          padding: "6px 10px",
          "box-sizing": "border-box",
          display: "flex",
          "flex-direction": "column",
          background: theme().fill,
          border: `1px solid ${theme().stroke}`,
          "border-radius": "6px",
          "font-family": "ui-monospace, SFMono-Regular, monospace",
          color: "var(--sui-text, #e6ecf5)",
          cursor: props.visible ? "pointer" : "default",
          opacity: props.visible ? 1 : 0,
          "pointer-events": props.visible ? "auto" : "none",
          transition: `opacity ${CARD_FADE_MS}ms ease-out`,
        }}
      >
        <div
          style={{
            display: "flex",
            "justify-content": "space-between",
            "align-items": "baseline",
            "font-size": "10px",
            color: "rgba(255,255,255,0.55)",
            "line-height": "14px",
          }}
        >
          <span>{props.task.owner}</span>
          <span
            style={{
              "font-weight": 600,
              "letter-spacing": "0.06em",
              color: theme().text,
            }}
          >
            {props.task.status}
          </span>
        </div>
        <div
          style={{
            "font-size": "11px",
            "font-weight": 600,
            "line-height": "14px",
            height: "28px",
            display: "-webkit-box",
            "-webkit-line-clamp": "2",
            "-webkit-box-orient": "vertical",
            overflow: "hidden",
          }}
        >
          {props.task.title}
        </div>
        <div
          style={{
            display: "flex",
            "justify-content": "space-between",
            "align-items": "baseline",
            "font-size": "10px",
            color: "rgba(255,255,255,0.55)",
            "line-height": "14px",
          }}
        >
          <span>est {props.task.est}</span>
          <span style={{ color: theme().text }}>{props.task.actual}</span>
        </div>
        <Show when={hovered() && !liftedPopover}>
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: "0",
              width: "260px",
              padding: "8px 10px",
              // Solid background so the popover doesn't bleed through
              // to the cards stacked behind it.
              background: "#0c141c",
              border: "1px solid rgba(255,255,255,0.28)",
              "border-radius": "4px",
              "font-size": "11px",
              "line-height": "1.4",
              color: "var(--sui-text, #e6ecf5)",
              "box-shadow": "0 4px 12px rgba(0,0,0,0.4)",
              "pointer-events": "none",
              "z-index": 10,
              "white-space": "normal",
            }}
          >
            <div style={{ "font-weight": 600, "margin-bottom": "2px" }}>
              {props.task.title}
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)" }}>
              {props.task.owner} · {props.task.status} · est {props.task.est} · {props.task.actual}
            </div>
          </div>
        </Show>
      </div>
    </foreignObject>
  );
}

// ─── shared genie-stage scaffold ────────────────────────────────────────────
interface SlurpStageProps {
  /** "ltr" puts the lozenge on the LEFT; "rtl" mirrors to the right. */
  direction: "ltr" | "rtl";
  /** "out" emerges from the lozenge; "in" retreats into it. */
  phase: "out" | "in";
  /** Task content rendered in the card at rest. */
  task: TaskData;
}

function pathForFrame(t: number, props: SlurpStageProps): string {
  const base = props.phase === "out" ? slurpOutGeometry(t) : slurpInGeometry(t);
  const g = props.direction === "ltr" ? base : mirrorGeometry(base);
  return geometryToPath(g);
}

function SlurpStage(props: SlurpStageProps): JSX.Element {
  // implementation begins; overflow on the SVG is set below so the
  // TaskCard's hover popover can render outside the stage bbox.
  let pathRef: SVGPathElement | undefined;
  let raf: number | undefined;
  const lozengeX = props.direction === "ltr" ? LOZENGE_X : STAGE_W - LOZENGE_X - LOZENGE_W;
  // Pre-animation state is always t=0.
  const startT = 0;
  // Slurp-out starts with no card (the node hasn't arrived). Slurp-in
  // starts with the card visible (the node is sitting at rest).
  const [showCard, setShowCard] = createSignal(props.phase === "in");
  const geom = (t: number) => {
    const base = props.phase === "out" ? slurpOutGeometry(t) : slurpInGeometry(t);
    return props.direction === "ltr" ? base : mirrorGeometry(base);
  };
  // Where the TaskCard sits at rest, in stage coordinates.
  const cardX = props.direction === "ltr"
    ? NODE_FINAL_LEFT_X
    : STAGE_W - NODE_FINAL_LEFT_X - NODE_W;
  const cardY = LOZENGE_CY - NODE_H / 2;
  const reset = () => {
    if (raf !== undefined) {
      cancelAnimationFrame(raf);
      raf = undefined;
    }
    setShowCard(props.phase === "in");
    if (!pathRef) return;
    pathRef.setAttribute("d", pathForFrame(startT, props));
    pathRef.style.visibility = props.phase === "out" ? "hidden" : "visible";
  };
  return (
    <div style={demoBoxStyle}>
      <svg
        width={STAGE_W}
        height={STAGE_H}
        viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
        // overflow:visible so the TaskCard's hover popover (positioned
        // above the card) renders outside the SVG's bbox.
        style={{ display: "block", margin: "0 auto", overflow: "visible" }}
      >
        <rect
          x={lozengeX}
          y={LOZENGE_CY - LOZENGE_H / 2}
          width={LOZENGE_W}
          height={LOZENGE_H}
          rx={LOZENGE_W / 2}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.4)"
          stroke-width="1"
        />
        <text
          x={lozengeX + LOZENGE_W / 2}
          y={LOZENGE_CY}
          text-anchor="middle"
          dominant-baseline="central"
          fill="rgba(255,255,255,0.55)"
          font-size="9"
          font-family="ui-monospace, SFMono-Regular, monospace"
        >
          3
        </text>
        <path
          ref={(el) => (pathRef = el)}
          d={pathForFrame(startT, props)}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.45)"
          stroke-width="1"
          style={{ visibility: props.phase === "out" ? "hidden" : "visible" }}
        />
        <TaskCard
          x={cardX}
          y={cardY}
          width={NODE_W}
          height={NODE_H}
          visible={showCard()}
          task={props.task}
        />
      </svg>
      <div style={buttonRowStyle}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => {
            if (!pathRef) return;
            // Sequence:
            //   slurp-out: morph path → at t=1, fade card IN.
            //   slurp-in : fade card OUT (CARD_FADE_MS) → then morph
            //              path → at t=1, hide path.
            const runMorph = (onDone: () => void) => {
              pathRef!.style.visibility = "visible";
              const start = performance.now();
              const tick = (now: number) => {
                const t = Math.min(1, (now - start) / SLURP_DURATION_MS);
                pathRef!.setAttribute("d", geometryToPath(geom(t)));
                if (t < 1) {
                  raf = requestAnimationFrame(tick);
                } else {
                  raf = undefined;
                  onDone();
                }
              };
              raf = requestAnimationFrame(tick);
            };
            if (props.phase === "out") {
              setShowCard(false);
              runMorph(() => {
                setShowCard(true);
                // Hide the path silhouette so its border doesn't
                // double-up with the card's own border at rest.
                pathRef!.style.visibility = "hidden";
              });
            } else {
              setShowCard(false); // triggers CSS fade-out
              setTimeout(() => {
                runMorph(() => {
                  pathRef!.style.visibility = "hidden";
                });
              }, CARD_FADE_MS);
            }
          }}
        >
          ▶ play
        </button>
        <button type="button" style={buttonStyle} onClick={reset}>
          ↺ reset
        </button>
      </div>
    </div>
  );
}

const SLURP_DURATION_MS = 900;

// ─── slurp-with-dep: arrow tracks the leading edge of a fulfilling node ─────
//
// An existing source node sits on the left with a dangling dependency on
// a hidden node summarized in a right-side lozenge. On play:
//   1. The new (dependent) node slurp-outs of the lozenge, extruding
//      leftward.
//   2. Simultaneously a dependency arrow grows from the source node's
//      right edge, tracking the new node's leading (left) edge. So the
//      arrow appears to "drag" the new node into view.
// At rest the arrow connects source.right → new.left at the same gap a
// regular SwimlaneChart edge would.
// Source and emerging share NODE_W/CARD geometry — they're the same
// kind of task, just one's already in the chart and the other is
// fulfilling its dependency.
const DEP_STAGE_W = 520;
const DEP_STAGE_H = 130;
const DEP_SOURCE_X = 20;
const DEP_SOURCE_W = NODE_W;
const DEP_SOURCE_H = 84;
const DEP_NODE_REST_LEFT_X = DEP_SOURCE_X + DEP_SOURCE_W + 60; // arrow run
const DEP_NODE_REST_RIGHT_X = DEP_NODE_REST_LEFT_X + NODE_W;
// Dedicated height for the dep card so we can fit 4 lines of content
// (14px each + 6px top/bottom padding = 68px min). The slurp-out
// geometry still anchors to NODE_H for the lozenge slit math; we let
// the card body grow taller around it.
const DEP_NODE_H = 84;
// "Container" (chart viewport) dimensions. Initially the viewport is
// too narrow to fit the new node — source sits at the left, lozenge
// presses up against it on the right, dashed arrow between. Play
// widens the container; once it crosses DEP_CONTAINER_THRESHOLD the
// slurp-out kicks off.
const DEP_CONTAINER_X = 10;
const DEP_CONTAINER_Y = 10;
const DEP_CONTAINER_INNER_PAD = 10;
const DEP_CONTAINER_FULL_W = DEP_STAGE_W - DEP_CONTAINER_X - 10;
const DEP_CONTAINER_NARROW_W =
  DEP_SOURCE_W + 60 + LOZENGE_W + DEP_CONTAINER_INNER_PAD * 2;
// Once the container is wide enough that the new node fits between
// source and lozenge (with rest gaps on both sides), slurp can begin.
const DEP_CONTAINER_THRESHOLD =
  DEP_SOURCE_W + 60 + NODE_W + 32 + LOZENGE_W + DEP_CONTAINER_INNER_PAD * 2;
const DEP_WIDEN_DURATION_MS = 700;
const lozengeXFor = (containerW: number) =>
  DEP_CONTAINER_X + containerW - DEP_CONTAINER_INNER_PAD - LOZENGE_W;

// Reuse slurp-out geometry, but anchored to THIS stage's lozenge / rest
// positions and mirrored RTL so the new node extrudes leftward.
function slurpDepGeometry(t: number): {
  leadingX: number;
  leadingH: number;
  trailingX: number;
  trailingH: number;
} {
  const clamp = Math.max(0, Math.min(1, t));
  // Slurp runs AFTER the container widens to full, so the lozenge sits
  // at its full-width rest position.
  const lozengeLeftX = lozengeXFor(DEP_CONTAINER_FULL_W);
  // For RTL: leading edge starts at lozenge's left edge and moves further LEFT.
  const leadingX0 = lozengeLeftX;
  const leadingX1 = DEP_NODE_REST_LEFT_X;
  const trailingX0 = lozengeLeftX;
  const trailingX1 = DEP_NODE_REST_RIGHT_X;
  const leadingX = lerp(leadingX0, leadingX1, ease(windowProgress(clamp, 0.0, 0.55)));
  // Width-cap: keep |trailingX − leadingX| ≤ NODE_W.
  const trailingX = Math.min(trailingX0, leadingX + NODE_W);
  return {
    leadingX,
    leadingH: lerp(GENIE_SLIT_HEIGHT, DEP_NODE_H, ease(windowProgress(clamp, 0.0, 0.55))),
    trailingX,
    trailingH: lerp(GENIE_SLIT_HEIGHT, DEP_NODE_H, ease(windowProgress(clamp, 0.4, 0.88))),
  };
  void trailingX1;
}

// Sequencing: the lozenge comes to rest, then we wait DEP_SETTLE_MS
// of "not moving" before the slurp kicks off — just a tick to confirm
// the resize has stopped.
const DEP_SETTLE_MS = 50;

const SlurpDep: Component = () => {
  let pathRef: SVGPathElement | undefined;
  let arrowRef: SVGLineElement | undefined;
  let raf: number | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  const [showCard, setShowCard] = createSignal(false);
  // Container width drives the lozenge's x position. Starts narrow
  // (no room for the new node) and widens on play. Slurp begins once
  // the container clears the threshold = source + arrow run + node +
  // gap + lozenge.
  const [containerWidth, setContainerWidth] = createSignal(DEP_CONTAINER_NARROW_W);
  const lozengeX = () => lozengeXFor(containerWidth());
  const sourceRightX = DEP_SOURCE_X + DEP_SOURCE_W;
  const cy = DEP_STAGE_H / 2;

  const runSlurp = () => {
    if (!pathRef || !arrowRef) return;
    pathRef.style.visibility = "visible";
    // The dashes "fill in" via WAAPI: tween dasharray gap 3 → 0.
    arrowRef.animate(
      [{ strokeDasharray: "4 3" }, { strokeDasharray: "4 0" }],
      { duration: 280, easing: "ease-out", fill: "forwards" },
    );
    setShowCard(false);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SLURP_DURATION_MS);
      const g = slurpDepGeometry(t);
      pathRef!.setAttribute("d", geometryToPath(g));
      arrowRef!.setAttribute("x2", String(g.leadingX));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = undefined;
        setShowCard(true);
        // Hide the path silhouette so its border doesn't double-up
        // with the card's own border at rest.
        pathRef!.style.visibility = "hidden";
      }
    };
    raf = requestAnimationFrame(tick);
  };

  const runWiden = () => {
    // Animate container width from narrow → full, then settle for a
    // full second before triggering slurp. The lozenge slides outward
    // with the container's right edge while the dashed arrow stretches
    // to follow.
    const startW = DEP_CONTAINER_NARROW_W;
    const endW = DEP_CONTAINER_FULL_W;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DEP_WIDEN_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const w = lerp(startW, endW, eased);
      setContainerWidth(w);
      if (arrowRef) arrowRef.setAttribute("x2", String(lozengeXFor(w)));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = undefined;
        // Lozenge is at rest. Wait DEP_SETTLE_MS of "not moving"
        // before kicking off slurp — gives the eye time to register
        // the new available space before the node fills it.
        settleTimer = setTimeout(() => {
          settleTimer = undefined;
          runSlurp();
        }, DEP_SETTLE_MS);
      }
    };
    raf = requestAnimationFrame(tick);
  };

  const play = () => {
    if (!pathRef || !arrowRef) return;
    // Stop any in-flight rAF or settle timer from a previous play.
    if (raf !== undefined) {
      cancelAnimationFrame(raf);
      raf = undefined;
    }
    if (settleTimer !== undefined) {
      clearTimeout(settleTimer);
      settleTimer = undefined;
    }
    setContainerWidth(DEP_CONTAINER_NARROW_W);
    setShowCard(false);
    pathRef.setAttribute("d", geometryToPath(slurpDepGeometry(0)));
    pathRef.style.visibility = "hidden";
    arrowRef.getAnimations().forEach((a) => a.cancel());
    arrowRef.setAttribute("stroke-dasharray", "4 3");
    arrowRef.setAttribute("x2", String(lozengeXFor(DEP_CONTAINER_NARROW_W)));
    runWiden();
  };
  const reset = () => {
    if (raf !== undefined) {
      cancelAnimationFrame(raf);
      raf = undefined;
    }
    if (settleTimer !== undefined) {
      clearTimeout(settleTimer);
      settleTimer = undefined;
    }
    setShowCard(false);
    setContainerWidth(DEP_CONTAINER_NARROW_W);
    if (pathRef) {
      pathRef.setAttribute("d", geometryToPath(slurpDepGeometry(0)));
      pathRef.style.visibility = "hidden";
    }
    if (arrowRef) {
      arrowRef.getAnimations().forEach((a) => a.cancel());
      arrowRef.setAttribute("x2", String(lozengeXFor(DEP_CONTAINER_NARROW_W)));
      arrowRef.setAttribute("stroke-dasharray", "4 3");
      arrowRef.setAttribute("stroke", "rgba(255,255,255,0.45)");
      arrowRef.setAttribute("color", "rgba(255,255,255,0.45)");
    }
  };
  return (
    <div style={demoBoxStyle}>
      <svg
        width={DEP_STAGE_W}
        height={DEP_STAGE_H}
        viewBox={`0 0 ${DEP_STAGE_W} ${DEP_STAGE_H}`}
        // overflow:visible so the hover popover (positioned above the
        // card) can render outside the SVG's bbox without being clipped.
        style={{ display: "block", margin: "0 auto", overflow: "visible" }}
      >
        <defs>
          <marker
            id="dep-arrow-head"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            {/* currentColor → matches the line's color so grey/dashed
                 dep arrows get grey heads, accent solid arrows get
                 accent heads. */}
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>
        {/* Chart container box — starts too narrow to fit a new node,
            then widens on play. The lozenge rides its right edge. */}
        <rect
          x={DEP_CONTAINER_X}
          y={DEP_CONTAINER_Y}
          width={containerWidth()}
          height={DEP_STAGE_H - DEP_CONTAINER_Y * 2}
          rx={6}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          stroke-width="1"
          stroke-dasharray="3 3"
        />
        {/* Existing source node — already in the chart, always visible. */}
        <TaskCard
          x={DEP_SOURCE_X}
          y={cy - DEP_SOURCE_H / 2}
          width={DEP_SOURCE_W}
          height={DEP_SOURCE_H}
          visible={true}
          task={TASKS.fixBucket}
        />
        {/* lozenge — anchored to the container's right edge. */}
        <rect
          x={lozengeX()}
          y={cy - LOZENGE_H / 2}
          width={LOZENGE_W}
          height={LOZENGE_H}
          rx={LOZENGE_W / 2}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.4)"
          stroke-width="1"
        />
        <text
          x={lozengeX() + LOZENGE_W / 2}
          y={cy}
          text-anchor="middle"
          dominant-baseline="central"
          fill="rgba(255,255,255,0.55)"
          font-size="9"
          font-family="ui-monospace, SFMono-Regular, monospace"
        >
          3
        </text>
        {/* new node — slurp-out morph */}
        <path
          ref={(el) => (pathRef = el)}
          d={geometryToPath(slurpDepGeometry(0))}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.45)"
          stroke-width="1"
          style={{ visibility: "hidden" }}
        />
        {/* Dep arrow. Initial state: GREY dashed line pointing at the
            +S lozenge — source has a dep on a hidden TODO. On play the
            line switches to solid + accent (the target is now DOING)
            and its x2 tracks the new node's leading edge. */}
        <line
          ref={(el) => (arrowRef = el)}
          x1={sourceRightX}
          y1={cy}
          x2={lozengeX()}
          y2={cy}
          stroke="rgba(255,255,255,0.45)"
          color="rgba(255,255,255,0.45)"
          stroke-width="1.5"
          stroke-dasharray="4 3"
          marker-end="url(#dep-arrow-head)"
        />
        {/* 4-line task card — shared TaskCard so we get the same
            opacity-fade in/out behavior as the other slurp panels. */}
        <TaskCard
          x={DEP_NODE_REST_LEFT_X}
          y={cy - DEP_NODE_H / 2}
          width={NODE_W}
          height={DEP_NODE_H}
          visible={showCard()}
          task={TASKS.mendHole}
        />
      </svg>
      <div style={buttonRowStyle}>
        <button type="button" style={buttonStyle} onClick={play}>
          ▶ play
        </button>
        <button type="button" style={buttonStyle} onClick={reset}>
          ↺ reset
        </button>
      </div>
    </div>
  );
};

// ─── mixed-shapes — full SVG reimplementation ──────────────────────────────
//
// Same dataset as the StatusFlowChart-based TwoParentsRow at the bottom
// of the workshop, but rendered using only the SVG primitives we've
// iterated on in this file (TaskCard + side lozenges + orthogonal edge
// routing). Four lanes stacked vertically: Parent A chain, Parent B
// broom, standalone chain, chores.
type ChildStatus = "TODO" | "DOING" | "DONE";
interface ChartChild {
  id: string;
  title: string;
  status: ChildStatus;
  /** Ids this child depends on. Empty/missing → independent root. */
  dependsOn?: string[];
  /** Optional owner override; otherwise derived from id index. */
  owner?: string;
}

function childToTask(c: ChartChild): TaskData {
  // Cycle a few names so the cards don't all show the same owner.
  const owners = ["henry", "liza", "alex"];
  const idx = c.id.charCodeAt(c.id.length - 1) % owners.length;
  return {
    id: c.id,
    owner: c.owner ?? owners[idx],
    status: c.status,
    title: c.title,
    est: "—",
    actual: c.status === "DOING" ? "32m" : c.status === "DONE" ? "1h 14m" : "—",
  };
}

// Parent A — 3-child linear chain. a1 → a2 → a3.
const MS_PARENT_A_CHILDREN: ChartChild[] = [
  { id: "a1", title: "A child 1 — set up the bucket inventory", status: "TODO" },
  { id: "a2", title: "A child 2 — patch any obvious holes", status: "TODO", dependsOn: ["a1"] },
  { id: "a3", title: "A child 3 — verify the patch held overnight", status: "TODO", dependsOn: ["a2"] },
];

// Parent B — 8-child broom (mirrors initParentB in workshop.tsx):
//   b1, b2, b3 — independent roots
//   b4 deps on b1, b2
//   b5 deps on b4
//   b6 deps on b3, b5
//   b7, b8 deps on b6
const MS_PARENT_B_CHILDREN: ChartChild[] = [
  { id: "b1", title: "B child 1 — wet the stone in the well", status: "TODO" },
  { id: "b2", title: "B child 2 — sharpen the dull axe", status: "TODO" },
  { id: "b3", title: "B child 3 — cut straw to the right length", status: "TODO" },
  { id: "b4", title: "B child 4 — mend the hole with the cut straw", status: "TODO", dependsOn: ["b1", "b2"] },
  { id: "b5", title: "B child 5 — refill the patched bucket", status: "TODO", dependsOn: ["b4"] },
  { id: "b6", title: "B child 6 — confirm no leaks", status: "TODO", dependsOn: ["b3", "b5"] },
  { id: "b7", title: "B child 7 — bring bucket to the cattle", status: "TODO", dependsOn: ["b6"] },
  { id: "b8", title: "B child 8 — log the day's water usage", status: "TODO", dependsOn: ["b6"] },
];

// Standalone — 4-task linear chain, no parent.
const MS_STANDALONE: ChartChild[] = [
  { id: "t1", title: "Task 1 — clean out the well's debris", status: "TODO" },
  { id: "t2", title: "Task 2 — re-rope the well's pulley", status: "TODO", dependsOn: ["t1"] },
  { id: "t3", title: "Task 3 — test the pulley with a weighted bucket", status: "TODO", dependsOn: ["t2"] },
  { id: "t4", title: "Task 4 — repaint the well's signage for clarity", status: "TODO", dependsOn: ["t3"] },
];

// Chores — 3 independent tasks, no parent, no deps.
const MS_CHORES: ChartChild[] = [
  { id: "ch1", title: "Chore 1 — feed the chickens before sunset", status: "TODO" },
  { id: "ch2", title: "Chore 2 — split firewood for the evening cook", status: "TODO" },
  { id: "ch3", title: "Chore 3 — close the barn door against the wind", status: "TODO" },
];

// ─── layout ─────────────────────────────────────────────────────────────────
const MS_STAGE_W = 920;
const MS_CARD_W = NODE_W;
const MS_CARD_H = NODE_H;
const MS_COL_GAP = 60; // gap between adjacent card EDGES (matches arrow run)
const MS_COL_CENTER_GAP = MS_CARD_W + MS_COL_GAP;
const MS_ROW_GAP = 16; // gap between stacked cards within a column
const MS_PARENT_GAP = 16; // gap between parent card and child row
const MS_LANE_PAD = 16; // padding inside each lane box
const MS_LANE_GAP = 20; // gap between lanes
const MS_LOZENGE_GAP = 32;

// Visible window: how many cols of children we show before overflow
// rolls into the right-side lozenge. Frame 2 in the reference is
// maxDepth = 1 (parent col + dep depth 0 + dep depth 1). Tune to taste.
const MS_MAX_DEPTH = 1;

// Compute longest-path topo depth per child relative to independent
// roots. Roots = depth 0; their direct dependents = 1; etc.
function topoDepths(children: ChartChild[]): Map<string, number> {
  const byId = new Map(children.map((c) => [c.id, c]));
  const memo = new Map<string, number>();
  const visit = (id: string): number => {
    const hit = memo.get(id);
    if (hit !== undefined) return hit;
    const c = byId.get(id);
    if (!c) return 0;
    memo.set(id, 0); // cycle guard
    const deps = (c.dependsOn ?? []).filter((d) => byId.has(d));
    const d = deps.length === 0 ? 0 : 1 + Math.max(...deps.map(visit));
    memo.set(id, d);
    return d;
  };
  for (const c of children) visit(c.id);
  return memo;
}

interface LanePosition {
  node: StatusFlowNode;
  col: number;
  visible: boolean;
  isParent: boolean;
  /** Card center (only set when visible). */
  x?: number;
  y?: number;
}

interface LaneLayout {
  positions: LanePosition[];
  leftLozengeCount: number;
  rightLozengeCount: number;
  /** Tallest visible column among children (for sizing the child row). */
  maxStack: number;
  /** Vertical range used by visible children. */
  childRowH: number;
}

/**
 * Compute per-node positions for one lane using the shared
 * `computeColFor` from `workshop-layout` so this SVG implementation
 * stays in lockstep with the existing StatusFlowChart-based demo.
 *
 * - Parent (if any) sits in its own row at the top of the lane.
 * - Children sit in the row below, positioned by signed col.
 * - Cards at |col| > maxDepth roll into the matching side lozenge.
 * - Multiple cards sharing the same col stack vertically.
 */
function computeLaneLayout(
  nodes: StatusFlowNode[],
  maxDepth: number,
  stageCenterX: number,
  parentRowCenterY: number,
  childRowCenterY: number,
): LaneLayout {
  const effective = resolveParentStatuses(nodes, "DOING");
  const parentIds = new Set<string>();
  for (const n of nodes) if (n.parentId) parentIds.add(n.parentId);
  // Group child cols. Parent's col is computed but its row is the top.
  const childByCol = new Map<number, StatusFlowNode[]>();
  let leftLozengeCount = 0;
  let rightLozengeCount = 0;
  const cols = new Map<string, number>();

  // First pass: count visibility, bucket visible children by col.
  // Hidden children are pushed straight into `positions` with
  // visible=false so callers (edge layout, transition detection)
  // can still find them by id.
  for (const n of nodes) {
    const col = computeColForLib(n, nodes, (id) => effective.get(id));
    cols.set(n.id, col);
    const isParent = parentIds.has(n.id);
    if (isParent) continue;
    if (Math.abs(col) > maxDepth) {
      if (col < 0) leftLozengeCount++;
      else rightLozengeCount++;
      continue;
    }
    if (!childByCol.has(col)) childByCol.set(col, []);
    childByCol.get(col)!.push(n);
  }

  const colToX = (col: number) => stageCenterX + col * MS_COL_CENTER_GAP;
  const positions: LanePosition[] = [];

  // Children, stacked per col.
  for (const [col, group] of childByCol) {
    const totalH = group.length * MS_CARD_H + (group.length - 1) * MS_ROW_GAP;
    const startY = childRowCenterY - totalH / 2 + MS_CARD_H / 2;
    group.forEach((n, i) => {
      positions.push({
        node: n,
        col,
        visible: true,
        isParent: false,
        x: colToX(col),
        y: startY + i * (MS_CARD_H + MS_ROW_GAP),
      });
    });
  }
  // Add hidden children to positions (visible=false) so callers can
  // look them up by id when computing edges and detecting transitions.
  for (const n of nodes) {
    const col = cols.get(n.id) ?? 0;
    const isParent = parentIds.has(n.id);
    if (isParent) continue;
    if (Math.abs(col) <= maxDepth) continue;
    positions.push({
      node: n,
      col,
      visible: false,
      isParent: false,
    });
  }
  // Parent (only one supported per lane).
  for (const n of nodes) {
    if (!parentIds.has(n.id)) continue;
    const col = cols.get(n.id) ?? 0;
    const visible = Math.abs(col) <= maxDepth;
    positions.push({
      node: n,
      col,
      visible,
      isParent: true,
      x: visible ? colToX(col) : undefined,
      y: visible ? parentRowCenterY : undefined,
    });
  }

  const maxStack = Math.max(1, ...Array.from(childByCol.values()).map((g) => g.length));
  const childRowH = maxStack * MS_CARD_H + (maxStack - 1) * MS_ROW_GAP;
  return { positions, leftLozengeCount, rightLozengeCount, maxStack, childRowH };
}

function rectFor(pos: LanePosition) {
  return { x: pos.x!, y: pos.y!, width: MS_CARD_W, height: MS_CARD_H };
}

/**
 * Slurp morph between a full TaskCard rect and a lozenge slit, at
 * parameter `t` ∈ [0, 1]. t=0 → slit at the lozenge's inner edge;
 * t=1 → full card at its rest position.
 *
 * Same phased timing as `slurpOutGeometry` so the leading edge sweeps
 * out first and the trailing edge follows. `side` tells us which side
 * of the lozenge the card lives on so we can flip leading/trailing.
 */
function slurpRectMorph(
  card: { x: number; y: number; width: number; height: number },
  loz: { x: number; y: number; width: number; height: number },
  side: "left" | "right",
  t: number,
): string {
  const SLIT_H = GENIE_SLIT_HEIGHT;
  const cardLeft = card.x - card.width / 2;
  const cardRight = card.x + card.width / 2;
  const lozLeftEdge = loz.x - loz.width / 2;
  const lozRightEdge = loz.x + loz.width / 2;
  const lozNearEdgeX = side === "left" ? lozLeftEdge : lozRightEdge;
  // Card's "far" edge — the one away from the lozenge — is the leading
  // edge of the slurp shape. The near edge is the trailing edge.
  const leadingFarX = side === "left" ? cardLeft : cardRight;

  const leadingT = windowProgress(t, 0.0, 0.55);
  const trailingHT = windowProgress(t, 0.4, 0.88);

  const leadingX = lerp(lozNearEdgeX, leadingFarX, ease(leadingT));
  const leadingH = lerp(SLIT_H, card.height, ease(leadingT));
  const trailingH = lerp(SLIT_H, card.height, ease(trailingHT));
  // Trailing X follows the leading edge once the width hits cardW
  // (mirrors the slurpOutGeometry width-cap).
  const trailingX = side === "left"
    ? Math.min(lozNearEdgeX, leadingX + card.width)
    : Math.max(lozNearEdgeX, leadingX - card.width);
  // Y morphs from lozenge.cy → card.cy over most of t.
  const yT = windowProgress(t, 0.0, 0.7);
  const morphCy = lerp(loz.y, card.y, ease(yT));

  const lTop = morphCy - leadingH / 2;
  const lBot = morphCy + leadingH / 2;
  const tTop = morphCy - trailingH / 2;
  const tBot = morphCy + trailingH / 2;
  const ctrlX = (leadingX + trailingX) / 2;
  return [
    `M ${trailingX} ${tTop}`,
    `C ${ctrlX} ${tTop}, ${ctrlX} ${lTop}, ${leadingX} ${lTop}`,
    `L ${leadingX} ${lBot}`,
    `C ${ctrlX} ${lBot}, ${ctrlX} ${tBot}, ${trailingX} ${tBot}`,
    "Z",
  ].join(" ");
}

/**
 * Map a ChartChild + parent spec into a StatusFlowNode[] (the format
 * the shared layout helpers expect).
 */
function laneToNodes(spec: MixedLaneSpec): StatusFlowNode[] {
  const nodes: StatusFlowNode[] = [];
  const parentId = spec.parentTitle ? `parent-${spec.id}` : undefined;
  if (parentId) {
    nodes.push({
      id: parentId,
      title: spec.parentTitle!,
      subtitle: spec.parentSubtitle,
      status: "TODO",
    });
  }
  for (const c of spec.children) {
    nodes.push({
      id: c.id,
      title: c.title,
      status: c.status,
      parentId,
      dependsOn: c.dependsOn,
    });
  }
  return nodes;
}

interface MixedLaneSpec {
  id: string;
  parentTitle?: string;
  /** Subtitle for the parent card ("owns N children"). */
  parentSubtitle?: string;
  children: ChartChild[];
}

type HoverInfo = { task: TaskData; x: number; y: number; width: number; height: number };
// childToTaskFromNode: build TaskData for the TaskCard from a state node.
function nodeToTask(n: StatusFlowNode): TaskData {
  const owners = ["henry", "liza", "alex"];
  const idx = n.id.charCodeAt(n.id.length - 1) % owners.length;
  return {
    id: n.id,
    owner: owners[idx],
    status: (n.status as ChildStatus) ?? "TODO",
    title: n.title,
    est: "—",
    actual: n.status === "DOING" ? "32m" : n.status === "DONE" ? "1h 14m" : "—",
  };
}

// Each tick is animated in three phases so cards leaving / arriving
// don't fight visible cards that are simply shifting columns:
//
//   [0 ────────── SLURP] leaving cards slurp INTO their lozenge
//   [SLURP ── + MOVE]    visible cards shift to their new columns
//   [SLURP+MOVE ─ +SLURP] arriving cards slurp OUT of their lozenge
//
// The state-machine tick rate is bumped to comfortably exceed this
// entire sequence so the next tick doesn't trample an in-flight one.
const MS_SLURP_MS = 600;
const MS_MOVE_MS = 450;
const MS_PHASE_TOTAL = MS_SLURP_MS + MS_MOVE_MS + MS_SLURP_MS; // 1650

/** Per-transition delay before the morph rAF actually starts.
 *  Leaving ("in") cards run immediately; arriving ("out") cards wait
 *  until both the slurp-in phase AND the visible-card shift have
 *  finished. */
const MS_DELAY_IN = 0;
const MS_DELAY_OUT = MS_SLURP_MS + MS_MOVE_MS;

interface MsLozengeTransition {
  id: string;
  kind: "in" | "out";
  side: "left" | "right";
  cardRect: { x: number; y: number; width: number; height: number };
  lozRect: { x: number; y: number; width: number; height: number };
  startTs: number;
  status: ChildStatus;
}

function SlurpTransitionPath(props: {
  transition: MsLozengeTransition;
  onComplete: (tx: MsLozengeTransition) => void;
}): JSX.Element {
  let pathRef: SVGPathElement | undefined;
  const theme = statusTheme(props.transition.status);
  onMount(() => {
    if (!pathRef) return;
    const { cardRect, lozRect, side, kind, startTs } = props.transition;
    const delay = kind === "in" ? MS_DELAY_IN : MS_DELAY_OUT;
    const tick = (now: number) => {
      const sinceStart = now - startTs;
      if (sinceStart < delay) {
        requestAnimationFrame(tick);
        return;
      }
      const elapsed = sinceStart - delay;
      const tNormalized = Math.min(1, elapsed / MS_SLURP_MS);
      // morphT: 0 = at lozenge slit, 1 = at full card
      const morphT = kind === "out" ? tNormalized : 1 - tNormalized;
      pathRef!.setAttribute(
        "d",
        slurpRectMorph(cardRect, lozRect, side, morphT),
      );
      if (tNormalized < 1) requestAnimationFrame(tick);
      else props.onComplete(props.transition);
    };
    requestAnimationFrame(tick);
  });
  // Initial d so the path doesn't flash at origin.
  const { cardRect, lozRect, side, kind } = props.transition;
  const initialMorphT = kind === "out" ? 0 : 1;
  const initialD = slurpRectMorph(cardRect, lozRect, side, initialMorphT);
  return (
    <path
      ref={(el) => (pathRef = el)}
      d={initialD}
      fill={theme.fill}
      stroke={theme.stroke}
      stroke-width="1"
    />
  );
}

function MixedShapesLaneReactive(props: {
  spec: MixedLaneSpec;
  nodes: StatusFlowNode[];
  laneY: number;
  onCardHover?: (info: HoverInfo | null) => void;
}): JSX.Element {
  const centerX = MS_STAGE_W / 2;
  const hasParent = !!props.spec.parentTitle;

  // Size the lane based on the WORST-CASE stack height across the
  // animation so cards don't jump as siblings finish. A naive measure
  // is the largest col group at any given time; we approximate with
  // the maximum number of children sharing the same parent (initial
  // all-TODO → all roots stack at +1).
  const childCount = props.spec.children.length;
  // Lower-bound the stack to the largest "depth=0 root group" since
  // independent roots all share col +1 at initial state.
  const initialRoots = props.spec.children.filter(
    (c) => !c.dependsOn || c.dependsOn.length === 0,
  ).length;
  const reservedStack = Math.max(1, initialRoots, Math.min(childCount, 3));
  const reservedChildRowH =
    reservedStack * MS_CARD_H + (reservedStack - 1) * MS_ROW_GAP;
  const parentRowH = hasParent ? MS_CARD_H + MS_PARENT_GAP : 0;
  const laneHeight = MS_LANE_PAD * 2 + parentRowH + reservedChildRowH;

  const parentRowCenterY = props.laneY + MS_LANE_PAD + MS_CARD_H / 2;
  const childRowCenterY =
    props.laneY + MS_LANE_PAD + parentRowH + reservedChildRowH / 2;

  // Shadow state: lags behind props.nodes during the multi-phase
  // animation. When the row ticks (props.nodes changes), the lane
  // (1) starts slurp-in transitions reading from the OLD shadow state,
  // (2) after MS_SLURP_MS, applies the new state — visible cards then
  // CSS-transition to their new positions,
  // (3) after MS_SLURP_MS + MS_MOVE_MS, slurp-out runs for arriving
  // cards (via the per-transition delay in SlurpTransitionPath).
  const [shadowNodes, setShadowNodes] = createSignal(props.nodes);
  // Cards that are "pending arrival" — they exist in shadowNodes as
  // visible but their TaskCard is hidden until the slurp-out animation
  // for them completes.
  const [pendingArrivals, setPendingArrivals] = createSignal<Set<string>>(new Set());

  // Reactive layout — based on shadow state (the visible truth on
  // screen), not props.nodes (the row's truth which may be ahead).
  const layout = () =>
    computeLaneLayout(
      shadowNodes(),
      MS_MAX_DEPTH,
      centerX,
      parentRowCenterY,
      childRowCenterY,
    );

  const colTopY = childRowCenterY - reservedChildRowH / 2;
  const colBottomY = childRowCenterY + reservedChildRowH / 2;
  const lozMidY = childRowCenterY;
  // Lozenge anchor positions stay fixed at the visible-window edges.
  const leftLozengeX =
    centerX - MS_MAX_DEPTH * MS_COL_CENTER_GAP - MS_CARD_W / 2 -
    MS_LOZENGE_GAP - LOZENGE_W;
  const rightLozengeX =
    centerX + MS_MAX_DEPTH * MS_COL_CENTER_GAP + MS_CARD_W / 2 + MS_LOZENGE_GAP;

  const greyStroke = "rgba(255,255,255,0.45)";
  const accentStroke = "var(--sui-accent, #00d4ff)";

  // Lozenge rects (used by transition paths AND lozenge anchors).
  const leftLozRect = () => ({
    x: leftLozengeX + LOZENGE_W / 2,
    y: lozMidY,
    width: LOZENGE_W,
    height: colBottomY - colTopY,
  });
  const rightLozRect = () => ({
    x: rightLozengeX + LOZENGE_W / 2,
    y: lozMidY,
    width: LOZENGE_W,
    height: colBottomY - colTopY,
  });

  // Active slurp transitions for nodes crossing the visible-window
  // boundary this frame. Detected via createEffect comparing the
  // previous layout to the current one.
  const [transitions, setTransitions] = createSignal<MsLozengeTransition[]>([]);
  const inTransition = (id: string) =>
    transitions().some((t) => t.id === id);

  // Helper: derive (which lozenge, which side of lozenge the card sits
  // on) from a signed col. col < 0 → LEFT lozenge, card on its right.
  // col > 0 → RIGHT lozenge, card on its left.
  const sideAndLoz = (col: number) =>
    col < 0
      ? { side: "right" as const, lozRect: leftLozRect() }
      : { side: "left" as const, lozRect: rightLozRect() };

  // When props.nodes changes (a row tick or step), sequence the
  // transitions: slurp-in first → apply state (cards shift) → slurp-out.
  createEffect(() => {
    const incoming = props.nodes;
    const current = shadowNodes();
    if (incoming === current) return;

    // Compute prev / next layouts so we know who is visible in each.
    const prevLayout = computeLaneLayout(
      current,
      MS_MAX_DEPTH,
      centerX,
      parentRowCenterY,
      childRowCenterY,
    );
    const nextLayout = computeLaneLayout(
      incoming,
      MS_MAX_DEPTH,
      centerX,
      parentRowCenterY,
      childRowCenterY,
    );
    const prevVisible = new Map<string, LanePosition>();
    for (const p of prevLayout.positions) if (p.visible) prevVisible.set(p.node.id, p);
    const nextVisible = new Map<string, LanePosition>();
    for (const p of nextLayout.positions) if (p.visible) nextVisible.set(p.node.id, p);

    const newTx: MsLozengeTransition[] = [];
    const startTs = performance.now();

    // LEAVING — visible now, hidden in incoming. Slurp INTO lozenge.
    for (const [id, oldP] of prevVisible) {
      if (nextVisible.has(id)) continue;
      const newP = nextLayout.positions.find((x) => x.node.id === id);
      const { side, lozRect } = sideAndLoz(newP?.col ?? oldP.col);
      const node = incoming.find((n) => n.id === id);
      newTx.push({
        id,
        kind: "in",
        side,
        cardRect: { x: oldP.x!, y: oldP.y!, width: MS_CARD_W, height: MS_CARD_H },
        lozRect,
        startTs,
        status: (node?.status as ChildStatus) ?? "TODO",
      });
    }
    // ARRIVING — hidden now, visible in incoming. Slurp OUT of lozenge.
    const arrivingIds = new Set<string>();
    for (const [id, newP] of nextVisible) {
      if (prevVisible.has(id)) continue;
      arrivingIds.add(id);
      const oldP = prevLayout.positions.find((x) => x.node.id === id);
      const { side, lozRect } = sideAndLoz(oldP?.col ?? newP.col);
      const node = incoming.find((n) => n.id === id);
      newTx.push({
        id,
        kind: "out",
        side,
        cardRect: { x: newP.x!, y: newP.y!, width: MS_CARD_W, height: MS_CARD_H },
        lozRect,
        startTs,
        status: (node?.status as ChildStatus) ?? "TODO",
      });
    }
    if (newTx.length > 0) setTransitions((prev) => [...prev, ...newTx]);

    // Mark arriving cards as pending so their TaskCards stay hidden
    // until their slurp-out completes. They become visible after the
    // full sequence (slurp-in + move + slurp-out).
    if (arrivingIds.size > 0) {
      setPendingArrivals((prev) => new Set([...prev, ...arrivingIds]));
      setTimeout(
        () =>
          setPendingArrivals((prev) => {
            const next = new Set(prev);
            for (const id of arrivingIds) next.delete(id);
            return next;
          }),
        MS_PHASE_TOTAL,
      );
    }

    // Phase boundary: after MS_SLURP_MS, swap the shadow state to the
    // incoming one. Visible cards' positions reactively update; they
    // CSS-transition to their new column over MS_MOVE_MS. Cards that
    // are pending-arrival remain hidden (their TaskCard is gated on
    // !pendingArrivals.has(id)).
    setTimeout(() => setShadowNodes(incoming), MS_SLURP_MS);
  });

  const onTxComplete = (tx: MsLozengeTransition) =>
    setTransitions((prev) => prev.filter((t) => t !== tx));

  // Edge data: visible→visible solid, visible→hidden dashed.
  const edges = () => {
    const positionById = new Map<string, LanePosition>(
      layout().positions.map((p) => [p.node.id, p]),
    );
    const solidEdges: { from: LanePosition; to: LanePosition }[] = [];
    const dashedSources: Map<string, LanePosition> = new Map();
    for (const n of props.nodes) {
      for (const depId of n.dependsOn ?? []) {
        const src = positionById.get(depId);
        const tgt = positionById.get(n.id);
        if (!src || !tgt) continue;
        if (src.visible && tgt.visible) {
          solidEdges.push({ from: src, to: tgt });
        } else if (src.visible && !tgt.visible) {
          dashedSources.set(src.node.id, src);
        }
      }
    }
    return { solid: solidEdges, dashed: Array.from(dashedSources.values()) };
  };

  const allRects = () =>
    layout()
      .positions.filter((p) => p.visible)
      .map((p) => ({ id: p.node.id, ...rectFor(p) }));

  return (
    <g>
      {/* Lane box */}
      <rect
        x={MS_LANE_PAD / 2}
        y={props.laneY}
        width={MS_STAGE_W - MS_LANE_PAD}
        height={laneHeight}
        rx={8}
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.1)"
        stroke-width="1"
      />
      {/* Left + right lozenges (one or both can be 0) */}
      <Show when={layout().leftLozengeCount > 0}>
        <rect
          x={leftLozengeX}
          y={colTopY}
          width={LOZENGE_W}
          height={colBottomY - colTopY}
          rx={LOZENGE_W / 2}
          ry={LOZENGE_W / 2}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.4)"
          stroke-width="1"
        />
        <text
          x={leftLozengeX + LOZENGE_W / 2}
          y={lozMidY}
          text-anchor="middle"
          dominant-baseline="central"
          fill="rgba(255,255,255,0.55)"
          font-size="9"
          font-family="ui-monospace, SFMono-Regular, monospace"
        >
          {layout().leftLozengeCount}
        </text>
      </Show>
      <Show when={layout().rightLozengeCount > 0}>
        <rect
          x={rightLozengeX}
          y={colTopY}
          width={LOZENGE_W}
          height={colBottomY - colTopY}
          rx={LOZENGE_W / 2}
          ry={LOZENGE_W / 2}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.4)"
          stroke-width="1"
        />
        <text
          x={rightLozengeX + LOZENGE_W / 2}
          y={lozMidY}
          text-anchor="middle"
          dominant-baseline="central"
          fill="rgba(255,255,255,0.55)"
          font-size="9"
          font-family="ui-monospace, SFMono-Regular, monospace"
        >
          {layout().rightLozengeCount}
        </text>
      </Show>
      {/* Solid edges */}
      <For each={edges().solid}>
        {(e) => {
          const obstacles = allRects().filter(
            (r) => r.id !== e.from.node.id && r.id !== e.to.node.id,
          );
          return (
            <path
              d={orthogonalAvoidingObstacles(rectFor(e.from), rectFor(e.to), obstacles)}
              fill="none"
              stroke={accentStroke}
              stroke-width="1.5"
              marker-end="url(#ms-arrow-head)"
              style={{ color: accentStroke, transition: "d 0.4s ease-out" }}
            />
          );
        }}
      </For>
      {/* Dashed visible→hidden edges (route to right lozenge by default) */}
      <For each={edges().dashed}>
        {(p) => (
          <path
            d={orthogonalAvoidingObstacles(
              rectFor(p),
              {
                x: rightLozengeX + LOZENGE_W / 2,
                y: lozMidY,
                width: LOZENGE_W,
                height: colBottomY - colTopY,
              },
              allRects().filter((r) => r.id !== p.node.id),
            )}
            fill="none"
            stroke={greyStroke}
            stroke-width="1.5"
            stroke-dasharray="4 3"
            marker-end="url(#ms-arrow-head)"
            style={{ color: greyStroke, transition: "d 0.4s ease-out" }}
          />
        )}
      </For>
      {/* Slurp transition paths — one per node currently morphing
          between the lozenge and its rest position. Rendered BEFORE
          the cards so they sit beneath. */}
      <For each={transitions()}>
        {(tx) => <SlurpTransitionPath transition={tx} onComplete={onTxComplete} />}
      </For>
      {/* All TaskCards (parent + children). Iterating by STABLE id
          keeps Solid's `<For>` reusing the same foreignObject DOM
          element across ticks — without that, every state change
          remounts every card and the CSS x/y transitions never fire.
          Parents display their EFFECTIVE status (computed from
          children) so a parent in the DOING column reads "DOING"
          rather than the static initial "TODO". */}
      <For each={shadowNodes().map((n) => n.id)}>
        {(id) => {
          const pos = () => layout().positions.find((p) => p.node.id === id);
          const node = () => shadowNodes().find((n) => n.id === id);
          const isParent = () => pos()?.isParent ?? false;
          const task = () => {
            const n = node();
            if (!n) return null;
            const base = nodeToTask(n);
            if (!isParent()) return base;
            const effective = resolveParentStatuses(shadowNodes(), "DOING");
            const eff = effective.get(n.id) ?? n.status;
            return { ...base, status: eff as ChildStatus };
          };
          return (
            <Show
              when={
                pos()?.visible &&
                task() &&
                !inTransition(id) &&
                !pendingArrivals().has(id)
              }
            >
              {/* Read pos() / task() inline so reactive updates flow
                  through cleanly — no captured stale references. */}
              <TaskCard
                x={pos()!.x! - MS_CARD_W / 2}
                y={pos()!.y! - MS_CARD_H / 2}
                width={MS_CARD_W}
                height={MS_CARD_H}
                visible={true}
                task={task()!}
                onHoverChange={(h) =>
                  props.onCardHover?.(
                    h
                      ? {
                          task: task()!,
                          x: pos()!.x! - MS_CARD_W / 2,
                          y: pos()!.y! - MS_CARD_H / 2,
                          width: MS_CARD_W,
                          height: MS_CARD_H,
                        }
                      : null,
                  )
                }
              />
            </Show>
          );
        }}
      </For>
    </g>
  );
}

// Pacing — tick must be ≥ the full phase sequence (slurp-in + move +
// slurp-out = MS_PHASE_TOTAL) plus a small buffer so the next tick
// doesn't trample an in-flight one.
const MS_TICK_MS = MS_PHASE_TOTAL + 200;

const MixedShapesRow: Component = () => {
  const [hovered, setHovered] = createSignal<HoverInfo | null>(null);
  const lanes: MixedLaneSpec[] = [
    {
      id: "lane-a",
      parentTitle: "Parent Task A",
      parentSubtitle: "owns 3 children",
      children: MS_PARENT_A_CHILDREN,
    },
    {
      id: "lane-b",
      parentTitle: "Parent Task B",
      parentSubtitle: "owns 8 children",
      children: MS_PARENT_B_CHILDREN,
    },
    { id: "lane-s", children: MS_STANDALONE },
    { id: "lane-c", children: MS_CHORES },
  ];
  // Per-lane history: array of StatusFlowNode[] snapshots, indexed by
  // frame. Frame 0 = pristine all-TODO state (no roots promoted yet —
  // hitting Next will tick once and roots will flip to DOING then).
  // Next/Prev/Play move through this history, extending it via
  // `advanceChildren` when stepping past the end.
  const initialStates = lanes.map((spec) => laneToNodes(spec));
  const histories = lanes.map((_, i) =>
    createSignal<StatusFlowNode[][]>([initialStates[i]]),
  );
  const [cursor, setCursor] = createSignal(0);
  // Convenience accessor: current state per lane.
  const currentStates = () =>
    histories.map(([get]) => get()[Math.min(cursor(), get().length - 1)]);

  // Pre-compute fixed lane heights so they stack stably across the
  // animation (lane height doesn't reflow as children move cols).
  let runningY = 0;
  const lanesWithY = lanes.map((spec) => {
    const childCount = spec.children.length;
    const initialRoots = spec.children.filter(
      (c) => !c.dependsOn || c.dependsOn.length === 0,
    ).length;
    const reservedStack = Math.max(1, initialRoots, Math.min(childCount, 3));
    const reservedChildRowH =
      reservedStack * MS_CARD_H + (reservedStack - 1) * MS_ROW_GAP;
    const hasParent = !!spec.parentTitle;
    const parentRowH = hasParent ? MS_CARD_H + MS_PARENT_GAP : 0;
    const laneH = MS_LANE_PAD * 2 + parentRowH + reservedChildRowH;
    const out = { spec, laneY: runningY };
    runningY += laneH + MS_LANE_GAP;
    return out;
  });
  const totalH = runningY;

  // Play / Pause / Next / Prev / Reset.
  const [playing, setPlaying] = createSignal(false);
  let tickTimer: ReturnType<typeof setInterval> | undefined;

  // All lanes are "done" when every lane's last-known state is all-DONE.
  const allLanesDone = () =>
    histories.every(([get]) => {
      const arr = get();
      return isAllDone(arr[arr.length - 1]);
    });

  /**
   * Advance EVERY lane by one tick. If the new frame is already cached
   * past the cursor (we previously stepped back), just advance the
   * cursor; otherwise compute the next state per lane and append.
   * Returns true if anything changed.
   */
  const next = (): boolean => {
    let advanced = false;
    histories.forEach(([get, set]) => {
      const arr = get();
      const i = cursor();
      if (i + 1 < arr.length) {
        // Already have a future frame from prior stepping.
        advanced = true;
        return;
      }
      const cur = arr[arr.length - 1];
      if (isAllDone(cur)) return; // this lane has nothing left to do
      set([...arr, advanceChildrenLib(cur)]);
      advanced = true;
    });
    if (advanced) setCursor(cursor() + 1);
    return advanced;
  };

  const prev = () => {
    if (cursor() === 0) return;
    setCursor(cursor() - 1);
  };

  const pause = () => {
    setPlaying(false);
    if (tickTimer !== undefined) {
      clearInterval(tickTimer);
      tickTimer = undefined;
    }
  };

  const play = () => {
    if (playing()) return;
    // If everything is already done, reset before starting so play has
    // somewhere to go.
    if (allLanesDone() && cursor() === histories[0][0]().length - 1) {
      reset();
    }
    setPlaying(true);
    const tick = () => {
      const advanced = next();
      if (!advanced) pause();
    };
    tick(); // immediate feedback
    tickTimer = setInterval(tick, MS_TICK_MS);
  };

  const reset = () => {
    pause();
    setCursor(0);
    histories.forEach(([_, set], i) => set([initialStates[i]]));
  };

  return (
    <>
      <div class="workshop-grid__cell">
        <SubsectionTitleLite>StatusFlowChart — mixed shapes (SVG primitives)</SubsectionTitleLite>
        <p style={{ "font-size": "12px", color: "rgba(255,255,255,0.6)", margin: "8px 0" }}>
          Same 4-lane dataset as the StatusFlowChart-based version
          below, but rendered entirely from the SVG primitives we've
          built — and driven by the same shared layout helpers
          (<code>computeColFor</code>, <code>advanceChildren</code>,
          <code>promoteReady</code>) so the rules stay in lockstep.
          Click <strong>▶ play</strong> to tick the state machine
          forward: one DOING leaf finishes per tick, ready TODOs are
          promoted, cards animate between columns as their status
          changes. The animation halts when every leaf is DONE.
        </p>
        <div
          style={{
            display: "flex",
            gap: "8px",
            "align-items": "center",
            "margin-top": "12px",
            "flex-wrap": "wrap",
          }}
        >
          <button
            type="button"
            style={buttonStyle}
            onClick={prev}
            disabled={cursor() === 0}
          >
            ← prev
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={playing() ? pause : play}
          >
            {playing() ? "⏸ pause" : "▶ play"}
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={next}
            disabled={allLanesDone() && cursor() === histories[0][0]().length - 1}
          >
            next →
          </button>
          <button type="button" style={buttonStyle} onClick={reset}>
            ↺ reset
          </button>
          <span
            style={{
              "font-size": "11px",
              color: "rgba(255,255,255,0.55)",
              "font-family": "ui-monospace, SFMono-Regular, monospace",
            }}
          >
            frame {cursor() + 1}
          </span>
        </div>
      </div>
      <div class="workshop-grid__cell">
        <div
          style={{
            background: "rgba(0,0,0,0.15)",
            border: "1px solid rgba(255,255,255,0.08)",
            "border-radius": "6px",
            padding: "12px",
            overflow: "auto",
          }}
        >
          <svg
            width={MS_STAGE_W}
            height={totalH}
            viewBox={`0 0 ${MS_STAGE_W} ${totalH}`}
            style={{ display: "block", overflow: "visible" }}
          >
            <defs>
              <marker
                id="ms-arrow-head"
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
            <For each={lanesWithY}>
              {(l, i) => (
                <MixedShapesLaneReactive
                  spec={l.spec}
                  nodes={currentStates()[i()]}
                  laneY={l.laneY}
                  onCardHover={setHovered}
                />
              )}
            </For>
            {/* Chart-level popover, rendered after every card so SVG
                paint order keeps it on top. Position is computed from
                the hovered card's rect, clamped to stay inside the
                stage horizontally. */}
            <Show when={hovered()}>
              {(info) => {
                const POPOVER_W = 260;
                const POPOVER_GAP = 6;
                // Tight: 4px top/bottom padding + 2-line title +
                // 2px gap + 1 meta line. ~60px total.
                const POPOVER_H = 60;
                const px = Math.min(
                  Math.max(info().x, 8),
                  MS_STAGE_W - POPOVER_W - 8,
                );
                const py = info().y - POPOVER_H - POPOVER_GAP;
                return (
                  <foreignObject
                    x={px}
                    y={py}
                    width={POPOVER_W}
                    height={POPOVER_H}
                  >
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      style={{
                        width: `${POPOVER_W}px`,
                        padding: "4px 8px",
                        background: "#0c141c",
                        border: "1px solid rgba(255,255,255,0.28)",
                        "border-radius": "4px",
                        "font-size": "11px",
                        "line-height": "1.4",
                        color: "var(--sui-text, #e6ecf5)",
                        "box-shadow": "0 4px 12px rgba(0,0,0,0.4)",
                        "pointer-events": "none",
                        "font-family": "ui-monospace, SFMono-Regular, monospace",
                        "box-sizing": "border-box",
                      }}
                    >
                      <div style={{ "font-weight": 600, "margin-bottom": "2px" }}>
                        {info().task.title}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.55)" }}>
                        {info().task.owner} · {info().task.status} · est{" "}
                        {info().task.est} · {info().task.actual}
                      </div>
                    </div>
                  </foreignObject>
                );
              }}
            </Show>
          </svg>
        </div>
      </div>
    </>
  );
};

// Local subsection title that doesn't depend on the rest of the file's
// imports (workshop.tsx pulls in SectionTitle/SubsectionTitle from Text).
const SubsectionTitleLite: Component<{ children: JSX.Element }> = (p) => (
  <div
    style={{
      "font-size": "14px",
      "font-weight": 600,
      color: "var(--sui-text, #e6ecf5)",
      "margin-bottom": "4px",
    }}
  >
    {p.children}
  </div>
);

// ─── bucket chain: composed mixed-shapes preview ───────────────────────────
//
// Re-creates the spirit of StatusFlowChart's "mixed shapes" using only
// the primitives we've built in this file:
//   - TaskCard (with hover popover)
//   - Side lozenges for hidden / out-of-window nodes
//   - Orthogonal routing for solid + dashed (visible→hidden) edges
//   - Lane-box container outline
//
// One static frame of the children's song chain:
//   fetchWater → wetStone → sharpenAxe → cutStraw → mendHole → fixBucket
// State chosen to land each task in a distinct status bucket so the
// visible window shows three real cards plus a hidden node on each side.
const CHAIN_STAGE_W = 720;
const CHAIN_STAGE_H = 180;
const CHAIN_PAD_X = 16;
const CHAIN_PAD_Y = 16;
const CHAIN_COL_GAP = 80; // gap between adjacent card edges
const CHAIN_LOZENGE_GAP = 32;
const CHAIN_CARD_W = NODE_W;
const CHAIN_CARD_H = NODE_H;
const CHAIN_CY = CHAIN_STAGE_H / 2;

// Pre-computed col x positions: 3 visible cards centered in the stage,
// with a lozenge anchored to each outer edge.
const CHAIN_CENTER_X = CHAIN_STAGE_W / 2;
const CHAIN_COL_0_LEFT = CHAIN_CENTER_X - CHAIN_CARD_W / 2;
const CHAIN_COL_MINUS_1_LEFT = CHAIN_COL_0_LEFT - CHAIN_COL_GAP - CHAIN_CARD_W;
const CHAIN_COL_PLUS_1_LEFT = CHAIN_COL_0_LEFT + CHAIN_CARD_W + CHAIN_COL_GAP;
const CHAIN_LEFT_LOZENGE_X = CHAIN_COL_MINUS_1_LEFT - CHAIN_LOZENGE_GAP - LOZENGE_W;
const CHAIN_RIGHT_LOZENGE_X = CHAIN_COL_PLUS_1_LEFT + CHAIN_CARD_W + CHAIN_LOZENGE_GAP;

interface ChainNode {
  task: TaskData;
  x: number;
}

function ChainStubMarker(): JSX.Element {
  return (
    <marker
      id="chain-arrow-head"
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
    </marker>
  );
}

const BucketChainChart: Component = () => {
  // Visible nodes (left → right): wetStone (DONE), sharpenAxe (DOING),
  // cutStraw (TODO). fetchWater is hidden on the left (an earlier DONE);
  // mendHole + fixBucket are hidden on the right (future TODOs).
  const nodes: ChainNode[] = [
    { task: TASKS.wetStone, x: CHAIN_COL_MINUS_1_LEFT },
    {
      task: { ...TASKS.sharpenAxe, status: "DOING" },
      x: CHAIN_COL_0_LEFT,
    },
    { task: TASKS.cutStraw, x: CHAIN_COL_PLUS_1_LEFT },
  ];
  const cards = nodes.map((n) => ({
    rect: {
      x: n.x + CHAIN_CARD_W / 2,
      y: CHAIN_CY,
      width: CHAIN_CARD_W,
      height: CHAIN_CARD_H,
    },
    task: n.task,
  }));

  // Visible→visible solid edges (dep flow points back toward the
  // not-yet-done task — wetStone ← sharpenAxe ← cutStraw → ...).
  const arrowColor = "var(--sui-accent, #00d4ff)";
  const greyColor = "rgba(255,255,255,0.45)";
  const obstacles = cards.map((c, i) => ({ id: `n${i}`, ...c.rect }));
  const solidEdges = [
    { from: cards[0].rect, to: cards[1].rect, color: arrowColor },
    { from: cards[1].rect, to: cards[2].rect, color: greyColor },
  ];
  // Dashed edges from outermost visible nodes to their respective
  // side lozenges (the hidden side-summary in a real chart).
  const leftLozengeAnchor = {
    x: CHAIN_LEFT_LOZENGE_X + LOZENGE_W / 2,
    y: CHAIN_CY,
    width: LOZENGE_W,
    height: LOZENGE_H,
  };
  const rightLozengeAnchor = {
    x: CHAIN_RIGHT_LOZENGE_X + LOZENGE_W / 2,
    y: CHAIN_CY,
    width: LOZENGE_W,
    height: LOZENGE_H,
  };

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.15)",
        border: "1px solid rgba(255,255,255,0.08)",
        "border-radius": "6px",
        padding: "12px",
      }}
    >
      <svg
        width={CHAIN_STAGE_W}
        height={CHAIN_STAGE_H}
        viewBox={`0 0 ${CHAIN_STAGE_W} ${CHAIN_STAGE_H}`}
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <ChainStubMarker />
        </defs>
        {/* Lane-box outline */}
        <rect
          x={CHAIN_PAD_X}
          y={CHAIN_PAD_Y}
          width={CHAIN_STAGE_W - CHAIN_PAD_X * 2}
          height={CHAIN_STAGE_H - CHAIN_PAD_Y * 2}
          rx={8}
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.1)"
          stroke-width="1"
        />
        {/* Side lozenges */}
        <For each={[
          { x: CHAIN_LEFT_LOZENGE_X, count: 1 },
          { x: CHAIN_RIGHT_LOZENGE_X, count: 2 },
        ]}>
          {(loz) => (
            <>
              <rect
                x={loz.x}
                y={CHAIN_CY - LOZENGE_H / 2}
                width={LOZENGE_W}
                height={LOZENGE_H}
                rx={LOZENGE_W / 2}
                fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.4)"
                stroke-width="1"
              />
              <text
                x={loz.x + LOZENGE_W / 2}
                y={CHAIN_CY}
                text-anchor="middle"
                dominant-baseline="central"
                fill="rgba(255,255,255,0.55)"
                font-size="9"
                font-family="ui-monospace, SFMono-Regular, monospace"
              >
                {loz.count}
              </text>
            </>
          )}
        </For>
        {/* Visible→visible edges */}
        <For each={solidEdges}>
          {(e) => (
            <path
              d={orthogonalAvoidingObstacles(
                e.from,
                e.to,
                obstacles.filter(
                  (o) =>
                    !(o.x === e.from.x && o.y === e.from.y) &&
                    !(o.x === e.to.x && o.y === e.to.y),
                ),
              )}
              fill="none"
              stroke={e.color}
              stroke-width="1.5"
              marker-end="url(#chain-arrow-head)"
              style={{ color: e.color }}
            />
          )}
        </For>
        {/* Visible→hidden dashed dep arrows to each lozenge */}
        <path
          d={orthogonalAvoidingObstacles(
            cards[0].rect,
            leftLozengeAnchor,
            [],
          )}
          fill="none"
          stroke={greyColor}
          stroke-width="1.5"
          stroke-dasharray="4 3"
          marker-end="url(#chain-arrow-head)"
          style={{ color: greyColor }}
        />
        <path
          d={orthogonalAvoidingObstacles(
            cards[2].rect,
            rightLozengeAnchor,
            [],
          )}
          fill="none"
          stroke={greyColor}
          stroke-width="1.5"
          stroke-dasharray="4 3"
          marker-end="url(#chain-arrow-head)"
          style={{ color: greyColor }}
        />
        {/* Task cards — rendered last so they sit on top of edges */}
        <For each={cards}>
          {(c) => (
            <TaskCard
              x={c.rect.x - c.rect.width / 2}
              y={c.rect.y - c.rect.height / 2}
              width={c.rect.width}
              height={c.rect.height}
              visible={true}
              task={c.task}
            />
          )}
        </For>
      </svg>
    </div>
  );
};

const SlurpOutLtr: Component = () => (
  <SlurpStage direction="ltr" phase="out" task={TASKS.mendHole} />
);
const SlurpOutRtl: Component = () => (
  <SlurpStage direction="rtl" phase="out" task={TASKS.cutStraw} />
);
const SlurpInLtr: Component = () => (
  <SlurpStage direction="ltr" phase="in" task={TASKS.sharpenAxe} />
);
const SlurpInRtl: Component = () => (
  <SlurpStage direction="rtl" phase="in" task={TASKS.wetStone} />
);

// ─── shared styles ──────────────────────────────────────────────────────────
const demoBoxStyle = {
  background: "rgba(0,0,0,0.15)",
  border: "1px solid rgba(255,255,255,0.08)",
  "border-radius": "6px",
  padding: "12px",
  height: "200px",
  display: "flex",
  "flex-direction": "column",
  "align-items": "center",
  "justify-content": "center",
  gap: "12px",
} as const;

const buttonStyle = {
  padding: "6px 14px",
  "font-size": "12px",
  "font-family": "inherit",
  color: "var(--sui-text, #e6ecf5)",
  background: "var(--sui-surface, rgba(0,0,0,0.2))",
  border: "1px solid var(--sui-border, rgba(255,255,255,0.15))",
  "border-radius": "4px",
  cursor: "pointer",
} as const;

const buttonRowStyle = {
  display: "flex",
  gap: "8px",
  "justify-content": "center",
} as const;

// ─── registry ───────────────────────────────────────────────────────────────
const EXPERIMENTS: Experiment[] = [
  {
    id: "slurp-with-dep",
    label: "slurp · fulfilling a dependency",
    description:
      "Existing source node on the left has a hidden dependency in the right-side lozenge. On play, the new node slurp-outs leftward while a dep arrow grows from the source's right edge, tracking the new node's leading (left) edge. The arrow appears to drag the node into view.",
    Demo: SlurpDep,
  },
  {
    id: "slurp-out-ltr",
    label: "slurp-out · left → right",
    description:
      "Node emerges from the lozenge on the left. Leading edge sweeps right and reaches full height first; trailing edge lands in its rest column at t≈0.55 and squares up to full height ~300ms later.",
    Demo: SlurpOutLtr,
  },
  {
    id: "slurp-out-rtl",
    label: "slurp-out · right → left",
    description: "Mirror of slurp-out: lozenge on the right, node extrudes leftward.",
    Demo: SlurpOutRtl,
  },
  {
    id: "slurp-in-ltr",
    label: "slurp-in · right → left (into left lozenge)",
    description:
      "Reverse of slurp-out: node at rest collapses into the lozenge. Trailing edge moves first toward the lozenge, then height collapses to the 1rem slit.",
    Demo: SlurpInLtr,
  },
  {
    id: "slurp-in-rtl",
    label: "slurp-in · left → right (into right lozenge)",
    description: "Mirror of slurp-in: node retreats into the lozenge on the right.",
    Demo: SlurpInRtl,
  },
  {
    id: "bucket-chain",
    label: "mixed-shapes preview · bucket-song chain",
    description:
      "Composes the primitives — TaskCard + hover popover + side lozenges + orthogonal dashed/solid edges — into one static frame. wetStone (DONE) → sharpenAxe (DOING) → cutStraw (TODO) with hidden tasks summarised in side lozenges. Closest preview of what a real SwimlaneDAG row will look like.",
    Demo: BucketChainChart,
  },
];

// ─── separate row export for the full mixed-shapes preview ─────────────────
export { MixedShapesRow };

// ─── row entrypoint ─────────────────────────────────────────────────────────
export const AnimationExperimentsRow: Component = () => {
  return (
    <>
      <div class="workshop-grid__cell">
        <div
          style={{
            "font-family": "ui-monospace, SFMono-Regular, monospace",
            "font-size": "12px",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <p style={{ margin: "0 0 8px" }}>
            Each experiment isolates one effect. Use the play button to
            restart the animation. Once an effect feels right, we'll
            name it and compose it into the SwimlaneChart pipeline.
          </p>
          <p style={{ margin: "0", color: "rgba(255,255,255,0.5)" }}>
            Add more experiments by appending to{" "}
            <code>EXPERIMENTS</code> in{" "}
            <code>dev/showcases/animation-experiments.tsx</code>.
          </p>
        </div>
      </div>
      <div class="workshop-grid__cell">
        <div
          style={{
            display: "grid",
            "grid-template-columns": "repeat(2, 1fr)",
            gap: "12px",
          }}
        >
          <For each={EXPERIMENTS}>
            {(e) => (
              <div>
                <div
                  style={{
                    "font-family": "ui-monospace, SFMono-Regular, monospace",
                    "font-size": "12px",
                    color: "var(--sui-accent, #00d4ff)",
                    "margin-bottom": "4px",
                  }}
                >
                  {e.label}
                </div>
                <div
                  style={{
                    "font-size": "11px",
                    color: "rgba(255,255,255,0.55)",
                    "margin-bottom": "8px",
                  }}
                >
                  {e.description}
                </div>
                <e.Demo />
              </div>
            )}
          </For>
        </div>
      </div>
    </>
  );
};
