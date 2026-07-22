import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { avgCol } from "./avg";
import { geo as floatGeo } from "./float";

afterEach(cleanup);

interface Row {
  aux_1: number | null;
  aux_2: number | null;
  aux_3: number | null;
}

const renderCell = (row: Row, opts?: Parameters<typeof avgCol<Row>>[1]) =>
  render(() => (
    <>
      {(avgCol<Row>(["aux_1", "aux_2", "aux_3"], opts).accessor as (
        r: Row,
      ) => JSX.Element)(row)}
    </>
  ));

describe("avg field", () => {
  it("uses float geometry and the configured header/id", () => {
    const col = avgCol<Row>(["aux_1"], { id: "kw", header: "kW/train" });
    // "kW/train" (8 glyphs × 1.17 header tracking → 10ch) floors the 6ch data minimum.
    expect(col.geo).toEqual({ ...floatGeo, minCh: 10 });
    expect(col.id).toBe("kw");
    expect(col.align).toBe("right");
  });

  it("averages the configured keys, skipping nulls, accent by default", () => {
    const { container } = renderCell({ aux_1: 912, aux_2: 946, aux_3: null });
    const toned = container.querySelector(".sui-field-tone--accent");
    expect(toned).toBeTruthy();
    expect(toned?.textContent).toBe("929"); // (912 + 946) / 2 — exact, as given
  });

  it("renders blank when no member is numeric (ruled 2026-07-18)", () => {
    const { container } = renderCell({ aux_1: null, aux_2: null, aux_3: null });
    expect(container.textContent).toBe("");
  });

  it("a configured tone fn overrides the accent default", () => {
    const { container } = renderCell(
      { aux_1: 100, aux_2: 100, aux_3: 100 },
      { tone: (avg) => (avg > 50 ? "danger" : "default") },
    );
    expect(container.querySelector(".sui-field-tone--danger")).toBeTruthy();
    expect(container.querySelector(".sui-field-tone--accent")).toBeNull();
  });
});
