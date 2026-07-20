import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { withHref, withHint } from "./combinators";
import { intCol } from "./int";
import { statusCol } from "./status";

afterEach(cleanup);

// Column combinators (ruled 2026-07-20): decorate ANY built FieldCol —
// withHref links the cell, withHint tooltips the header. Dual form like fn.

interface Row {
  flow: number;
  week: string;
  status: string;
}

const ROW: Row = { flow: 22, week: "2026-W28", status: "exported" };

const renderCell = <T,>(col: { accessor: unknown }, row: T) =>
  render(() => (col.accessor as (r: T) => JSX.Element)(row));

describe("withHref", () => {
  it("wraps the cell in an accent link; geometry and sort survive", () => {
    const base = intCol<Row>("flow");
    const linked = withHref<Row>((r) => `/violations?bucket=flow&week=${r.week}`, base);
    expect(linked.geo).toBe(base.geo);
    expect(linked.sortValue?.(ROW)).toBe(22);
    const { container } = renderCell(linked, ROW);
    const a = container.querySelector("a.sui-field-link");
    expect(a?.getAttribute("href")).toBe("/violations?bucket=flow&week=2026-W28");
    expect(a?.textContent).toBe("22");
  });

  it("curried form equals direct form", () => {
    const direct = withHref<Row>((r) => `/w/${r.week}`, intCol<Row>("flow"));
    const curried = withHref<Row>((r) => `/w/${r.week}`)(intCol<Row>("flow"));
    const d = renderCell(direct, ROW).container.querySelector("a")?.getAttribute("href");
    const c = renderCell(curried, ROW).container.querySelector("a")?.getAttribute("href");
    expect(d).toBe(c);
  });

  it("composes with statusCol — the linked badge", () => {
    const badge = withHref<Row>(
      () => "https://sheets.example/export",
      statusCol<Row>("status", { exported: { label: "Exported", tone: "success" } }),
    );
    const { container } = renderCell(badge, ROW);
    const a = container.querySelector("a.sui-field-link");
    expect(a?.querySelector(".status-badge")).toBeTruthy();
  });
});

describe("withHint", () => {
  it("tooltips the header with a help affordance; header text unchanged", () => {
    const hinted = withHint<Row>("Calls with a flow fault this week", intCol<Row>("flow"));
    const { container } = render(() => hinted.header as JSX.Element);
    const trigger = container.querySelector(".sui-field-th-hint");
    expect(trigger?.textContent).toBe("Flow");
    expect(container.querySelector(".sui-tooltip__trigger, [class*='tooltip']")).toBeTruthy();
  });

  it("leaves the accessor untouched", () => {
    const base = intCol<Row>("flow");
    const hinted = withHint<Row>("hint", base);
    expect(hinted.accessor).toBe(base.accessor);
    expect(hinted.sortValue?.(ROW)).toBe(22);
  });
});

describe("withHref — nullish href", () => {
  it("renders the plain cell, never a dead link (no destination → no anchor)", () => {
    const linked = withHref<Row>(
      (r) => (r.flow > 0 ? `/violations?bucket=flow` : null),
      intCol<Row>("flow"),
    );
    const zero = renderCell(linked, { ...ROW, flow: 0 });
    expect(zero.container.querySelector("a")).toBeNull();
    expect(zero.container.textContent).toBe("0");
    const linkedRow = renderCell(linked, ROW);
    expect(linkedRow.container.querySelector("a.sui-field-link")).toBeTruthy();
  });
});
