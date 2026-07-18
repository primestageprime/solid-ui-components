import type { JSX } from "solid-js";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { geo, moneyCol } from "./money";

afterEach(cleanup);

// The `money` field module: factory shape (id, centered/humanized header,
// right-aligned, geometry baked in) plus a cell that formats integer cents as
// currency (value / 100 — PrimeStage's *Cents storage convention).

interface Row {
  amountCents: number;
}

describe("money field module", () => {
  it("geo is a content-fit column capped at 22ch", () => {
    expect(geo).toEqual({ minCh: 6, maxCh: 18, padPx: 18, css: "calc(18ch + 18px)" });
  });

  it("moneyCol builds a right-aligned, sortValue-carrying column with baked geometry", () => {
    const col = moneyCol<Row>("amountCents");
    expect(col.id).toBe("amountCents");
    expect(col.align).toBe("right");
    expect(col.width).toBe("calc(18ch + 18px)");
    expect(col.sortable).toBeUndefined(); // table-level mode flips it (ruled 2026-07-18)
    expect(typeof col.sortValue).toBe("function");
    expect(col.geo).toBe(geo);
  });

  it("humanizes the header, stripping the ' Cents' storage suffix", () => {
    const col = moneyCol<Row>("amountCents");
    const { container } = render(() => <>{col.header}</>);
    expect(container.textContent).toBe("Amount");
  });

  it("renders the cell as currency, dividing integer cents by 100", () => {
    const col = moneyCol<Row>("amountCents");
    const { container } = render(() => <>{(col.accessor as (row: Row) => JSX.Element)({ amountCents: 812_500 })}</>);
    expect(container.querySelector(".cell-money")?.textContent).toBe("$8,125.00");
  });
});
