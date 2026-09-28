import { fireEvent } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { renderQueue, rowFor } from "./testHelpers";

describe("GroupedBucketQueue keyboard", () => {
  it("ArrowDown moves focus across leaf groups in render order, no wrap", () => {
    const focused: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "a", bucket: "rev-lic-monthly" },
        { id: "b", bucket: "rev-lic-annual" },
        { id: "c", bucket: "exp-office-monthly" },
      ],
      {
        onSelect: () => {},
        onFocusChange: (k: string | null) => focused.push(k),
      },
    );
    const a = rowFor(container, "a");
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowDown" });
    expect(focused.at(-1)).toBe("b");
    fireEvent.keyDown(rowFor(container, "b"), { key: "ArrowDown" });
    expect(focused.at(-1)).toBe("c");
    // No wrap past the last row.
    fireEvent.keyDown(rowFor(container, "c"), { key: "ArrowDown" });
    expect(focused.at(-1)).toBe("c");
  });

  it("ArrowUp/Home/End traverse the same visible sequence", () => {
    const focused: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "a", bucket: "rev-lic-monthly" },
        { id: "b", bucket: "rev-lic-annual" },
      ],
      {
        onSelect: () => {},
        onFocusChange: (k: string | null) => focused.push(k),
      },
    );
    fireEvent.keyDown(rowFor(container, "b"), { key: "Home" });
    expect(focused.at(-1)).toBe("a");
    fireEvent.keyDown(rowFor(container, "a"), { key: "End" });
    expect(focused.at(-1)).toBe("b");
  });

  it("a collapsed leaf's rows are excluded from arrow-key navigation", () => {
    const focused: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "a", bucket: "rev-lic-monthly" },
        { id: "b", bucket: "exp-office-monthly" },
      ],
      {
        onSelect: () => {},
        onFocusChange: (k: string | null) => focused.push(k),
      },
    );
    const monthlyHeader = container.querySelector(
      '[data-gbq-node="revenue:license:monthly"] > .grouped-bucket-queue__header',
    ) as HTMLElement;
    fireEvent.click(monthlyHeader); // collapse the leaf holding "a"
    const b = rowFor(container, "b");
    b.focus();
    fireEvent.keyDown(b, { key: "ArrowUp" });
    // "a" is hidden — there is nothing above "b" to move to.
    expect(focused.at(-1)).toBe("b");
  });

  it("Enter activates the focused row", () => {
    const selected: (string | null)[] = [];
    const { container } = renderQueue(
      [{ id: "a", bucket: "rev-lic-monthly" }],
      {
        onSelect: (k: string | null) => selected.push(k),
      },
    );
    fireEvent.keyDown(rowFor(container, "a"), { key: "Enter" });
    expect(selected).toEqual(["a"]);
  });

  it("a non-interactive queue (no onSelect, no select mode) puts no row in the tab order", () => {
    const { container } = renderQueue([{ id: "a", bucket: "rev-lic-monthly" }]);
    expect(rowFor(container, "a").getAttribute("tabindex")).toBe("-1");
  });
});
