import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { aggregateCol } from "./aggregate";
import { avgCol } from "./avg";
import { geo as floatGeo } from "./float";
import { pipe, filter, sum } from "../../../fn";

afterEach(cleanup);

// aggregateCol (ruled 2026-07-20): the generic shape is curried, the math is
// a configure-time pure combine(values, row). avgCol is the mean sugar.

interface Row {
  aux_1: number | null;
  aux_2: number | null;
  trains: number;
}

const isPositive = (v: number): boolean => v > 0;
const perTrainKw = (values: number[], row: Row): number =>
  sum(pipe(values, filter(isPositive))) / row.trains;

const renderCell = (col: { accessor: unknown }, row: Row) =>
  render(() => (col.accessor as (r: Row) => JSX.Element)(row));

describe("aggregateCol", () => {
  const col = aggregateCol<Row>(["aux_1", "aux_2"], perTrainKw, {
    id: "avg_kw",
    header: "Avg",
  });

  it("combine receives the finite members and the row — exact math preserved", () => {
    // 412 + 398 = 810, two trains ⇒ 405 (a SUM split, not a mean of columns)
    expect(col.sortValue?.({ aux_1: 412, aux_2: 398, trains: 2 })).toBe(405);
    // null member skipped; one train ⇒ plain sum
    expect(col.sortValue?.({ aux_1: 412, aux_2: null, trains: 1 })).toBe(412);
  });

  it("wears the accent tone by default at float geometry", () => {
    expect(col.geo).toBe(floatGeo);
    const { container } = renderCell(col, { aux_1: 412, aux_2: 398, trains: 2 });
    expect(container.querySelector(".sui-field-tone--accent")).toBeTruthy();
    expect(container.textContent).toContain("405");
  });

  it("combine returning null renders BLANK", () => {
    const c = aggregateCol<Row>(["aux_1"], () => null, { id: "x" });
    const { container } = renderCell(c, { aux_1: 1, aux_2: 1, trains: 1 });
    expect(container.textContent).toBe("");
  });
});

describe("avgCol — the mean sugar", () => {
  it("is aggregateCol with meanOrNull: same defaults, same blank-empty", () => {
    const col = avgCol<Row>(["aux_1", "aux_2"]);
    expect(col.id).toBe("avg");
    expect(col.sortValue?.({ aux_1: 4, aux_2: 8, trains: 1 })).toBe(6);
    const { container } = renderCell(col, { aux_1: null, aux_2: null, trains: 1 });
    expect(container.textContent).toBe("");
  });
});
