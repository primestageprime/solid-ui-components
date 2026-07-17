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
    expect(geo).toEqual({ minCh: 8, maxCh: 20, css: "20ch" });
  });

  it("moneyCol builds a right-aligned, sortable column with baked geometry", () => {
    const col = moneyCol<Row>("amountCents");
    expect(col.id).toBe("amountCents");
    expect(col.align).toBe("right");
    expect(col.width).toBe("20ch");
    expect(col.sortable).toBe(true);
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
