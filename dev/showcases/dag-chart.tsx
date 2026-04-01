import { Component, createSignal } from "solid-js";
import { DagChart } from "../../src/components/DagChart";
import type { DAGNode, DAGEdge, NodeRenderState } from "../../src/components/DagChart";

type TaskData = {
  label: string;
  status: "done" | "active" | "pending" | "blocked";
  estimate?: string;
};

const nodes: DAGNode<TaskData>[] = [
  { id: "design", data: { label: "Design API schema", status: "done", estimate: "1h" } },
  { id: "backend", data: { label: "Implement reducers", status: "done", estimate: "3h" } },
  { id: "ui", data: { label: "Build form UI", status: "active", estimate: "2h" } },
  { id: "wire", data: { label: "Wire UI to backend", status: "pending", estimate: "1.5h" } },
  { id: "tests", data: { label: "Write integration tests", status: "pending", estimate: "1h" } },
  { id: "qa", data: { label: "QA verification", status: "blocked", estimate: "30m" } },
  { id: "deploy", data: { label: "Deploy to staging", status: "blocked" } },
  { id: "docs", data: { label: "Update docs", status: "pending", estimate: "45m" } },
];

const edges: DAGEdge[] = [
  { source: "design", target: "backend" },
  { source: "design", target: "ui" },
  { source: "backend", target: "wire" },
  { source: "ui", target: "wire" },
  { source: "wire", target: "tests" },
  { source: "wire", target: "docs" },
  { source: "tests", target: "qa" },
  { source: "qa", target: "deploy" },
];

const statusColors: Record<TaskData["status"], string> = {
  done: "#22c55e",
  active: "#f59e0b",
  pending: "#64748b",
  blocked: "#ef4444",
};

const statusBg: Record<TaskData["status"], string> = {
  done: "rgba(34, 197, 94, 0.1)",
  active: "rgba(245, 158, 11, 0.1)",
  pending: "rgba(100, 116, 139, 0.1)",
  blocked: "rgba(239, 68, 68, 0.1)",
};

function renderTaskNode(node: DAGNode<TaskData>, state: NodeRenderState) {
  if (state.collapsed) {
    return (
      <div style={{
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        width: "100%",
        height: "100%",
        background: "var(--sui-bg-elevated, #1e2a3e)",
        border: "1px dashed var(--sui-border, #334155)",
        "border-radius": "8px",
        color: "var(--sui-text-muted, #64748b)",
        "font-size": "13px",
        cursor: "pointer",
      }}>
        +{state.collapsedCount}
      </div>
    );
  }

  const d = node.data;
  const borderColor = statusColors[d.status];
  const bg = statusBg[d.status];
  const opacity = state.focused ? "1" : state.adjacent ? "0.85" : "0.6";

  return (
    <div style={{
      display: "flex",
      "flex-direction": "column",
      "justify-content": "center",
      padding: "8px 12px",
      width: "100%",
      height: "100%",
      background: bg,
      border: `2px solid ${borderColor}`,
      "border-radius": "8px",
      "box-sizing": "border-box",
      opacity,
      "font-family": "inherit",
    }}>
      <div style={{
        display: "flex",
        "justify-content": "space-between",
        "align-items": "center",
      }}>
        <span style={{
          "font-size": "13px",
          "font-weight": "600",
          color: "var(--sui-text-primary, #f1f5f9)",
        }}>
          {d.label}
        </span>
        {d.estimate && (
          <span style={{ "font-size": "11px", color: "var(--sui-text-muted, #64748b)" }}>
            {d.estimate}
          </span>
        )}
      </div>
      <span style={{
        "font-size": "11px",
        color: borderColor,
        "margin-top": "2px",
        "text-transform": "uppercase",
        "letter-spacing": "0.5px",
      }}>
        {d.status}
      </span>
    </div>
  );
}

export const DagChartShowcase: Component = () => {
  const [focusedId, setFocusedId] = createSignal<string | undefined>(undefined);
  const [direction, setDirection] = createSignal<"horizontal" | "vertical" | undefined>(undefined);

  const handleNodeClick = (id: string) => {
    setFocusedId((prev) => (prev === id ? undefined : id));
  };

  return (
    <div class="component-section">
      <h2>DagChart — Generic DAG Visualization</h2>
      <p class="text-meta">
        Generic DAG component with custom renderNode, focus-driven collapse, pan/zoom, and responsive direction.
        Click a node to focus it and collapse distant branches. Click again to unfocus.
      </p>

      <div style={{ "margin-bottom": "12px", display: "flex", gap: "8px" }}>
        <button onClick={() => setDirection(undefined)}>Auto direction</button>
        <button onClick={() => setDirection("horizontal")}>Horizontal</button>
        <button onClick={() => setDirection("vertical")}>Vertical</button>
        <button onClick={() => setFocusedId(undefined)}>Clear focus</button>
      </div>

      {focusedId() && (
        <p class="text-meta" style={{ "margin-bottom": "8px" }}>
          Focused: <strong>{focusedId()}</strong>
        </p>
      )}

      <div style={{ height: "500px", border: "1px solid var(--sui-border, #334155)", "border-radius": "8px" }}>
        <DagChart
          nodes={nodes}
          edges={edges}
          renderNode={renderTaskNode}
          nodeSize={() => [200, 60]}
          direction={direction()}
          onNodeClick={handleNodeClick}
          focusedNodeId={focusedId()}
        />
      </div>
    </div>
  );
};
