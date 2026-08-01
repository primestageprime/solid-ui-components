import { type Component, Show } from "solid-js";
import { DagChart } from "../../src/components/DagChart";
import type {
  DAGNode,
  DAGEdge,
  NodeRenderState,
} from "../../src/components/DagChart";
import { ClusterRow } from "../../src/components/Layout";
import { TextSublabel } from "../../src/components/Text";

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
      description:
        "Create the task input form with validation and loading states.",
    },
  },
  {
    id: "backend",
    data: {
      label: "Implement reducers",
      status: "warning",
      sublabel: "jenn",
      estimate: "3h",
      description:
        "CRUD reducers: create, update status, assign worker, soft-delete.",
    },
  },
  {
    id: "wire",
    data: {
      label: "Wire UI to SpacetimeDB",
      status: "default",
      sublabel: "athena",
      estimate: "1h 30m",
      description:
        "Connect form to live subscriptions; handle optimistic updates.",
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
      <div class="dag-chart-demo__collapsed-node">
        +{state.collapsedCount} more
      </div>
    );
  }

  const isFocused = state.kind === "focused";
  const isAdjacent = state.kind === "adjacent";
  return (
    <div
      class="dag-chart-demo__node"
      classList={{
        "dag-chart-demo__node--focused": isFocused,
        "dag-chart-demo__node--adjacent": isAdjacent,
      }}
      style={{ "--dag-node-status": STATUS_COLORS[node.data.status] }}
    >
      <ClusterRow>
        <span class="dag-chart-demo__dot" />
        <span class="dag-chart-demo__node-label">{node.data.label}</span>
      </ClusterRow>
      <Show when={node.data.sublabel || node.data.estimate}>
        <ClusterRow>
          <Show when={node.data.sublabel}>
            <TextSublabel>{node.data.sublabel}</TextSublabel>
          </Show>
          <Show when={node.data.estimate}>
            <TextSublabel>· {node.data.estimate}</TextSublabel>
          </Show>
        </ClusterRow>
      </Show>
    </div>
  );
};

export const DagChartShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>DagChart — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Generic DAG visualizer. Consumer supplies <code>renderNode</code>;
        supports pan/zoom, focus-driven collapse, and horizontal/vertical
        layout.
      </p>

      <div class="example-group">
        <h3>Vertical layout</h3>
        <p class="text-meta">5-node task graph rendered top-to-bottom.</p>
        <div class="dag-chart-demo__frame dag-chart-demo__frame--h420">
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

      <div class="example-group showcase-heading-gap--lg">
        <h3>Horizontal layout</h3>
        <div class="dag-chart-demo__frame dag-chart-demo__frame--h320">
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

      <div class="example-group showcase-heading-gap--lg">
        <h3>Minimal (label + status only)</h3>
        <div class="dag-chart-demo__frame dag-chart-demo__frame--h260">
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
