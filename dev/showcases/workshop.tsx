import { Component, For, JSX } from "solid-js";
import { SwimlaneChart } from "../../src/components/SwimlaneChart";
import type { DAGNode } from "../../src/components/DagChart";
import { Surface } from "../../src/components/Surface";
import { Stack } from "../../src/components/Layout";
import { TextLabel, EllipsizedTitle, SectionTitle, SubsectionTitle } from "../../src/components/Text";

// ─── JSON syntax highlighter ──────────────────────────────────────────────
// Tokenize once with a single regex; alternating capture groups split the
// input into match / non-match runs. Each match is classified by its first
// char(s). Non-matches (whitespace, etc.) pass through untouched.
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
  /** Width in monospace ch units. Default 40. */
  widthCh?: number;
  /** Height in lines. Default 20. */
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
// Node data carries an explicit signed `col` so the SwimlaneChart can
// position it relative to center. 0 = DOING/center; negative = completed
// (left, dependency side); positive = todo (right, dependent side).
type StubData = { label: string; col: number };
type StubGraph = {
  nodes: DAGNode<StubData>[];
  edges: { source: string; target: string }[];
};

const SINGLE_NODE: StubGraph = {
  nodes: [{ id: "a", data: { label: "Solo node", col: 0 } }],
  edges: [],
};

const LINEAR_THREE: StubGraph = {
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

// Two layers on each side, each in its OWN column:
//   col -2  c_far         (completed, layer 2)
//   col -1  c_near        (completed, layer 1)
//   col  0  active        (DOING / center)
//   col +1  t_near        (todo, layer 1)
//   col +2  t_far         (todo, layer 2)
const TWO_LAYERS: StubGraph = {
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
//
//   col -3        col -2          col -1        col 0      col +1   col +2     col +3
//   cf1 ─┬─→ cm1 ─┬─→ c1 ─┐
//        └─→ cm2 ─┤        ├──→ active ──→ t1 ─┬─→ tn1 ─┐
//   cf2 ─┬─→ cm2 ─┘        │                   │        ├──→ tf1
//        └─→ cm3 ─┬─→ c2 ──┘                ─→ t2 ─┬→ tn1│
//                 └─→ c3 ──┘                       └→ tn2┘
const MULTI_DEPS: StubGraph = {
  nodes: [
    // Left subtree (8 nodes total)
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
    // Right subtree (5 nodes total)
    { id: "t1", data: { label: "Up next A", col: 1 } },
    { id: "t2", data: { label: "Up next B", col: 1 } },
    { id: "tn1", data: { label: "Then (deps on A+B)", col: 2 } },
    { id: "tn2", data: { label: "Then alt", col: 2 } },
    { id: "tf1", data: { label: "Final (deps on Then A+B)", col: 3 } },
  ],
  edges: [
    // Left subtree
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
    // Right subtree
    { source: "active", target: "t1" },
    { source: "active", target: "t2" },
    { source: "t1", target: "tn1" },
    { source: "t2", target: "tn1" },
    { source: "t2", target: "tn2" },
    { source: "tn1", target: "tf1" },
    { source: "tn2", target: "tf1" },
  ],
};

// 5 nodes mapped to lanes by dependency depth:
//   A, B (col -1) — independents on the left
//   C, D (col  0) — C depends on A; D depends on A + B
//   E   (col +1) — depends on both dependents (C + D)
// Dependency relationships flow left -> right.
const FIVE_DIAMOND: StubGraph = {
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

// ─── Chart cell ───────────────────────────────────────────────────────────
// Labels for the workshop's interpretation: dependencies flow left -> right,
// so completed prerequisites are on the left and the things waiting on them
// (todo) are on the right. NOT the canonical kanban order — purely a
// workshop convention for these stubs.
const colLabel = (col: number): string =>
  col < 0 ? "COMPLETED" : col > 0 ? "TODO" : "DOING";
const colTint = (col: number): { bg: string; border: string } => {
  if (col < 0) return { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.18)" };
  if (col > 0) return { bg: "rgba(95,179,124,0.10)", border: "rgba(95,179,124,0.5)" };
  return { bg: "rgba(0,212,255,0.10)", border: "var(--sui-accent, #00d4ff)" };
};

const renderStubNode = (node: DAGNode<StubData>, state: { kind: string; collapsedCount?: number }) => {
  if (state.kind === "collapsed") {
    return (
      <Surface
        padding="sm"
        radius="sm"
        bg="rgba(255,255,255,0.03)"
        borderColor="rgba(255,255,255,0.25)"
        style={{ width: "100%", height: "100%", display: "flex", "align-items": "center", "justify-content": "center", "border-style": "dashed" }}
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

const StubChart: Component<{
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
      border: "1px dashed rgba(255,255,255,0.12)",
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

// ─── Workshop ─────────────────────────────────────────────────────────────
export const WorkshopShowcase: Component = () => {
  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop</SectionTitle>
      {/* 2 columns x N rows. Column 1 = JSON. Column 2 = rendered chart.
          Blue borders separate rows. */}
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
          <SubsectionTitle>8 · multi-dep subtree (8 left · 5 right)</SubsectionTitle>
          <JsonPanel value={MULTI_DEPS} heightLines={10} />
        </div>
        <div class="workshop-grid__cell">
          <StubChart graph={MULTI_DEPS} width="360px" />
        </div>
      </div>
    </div>
  );
};
