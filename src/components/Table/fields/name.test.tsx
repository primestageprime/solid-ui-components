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
  it("exports an expanding geo (min < max, no fixed css)", () => {
    expect(geo).toEqual({ minCh: 12, maxCh: 50 });
    expect(geo.css).toBeUndefined();
    expect(geo.minCh).toBeLessThan(geo.maxCh);
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
    expect(col.sortable).toBe(true);
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
    expect(container.querySelector(".cell-longtext")?.textContent).toBe(
      "Adlai Arnold",
    );
  });

  it("renders an em-dash for an empty value", () => {
    const col = nameCol<{ name: string }>();
    const accessor = col.accessor as (row: { name: string }) => JSX.Element;
    const { container } = render(() => accessor({ name: "" }));
    expect(container.querySelector(".cell-empty")?.textContent).toBe("—");
  });
});
