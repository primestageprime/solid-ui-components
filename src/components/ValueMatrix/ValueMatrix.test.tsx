import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ValueMatrix } from "./ValueMatrix";

afterEach(cleanup);

interface Source {
  key: string;
  label: string;
}
const SOURCES: Source[] = [
  { key: "shore", label: "Shore" },
  { key: "barge", label: "Barge" },
];
const CE_LEVELS = [90, 95];
const VALUES: Record<string, Record<number, number | null>> = {
  shore: { 90: 0.42, 95: 0.21 },
  barge: { 90: 2.9, 95: null },
};

const matrix = (extra?: {
  tone?: (v: number | null, ce: number, s: Source) => "success" | "danger" | "default";
  selected?: (ce: number, s: Source) => boolean;
}) => (
  <ValueMatrix
    rows={CE_LEVELS}
    cols={SOURCES}
    rowLabel={(ce) => `${ce}%`}
    colLabel={(s) => s.label}
    rowAxisLabel="CE"
    value={(ce, s) => VALUES[s.key][ce]}
    format={(v) => `${v.toFixed(2)} g/kWh`}
    tone={extra?.tone}
    selected={extra?.selected}
  />
);

describe("ValueMatrix", () => {
  it("renders axis labels, column headers, and formatted values", () => {
    const { container, getByText } = render(() => matrix());
    expect(getByText("CE")).toBeTruthy();
    expect(getByText("Shore")).toBeTruthy();
    expect(getByText("90%")).toBeTruthy();
    expect(getByText("0.42 g/kWh")).toBeTruthy();
    expect(container.querySelectorAll("tbody tr").length).toBe(2);
  });

  it("renders null values blank (ruled 2026-07-18: no empty markers)", () => {
    const { container } = render(() => matrix());
    // barge @ 95 is null — its cell renders empty, no dash.
    expect(container.textContent).not.toContain("—");
    const cells = container.querySelectorAll(".sui-value-matrix__cell");
    expect([...cells].some((c) => c.textContent === "")).toBe(true);
  });

  it("applies the configure-time tone function per cell", () => {
    const { container } = render(() =>
      matrix({
        tone: (v) => (v !== null && v < 1 ? "success" : "danger"),
      }),
    );
    expect(
      container.querySelectorAll(".sui-value-matrix__cell--success").length,
    ).toBe(2); // 0.42 and 0.21
    expect(
      container.querySelectorAll(".sui-value-matrix__cell--danger").length,
    ).toBe(2); // 2.9 and null
  });

  it("marks the selected cell", () => {
    const { container } = render(() =>
      matrix({ selected: (ce, s) => ce === 95 && s.key === "shore" }),
    );
    const chosen = container.querySelectorAll(".sui-value-matrix__cell--selected");
    expect(chosen.length).toBe(1);
    expect(chosen[0]?.textContent).toBe("0.21 g/kWh");
  });

  it("renders JSX from rowLabel/colLabel as elements, not stringified", () => {
    const { container } = render(() => (
      <ValueMatrix
        rows={CE_LEVELS}
        cols={SOURCES}
        rowLabel={(ce) => <strong class="row-label">{ce}%</strong>}
        colLabel={(s) => <em class="col-label">{s.label}</em>}
        value={(ce, s) => VALUES[s.key][ce]}
      />
    ));
    expect(container.querySelector("strong.row-label")?.textContent).toBe(
      "90%",
    );
    expect(container.querySelector("em.col-label")?.textContent).toBe(
      "Shore",
    );
  });
});
