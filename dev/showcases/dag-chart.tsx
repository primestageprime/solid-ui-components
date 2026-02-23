import { Component } from "solid-js";
import { DagChart } from "../../src/components/DagChart";
import type { DagNode, DagEdge } from "../../src/components/DagChart";

const nodes: DagNode[] = [
  {
    id: "design",
    label: "Design API schema",
    status: "success",
    sublabel: "leslie",
    estimate: "1h",
    description: "Define REST endpoints and types",
    tags: ["api", "design"],
    files: ["src/api/schema.ts", "src/types.ts"],
  },
  {
    id: "ui",
    label: "Build form UI",
    status: "warning",
    sublabel: "athena",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=athena",
    estimate: "2h",
    description: "Create input form with validation",
    tags: ["ui"],
    files: ["src/components/TaskForm.tsx", "src/components/TaskForm.css"],
  },
  {
    id: "backend",
    label: "Implement reducers",
    status: "warning",
    sublabel: "jenn",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=jenn",
    estimate: "3h",
    description: "CRUD reducers for tasks table",
    tags: ["db", "rust"],
    files: ["src/lib.rs", "src/reducers/task.rs", "src/schema.rs"],
  },
  {
    id: "wire",
    label: "Wire UI to SpacetimeDB",
    status: "default",
    sublabel: "athena",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=athena",
    estimate: "1h 30m",
    description: "Connect form to live subscriptions",
    tags: ["ui", "db"],
    files: ["src/lib/stdb-store.ts"],
  },
  {
    id: "qa",
    label: "QA verification",
    status: "default",
    sublabel: "hannelore",
    estimate: "30m",
    description: "End-to-end smoke test",
    tags: ["qa"],
  },
];

const edges: DagEdge[] = [
  { source: "design", target: "ui" },
  { source: "design", target: "backend" },
  { source: "ui", target: "wire" },
  { source: "backend", target: "wire" },
  { source: "wire", target: "qa" },
];

const minimalNodes: DagNode[] = [
  { id: "a", label: "Step A", status: "success" },
  { id: "b", label: "Step B", status: "warning" },
  { id: "c", label: "Step C", status: "default" },
];

const minimalEdges: DagEdge[] = [
  { source: "a", target: "b" },
  { source: "b", target: "c" },
];

export const DagChartShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>DagChart — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (DagChart.css), no component imports. SVG directed acyclic graph using dagre layout.</p>

      <div class="example-group">
        <h3>Full-featured (TB direction)</h3>
        <p class="text-meta">Nodes with label, estimate, description, avatar, sublabel, tags, and files (hover file count for list).</p>
        <DagChart
          nodes={nodes}
          edges={edges}
          direction="TB"
          onNodeClick={(id) => console.log("clicked", id)}
        />
      </div>

      <div class="example-group" style={{ "margin-top": "32px" }}>
        <h3>Full-featured (LR direction)</h3>
        <DagChart
          nodes={nodes}
          edges={edges}
          direction="LR"
          onNodeClick={(id) => console.log("clicked", id)}
        />
      </div>

      <div class="example-group" style={{ "margin-top": "32px" }}>
        <h3>Minimal (label + status only)</h3>
        <DagChart nodes={minimalNodes} edges={minimalEdges} direction="TB" />
      </div>
    </div>
  );
};
