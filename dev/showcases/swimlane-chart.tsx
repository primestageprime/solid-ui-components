import { Component, For, JSX, createEffect, createSignal, onCleanup } from "solid-js";
import { SwimlaneChart, LinearFlowSwimlaneChart } from "../../src/components/SwimlaneChart";
import type { DAGNode, NodeRenderState } from "../../src/components/DagChart";
import { Surface } from "../../src/components/Surface";
import { Stack } from "../../src/components/Layout";
import {
  TextLabel,
  EllipsizedTitle,
  SectionTitle,
  SubsectionTitle,
} from "../../src/components/Text";

// ─── JSON syntax highlighter ──────────────────────────────────────────────
const JSON_TOKEN = /("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\],])/;

function highlightJson(json: string): JSX.Element {
  const parts = json.split(JSON_TOKEN);
  return (
    <For each={parts}>
      {(part, i) => {
        if (i() % 2 === 0) return <>{part}</>;
        if (part.endsWith(":")) return <span class="json-key">{part}</span>;
        if (part.startsWith('"')) return <span class="json-string">{part}</span>;
        if (part === "true" || part === "false")
          return <span class="json-bool">{part}</span>;
        if (part === "null") return <span class="json-null">{part}</span>;
        if (/^-?\d/.test(part)) return <span class="json-number">{part}</span>;
        return <span class="json-punct">{part}</span>;
      }}
    </For>
  );
}

// ─── JsonPanel component ──────────────────────────────────────────────────
type JsonPanelProps = {
  value: unknown;
  widthCh?: number;
  heightLines?: number;
};

export const JsonPanel: Component<JsonPanelProps> = (props) => {
  const widthCh = () => props.widthCh ?? 40;
  const heightLines = () => props.heightLines ?? 20;
  const formatted = () => JSON.stringify(props.value, null, 2);
  return (
    <pre
      class="json-panel"
      style={{
        width: `${widthCh()}ch`,
        height: `${heightLines() * 1.4}em`,
      }}
    >
      {highlightJson(formatted())}
    </pre>
  );
};

// ─── Stub data ────────────────────────────────────────────────────────────
// Node data carries a signed `col` so SwimlaneChart positions it relative
// to center. 0 = DOING/center; negative = completed (left, dependency
// side); positive = todo (right, dependent side).
export type StubData = { label: string; col: number };
export type StubGraph = {
  nodes: DAGNode<StubData>[];
  edges: { source: string; target: string }[];
};

export const SINGLE_NODE: StubGraph = {
  nodes: [{ id: "a", data: { label: "Solo node", col: 0 } }],
  edges: [],
};

export const LINEAR_THREE: StubGraph = {
  nodes: [
    { id: "a", data: { label: "First", col: -1 } },
    { id: "b", data: { label: "Middle", col: 0 } },
    { id: "c", data: { label: "Last", col: 1 } },
  ],
  edges: [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
  ],
};

// 5 nodes mapped to lanes by dependency depth:
//   A, B (col -1) — independents on the left
//   C, D (col  0) — C depends on A; D depends on A + B
//   E   (col +1) — depends on both dependents (C + D)
export const FIVE_DIAMOND: StubGraph = {
  nodes: [
    { id: "a", data: { label: "Independent A", col: -1 } },
    { id: "b", data: { label: "Independent B", col: -1 } },
    { id: "c", data: { label: "Depends on A", col: 0 } },
    { id: "d", data: { label: "Depends on A + B", col: 0 } },
    { id: "e", data: { label: "Depends on C + D", col: 1 } },
  ],
  edges: [
    { source: "a", target: "c" },
    { source: "a", target: "d" },
    { source: "b", target: "d" },
    { source: "c", target: "e" },
    { source: "d", target: "e" },
  ],
};

// Two layers on each side, each in its OWN column.
export const TWO_LAYERS: StubGraph = {
  nodes: [
    { id: "c_far", data: { label: "Completed (layer 2)", col: -2 } },
    { id: "c_near", data: { label: "Completed (layer 1)", col: -1 } },
    { id: "active", data: { label: "In progress", col: 0 } },
    { id: "t_near", data: { label: "Todo (layer 1)", col: 1 } },
    { id: "t_far", data: { label: "Todo (layer 2)", col: 2 } },
  ],
  edges: [
    { source: "c_far", target: "c_near" },
    { source: "c_near", target: "active" },
    { source: "active", target: "t_near" },
    { source: "t_near", target: "t_far" },
  ],
};

// Multi-dep graph designed so the left subtree totals 8 nodes and the
// right subtree totals 5. Several nodes have 2+ deps; the tree branches
// and re-converges through `active`.
export const MULTI_DEPS: StubGraph = {
  nodes: [
    // Left subtree (8 nodes)
    { id: "cf1", data: { label: "Far A", col: -3 } },
    { id: "cf2", data: { label: "Far B", col: -3 } },
    { id: "cm1", data: { label: "Mid A", col: -2 } },
    { id: "cm2", data: { label: "Mid B (deps on Far A+B)", col: -2 } },
    { id: "cm3", data: { label: "Mid C", col: -2 } },
    { id: "c1", data: { label: "Near A (deps on Mid A+B)", col: -1 } },
    { id: "c2", data: { label: "Near B (deps on Mid B+C)", col: -1 } },
    { id: "c3", data: { label: "Near C", col: -1 } },
    // Center
    { id: "active", data: { label: "In progress", col: 0 } },
    // Right subtree (5 nodes)
    { id: "t1", data: { label: "Up next A", col: 1 } },
    { id: "t2", data: { label: "Up next B", col: 1 } },
    { id: "tn1", data: { label: "Then (deps on A+B)", col: 2 } },
    { id: "tn2", data: { label: "Then alt", col: 2 } },
    { id: "tf1", data: { label: "Final (deps on Then A+B)", col: 3 } },
  ],
  edges: [
    { source: "cf1", target: "cm1" },
    { source: "cf1", target: "cm2" },
    { source: "cf2", target: "cm2" },
    { source: "cf2", target: "cm3" },
    { source: "cm1", target: "c1" },
    { source: "cm2", target: "c1" },
    { source: "cm2", target: "c2" },
    { source: "cm3", target: "c2" },
    { source: "cm3", target: "c3" },
    { source: "c1", target: "active" },
    { source: "c2", target: "active" },
    { source: "c3", target: "active" },
    { source: "active", target: "t1" },
    { source: "active", target: "t2" },
    { source: "t1", target: "tn1" },
    { source: "t2", target: "tn1" },
    { source: "t2", target: "tn2" },
    { source: "tn1", target: "tf1" },
    { source: "tn2", target: "tf1" },
  ],
};

// ─── Node renderer ────────────────────────────────────────────────────────
const colLabel = (col: number): string =>
  col < 0 ? "COMPLETED" : col > 0 ? "TODO" : "DOING";

const colTint = (col: number): { bg: string; border: string } => {
  if (col < 0) return { bg: "rgba(95,179,124,0.10)", border: "rgba(95,179,124,0.5)" }; // DONE → green
  if (col > 0) return { bg: "var(--sui-bg-secondary)", border: "var(--sui-border-bright)" }; // TODO → grey
  return { bg: "rgba(var(--sui-accent-rgb),0.10)", border: "var(--sui-accent)" }; // DOING → cyan
};

export const renderStubNode = (
  node: DAGNode<StubData>,
  state: { kind: string; collapsedCount?: number },
) => {
  if (state.kind === "collapsed") {
    return (
      <Surface
        padding="sm"
        radius="sm"
        bg="var(--sui-bg-secondary)"
        borderColor="var(--sui-border-bright)"
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
  const tint = colTint(node.data.col);
  return (
    <Surface
      padding="sm"
      radius="sm"
      bg={tint.bg}
      borderColor={tint.border}
      style={{ width: "100%", height: "100%" }}
    >
      <Stack gap="xs">
        <TextLabel>{colLabel(node.data.col)}</TextLabel>
        <EllipsizedTitle>{node.data.label}</EllipsizedTitle>
      </Stack>
    </Surface>
  );
};

// ─── StubChart: a fixed-size or flexible-width SwimlaneChart wrapper ──────
export const StubChart: Component<{
  graph: StubGraph;
  width?: string;
  minWidth?: string;
  maxDepth?: number;
}> = (props) => (
  <div
    style={{
      width: props.width ?? "100%",
      height: `${10 * 1.4}em`,
      "min-width": props.minWidth ?? "320px",
      border: "1px dashed var(--sui-border)",
      "border-radius": "4px",
      "box-sizing": "border-box",
    }}
  >
    <SwimlaneChart
      nodes={props.graph.nodes}
      edges={props.graph.edges}
      swimlaneFor={(n) => n.data.col}
      renderNode={renderStubNode}
      nodeSize={() => [160, 56]}
      maxDepth={props.maxDepth ?? 3}
      interactive={false}
    />
  </div>
);

// ─── Animated linear chain (live demo) ───────────────────────────────────
// Demonstrates SwimlaneChart's compress/expand animation: each tick a node
// advances TODO → DOING → DONE; cols are computed from graph distance to
// the current DOING node so nodes slide horizontally through the visible
// window. When the window can't hold every node, the overflow side renders
// a boundary summary badge.

type AnimStatus = "todo" | "doing" | "done";

const ANIM_CHAIN_NODES = Array.from({ length: 8 }, (_, i) => ({
  id: `n${i + 1}`,
  data: { label: `Step ${i + 1}` },
}));
const ANIM_CHAIN_EDGES = Array.from({ length: 7 }, (_, i) => ({
  source: `n${i + 1}`,
  target: `n${i + 2}`,
}));

const ANIM_STATUS_LABEL: Record<AnimStatus, string> = {
  todo: "TODO",
  doing: "DOING",
  done: "COMPLETED",
};
const ANIM_STATUS_TINT: Record<AnimStatus, { bg: string; border: string }> = {
  todo: { bg: "var(--sui-bg-secondary)", border: "var(--sui-border-bright)" }, // grey
  doing: { bg: "rgba(var(--sui-accent-rgb),0.10)", border: "var(--sui-accent)" },
  done: { bg: "rgba(95,179,124,0.10)", border: "rgba(95,179,124,0.5)" }, // green
};

type AnimNodeData = { label: string; col: number; status: AnimStatus };

const renderAnimNode = (
  node: DAGNode<AnimNodeData>,
  state: NodeRenderState,
) => {
  if (state.kind === "collapsed") {
    return (
      <Surface
        padding="sm"
        radius="sm"
        bg="var(--sui-bg-secondary)"
        borderColor="var(--sui-border-bright)"
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
  const tint = ANIM_STATUS_TINT[node.data.status];
  return (
    <Surface
      padding="sm"
      radius="sm"
      bg={tint.bg}
      borderColor={tint.border}
      style={{ width: "100%", height: "100%" }}
    >
      <Stack gap="xs">
        <TextLabel>{ANIM_STATUS_LABEL[node.data.status]}</TextLabel>
        <EllipsizedTitle>{node.data.label}</EllipsizedTitle>
      </Stack>
    </Surface>
  );
};

const ANIM_TICK_MS = 3000;

// Walks the chain TODO → DOING → DONE one node per tick, resets at the end.
// Col is the signed graph distance from the current DOING node — descendants
// get positive cols, ancestors get negative.
const AnimatedChain: Component = () => {
  const initStatuses = (): Record<string, AnimStatus> => {
    const s: Record<string, AnimStatus> = {};
    for (const n of ANIM_CHAIN_NODES) s[n.id] = "todo";
    s.n1 = "doing";
    return s;
  };
  const nextStatuses = (prev: Record<string, AnimStatus>): Record<string, AnimStatus> => {
    const next = { ...prev };
    const doingIdx = ANIM_CHAIN_NODES.findIndex((n) => next[n.id] === "doing");
    if (doingIdx < 0) return initStatuses();
    next[ANIM_CHAIN_NODES[doingIdx].id] = "done";
    const nextId = ANIM_CHAIN_NODES[doingIdx + 1]?.id;
    if (nextId) next[nextId] = "doing";
    else return initStatuses();
    return next;
  };
  const colByStatus = (s: Record<string, AnimStatus>): Record<string, number> => {
    const doingIdx = ANIM_CHAIN_NODES.findIndex((n) => s[n.id] === "doing");
    const cols: Record<string, number> = {};
    for (let i = 0; i < ANIM_CHAIN_NODES.length; i++) {
      cols[ANIM_CHAIN_NODES[i].id] = doingIdx >= 0 ? i - doingIdx : 0;
    }
    return cols;
  };

  const [history, setHistory] = createSignal<Record<string, AnimStatus>[]>([initStatuses()]);
  const [idx, setIdx] = createSignal(0);
  const [playing, setPlaying] = createSignal(false);
  const current = () => history()[idx()];
  const advance = () => {
    const h = history();
    const i = idx();
    if (i + 1 < h.length) setIdx(i + 1);
    else {
      setHistory([...h, nextStatuses(h[i])]);
      setIdx(i + 1);
    }
  };
  const goBack = () => idx() > 0 && setIdx(idx() - 1);

  createEffect(() => {
    if (!playing()) return;
    const t = setInterval(advance, ANIM_TICK_MS);
    onCleanup(() => clearInterval(t));
  });

  const nodes = (): DAGNode<AnimNodeData>[] => {
    const s = current();
    const cols = colByStatus(s);
    return ANIM_CHAIN_NODES.map((n) => ({
      id: n.id,
      data: { label: n.data.label, col: cols[n.id] ?? 0, status: s[n.id] },
    }));
  };

  const btnStyle = {
    padding: "6px 14px",
    "font-size": "12px",
    "font-family": "inherit",
    color: "var(--sui-text-primary)",
    background: "var(--sui-surface, rgba(0,0,0,0.2))",
    border: "1px solid var(--sui-border)",
    "border-radius": "4px",
    cursor: "pointer",
  } as const;

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
        <button type="button" style={btnStyle} onClick={goBack} disabled={idx() === 0}>← Prev</button>
        <button type="button" style={btnStyle} onClick={() => setPlaying((p) => !p)}>
          {playing() ? "⏸ Pause" : "▶ Play"}
        </button>
        <button type="button" style={btnStyle} onClick={advance}>Next →</button>
        <span style={{ "font-size": "11px", color: "var(--sui-text-muted)" }}>
          frame {idx() + 1} / {history().length}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: "560px",
          "min-width": "360px",
          border: "1px dashed var(--sui-border)",
          "border-radius": "4px",
          "box-sizing": "border-box",
        }}
      >
        <LinearFlowSwimlaneChart
          nodes={nodes()}
          edges={ANIM_CHAIN_EDGES}
          swimlaneFor={(n) => n.data.col}
          renderNode={renderAnimNode}
        />
      </div>
    </div>
  );
};

// ─── Showcase: eight scenarios ────────────────────────────────────────────
export const SwimlaneChartShowcase: Component = () => {
  return (
    <div class="component-section component-section--full">
      <SectionTitle>SwimlaneChart — Composed (Depth 2)</SectionTitle>
      <p class="text-meta">
        DAG visualizer where each node's signed{" "}
        <code>col</code> determines its column relative to center
        (0 = DOING). Edges are independent of status — backward and
        skip-lane edges are first-class. The chart picks how many depth
        rings to show based on container width; nodes beyond the
        threshold collapse into boundary badges (per-side count).
        Nodes slide in/out toward center when the depth ring boundary
        crosses them.
      </p>

      <div class="workshop-grid">
        <div class="workshop-grid__cell">
          <SubsectionTitle>1 · 1 node</SubsectionTitle>
          <JsonPanel value={SINGLE_NODE} heightLines={10} />
        </div>
        <div class="workshop-grid__cell">
          <StubChart graph={SINGLE_NODE} />
        </div>

        <div class="workshop-grid__cell">
          <SubsectionTitle>2 · 3 nodes (linear)</SubsectionTitle>
          <JsonPanel value={LINEAR_THREE} heightLines={10} />
        </div>
        <div class="workshop-grid__cell">
          <StubChart graph={LINEAR_THREE} />
        </div>

        <div class="workshop-grid__cell">
          <SubsectionTitle>3 · 5 nodes (diamond)</SubsectionTitle>
          <JsonPanel value={FIVE_DIAMOND} heightLines={10} />
        </div>
        <div class="workshop-grid__cell">
          <StubChart graph={FIVE_DIAMOND} width="760px" />
        </div>

        <div class="workshop-grid__cell">
          <SubsectionTitle>4 · 2 layers — narrow (1 visible)</SubsectionTitle>
          <JsonPanel value={TWO_LAYERS} heightLines={10} />
        </div>
        <div class="workshop-grid__cell">
          <StubChart graph={TWO_LAYERS} width="360px" />
        </div>

        <div class="workshop-grid__cell">
          <SubsectionTitle>5 · 2 layers — medium (3 visible)</SubsectionTitle>
          <JsonPanel value={TWO_LAYERS} heightLines={10} />
        </div>
        <div class="workshop-grid__cell">
          <StubChart graph={TWO_LAYERS} width="820px" />
        </div>

        <div class="workshop-grid__cell">
          <SubsectionTitle>6 · 2 layers — wide (all 5 visible)</SubsectionTitle>
          <JsonPanel value={TWO_LAYERS} heightLines={10} />
        </div>
        <div class="workshop-grid__cell">
          <StubChart graph={TWO_LAYERS} width="1200px" />
        </div>

        <div class="workshop-grid__cell">
          <SubsectionTitle>7 · 2 layers — variable width (resize the browser)</SubsectionTitle>
          <JsonPanel value={TWO_LAYERS} heightLines={10} />
        </div>
        <div class="workshop-grid__cell">
          <StubChart graph={TWO_LAYERS} minWidth="360px" />
        </div>

        <div class="workshop-grid__cell">
          <SubsectionTitle>8 · multi-dep subtree — variable width (8 left · 5 right)</SubsectionTitle>
          <JsonPanel value={MULTI_DEPS} heightLines={10} />
        </div>
        <div class="workshop-grid__cell">
          <StubChart graph={MULTI_DEPS} minWidth="360px" />
        </div>

        <div class="workshop-grid__cell">
          <SubsectionTitle>9 · animated linear chain (live)</SubsectionTitle>
          <p style={{ "font-size": "12px", color: "var(--sui-text-secondary)", margin: "8px 0" }}>
            8-node chain ticking through TODO → DOING → DONE. Col is the
            signed graph distance from the current DOING node, so the
            whole chain slides horizontally as work progresses. Resize
            the window to see the depth ring compress: overflow nodes
            collapse into per-side boundary badges. Uses{" "}
            <code>LinearFlowSwimlaneChart</code> (the curried variant).
          </p>
          <JsonPanel
            value={{ nodes: ANIM_CHAIN_NODES, edges: ANIM_CHAIN_EDGES }}
            heightLines={10}
          />
        </div>
        <div class="workshop-grid__cell">
          <AnimatedChain />
        </div>
      </div>
    </div>
  );
};
