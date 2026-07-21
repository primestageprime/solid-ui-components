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
    expect(geo).toEqual({ minCh: 8, maxCh: 40, padPx: 16 });
    expect(geo.css).toBeUndefined();
  });
});

describe("textCol — factory shape", () => {
  it("minCh floors at a long humanized label (ruled 2026-07-21)", () => {
    const col = textCol<{ operational_band_share: string }>(
      "operational_band_share", // "Operational Band Share" = 22ch > 8ch min
    );
    expect(col.geo?.minCh).toBe(26); // 22 glyphs × 1.17 header tracking
    expect(col.geo?.maxCh).toBe(40); // flexible cap unchanged
    expect(col.geo?.css).toBeUndefined();
  });

  it("humanizes the key into a LEFT-aligned plain-string header", () => {
    const col = textCol<Row>("displayName");
    expect(col.id).toBe("displayName");
    // Left-aligned flowing text: header is a bare humanized string, never wrapped
    // in centered()'s span element.
    expect(col.header).toBe("Display Name");
    expect(typeof col.header).toBe("string");
  });

  it("carries a sortValue, is ellipsis-clipped, and carries the text geometry", () => {
    const col = textCol<Row>("note");
    expect(col.sortable).toBeUndefined(); // table-level mode flips it (ruled 2026-07-18)
    expect(typeof col.sortValue).toBe("function");
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

  it("renders blank when the value is nullish (ruled 2026-07-18: no empty markers)", () => {
    const col = textCol<Row>("note");
    const { container } = render(() =>
      asFn(col.accessor)({ displayName: "x", note: null }),
    );
    expect(container.textContent).toBe("");
  });
});

// Sized text set (ruled 2026-07-21): fixed-width text columns for short
// strings whose length class is known — 5/10/15/20 ch, floored at the label.
import { text5Col, text10Col, text15Col, text20Col } from "./text";

describe("sized text set", () => {
  it("each size class is content-fit FIXED at its width", () => {
    interface R { code: string }
    expect(text10Col<R>("code").geo).toEqual({
      minCh: 10, maxCh: 10, padPx: 16, css: "calc(10ch + 16px)",
    });
    expect(text15Col<R>("code").geo?.maxCh).toBe(15);
    expect(text20Col<R>("code").geo?.maxCh).toBe(20);
  });

  it("floors at the tracked header label when it exceeds the size class", () => {
    interface R { state: string }
    // "State" (5 glyphs × 1.17 tracking → 6ch) floors the 5ch class.
    expect(text5Col<R>("state").geo).toEqual({
      minCh: 6, maxCh: 6, padPx: 16, css: "calc(6ch + 16px)",
    });
  });
});
