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
import { Component, createSignal, For, JSX, Show } from "solid-js";

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
}): JSX.Element {
  const [hovered, setHovered] = createSignal(false);
  const theme = () => statusTheme(props.task.status);
  return (
    <foreignObject
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      overflow="visible"
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        onPointerEnter={() => props.visible && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
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
        <Show when={hovered()}>
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: "0",
              width: "260px",
              padding: "8px 10px",
              background: "var(--sui-bg-deep, #0c141c)",
              border: "1px solid var(--sui-border, rgba(255,255,255,0.18))",
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
];

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
