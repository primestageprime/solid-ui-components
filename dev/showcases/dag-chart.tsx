import { Component, Show } from "solid-js";
import { DagChart } from "../../src/components/DagChart";
import type { DAGNode, DAGEdge, NodeRenderState } from "../../src/components/DagChart";

type TaskNode = {
  label: string;
  status: "success" | "warning" | "default";
  sublabel?: string;
  estimate?: string;
  description?: string;
};

const nodes: DAGNode<TaskNode>[] = [
  {
    id: "design",
    data: {
      label: "Design API schema",
      status: "success",
      sublabel: "leslie",
      estimate: "1h",
      description: "Define REST endpoints and request/response types.",
    },
  },
  {
    id: "ui",
    data: {
      label: "Build form UI",
      status: "warning",
      sublabel: "athena",
      estimate: "2h",
      description: "Create the task input form with validation and loading states.",
    },
  },
  {
    id: "backend",
    data: {
      label: "Implement reducers",
      status: "warning",
      sublabel: "jenn",
      estimate: "3h",
      description: "CRUD reducers: create, update status, assign worker, soft-delete.",
    },
  },
  {
    id: "wire",
    data: {
      label: "Wire UI to SpacetimeDB",
      status: "default",
      sublabel: "athena",
      estimate: "1h 30m",
      description: "Connect form to live subscriptions; handle optimistic updates.",
    },
  },
  {
    id: "qa",
    data: {
      label: "QA verification",
      status: "default",
      sublabel: "hannelore",
      estimate: "30m",
      description: "End-to-end smoke test across the full stack.",
    },
  },
];

const edges: DAGEdge[] = [
  { source: "design", target: "ui" },
  { source: "design", target: "backend" },
  { source: "ui", target: "wire" },
  { source: "backend", target: "wire" },
  { source: "wire", target: "qa" },
];

const minimalNodes: DAGNode<TaskNode>[] = [
  { id: "a", data: { label: "Step A", status: "success" } },
  { id: "b", data: { label: "Step B", status: "warning" } },
  { id: "c", data: { label: "Step C", status: "default" } },
];

const minimalEdges: DAGEdge[] = [
  { source: "a", target: "b" },
  { source: "b", target: "c" },
];

const STATUS_COLORS: Record<TaskNode["status"], string> = {
  success: "#3ecf8e",
  warning: "#f5a524",
  default: "#6b7a90",
};

const renderTaskNode = (node: DAGNode<TaskNode>, state: NodeRenderState) => {
  if (state.kind === "collapsed") {
    return (
      <div
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          width: "100%",
          height: "100%",
          "border-radius": "8px",
          background: "var(--sui-bg-elevated)",
          border: "1px dashed var(--sui-border-bright)",
          color: "var(--sui-text-secondary)",
          "font-size": "12px",
        }}
      >
        +{state.collapsedCount} more
      </div>
    );
  }

  const isFocused = state.kind === "focused";
  const isAdjacent = state.kind === "adjacent";
  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "4px",
        width: "100%",
        height: "100%",
        padding: "8px 10px",
        "border-radius": "8px",
        background: isFocused
          ? `rgba(var(--sui-success-rgb), 0.18)`
          : "var(--sui-bg-elevated)",
        border: `1px solid ${
          isFocused
            ? STATUS_COLORS[node.data.status]
            : isAdjacent
              ? "var(--sui-text-muted)"
              : "var(--sui-border)"
        }`,
        color: "var(--sui-text-primary)",
        "font-size": "12px",
        "box-sizing": "border-box",
      }}
    >
      <div style={{ display: "flex", "align-items": "center", gap: "6px" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            "border-radius": "50%",
            background: STATUS_COLORS[node.data.status],
            "flex-shrink": "0",
          }}
        />
        <span style={{ "font-weight": "600", "font-size": "13px" }}>
          {node.data.label}
        </span>
      </div>
      <Show when={node.data.sublabel || node.data.estimate}>
        <div style={{ display: "flex", gap: "8px", color: "var(--sui-text-secondary)", "font-size": "11px" }}>
          <Show when={node.data.sublabel}>
            <span>{node.data.sublabel}</span>
          </Show>
          <Show when={node.data.estimate}>
            <span>· {node.data.estimate}</span>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export const DagChartShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>DagChart — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Generic DAG visualizer. Consumer supplies <code>renderNode</code>; supports
        pan/zoom, focus-driven collapse, and horizontal/vertical layout.
      </p>

      <div class="example-group">
        <h3>Vertical layout</h3>
        <p class="text-meta">5-node task graph rendered top-to-bottom.</p>
        <div style={{ height: "420px", border: "1px solid rgba(255,255,255,0.08)", "border-radius": "6px" }}>
          <DagChart
            nodes={nodes}
            edges={edges}
            direction="vertical"
            renderNode={renderTaskNode}
            nodeSize={() => [200, 56]}
            onNodeClick={(id) => console.log("clicked", id)}
          />
        </div>
      </div>

      <div class="example-group" style={{ "margin-top": "32px" }}>
        <h3>Horizontal layout</h3>
        <div style={{ height: "320px", border: "1px solid rgba(255,255,255,0.08)", "border-radius": "6px" }}>
          <DagChart
            nodes={nodes}
            edges={edges}
            direction="horizontal"
            renderNode={renderTaskNode}
            nodeSize={() => [200, 56]}
            onNodeClick={(id) => console.log("clicked", id)}
          />
        </div>
      </div>

      <div class="example-group" style={{ "margin-top": "32px" }}>
        <h3>Minimal (label + status only)</h3>
        <div style={{ height: "260px", border: "1px solid rgba(255,255,255,0.08)", "border-radius": "6px" }}>
          <DagChart
            nodes={minimalNodes}
            edges={minimalEdges}
            direction="vertical"
            renderNode={renderTaskNode}
            nodeSize={() => [160, 44]}
          />
        </div>
      </div>
    </div>
  );
};
