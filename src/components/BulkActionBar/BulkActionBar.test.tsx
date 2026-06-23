import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { BulkActionBar } from "./index";

describe("BulkActionBar", () => {
  it("renders the count, pluralized noun, and action label", () => {
    const { container, getByText } = render(() => (
      <BulkActionBar
        count={3}
        noun="cell"
        actionLabel="Align to baseline"
        onAction={() => {}}
      />
    ));
    const root = container.firstElementChild!;
    expect(root.textContent).toMatch(/3/);
    expect(root.textContent).toMatch(/cells/); // pluralized
    expect(getByText("Align to baseline")).toBeTruthy();
  });

  it("uses the singular noun when count === 1", () => {
    const { container } = render(() => (
      <BulkActionBar
        count={1}
        noun="cell"
        actionLabel="Align"
        onAction={() => {}}
      />
    ));
    expect(container.textContent).toMatch(/cell/);
    expect(container.textContent).not.toMatch(/cells/);
  });

  it("fires onAction when the primary button is pressed", () => {
    let fired = false;
    const { getByText } = render(() => (
      <BulkActionBar
        count={2}
        noun="cell"
        actionLabel="Align to baseline"
        onAction={() => (fired = true)}
      />
    ));
    fireEvent.click(getByText("Align to baseline"));
    expect(fired).toBe(true);
  });

  it("renders Clear only when onClear is provided, and fires it", () => {
    let cleared = false;
    const { getByText } = render(() => (
      <BulkActionBar
        count={2}
        noun="cell"
        actionLabel="Align"
        onAction={() => {}}
        onClear={() => (cleared = true)}
      />
    ));
    fireEvent.click(getByText("Clear"));
    expect(cleared).toBe(true);
  });

  it("omits Clear when onClear is absent", () => {
    const { queryByText } = render(() => (
      <BulkActionBar count={2} noun="cell" actionLabel="Align" onAction={() => {}} />
    ));
    expect(queryByText("Clear")).toBeNull();
  });
});
