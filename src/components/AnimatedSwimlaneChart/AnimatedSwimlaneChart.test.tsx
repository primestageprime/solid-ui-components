// src/components/AnimatedSwimlaneChart/AnimatedSwimlaneChart.test.tsx
import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@solidjs/testing-library";
// White-box test of the internal base (full override surface). The public
// package only exposes the curried `AnimatedSwimlaneChart` + factory.
import {
  AnimatedSwimlaneChartBase as AnimatedSwimlaneChart,
  createAnimatedSwimlaneChart,
} from "./AnimatedSwimlaneChart";
import type { StatusFlowNode } from "../StatusFlowChart";

beforeAll(() => {
  // jsdom doesn't ship ResizeObserver. Provide a no-op so onMount doesn't throw.
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

const FIXTURE: StatusFlowNode[] = [
  { id: "a", title: "Alpha", status: "DOING" },
  { id: "b", title: "Bravo", status: "TODO", dependsOn: ["a"] },
  { id: "c", title: "Charlie", status: "DONE" },
];

describe("AnimatedSwimlaneChart (status-driven)", () => {
  it("renders an SVG with no required props besides nodes", () => {
    const { container } = render(() => <AnimatedSwimlaneChart nodes={FIXTURE} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("renders one card per node by default", () => {
    // maxDepth={1} ensures all three fixture nodes (DOING/TODO/DONE at depths
    // 0/+1/-1) are in the visible window. Without it, the responsive default
    // at jsdom's 800px width computes maxDepth=0 and hides depth-1 columns.
    const { container } = render(() => <AnimatedSwimlaneChart nodes={FIXTURE} maxDepth={1} />);
    const cards = container.querySelectorAll(".sui-asc__card");
    expect(cards.length).toBe(FIXTURE.length);
  });

  it("groups by parentId into separate lanes", () => {
    const nodes: StatusFlowNode[] = [
      { id: "p1", title: "Parent 1", status: "TODO" },
      { id: "p2", title: "Parent 2", status: "TODO" },
      { id: "c1", title: "C1", status: "TODO", parentId: "p1" },
      { id: "c2", title: "C2", status: "TODO", parentId: "p2" },
    ];
    const { container } = render(() => <AnimatedSwimlaneChart nodes={nodes} />);
    // One lane background rect per lane.
    const lanes = container.querySelectorAll(".sui-asc__lane-bg");
    expect(lanes.length).toBe(2);
  });

  it("uses a custom renderNode when provided", () => {
    // maxDepth={1} for same reason as the card-count test above.
    const { container } = render(() => (
      <AnimatedSwimlaneChart
        nodes={FIXTURE}
        maxDepth={1}
        renderNode={(n) => <div class="custom-card">{n.id}</div>}
      />
    ));
    expect(container.querySelectorAll(".custom-card").length).toBe(FIXTURE.length);
    expect(container.querySelectorAll(".sui-asc__card").length).toBe(0);
  });

  it("createAnimatedSwimlaneChart returns a component that takes only data props", () => {
    const Curried = createAnimatedSwimlaneChart({
      nodeSize: [180, 60],
      timing: { slurpMs: 100, moveMs: 100, arrowSettleMs: 0, arrowPathMs: 0 },
    });
    const { container } = render(() => <Curried nodes={FIXTURE} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders an empty SVG when nodes is empty (does not throw)", () => {
    const { container } = render(() => <AnimatedSwimlaneChart nodes={[]} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
