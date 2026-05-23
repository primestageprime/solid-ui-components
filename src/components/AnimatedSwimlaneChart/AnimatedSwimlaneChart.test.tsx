import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { AnimatedSwimlaneChart } from "./AnimatedSwimlaneChart";
import { SwimlaneChart } from "../SwimlaneChart/SwimlaneChart";
import type { DAGNode, DAGEdge, NodeRenderState } from "../DagChart/types";

// Three-status mini dataset reused across the parity + smoke tests. Same
// shape as the legacy kanban: 0 = TODO, 1 = DOING, 2 = DONE; centerCol = 0.
type Item = { status: 0 | 1 | 2; label: string };
const swimlaneFor = (n: DAGNode<Item>) => n.data.status - 1;
const renderNode = (
  node: DAGNode<Item>,
  state: NodeRenderState,
): import("solid-js").JSX.Element => {
  if (state.kind === "collapsed") {
    return <div data-testid="collapsed" data-count={state.collapsedCount} />;
  }
  return (
    <div data-testid="card" data-id={node.id}>
      {node.data.label}
    </div>
  );
};

const NODES: DAGNode<Item>[] = [
  { id: "a", data: { status: 0, label: "A" } },
  { id: "b", data: { status: 1, label: "B" } },
  { id: "c", data: { status: 2, label: "C" } },
];
const EDGES: DAGEdge[] = [
  { source: "a", target: "b" },
  { source: "b", target: "c" },
];

describe("AnimatedSwimlaneChart — smoke", () => {
  it("renders one card per visible node on initial mount", () => {
    const { container } = render(() => (
      <AnimatedSwimlaneChart
        nodes={NODES}
        edges={EDGES}
        swimlaneFor={swimlaneFor}
        renderNode={renderNode}
        interactive={false}
      />
    ));
    // Initial mount is t=1 (rest) — delegates to SwimlaneChart, which
    // renders each visible node via foreignObject.
    const cards = container.querySelectorAll("[data-testid='card']");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it("invokes renderNode for each visible node id", () => {
    const seen: string[] = [];
    const tagging = (node: DAGNode<Item>, state: NodeRenderState) => {
      if (state.kind !== "collapsed") seen.push(node.id);
      return renderNode(node, state);
    };
    render(() => (
      <AnimatedSwimlaneChart
        nodes={NODES}
        edges={EDGES}
        swimlaneFor={swimlaneFor}
        renderNode={tagging}
        interactive={false}
      />
    ));
    expect(seen).toContain("a");
    expect(seen).toContain("b");
    expect(seen).toContain("c");
  });
});

describe("AnimatedSwimlaneChart — API parity with SwimlaneChart", () => {
  // Same input → same set of node ids in the DOM at rest. The animated
  // chart delegates to SwimlaneChart when t=1, so the DOM should match
  // up to the wrapper element. We check the data-id set produced by
  // renderNode, which is the visible contract consumers depend on.
  it("produces the same set of rendered node ids at steady state", () => {
    const seenStatic = new Set<string>();
    const seenAnimated = new Set<string>();
    const collectStatic = (n: DAGNode<Item>, s: NodeRenderState) => {
      if (s.kind !== "collapsed") seenStatic.add(n.id);
      return renderNode(n, s);
    };
    const collectAnim = (n: DAGNode<Item>, s: NodeRenderState) => {
      if (s.kind !== "collapsed") seenAnimated.add(n.id);
      return renderNode(n, s);
    };
    render(() => (
      <SwimlaneChart
        nodes={NODES}
        edges={EDGES}
        swimlaneFor={swimlaneFor}
        renderNode={collectStatic}
        interactive={false}
      />
    ));
    render(() => (
      <AnimatedSwimlaneChart
        nodes={NODES}
        edges={EDGES}
        swimlaneFor={swimlaneFor}
        renderNode={collectAnim}
        interactive={false}
      />
    ));
    expect(Array.from(seenAnimated).sort()).toEqual(
      Array.from(seenStatic).sort(),
    );
  });
});
