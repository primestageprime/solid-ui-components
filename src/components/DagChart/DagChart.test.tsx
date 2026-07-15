import { describe, it, expect, vi, beforeAll } from "vitest";
import { render } from "@solidjs/testing-library";
import { collapseGraph } from "./collapse";
import {
  clipToRectBoundary,
  clipPolyline,
  buildEdgePath,
  polylineMidpoint,
  type Point,
} from "./edge-path";
import { DagChart } from "./DagChart";
import type { DAGNode, DAGEdge } from "./types";

// DagChart auto-detects flow direction via a ResizeObserver, which jsdom does
// not provide. Stub a no-op so the component mounts.
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

const nodes: DAGNode[] = [
  { id: "a", data: {} },
  { id: "b", data: {} },
  { id: "c", data: {} },
];
const edges: DAGEdge[] = [
  { source: "a", target: "b" },
  { source: "b", target: "c" },
];

describe("collapseGraph", () => {
  it("returns the full graph when no node is focused", () => {
    const res = collapseGraph(nodes, edges, undefined);
    expect(res.visibleNodes.length).toBe(3);
    expect(res.visibleNodes.every((v) => v.state.kind === "normal")).toBe(true);
    expect(res.visibleEdges.length).toBe(2);
  });

  it("drops edges that reference unknown node ids", () => {
    const res = collapseGraph(nodes, [...edges, { source: "a", target: "zz" }], undefined);
    expect(res.visibleEdges.length).toBe(2);
  });

  it("focuses a node and marks its neighbours adjacent", () => {
    const res = collapseGraph(nodes, edges, "b");
    const focused = res.visibleNodes.find((v) => v.node.id === "b");
    const neighbour = res.visibleNodes.find((v) => v.node.id === "a");
    expect(focused!.state.kind).toBe("focused");
    expect(neighbour!.state.kind).toBe("adjacent");
  });

  it("summarizes nodes beyond the focus neighbourhood", () => {
    // a - b - c - d - e : focusing a hides c/d/e behind a collapsed summary.
    const chain: DAGNode[] = ["a", "b", "c", "d", "e"].map((id) => ({
      id,
      data: {},
    }));
    const chainEdges: DAGEdge[] = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "c", target: "d" },
      { source: "d", target: "e" },
    ];
    const res = collapseGraph(chain, chainEdges, "a");
    const summary = res.visibleNodes.find(
      (v) => v.state.kind === "collapsed",
    );
    expect(summary).toBeTruthy();
    expect(summary!.node.id.startsWith("__collapsed_")).toBe(true);
  });

  it("falls back to the full graph when focusedNodeId is unknown", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = collapseGraph(nodes, edges, "does-not-exist");
    expect(res.visibleNodes.length).toBe(3);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("edge-path geometry", () => {
  it("clipToRectBoundary exits on the rectangle boundary", () => {
    const from: Point = { x: 0, y: 0 };
    const to: Point = { x: 100, y: 0 };
    const p = clipToRectBoundary(from, to, {
      x: 0,
      y: 0,
      width: 20,
      height: 10,
    });
    // Horizontal travel exits at half-width = 10.
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(0);
  });

  it("clipPolyline copies points and does not mutate the input", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
    ];
    const clipped = clipPolyline(
      pts,
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 50, y: 0, width: 10, height: 10 },
    );
    expect(clipped).not.toBe(pts);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
  });

  it("buildEdgePath emits a straight line for a 2-point edge", () => {
    const d = buildEdgePath([
      { x: 0, y: 0 },
      { x: 10, y: 20 },
    ]);
    expect(d).toBe("M 0 0 L 10 20");
  });

  it("polylineMidpoint finds the arc-length midpoint", () => {
    const mid = polylineMidpoint([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(mid.x).toBeCloseTo(5);
    expect(mid.y).toBeCloseTo(0);
  });
});

describe("DagChart render", () => {
  it("renders an SVG diagram with an accessible label", () => {
    const { container } = render(() => (
      <DagChart
        nodes={nodes}
        edges={edges}
        renderNode={(n) => <div>{n.id}</div>}
        interactive={false}
      />
    ));
    const svg = container.querySelector("svg.sui-dag")!;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute("aria-label")).toBe("Dependency graph");
  });
});
