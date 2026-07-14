import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { BulkActionBar } from "./BulkActionBar";

afterEach(cleanup);

// Layout-purity regression guard. The sticky-bottom anchoring stays in CSS
// (overlay control); the spread arrangement is now a SpreadRow and the action
// cluster a ClusterRow (was hand-rolled flex). Outer gap snapped 16px->sm.
describe("BulkActionBar layout purity", () => {
  const props = {
    count: 3,
    noun: "cell",
    actionLabel: "Align",
    onAction: () => {},
    onClear: () => {},
  };

  it("root is a SpreadRow keeping the toolbar role + BEM hook", () => {
    const { container } = render(() => <BulkActionBar {...props} />);
    const root = container.querySelector(".sui-bulk-action-bar")!;
    expect(root.getAttribute("role")).toBe("toolbar");
    expect(root.classList.contains("row")).toBe(true);
    expect(root.classList.contains("row--justify-between")).toBe(true);
    expect(root.classList.contains("row--gap-sm")).toBe(true);
  });

  it("actions are a ClusterRow containing the primary + clear buttons", () => {
    const { container, getByText } = render(() => <BulkActionBar {...props} />);
    const actions = container.querySelector(".sui-bulk-action-bar__actions")!;
    expect(actions.classList.contains("row")).toBe(true);
    expect(getByText("Align")).toBeTruthy();
    expect(getByText("Clear")).toBeTruthy();
  });

  it("omits Clear when no onClear (prop behavior unchanged)", () => {
    const { queryByText } = render(() => (
      <BulkActionBar count={1} noun="row" actionLabel="Go" onAction={() => {}} />
    ));
    expect(queryByText("Clear")).toBeNull();
  });
});
