import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { AssigneeChips } from "./AssigneeChips";
import { domStructure } from "../../test-utils/domStructure";

afterEach(cleanup);

// Layout-purity regression guard. The wrapping chip row is now composed from the
// ChipCluster Layout variant (was a hand-rolled .sui-assignee-chips flex row).
// The public props are unchanged and the render is one wrapper containing one
// intrinsic pill span per id — that structure must not regress.
describe("AssigneeChips layout purity", () => {
  const resolve = (id: string) => id.toUpperCase();

  it("renders a single ChipCluster wrapper of intrinsic chip pills", () => {
    const { container } = render(() => (
      <AssigneeChips ids={["a", "b"]} resolveName={resolve} />
    ));
    expect(domStructure(container)).toBe(
      [
        "div.row.row--align-center.row--gap-xs.row--wrap",
        "  span.sui-assignee-chip.sui-assignee-chip--sm",
        '    "A"',
        "  span.sui-assignee-chip.sui-assignee-chip--sm",
        '    "B"',
      ].join("\n"),
    );
  });

  it("threads size through to the pill class (byte-identical prop behavior)", () => {
    const { container } = render(() => (
      <AssigneeChips ids={["x"]} resolveName={resolve} size="md" />
    ));
    expect(container.querySelector(".sui-assignee-chip--md")).toBeTruthy();
  });

  it("renders nothing when ids is empty", () => {
    const { container } = render(() => (
      <AssigneeChips ids={[]} resolveName={resolve} />
    ));
    expect(container.querySelector(".sui-assignee-chip")).toBeNull();
  });
});
