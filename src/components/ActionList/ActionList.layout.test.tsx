import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ActionList } from "./variants";

afterEach(cleanup);

// Layout-purity regression guard. The wrapper column is now a NarrowStack and
// the selection actions bar a ClusterRow (were hand-rolled flex). The bar's
// accent styling + role + margin-right:auto spacer are unchanged.
describe("ActionList layout purity", () => {
  const items = [{ id: "a", name: "Task A" }];
  const actions = [{ hotkey: "c", label: "Claim", onApply: () => {} }];

  it("wraps rows in a NarrowStack", () => {
    const { container } = render(() => <ActionList items={items} />);
    const root = container.querySelector(".sui-action-list")!;
    expect(root.classList.contains("stack")).toBe(true);
    expect(root.classList.contains("stack--gap-sm")).toBe(true);
  });

  it("renders the selection bar as a ClusterRow keeping role + hook", () => {
    const { container } = render(() => (
      <ActionList items={items} actions={actions} selectedIds={["a"]} />
    ));
    const bar = container.querySelector(".sui-action-list__bar")!;
    expect(bar).toBeTruthy();
    expect(bar.getAttribute("role")).toBe("toolbar");
    expect(bar.classList.contains("row")).toBe(true);
    expect(bar.classList.contains("row--align-center")).toBe(true);
  });
});
