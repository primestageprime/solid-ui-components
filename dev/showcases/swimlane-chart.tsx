import { Component, createSignal, Show } from "solid-js";
import { SwimlaneChart } from "../../src/components/SwimlaneChart";
import type { DAGNode, DAGEdge, NodeRenderState } from "../../src/components/DagChart";

type Card = {
  label: string;
  col: 0 | 1 | 2;
  owner?: string;
};

const COL_NAME = ["TODO", "DOING", "DONE"] as const;

const COL_COLOR: Record<0 | 1 | 2, { border: string; bg: string; text: string }> = {
  0: { border: "rgba(255,255,255,0.18)", bg: "rgba(255,255,255,0.04)", text: "rgba(255,255,255,0.6)" },
  1: { border: "var(--sui-accent, #00d4ff)", bg: "rgba(0,212,255,0.10)", text: "var(--sui-accent, #00d4ff)" },
  2: { border: "rgba(95,179,124,0.5)", bg: "rgba(95,179,124,0.10)", text: "rgba(95,179,124,0.9)" },
};

const renderCard = (node: DAGNode<Card>, state: NodeRenderState) => {
  if (state.kind === "collapsed") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          "box-sizing": "border-box",
          padding: "4px 8px",
          "border-radius": "6px",
          border: "1px dashed rgba(255,255,255,0.25)",
          background: "rgba(255,255,255,0.03)",
          color: "rgba(255,255,255,0.55)",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "font-size": "11px",
        }}
      >
        +{state.collapsedCount} more
      </div>
    );
  }
  const c = COL_COLOR[node.data.col];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        "box-sizing": "border-box",
        padding: "6px 10px",
        "border-radius": "8px",
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: "var(--sui-text, #e6ecf5)",
        display: "flex",
        "flex-direction": "column",
        gap: "2px",
        "font-size": "12px",
      }}
    >
      <div
        style={{
          "font-size": "9px",
          "letter-spacing": "0.08em",
          "text-transform": "uppercase",
          color: c.text,
        }}
      >
        {COL_NAME[node.data.col]}
      </div>
      <div
        style={{
          "font-size": "12px",
          overflow: "hidden",
          "text-overflow": "ellipsis",
          "white-space": "nowrap",
        }}
      >
        {node.data.label}
      </div>
      <Show when={node.data.owner}>
        <div style={{ "font-size": "10px", color: "rgba(255,255,255,0.45)" }}>
          {node.data.owner}
        </div>
      </Show>
    </div>
  );
};

// ─── Example 1: kanban-style chain, 3 layers each side ───────────────────
const chainNodes: DAGNode<Card>[] = [
  { id: "n3a", data: { col: 2, label: "Spec signed off", owner: "leslie" } },
  { id: "n3b", data: { col: 2, label: "Vendor selected", owner: "jane" } },
  { id: "n2a", data: { col: 2, label: "API contract drafted", owner: "leslie" } },
  { id: "n2b", data: { col: 2, label: "Hardware ordered", owner: "jane" } },
  { id: "n1a", data: { col: 2, label: "Endpoints implemented", owner: "jenn" } },
  { id: "n1b", data: { col: 2, label: "Hardware on site", owner: "jane" } },
  { id: "d1", data: { col: 1, label: "Integration testing", owner: "hannelore" } },
  { id: "d2", data: { col: 1, label: "Calibration run", owner: "veronica" } },
  { id: "t1a", data: { col: 0, label: "Staging rollout", owner: "jenn" } },
  { id: "t1b", data: { col: 0, label: "Pilot deployment", owner: "athena" } },
  { id: "t2a", data: { col: 0, label: "Production rollout", owner: "athena" } },
  { id: "t2b", data: { col: 0, label: "Full fleet deployment", owner: "athena" } },
  { id: "t3a", data: { col: 0, label: "Post-launch review", owner: "leslie" } },
  { id: "t3b", data: { col: 0, label: "Sunset legacy system", owner: "jane" } },
];

const chainEdges: DAGEdge[] = [
  { source: "n3a", target: "n2a" },
  { source: "n3b", target: "n2b" },
  { source: "n2a", target: "n1a" },
  { source: "n2b", target: "n1b" },
  { source: "n1a", target: "d1" },
  { source: "n1b", target: "d2" },
  { source: "d1", target: "t1a" },
  { source: "d2", target: "t1b" },
  { source: "t1a", target: "t2a" },
  { source: "t1b", target: "t2b" },
  { source: "t2a", target: "t3a" },
  { source: "t2b", target: "t3b" },
];

