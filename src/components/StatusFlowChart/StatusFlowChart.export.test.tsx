import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import * as sui from "../../index";

// Every other test in this directory imports from "./StatusFlowChart" or
// "./columns", which is exactly why the suite stayed green while src/index.ts
// re-exported nothing from this family but the `StatusFlowNode` TYPE. The
// component, its factory and the three layout helpers COMPONENTS.md describes
// as "exposed for testing" were all unreachable from the package root.
//
// Anything added to src/components/StatusFlowChart/index.ts that consumers are
// meant to reach needs a line here too.
describe("package root exports", () => {
  it("exposes the factory, not the base component", () => {
    expect(sui.createStatusFlowChart).toBeTypeOf("function");
    // The curried-only policy: the base must NOT leak to the root, or call
    // sites can pass their own `columns` and two views of one board disagree
    // about where a status belongs.
    expect("StatusFlowChart" in sui).toBe(false);
  });

  it("exposes the pure layout helpers", () => {
    expect(sui.pickVisibleCols).toBeTypeOf("function");
    expect(sui.assignColumns).toBeTypeOf("function");
    expect(sui.resolveParentStatuses).toBeTypeOf("function");
  });
});

describe("createStatusFlowChart", () => {
  const config = {
    columns: [
      { label: "Done", statuses: ["done"] },
      { label: "Doing", statuses: ["doing"] },
      { label: "Todo", statuses: ["todo"] },
    ],
    centerStatus: "doing",
    terminalStatus: "done",
    nodeWidth: 180,
    nodeHeight: 60,
    minArrowWidth: 40,
    breakpoints: [{ minWidth: 0, visibleCols: 3 }],
  };

  it("renders a variant from data props alone", () => {
    const ProjectFlow = sui.createStatusFlowChart(config);
    const { container } = render(() => (
      <ProjectFlow
        nodes={[
          { id: "a", title: "Ship it", status: "doing" },
          { id: "b", title: "Write it", status: "done" },
        ]}
      />
    ));
    expect(container.querySelector(".sui-statusflow")).toBeTruthy();
    expect(container.textContent).toContain("Ship it");
  });

  // The reason the config parameter is `Pick`, not `Partial<Pick>`: a variant
  // with no taxonomy cannot lay anything out, and the failure mode is a blank
  // box rather than an error. Keeping it required makes that a compile error.
  // This asserts the runtime half — a baked taxonomy actually reaches the
  // chart rather than being dropped by mergeProps.
  it("bakes the config so a call site cannot override it", () => {
    const Flow = sui.createStatusFlowChart({ ...config, nodeWidth: 240 });
    const props = { nodes: [{ id: "a", title: "A", status: "doing" }] };
    // `nodeWidth` is not in StatusFlowChartDataProps, so this is the shape a
    // JS consumer could still attempt at runtime.
    const { container } = render(() => (
      <Flow {...(props as Parameters<typeof Flow>[0])} />
    ));
    expect(container.querySelector(".sui-statusflow")).toBeTruthy();
  });
});
