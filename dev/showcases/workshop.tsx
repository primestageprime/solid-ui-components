import { Component, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { SectionTitle, SubsectionTitle } from "../../src/components/Text";
import { JsonPanel, MULTI_DEPS } from "./swimlane-chart";
import { LinearFlowSwimlaneChart } from "../../src/components/SwimlaneChart";
import type { DAGNode, NodeRenderState } from "../../src/components/DagChart";
import { Surface } from "../../src/components/Surface";
import { Stack } from "../../src/components/Layout";
import { TextLabel, EllipsizedTitle } from "../../src/components/Text";
import { DigitRoller } from "../../src/components/DataDisplay";

type Status = "todo" | "doing" | "done";

// Linear 8-node chain: n1 → n2 → … → n8. Topology cols span -3..+4 so
// the chain has 7 "depth rings" of work on either side of DOING.
const LINEAR_CHAIN = {
  nodes: Array.from({ length: 8 }, (_, i) => ({
    id: `n${i + 1}`,
    data: { label: `Step ${i + 1}`, col: i - 3 },
  })),
  edges: Array.from({ length: 7 }, (_, i) => ({
    source: `n${i + 1}`,
    target: `n${i + 2}`,
  })),
};

const TOPO_ORDER = LINEAR_CHAIN.nodes.map((n) => n.id);

const DEPS_BY_NODE: Record<string, string[]> = {};
for (const e of LINEAR_CHAIN.edges) {
  (DEPS_BY_NODE[e.target] ??= []).push(e.source);
}

const TICK_MS = 3000;

const allTodo = (): Record<string, Status> =>
  Object.fromEntries(LINEAR_CHAIN.nodes.map((n) => [n.id, "todo" as Status]));

const allDepsDone = (
  id: string,
  statuses: Record<string, Status>,
): boolean => (DEPS_BY_NODE[id] ?? []).every((dep) => statuses[dep] === "done");

// Initial state: every TODO whose dependencies are already satisfied is
// promoted to DOING. With an empty graph state, that's every source.
const initialStatuses = (): Record<string, Status> => {
  const out = allTodo();
  for (const id of TOPO_ORDER) {
    if (out[id] === "todo" && allDepsDone(id, out)) out[id] = "doing";
  }
  return out;
};

// ─── Animation-aware node renderer ────────────────────────────────────────
// Topology stays in MULTI_DEPS (cols -3..+3 by dependency depth). The
// node's STATUS — a separate property that the animation flips over
// time — drives the visual color + label.
type AnimNode = { label: string; col: number; status: Status };

const STATUS_LABEL: Record<Status, string> = {
  todo: "TODO",
  doing: "DOING",
  done: "COMPLETED",
};
const STATUS_TINT: Record<Status, { bg: string; border: string }> = {
  todo: { bg: "rgba(95,179,124,0.10)", border: "rgba(95,179,124,0.5)" },
  doing: { bg: "rgba(0,212,255,0.10)", border: "var(--sui-accent, #00d4ff)" },
  done: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.18)" },
};

const renderAnimNode = (node: DAGNode<AnimNode>, state: NodeRenderState) => {
  if (state.kind === "collapsed") {
    return (
      <Surface
        padding="sm"
        radius="sm"
        bg="rgba(255,255,255,0.03)"
        borderColor="rgba(255,255,255,0.25)"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "border-style": "dashed",
        }}
      >
        ({state.collapsedCount} {state.collapsedCount === 1 ? "node" : "nodes"}…)
      </Surface>
    );
  }
  const tint = STATUS_TINT[node.data.status];
  return (
    <Surface
      padding="sm"
      radius="sm"
      bg={tint.bg}
      borderColor={tint.border}
      style={{ width: "100%", height: "100%" }}
    >
      <Stack gap="xs">
        <TextLabel>{STATUS_LABEL[node.data.status]}</TextLabel>
        <EllipsizedTitle>{node.data.label}</EllipsizedTitle>
      </Stack>
    </Surface>
  );
};

/**
 * Cycles through the MULTI_DEPS graph. Every TICK_MS:
 *   1. ONE DOING item completes (-> DONE) — the first by topo order
 *   2. every TODO whose deps are now all DONE starts in parallel (-> DOING)
 * When every node is done, the loop resets to the initial state.
 */
