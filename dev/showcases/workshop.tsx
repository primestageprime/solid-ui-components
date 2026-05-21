import { Component, createSignal, onCleanup, onMount } from "solid-js";
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
 *   1. every DOING item completes (-> DONE)
 *   2. every TODO whose deps are all DONE starts in parallel (-> DOING)
 * When every node is done, the loop resets to the initial state.
 *
 * Nodes keep their topological col (-3..+3) throughout — only their
 * status changes. The SwimlaneChart shows as many depth rings as the
 * container width allows; deeper rings collapse into boundary badges.
 */
const AnimatedDag: Component = () => {
  const [statuses, setStatuses] = createSignal<Record<string, Status>>(
    initialStatuses(),
  );

  const tick = () => {
    setStatuses((prev) => {
      const next = { ...prev };
      for (const id of TOPO_ORDER) {
        if (next[id] === "doing") next[id] = "done";
      }
      for (const id of TOPO_ORDER) {
        if (next[id] === "todo" && allDepsDone(id, next)) next[id] = "doing";
      }
      if (TOPO_ORDER.every((id) => next[id] === "done")) {
        return initialStatuses();
      }
      return next;
    });
  };

  let timer: ReturnType<typeof setInterval> | undefined;
  onMount(() => {
    timer = setInterval(tick, TICK_MS);
  });
  onCleanup(() => {
    if (timer) clearInterval(timer);
  });

  // Where do the current DOING nodes sit, in topology-col space? We
  // shift every node by this amount so the DOING column always renders
  // at chart-col 0 (= viewport center). Asymmetry between the two sides
  // is fine and expected.
  const doingShift = (): number => {
    const s = statuses();
    const cols = MULTI_DEPS.nodes
      .filter((n) => s[n.id] === "doing")
      .map((n) => n.data.col)
      .sort((a, b) => a - b);
    if (cols.length === 0) return 0;
    return cols[Math.floor(cols.length / 2)]; // median
  };

  const animatedNodes = (): DAGNode<AnimNode>[] => {
    const s = statuses();
    const shift = doingShift();
    return MULTI_DEPS.nodes.map((n) => ({
      id: n.id,
      data: {
        label: n.data.label,
        col: n.data.col - shift,
        status: s[n.id],
      },
    }));
  };

  return (
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
        maxDepth={3}
        interactive={false}
      />
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
