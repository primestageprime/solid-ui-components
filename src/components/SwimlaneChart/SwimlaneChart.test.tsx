import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { SwimlaneChart } from "./SwimlaneChart";

afterEach(cleanup);

// Characterization + behavior coverage for the SwimlaneChart geometry.
//
// The chart's node/edge geometry is PROPS-driven (nodes/edges/nodeSize/
// columnGap/rowGap) — container width only affects the responsive collapse
// (opted out here via `responsiveCollapse={false}`) and viewport fit. So with a
// fixed DAG the rendered SVG is deterministic and testable headlessly. These
// tests lock the current output so the geometry can later be refactored (e.g.
// extracted into pure functions) and verified to produce identical results.

const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

type Cols = Record<string, number>;

function mountChain(
  overrides: {
    arrows?: boolean;
    routingStyle?: "bezier" | "orthogonal";
    columnGap?: number;
  } = {},
) {
  const nodes = [
    { id: "a", data: {} },
    { id: "b", data: {} },
    { id: "c", data: {} },
  ];
  const edges = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
  ];
  const col: Cols = { a: 0, b: 1, c: 2 };
  const { container } = render(() => (
    <SwimlaneChart
      nodes={nodes}
      edges={edges}
      swimlaneFor={(n) => col[n.id]}
      renderNode={(n) => <div class="probe-node">{n.id}</div>}
      responsiveCollapse={false}
      interactive={false}
      columnGap={overrides.columnGap}
      arrows={overrides.arrows}
      routingStyle={overrides.routingStyle}
    />
  ));
  return { container };
}

const edgePaths = (c: Element) =>
  [...c.querySelectorAll<SVGPathElement>("path.sui-swimlane__edge")];
const nodeWrappers = (c: Element) =>
  [...c.querySelectorAll<SVGForeignObjectElement>(".sui-swimlane__node-wrapper")];
const wrapperFor = (c: Element, id: string) =>
  nodeWrappers(c).find((w) => w.textContent?.includes(id))!;

describe("SwimlaneChart — geometry", () => {
  it("renders one node per input node and one path per edge", async () => {
    const { container } = mountChain();
    await tick();
    expect(nodeWrappers(container).length).toBe(3);
    expect([...nodeWrappers(container)].map((w) => w.textContent).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(edgePaths(container).length).toBe(2);
  });

  it("positions nodes left→right by swimlane column", async () => {
    const { container } = mountChain();
    await tick();
    const x = (id: string) =>
      parseFloat(wrapperFor(container, id).getAttribute("x") ?? "NaN");
    // Columns 0 < 1 < 2 → strictly increasing x (foreignObject x = center-w/2).
    expect(x("a")).toBeLessThan(x("b"));
    expect(x("b")).toBeLessThan(x("c"));
  });

  it("widens column spacing with a larger columnGap", async () => {
    const narrow = mountChain({ columnGap: 200 });
    await tick();
    const nx = (c: Element, id: string) =>
      parseFloat(wrapperFor(c, id).getAttribute("x") ?? "NaN");
    const narrowSpan = nx(narrow.container, "c") - nx(narrow.container, "a");
    cleanup();
    const wide = mountChain({ columnGap: 400 });
    await tick();
    const wideSpan = nx(wide.container, "c") - nx(wide.container, "a");
    expect(wideSpan).toBeGreaterThan(narrowSpan);
  });

  it("orthogonal routing uses line segments; bezier uses curves", async () => {
    const orth = mountChain({ routingStyle: "orthogonal" });
    await tick();
    const orthD = edgePaths(orth.container)[0].getAttribute("d") ?? "";
    expect(orthD).toContain("L"); // straight segments
    expect(orthD).not.toContain("C");
    cleanup();
    const bez = mountChain({ routingStyle: "bezier" });
    await tick();
    const bezD = edgePaths(bez.container)[0].getAttribute("d") ?? "";
    expect(bezD).toContain("C"); // cubic curve
  });

  it("applies an arrowhead marker only when arrows are enabled", async () => {
    const on = mountChain({ arrows: true });
    await tick();
    expect(edgePaths(on.container)[0].getAttribute("marker-end")).toContain(
      "url(#",
    );
    cleanup();
    const off = mountChain({ arrows: false });
    await tick();
    expect(edgePaths(off.container)[0].getAttribute("marker-end")).toBeNull();
  });

  it("produces stable edge path geometry (characterization lock)", async () => {
    const { container } = mountChain({ routingStyle: "orthogonal", columnGap: 260 });
    await tick();
    const ds = edgePaths(container).map((p) => p.getAttribute("d"));
    expect(ds).toMatchInlineSnapshot(`
      [
        "M 90 0 L 170 0",
        "M 350 0 L 430 0",
      ]
    `);
  });
});

describe("SwimlaneChart — collapse into summary badges", () => {
  // A 5-node chain a→b→c→d→e centered on c (col 2) with maxDepth=1 collapses the
  // two ends (a on the left, e on the right) into side "boundary badges", drawing
  // dashed summary edges to the pills. Exercises sideBadgePositions (badge
  // geometry), boundaryBadges (the pill rendering), and the badge-routing
  // branches of computeEdgeViews.
  function mountCollapsed() {
    const ids = ["a", "b", "c", "d", "e"];
    const nodes = ids.map((id) => ({ id, data: {} }));
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "c", target: "d" },
      { source: "d", target: "e" },
    ];
    const col: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };
    const { container } = render(() => (
      <SwimlaneChart
        nodes={nodes}
        edges={edges}
        swimlaneFor={(n) => col[n.id]}
        renderNode={(n) => <div class="probe-node">{n.id}</div>}
        responsiveCollapse={false}
        interactive={false}
        maxDepth={1}
        centerCol={2}
      />
    ));
    return { container };
  }

  const badges = (c: Element) =>
    [...c.querySelectorAll<SVGGElement>(".sui-swimlane__boundary")];

  it("shows only the within-depth nodes and one badge per collapsed side", async () => {
    const { container } = mountCollapsed();
    await tick();
    // Center c ± depth 1 → b, c, d visible; a and e collapse.
    expect([...nodeWrappers(container)].map((w) => w.textContent).sort()).toEqual([
      "b",
      "c",
      "d",
    ]);
    expect(badges(container).length).toBe(2);
  });

  it("labels each badge with its collapsed count", async () => {
    const { container } = mountCollapsed();
    await tick();
    const texts = [
      ...container.querySelectorAll(".sui-swimlane__boundary-badge-text"),
    ].map((t) => t.textContent);
    expect(texts.sort()).toEqual(["+1", "+1"]); // a on the left, e on the right
  });

  it("places the two badges on opposite sides of center", async () => {
    const { container } = mountCollapsed();
    await tick();
    const xs = [
      ...container.querySelectorAll<SVGRectElement>(".sui-swimlane__boundary-badge"),
    ]
      .map((r) => parseFloat(r.getAttribute("x") ?? "NaN"))
      .sort((a, b) => a - b);
    expect(xs[0]).toBeLessThan(0); // left badge
    expect(xs[1]).toBeGreaterThan(0); // right badge
  });

  it("draws dashed summary edges to the badges (characterization lock)", async () => {
    const { container } = mountCollapsed();
    await tick();
    const summaryDs = [
      ...container.querySelectorAll<SVGPathElement>("path.sui-swimlane__edge--summary"),
    ].map((p) => p.getAttribute("d"));
    expect(summaryDs.length).toBe(2);
    expect(summaryDs).toMatchInlineSnapshot(`
      [
        "M -378 0 L -350 0",
        "M 350 0 L 378 0",
      ]
    `);
  });
});