const computeNext = (
  prev: Record<string, Status>,
): Record<string, Status> => {
  const next = { ...prev };
  const toFinish = TOPO_ORDER.find((id) => next[id] === "doing");
  if (toFinish) next[toFinish] = "done";
  for (const id of TOPO_ORDER) {
    if (next[id] === "todo" && allDepsDone(id, next)) next[id] = "doing";
  }
  if (TOPO_ORDER.every((id) => next[id] === "done")) {
    return initialStatuses();
  }
  return next;
};

// First-row rules (linear 8-node chain):
//   1. Use the compressed view: nodes that don't fit collapse into the
//      summary circle badges on the side they overflowed to.
//   2. DOING stays in the center (col 0) at all times.
//   3. No node ever extends past the edge of the available space —
//      `effectiveMaxDepth` must always pick a depth whose total width
//      fits within `containerWidth`.
const AnimatedDag: Component = () => {
  // History of states allows Prev to step back through frames already
  // visited. Advancing past the history's end computes a new frame.
  const [history, setHistory] = createSignal<Record<string, Status>[]>([
    initialStatuses(),
  ]);
  const [historyIdx, setHistoryIdx] = createSignal(0);
  const [playing, setPlaying] = createSignal(true);

  const statuses = () => history()[historyIdx()];
  const setStatuses = (next: Record<string, Status>) => {
    const idx = historyIdx();
    setHistory((h) => [...h.slice(0, idx + 1), next]);
    setHistoryIdx(idx + 1);
  };

  const advance = () => {
    const idx = historyIdx();
    const h = history();
    if (idx + 1 < h.length) {
      setHistoryIdx(idx + 1); // replay a future-of-cursor frame
    } else {
      setStatuses(computeNext(h[idx]));
    }
  };

  const goBack = () => {
    const idx = historyIdx();
    if (idx > 0) setHistoryIdx(idx - 1);
  };

  const togglePlay = () => setPlaying((p) => !p);

  createEffect(() => {
    if (!playing()) return;
    const timer = setInterval(advance, TICK_MS);
    onCleanup(() => clearInterval(timer));
  });

  // Col mapping: every node's column is its topo distance from the
  // current DOING node. DOING → 0, prior nodes get negative cols in
  // strict order (done → done → done from left to right of center),
  // upcoming nodes get positive cols. This guarantees a node always
  // sits to the left of its dependent, which a status-then-topo
  // mapping can break when adjacent nodes share a status.
  const animatedNodes = (): DAGNode<AnimNode>[] => {
    const s = statuses();
    const doingIdx = TOPO_ORDER.findIndex((id) => s[id] === "doing");
    const center = doingIdx >= 0 ? doingIdx : 0;
    return LINEAR_CHAIN.nodes.map((n, i) => ({
      id: n.id,
      data: {
        label: n.data.label,
        col: i - center,
        status: s[n.id],
      },
    }));
  };

  const btnStyle = {
    padding: "6px 14px",
    "font-size": "12px",
    "font-family": "inherit",
    color: "var(--sui-text, #e6ecf5)",
    background: "var(--sui-surface, rgba(0,0,0,0.2))",
    border: "1px solid var(--sui-border, rgba(255,255,255,0.15))",
    "border-radius": "4px",
    cursor: "pointer",
  } as const;

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
        <button
          type="button"
          style={btnStyle}
          onClick={goBack}
          disabled={historyIdx() === 0}
        >
          ← Prev
        </button>
        <button type="button" style={btnStyle} onClick={togglePlay}>
          {playing() ? "⏸ Pause" : "▶ Play"}
        </button>
        <button type="button" style={btnStyle} onClick={advance}>
          Next →
        </button>
        <span style={{ "font-size": "11px", color: "rgba(255,255,255,0.5)" }}>
          frame {historyIdx() + 1} / {history().length}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: "560px",
          "min-width": "360px",
          border: "1px dashed rgba(255,255,255,0.12)",
          "border-radius": "4px",
          "box-sizing": "border-box",
        }}
      >
        {/* LinearFlowSwimlaneChart is the curried variant that bakes in
            the depth/collapse/center defaults this row needs (per ADR-0001).
            Consumer only passes data + render callback. */}
        <LinearFlowSwimlaneChart
          nodes={animatedNodes()}
          edges={LINEAR_CHAIN.edges}
          swimlaneFor={(n) => n.data.col}
          renderNode={renderAnimNode}
        />
      </div>
    </div>
  );
};

