import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { geo, nameCol } from "./name";

afterEach(cleanup);

interface Row {
  name: string;
  title: string;
}

const ROW: Row = { name: "Adlai Arnold", title: "Lead Dispatcher" };

describe("name field — geometry", () => {
  it("is FIXED at 50ch — names never get squeezed (ruled 2026-07-18)", () => {
    expect(geo).toEqual({
      minCh: 50,
      maxCh: 50,
      padPx: 16,
      css: "calc(50ch + 16px)",
    });
    expect(geo.minCh).toBe(geo.maxCh);
  });
});

describe("name field — factory shape", () => {
  it("defaults to the `name` key with a humanized left-aligned header", () => {
    const col = nameCol<Row>();
    expect(col.id).toBe("name");
    expect(col.header).toBe("Name");
    // flowing text: no centered() wrapper, so header stays a plain string
    expect(typeof col.header).toBe("string");
    expect(col.ellipsis).toBe(true);
    expect(col.sortable).toBeUndefined(); // table-level mode flips it (ruled 2026-07-18)
    expect(typeof col.sortValue).toBe("function");
    expect(col.geo).toBe(geo);
  });

  it("honors an explicit key and humanizes it", () => {
    const col = nameCol<Row>("title");
    expect(col.id).toBe("title");
    expect(col.header).toBe("Title");
  });
});

describe("name field — cell render", () => {
  it("renders the row value via LongTextCell", () => {
    const col = nameCol<Row>();
    const accessor = col.accessor as (row: Row) => JSX.Element;
    const { container } = render(() => accessor(ROW));
    expect(container.querySelector(".sui-value-longtext")?.textContent).toBe(
      "Adlai Arnold",
    );
  });

  it("renders blank for an empty value (ruled 2026-07-18: no empty markers)", () => {
    const col = nameCol<{ name: string }>();
    const accessor = col.accessor as (row: { name: string }) => JSX.Element;
    const { container } = render(() => accessor({ name: "" }));
    expect(container.textContent).toBe("");
  });
});

// Recede knob (ruled 2026-07-18): a boolean muted fn, not the Tone vocabulary.
describe("name field — muted knob", () => {
  it("wraps the name in the muted tone when the fn returns true", () => {
    const col = nameCol<{ name: string; spent: boolean }>("name", {
      muted: (r) => r.spent,
    });
    const accessor = col.accessor as (row: { name: string; spent: boolean }) => JSX.Element;
    const { container } = render(() => accessor({ name: "Coral Dawn", spent: true }));
    expect(container.querySelector(".sui-field-tone--muted")).toBeTruthy();
    const plain = render(() => accessor({ name: "Coral Dawn", spent: false }));
    expect(plain.container.querySelector(".sui-field-tone--muted")).toBeNull();
  });
});