// ─── Example 2: backward edge (DONE → TODO) ───────────────────────────────
const backwardNodes: DAGNode<Card>[] = [
  { id: "done", data: { col: 2, label: "Spike: prove concept" } },
  { id: "doing", data: { col: 1, label: "Implement v1" } },
  { id: "todo", data: { col: 0, label: "Revisit spike findings" } },
];
const backwardEdges: DAGEdge[] = [
  { source: "done", target: "doing" },
  { source: "done", target: "todo" }, // backward edge across all columns
  { source: "doing", target: "todo" },
];

// ─── Example 3: empty DOING column (no falloff anchor) ────────────────────
const noAnchorNodes: DAGNode<Card>[] = [
  { id: "a", data: { col: 2, label: "Done thing A" } },
  { id: "b", data: { col: 2, label: "Done thing B" } },
  { id: "c", data: { col: 0, label: "Future thing C" } },
];
const noAnchorEdges: DAGEdge[] = [
  { source: "a", target: "c" },
  { source: "b", target: "c" },
];

export const SwimlaneChartShowcase: Component = () => {
  const [maxDepth, setMaxDepth] = createSignal(2);
  return (
    <div class="component-section">
      <h2>SwimlaneChart — Atomic (Depth 1)</h2>
      <p class="text-meta">
        DAG visualizer where status determines the column. DOING is pinned to
        the viewport's horizontal center. Nodes beyond <code>maxDepth</code>{" "}
        graph-hops from any DOING node collapse into "+N" summary stubs. Edges
        are independent of status — backward (DONE → TODO) and skip-lane
        (TODO → DONE) edges are first-class.
      </p>

      <div class="example-group">
        <h3>Kanban with 3 layers of dependency on each side</h3>
        <p class="text-meta">
          Two parallel chains of 7 nodes each, anchored on DOING (d1, d2). Try
          changing <code>maxDepth</code> to see falloff: 2 hides the depth-3
          tier; 3 reveals everything; 1 hides the depth-2+ tier.
        </p>
        <div style={{ display: "flex", gap: "8px", "align-items": "center", "margin-bottom": "8px" }}>
          <span style={{ "font-size": "11px", color: "rgba(255,255,255,0.6)" }}>
            maxDepth:
          </span>
          {[1, 2, 3].map((d) => (
            <button
              type="button"
              onClick={() => setMaxDepth(d)}
              style={{
                padding: "4px 10px",
                "border-radius": "4px",
                border:
                  maxDepth() === d
                    ? "1px solid var(--sui-accent, #00d4ff)"
                    : "1px solid rgba(255,255,255,0.15)",
                background:
                  maxDepth() === d ? "rgba(0,212,255,0.15)" : "transparent",
                color: "var(--sui-text, #e6ecf5)",
                "font-size": "11px",
                cursor: "pointer",
              }}
            >
              {d}
            </button>
          ))}
        </div>
        <div style={{ height: "560px", border: "1px solid rgba(255,255,255,0.08)", "border-radius": "6px" }}>
          <SwimlaneChart
            nodes={chainNodes}
            edges={chainEdges}
            swimlaneFor={(n) => n.data.col}
            renderNode={renderCard}
            nodeSize={() => [220, 64]}
            maxDepth={maxDepth()}
            onNodeClick={(id) => console.log("clicked", id)}
          />
        </div>
      </div>

      <div class="example-group" style={{ "margin-top": "32px" }}>
        <h3>Backward edge (DONE → TODO)</h3>
        <p class="text-meta">
          Edges are determined by dependency, not by status flow. An edge
          going from a DONE node back to a TODO node curves naturally — no
          layout breakage.
        </p>
        <div style={{ height: "260px", border: "1px solid rgba(255,255,255,0.08)", "border-radius": "6px" }}>
          <SwimlaneChart
            nodes={backwardNodes}
            edges={backwardEdges}
            swimlaneFor={(n) => n.data.col}
            renderNode={renderCard}
            nodeSize={() => [200, 56]}
          />
        </div>
      </div>

      <div class="example-group" style={{ "margin-top": "32px" }}>
        <h3>No DOING column — falloff disabled</h3>
        <p class="text-meta">
          When zero nodes are in the DOING column, there is no anchor for the
          BFS falloff. Every node stays visible regardless of <code>maxDepth</code>.
          The empty DOING slot is still reserved so the remaining columns stay
          framed.
        </p>
        <div style={{ height: "260px", border: "1px solid rgba(255,255,255,0.08)", "border-radius": "6px" }}>
          <SwimlaneChart
            nodes={noAnchorNodes}
            edges={noAnchorEdges}
            swimlaneFor={(n) => n.data.col}
            renderNode={renderCard}
            nodeSize={() => [200, 56]}
            maxDepth={0}
          />
        </div>
      </div>
    </div>
  );
};
