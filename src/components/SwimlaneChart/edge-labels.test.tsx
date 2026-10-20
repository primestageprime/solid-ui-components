import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { stackedFlowPath } from "../../internal/dag-svg";
import { SwimlaneChart } from "./SwimlaneChart";
import { SwimlaneEdgeLabels } from "./edge-labels";

describe("stackedFlowPath", () => {
  it("runs a same-column edge straight from the bottom of one node to the top of the next", () => {
    expect(stackedFlowPath({ x: 0, y: 0, width: 100, height: 40 }, { x: 0, y: 100, width: 100, height: 40 })).toBe("M 0 20 L 0 80");
  });
  it("curves a cross-column edge between the inner sides", () => {
    expect(stackedFlowPath({ x: -200, y: 50, width: 100, height: 40 }, { x: 0, y: 0, width: 200, height: 100 })).toBe(
      "M -150 50 C -125 50, -125 0, -100 0",
    );
  });
});

describe("SwimlaneEdgeLabels", () => {
  it("draws one label per labelled edge and none when disabled", () => {
    const edges = [
      { key: "a|b", d: "M 0 0 L 0 100", isSummary: false },
      { key: "b|c", d: "M 0 0 L 100 0", isSummary: false },
    ];
    const labelOf = (k: string) => (k === "a|b" ? "18 min" : undefined);
    const on = render(() => (
      <svg>
        <SwimlaneEdgeLabels edges={edges} labelOf={labelOf} enabled />
      </svg>
    ));
    expect(on.container.querySelectorAll(".sui-swimlane__edge-twin").length).toBe(1);
    const off = render(() => (
      <svg>
        <SwimlaneEdgeLabels edges={edges} labelOf={labelOf} enabled={false} />
      </svg>
    ));
    expect(off.container.querySelectorAll(".sui-swimlane__edge-twin").length).toBe(0);
  });
});

describe("SwimlaneChart stacked + fitColumns", () => {
  it("renders every node of a chain with fitColumns off and stacked routing", () => {
    const nodes = ["a", "b", "c", "d"].map((id) => ({ id, data: { col: id === "c" ? 0 : id === "d" ? 1 : -1 } }));
    const edges = [
      { source: "a", target: "b", label: "18 min" },
      { source: "b", target: "c" },
      { source: "c", target: "d" },
    ];
    const { container } = render(() => (
      <SwimlaneChart
        nodes={nodes}
        edges={edges}
        swimlaneFor={(n) => n.data.col}
        maxDepth={99}
        responsiveCollapse={false}
        fitColumns={false}
        columnGap={200}
        rowOrder="input"
        routingStyle="stacked"
        renderNode={(n) => <span>{n.id}</span>}
      />
    ));
    expect(container.querySelectorAll("foreignObject").length).toBe(4);
    // Input order holds in the done column: a above b.
    const y = (id: string) => Number(container.querySelector(`foreignObject[aria-label="${id}"], foreignObject:has([aria-label="${id}"])`)?.getAttribute("y"));
    expect(y("a")).toBeLessThan(y("b"));
    expect(container.querySelectorAll(".sui-swimlane__edge").length).toBe(3);
  });
});
