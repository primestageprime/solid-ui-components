// FieldTable — the consumer surface owns the frame and its width-budget vars,
// so clients render a complete field table without touching CSS.
import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
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
    // text {8,40,16} expands + int {4,9,18} is css-fixed (consumes its 9ch
    // under fixed layout) ⇒ floor 8+9=17ch+34px, max 49ch+34px
    expect(frame.style.getPropertyValue("--sui-field-table-min")).toBe("calc(17ch + 34px)");
    expect(frame.style.getPropertyValue("--sui-field-table-max")).toBe("calc(49ch + 34px)");
    expect(container.querySelectorAll("tbody tr").length).toBe(2);
  });

  it("renders the width model per column: width = max, min-width = min, no spacer (ruled 2026-07-21)", () => {
    const { container } = render(() => (
      <FieldTable
        data={ROWS}
        fields={["note", "hours"]}
        registry={{ note: textCol<Row>("note"), hours: intCol<Row>("hours") }}
      />
    ));
    const headerCells = [...container.querySelectorAll("thead th")] as HTMLElement[];
    expect(headerCells.length).toBe(2); // no trailing spacer under auto layout
    // note (variable text): width at max, min-width at min, cells contained
    expect(headerCells[0].style.width).toBe("calc(40ch + 16px)");
    expect(headerCells[0].style.minWidth).toBe("calc(8ch + 16px)");
    const noteCell = container.querySelector("tbody td") as HTMLElement;
    expect(noteCell.querySelector(".hud-table__contained")).toBeTruthy();
    // hours (content-fit int): width at the css cap, min-width at its floor
    expect(headerCells[1].style.width).toBe("calc(9ch + 18px)");
    expect(headerCells[1].style.minWidth).toBe("calc(6ch + 18px)"); // "Hours" × 1.17 tracking floor
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

  it("forwards onRowHover to BaseTable: (row, index) on enter, (null, -1) on leave", () => {
    const hovers: [Row | null, number][] = [];
    const { container } = render(() => (
      <FieldTable
        data={ROWS}
        fields={["note", "hours"]}
        registry={{ note: textCol<Row>("note"), hours: intCol<Row>("hours") }}
        onRowHover={(row, index) => hovers.push([row, index])}
      />
    ));
    const rows = container.querySelectorAll("tbody tr");
    fireEvent.mouseEnter(rows[1]);
    fireEvent.mouseLeave(container.querySelector("tbody") as HTMLElement);
    expect(hovers).toEqual([
      [ROWS[1], 1],
      [null, -1],
    ]);
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

// Grouped headers (ruled 2026-07-20): the `group(label, [...members])` spec
// wrapper is the smallest way to express a two-row spanned category header —
// the ordered gesture stays the source of truth, the resolver stamps each
// member's `group`, and BaseTable derives the colspans it already renders.
// Exactly two rows, one caller: a group's members are leaf specs, never
// nested groups.
import { group } from "./shared";

interface QaRow {
  hour: string;
  ftirStatus: string;
  ftirSamples: number;
  scrStatus: string;
  scrSamples: number;
}

const QA_ROWS: QaRow[] = [
  { hour: "14:00", ftirStatus: "full", ftirSamples: 60, scrStatus: "partial", scrSamples: 33 },
  { hour: "15:00", ftirStatus: "missing", ftirSamples: 0, scrStatus: "full", scrSamples: 60 },
];

const qaRegistry = {
  hour: textCol<QaRow>("hour"),
  ftirStatus: col<QaRow>("ftirStatus", "Status", (r) => <span>{r.ftirStatus}</span>, "status"),
  ftirSamples: intCol<QaRow>("ftirSamples", { header: "Samples" }),
  scrStatus: col<QaRow>("scrStatus", "Status", (r) => <span>{r.scrStatus}</span>, "status"),
  scrSamples: intCol<QaRow>("scrSamples", { header: "Samples" }),
};

describe("FieldTable grouped headers", () => {
  it("renders a two-row header with group labels spanning their members", () => {
    const { container } = render(() => (
      <FieldTable
        data={QA_ROWS}
        fields={[
          "hour",
          group<QaRow>("FTIR I", ["ftirStatus", "ftirSamples"]),
          group<QaRow>("SCR", ["scrStatus", "scrSamples"]),
        ]}
        registry={qaRegistry}
      />
    ));
    // Two header rows: group labels + sub-column headers.
    expect(container.querySelectorAll("thead tr").length).toBe(2);
    // Each group label is a colspan header over its two members.
    const groups = Array.from(
      container.querySelectorAll(".hud-table__header-cell--group"),
    );
    expect(groups.map((g) => g.textContent)).toEqual(["FTIR I", "SCR"]);
    expect(groups.map((g) => g.getAttribute("colspan"))).toEqual(["2", "2"]);
    // The five body columns render as five cells (spacer retired 2026-07-21).
    expect(
      container.querySelectorAll("tbody tr")[0].querySelectorAll("td").length,
    ).toBe(5);
  });

  it("spans an ungrouped leading column across both header rows", () => {
    const { container } = render(() => (
      <FieldTable
        data={QA_ROWS}
        fields={[
          "hour",
          group<QaRow>("FTIR I", ["ftirStatus", "ftirSamples"]),
        ]}
        registry={qaRegistry}
      />
    ));
    const rowspanned = container.querySelectorAll(
      ".hud-table__header-cell--rowspan",
    );
    expect(rowspanned.length).toBe(1);
    expect(rowspanned[0].textContent).toContain("Hour");
    expect(rowspanned[0].getAttribute("rowspan")).toBe("2");
    // The two grouped members appear as sub-headers in the second row.
    const subs = Array.from(
      container.querySelectorAll(".hud-table__header-cell--sub"),
    ).map((s) => s.textContent);
    expect(subs).toEqual(["Status", "Samples"]);
  });

  it("accepts an explicit col() as a group member alongside registry ids", () => {
    const { container } = render(() => (
      <FieldTable
        data={QA_ROWS}
        fields={[
          "hour",
          group<QaRow>("FTIR I", [
            "ftirStatus",
            col<QaRow>("ftirSamples", "Samples", (r) => <span>{r.ftirSamples}</span>),
          ]),
        ]}
        registry={qaRegistry}
      />
    ));
    const groupTh = container.querySelector(".hud-table__header-cell--group");
    expect(groupTh?.getAttribute("colspan")).toBe("2");
    expect(container.querySelectorAll(".hud-table__header-cell--sub").length).toBe(2);
  });
});