/**
 * Standalone CSS-keyframe demo of the "compress into badge" effect.
 *   - The rectangle shrinks toward its right edge (transform-origin),
 *     vertically compresses, skews slightly, and slides left.
 *   - border-radius animates from 8px (rect) to 50% (circle).
 *   - The badge circle fades in as the rectangle fades out.
 *   - Loops every 4s so it's easy to inspect.
 */
const CompressDemo: Component = () => {
  // The CSS loop is 4s. At t=0 the left box is FULL and the right box
  // is COMPRESSED (just emerged from the right badge). At t=2s the
  // left has collapsed into its badge and the right has grown to full.
  // Counts roll in opposite directions: left badge gains a node (count
  // up) each cycle, right badge loses one (count down) — mirroring the
  // real chart where a leaving node is absorbed on one side while an
  // entering node emerges on the other.
  const [leftCount, setLeftCount] = createSignal(3);
  const [leftPrev, setLeftPrev] = createSignal(2);
  const [rightCount, setRightCount] = createSignal(5);
  const [rightPrev, setRightPrev] = createSignal(6);
  const LOOP_MS = 4000;
  const ROLL_OFFSET_MS = LOOP_MS * 0.5; // peak of compression (left side)

  let intervalId: ReturnType<typeof setInterval> | undefined;
  let kickoff: ReturnType<typeof setTimeout> | undefined;
  onMount(() => {
    kickoff = setTimeout(() => {
      const bump = () => {
        setLeftPrev(leftCount());
        setLeftCount((c) => c + 1);
        setRightPrev(rightCount());
        setRightCount((c) => Math.max(0, c - 1));
      };
      bump();
      intervalId = setInterval(bump, LOOP_MS);
    }, ROLL_OFFSET_MS);
  });
  onCleanup(() => {
    if (kickoff) clearTimeout(kickoff);
    if (intervalId) clearInterval(intervalId);
  });

  return (
    <div class="compress-demo">
      <div class="compress-demo__track">
        {/* Boxes first in DOM → badges paint on top (no z-index needed). */}
        <div class="compress-demo__box compress-demo__box--left">
          <div class="compress-demo__box-label">LEAVING</div>
          <div class="compress-demo__box-title">absorbed left</div>
        </div>
        <div class="compress-demo__box compress-demo__box--right">
          <div class="compress-demo__box-label">ENTERING</div>
          <div class="compress-demo__box-title">emerges right</div>
        </div>
        <div class="compress-demo__badge compress-demo__badge--left">
          <DigitRoller
            value={String(leftCount())}
            previousValue={String(leftPrev())}
            animate
            duration={400}
            stagger={60}
          />
        </div>
        <div class="compress-demo__badge compress-demo__badge--right">
          <DigitRoller
            value={String(rightCount())}
            previousValue={String(rightPrev())}
            animate
            duration={400}
            stagger={60}
          />
        </div>
      </div>
      <p class="compress-demo__caption">
        left absorbs (count↑) · right emerges (count↓) · 4s mirrored loop
      </p>
    </div>
  );
};

export const WorkshopShowcase: Component = () => {
  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop</SectionTitle>
      <div class="workshop-grid">
        <div class="workshop-grid__cell">
          <SubsectionTitle>animation — every 3s, all DOING -> DONE, all ready TODOs start</SubsectionTitle>
          <JsonPanel value={MULTI_DEPS} heightLines={10} />
        </div>
        <div class="workshop-grid__cell">
          <AnimatedDag />
        </div>

        <div class="workshop-grid__cell">
          <SubsectionTitle>compress preview — rect morphs into badge circle</SubsectionTitle>
          <p style={{ "font-size": "12px", color: "rgba(255,255,255,0.6)" }}>
            Animation a node would play if pushed past the visible edge:
            shrinks toward where its boundary badge sits, skewing slightly
            so it reads as "extruded into the circle".
          </p>
        </div>
        <div class="workshop-grid__cell">
          <CompressDemo />
        </div>
      </div>
    </div>
  );
};
