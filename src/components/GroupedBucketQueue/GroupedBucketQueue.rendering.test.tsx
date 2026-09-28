import { fireEvent } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { headerFor, renderQueue, rowFor, rows } from "./testHelpers";

describe("GroupedBucketQueue rendering", () => {
  it("renders every header depth-first with rolled-up counts", () => {
    const { container } = renderQueue([
      { id: "a", bucket: "rev-lic-monthly" },
      { id: "b", bucket: "rev-lic-monthly" },
      { id: "c", bucket: "exp-office-monthly" },
    ]);
    expect(headerFor(container, "revenue").textContent).toContain("Revenue");
    expect(headerFor(container, "revenue").textContent).toContain("2");
    expect(headerFor(container, "revenue:license").textContent).toContain("2");
    expect(
      headerFor(container, "revenue:license:monthly").textContent,
    ).toContain("2");
    expect(
      headerFor(container, "revenue:license:annual").textContent,
    ).toContain("0");
    expect(headerFor(container, "expense").textContent).toContain("1");
  });

  it("renders rows only under their own leaf, in item order", () => {
    const { container } = renderQueue([
      { id: "a", bucket: "rev-lic-monthly" },
      { id: "b", bucket: "exp-office-monthly" },
      { id: "c", bucket: "rev-lic-monthly" },
    ]);
    const allRows = rows(container).map((r) => r.dataset.gbqKey);
    expect(allRows).toEqual(["a", "c", "b"]);
  });

  it("collapsing a Category hides its Type header and rows", () => {
    const { container } = renderQueue([{ id: "a", bucket: "rev-lic-monthly" }]);
    expect(rowFor(container, "a")).toBeTruthy();
    fireEvent.click(headerFor(container, "revenue:license"));
    expect(
      container.querySelector('[data-gbq-node="revenue:license:monthly"]'),
    ).toBeNull();
    expect(rowFor(container, "a")).toBeNull();
  });

  it("re-expanding restores the rows", () => {
    const { container } = renderQueue([{ id: "a", bucket: "rev-lic-monthly" }]);
    fireEvent.click(headerFor(container, "revenue:license"));
    fireEvent.click(headerFor(container, "revenue:license"));
    expect(rowFor(container, "a")).toBeTruthy();
  });

  it("a zero-count leaf's header is not a toggle button", () => {
    const { container } = renderQueue([{ id: "a", bucket: "rev-lic-monthly" }]);
    const header = headerFor(container, "revenue:license:annual");
    expect(header.tagName).toBe("DIV");
  });

  it("clicking a row fires onSelect", () => {
    const onSelect = (v: unknown) => selected.push(v as string | null);
    const selected: (string | null)[] = [];
    const { container } = renderQueue(
      [{ id: "a", bucket: "rev-lic-monthly" }],
      { onSelect },
    );
    fireEvent.click(rowFor(container, "a"));
    expect(selected).toEqual(["a"]);
  });
});
