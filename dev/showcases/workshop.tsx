import { Component, createEffect, createSignal, onCleanup } from "solid-js";
import { SectionTitle, SubsectionTitle } from "../../src/components/Text";
import { JsonPanel, MULTI_DEPS } from "./swimlane-chart";
import { SwimlaneChart } from "../../src/components/SwimlaneChart";
import type { DAGNode, NodeRenderState } from "../../src/components/DagChart";
import { Surface } from "../../src/components/Surface";
import { Stack } from "../../src/components/Layout";
import { TextLabel, EllipsizedTitle } from "../../src/components/Text";

type Status = "todo" | "doing" | "done";

// Topological order: a node always appears after all its dependencies,
// so the simulation advances through this list left-to-right.
const TOPO_ORDER = [
  "cf1", "cf2",
  "cm1", "cm2", "cm3",
  "c1", "c2", "c3",
  "active",
  "t1", "t2",
  "tn1", "tn2",
  "tf1",
];

const DEPS_BY_NODE: Record<string, string[]> = {};
for (const e of MULTI_DEPS.edges) {
  (DEPS_BY_NODE[e.target] ??= []).push(e.source);
}

const TICK_MS = 3000;

const allTodo = (): Record<string, Status> =>
  Object.fromEntries(MULTI_DEPS.nodes.map((n) => [n.id, "todo" as Status]));

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

  // Col mapping combines status + topology:
  //   - status === "doing"     → col 0 (center reserved for DOING)
  //   - status === "done"      → min(-1, topoCol) (left side, topo-aware)
  //   - status === "todo"      → max(+1, topoCol) (right side, topo-aware)
  // Nodes at topology col 0 (active) flip to -1 / +1 instead of 0 when
  // not doing, so the center stays exclusively for DOING.
  const statusToCol = (status: Status, topoCol: number): number => {
    if (status === "doing") return 0;
    if (status === "done") return Math.min(-1, topoCol);
    return Math.max(1, topoCol);
  };

  const animatedNodes = (): DAGNode<AnimNode>[] => {
    const s = statuses();
    return MULTI_DEPS.nodes.map((n) => ({
      id: n.id,
      data: {
        label: n.data.label,
        col: statusToCol(s[n.id], n.data.col),
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
        <SwimlaneChart
          nodes={animatedNodes()}
          edges={MULTI_DEPS.edges}
          swimlaneFor={(n) => n.data.col}
          renderNode={renderAnimNode}
          nodeSize={() => [160, 56]}
          /* maxDepth=3 covers the full topology (cf at -3, tf at +3) but
             responsiveCollapse=true lets the chart show fewer rings when
             the container is narrow. Wide container → all 7 cols + no
             summaries. Narrow → depth shrinks, outer rings collapse into
             per-anchor badges. DOING (col 0) always stays at center. */
          maxDepth={3}
          responsiveCollapse={true}
          interactive={false}
        />
      </div>
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
      </div>
    </div>
  );
};
