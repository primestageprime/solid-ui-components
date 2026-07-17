import type { JSX } from "solid-js";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { durationCol, geo } from "./duration";

afterEach(cleanup);

interface Row {
  elapsed: number;
}

describe("duration field module", () => {
  it("geo is a content-fit column capped at 14ch (min < max)", () => {
    expect(geo).toEqual({ minCh: 5, maxCh: 9, padPx: 16, css: "calc(9ch + 16px)" });
  });

  it("durationCol builds a sortable, right-aligned column at geo width", () => {
    const col = durationCol<Row>("elapsed");
    expect(col.id).toBe("elapsed");
    expect(col.sortable).toBe(true);
    expect(col.align).toBe("right");
    expect(col.width).toBe(geo.css);
    expect(col.geo).toBe(geo);
  });

  it("cell renders a formatted duration, defaulting to seconds", () => {
    const col = durationCol<Row>("elapsed");
    const { container } = render(() => <>{(col.accessor as (row: Row) => JSX.Element)({ elapsed: 754 })}</>);
    expect(container.querySelector(".cell-duration")?.textContent).toBe(
      "12m 34s",
    );
  });

  it("honors the input unit (minutes)", () => {
    const col = durationCol<Row>("elapsed", "m");
    const { container } = render(() => <>{(col.accessor as (row: Row) => JSX.Element)({ elapsed: 90 })}</>);
    expect(container.querySelector(".cell-duration")?.textContent).toBe(
      "1h 30m",
    );
  });
});
