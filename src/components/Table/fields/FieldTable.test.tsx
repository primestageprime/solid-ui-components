// FieldTable — the consumer surface owns the frame and its width-budget vars,
// so clients render a complete field table without touching CSS.
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { FieldTable } from "./FieldTable";
import { intCol } from "./int";
import { textCol } from "./text";

interface Row {
  note: string;
  hours: number;
}

const ROWS: Row[] = [
  { note: "alpha", hours: 4 },
  { note: "beta", hours: 9 },
];

describe("FieldTable", () => {
  it("renders the field frame with the resolver's width budget", () => {
    const { container } = render(() => (
      <FieldTable
        data={ROWS}
        fields={["note", "hours"]}
        registry={{ note: textCol<Row>("note"), hours: intCol<Row>("hours") }}
      />
    ));
    const frame = container.querySelector(".sui-field-frame") as HTMLElement;
    expect(frame).toBeTruthy();
    // text {8,40,16} + int {4,9,18} ⇒ min 12ch+34px, max 49ch+34px
    expect(frame.style.getPropertyValue("--sui-field-table-min")).toBe("calc(12ch + 34px)");
    expect(frame.style.getPropertyValue("--sui-field-table-max")).toBe("calc(49ch + 34px)");
    expect(container.querySelectorAll("tbody tr").length).toBe(2);
  });

  it("renders emptyMessage when data is empty", () => {
    const { container } = render(() => (
      <FieldTable
        data={[] as Row[]}
        fields={["hours"]}
        registry={{ hours: intCol<Row>("hours") }}
        emptyMessage="Nothing yet"
      />
    ));
    expect(container.textContent).toContain("Nothing yet");
  });

  it("tone functions wrap cells in their semantic class", () => {
    const { container } = render(() => (
      <FieldTable
        data={ROWS}
        fields={["hours"]}
        registry={{
          hours: intCol<Row>("hours", {
            tone: (v) => (v > 5 ? "danger" : "default"),
          }),
        }}
      />
    ));
    const toned = container.querySelectorAll(".sui-field-tone--danger");
    expect(toned.length).toBe(1);
    expect(toned[0]?.textContent).toBe("9");
  });
});

// SortableFieldTable (ruled 2026-07-18): sorting is a table-level mode — the
// sortable variant flips every column that carries a sortValue; columns
// without one (no valid sort order) stay inert. Field accessors return JSX,
// so ordering MUST come from sortValue, never the rendered cell.
import { fireEvent } from "@solidjs/testing-library";
import { SortableFieldTable } from "./FieldTable";
import { col } from "./resolve";

const clickHeader = (container: HTMLElement, label: string) => {
  const th = Array.from(container.querySelectorAll("th")).find((el) =>
    el.textContent?.includes(label),
  );
  if (!th) throw new Error(`no header matching ${label}`);
  fireEvent.click(th);
};

const firstCells = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("tbody tr")).map(
    (r) => r.querySelector("td")?.textContent,
  );

describe("SortableFieldTable", () => {
  const registry = {
    note: textCol<Row>("note"),
    hours: intCol<Row>("hours"),
    weird: col<Row>("weird", "Weird", () => <span>?</span>),
  };

  it("marks every sortValue-carrying column sortable; no-sort types stay inert", () => {
    const { container } = render(() => (
      <SortableFieldTable
        data={ROWS}
        fields={["note", "hours", "weird"]}
        registry={registry}
      />
    ));
    const sortable = container.querySelectorAll(".hud-table__header-cell--sortable");
    expect(sortable.length).toBe(2);
  });

  it("plain FieldTable stays entirely unsortable", () => {
    const { container } = render(() => (
      <FieldTable data={ROWS} fields={["note", "hours"]} registry={registry} />
    ));
    expect(
      container.querySelectorAll(".hud-table__header-cell--sortable").length,
    ).toBe(0);
  });

  it("orders rows by the raw sortValue, not the rendered JSX", () => {
    const { container } = render(() => (
      <SortableFieldTable
        data={ROWS}
        fields={["note", "hours"]}
        registry={registry}
      />
    ));
    clickHeader(container, "Hours");
    expect(firstCells(container)).toEqual(["alpha", "beta"]); // 4 < 9
    clickHeader(container, "Hours");
    expect(firstCells(container)).toEqual(["beta", "alpha"]); // desc
  });
});
