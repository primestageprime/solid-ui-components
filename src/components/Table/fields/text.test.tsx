import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { geo, textCol } from "./text";

afterEach(cleanup);

// The text field module: an expanding secondary-text column factory plus its
// geometry. Guards the factory shape (humanized LEFT header, sortable, ellipsis)
// and that its accessor renders a LongTextCell.

interface Row {
  displayName: string;
  note: string | null;
}

const asFn = <T,>(
  accessor: ((row: T) => JSX.Element | string | number) | keyof T,
) => {
  if (typeof accessor !== "function") throw new Error("accessor is not a function");
  return accessor;
};

describe("text field — geometry", () => {
  it("expands between 8 and 40ch with no fixed css (yields to name)", () => {
    expect(geo).toEqual({ minCh: 8, maxCh: 40 });
    expect(geo.css).toBeUndefined();
  });
});

describe("textCol — factory shape", () => {
  it("humanizes the key into a LEFT-aligned plain-string header", () => {
    const col = textCol<Row>("displayName");
    expect(col.id).toBe("displayName");
    // Left-aligned flowing text: header is a bare humanized string, never wrapped
    // in centered()'s span element.
    expect(col.header).toBe("Display Name");
    expect(typeof col.header).toBe("string");
  });

  it("is sortable, ellipsis-clipped, and carries the text geometry", () => {
    const col = textCol<Row>("note");
    expect(col.sortable).toBe(true);
    expect(col.ellipsis).toBe(true);
    expect(col.geo).toBe(geo);
    expect(col.align).toBeUndefined();
  });
});

describe("textCol — cell rendering", () => {
  it("renders a LongTextCell with the row value", () => {
    const col = textCol<Row>("note");
    const { container } = render(() =>
      asFn(col.accessor)({ displayName: "x", note: "Prefers mornings" }),
    );
    expect(container.querySelector(".cell-longtext")?.textContent).toBe(
      "Prefers mornings",
    );
  });

  it("renders an em-dash when the value is nullish", () => {
    const col = textCol<Row>("note");
    const { container } = render(() =>
      asFn(col.accessor)({ displayName: "x", note: null }),
    );
    expect(container.querySelector(".cell-empty")?.textContent).toBe("—");
  });
});
