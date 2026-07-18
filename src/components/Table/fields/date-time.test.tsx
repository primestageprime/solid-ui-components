import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { dateTimeCol, geo } from "./date-time";

afterEach(cleanup);

interface Row {
  createdAt: string;
}

describe("dateTime field", () => {
  it("geo is a fixed 23ch column", () => {
    expect(geo).toEqual({ minCh: 19, maxCh: 19, padPx: 18, css: "calc(19ch + 18px)" });
  });

  it("factory bakes in id, width, sortValue, and geometry", () => {
    const col = dateTimeCol<Row>("createdAt");
    expect(col.id).toBe("createdAt");
    expect(col.width).toBe("calc(19ch + 18px)");
    expect(col.sortable).toBeUndefined(); // table-level mode flips it (ruled 2026-07-18)
    expect(typeof col.sortValue).toBe("function");
    expect(col.geo).toBe(geo);
  });

  it("centers values in the fixed-width column", () => {
    expect(dateTimeCol<Row>("createdAt").align).toBe("center");
  });

  it("header is centered and humanized — trailing ' At' is stripped", () => {
    const col = dateTimeCol<Row>("createdAt");
    const { container } = render(() => col.header as any);
    const th = container.querySelector(".sui-field-th-center");
    expect(th?.textContent).toBe("Created");
  });

  it("accessor renders a datetime cell for the keyed value", () => {
    const col = dateTimeCol<Row>("createdAt");
    const accessor = col.accessor;
    if (typeof accessor !== "function") throw new Error("expected a cell function");
    const { container } = render(() => (
      <>{accessor({ createdAt: "2026-01-15T08:30:00" })}</>
    ));
    expect(container.querySelector(".cell-datetime")).not.toBeNull();
  });
});
