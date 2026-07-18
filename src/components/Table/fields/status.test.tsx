import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { statusCol, geo } from "./status";

afterEach(cleanup);

interface Row {
  operator_kind: string | null;
}

const MAP = {
  operator: { label: "Operator", tone: "accent" as const },
  agent: { label: "Agent", tone: "success" as const },
};

const renderCell = (row: Row) =>
  render(() => (
    <>
      {(statusCol<Row>("operator_kind", MAP).accessor as (
        r: Row,
      ) => JSX.Element)(row)}
    </>
  ));

describe("status field", () => {
  it("keeps the fixed status geometry and humanized header", () => {
    const col = statusCol<Row>("operator_kind", MAP);
    expect(col.geo).toBe(geo);
    expect(geo).toEqual({ minCh: 9, maxCh: 9, padPx: 18, css: "calc(9ch + 18px)" });
    expect(col.align).toBe("right");
  });

  it("maps a valid value to its badge label and tone variant", () => {
    const { container } = renderCell({ operator_kind: "operator" });
    const badge = container.querySelector(".status-badge--info");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain("Operator");
  });

  it("renders blank for null (no empty markers)", () => {
    const { container } = renderCell({ operator_kind: null });
    expect(container.textContent).toBe("");
  });

  it("renders an unmapped value as quiet muted text, not a badge", () => {
    const { container } = renderCell({ operator_kind: "mystery" });
    expect(container.querySelector(".status-badge")).toBeNull();
    expect(container.querySelector(".sui-field-tone--muted")?.textContent).toBe(
      "mystery",
    );
  });
});
