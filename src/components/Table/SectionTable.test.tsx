// ============================================
// SectionTable binds a header to a table as ONE unit. Two things carry its
// weight, and neither shows up in a render-and-look test:
//
//   • the count is DERIVED from `data.length`, not passed in — so it tracks the
//     rows actually shown. Hard-wiring it to `total` would look right on an
//     unfiltered table and lie on every filtered one.
//   • `title` / `total` / `countNoun` are split OUT and must not reach
//     BaseTable, while everything else must.
//
// The "one unit" claim is structural: header and table share a single stretch
// container so the count lands at the table's right edge. That is asserted as
// containment, not geometry — jsdom has no layout, and asserting on pixels
// would pass for the wrong reason.
//
// Pluralization and the "N of TOTAL" wording belong to TableSectionHeader and
// are covered there; this suite asserts only what SectionTable decides.
// ============================================
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { SectionTable } from "./SectionTable";
import type { TableColumn } from "./types";

interface Row {
  name: string;
  region: string;
}

const COLUMNS: TableColumn<Row>[] = [
  { id: "name", header: "Name", accessor: "name" },
  { id: "region", header: "Region", accessor: "region" },
];

const DATA: Row[] = [
  { name: "Engine-1", region: "north" },
  { name: "Engine-2", region: "south" },
  { name: "Generator-A", region: "north" },
];

const countText = (container: HTMLElement) =>
  container.querySelector(".text--body")?.textContent?.trim() ?? null;

const titleText = (container: HTMLElement) =>
  container.querySelector(".text--label")?.textContent?.trim() ?? null;

const bodyRows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(".hud-table__body .hud-table__row"));

describe("SectionTable header binding", () => {
  it("renders the title above the table", () => {
    const { container } = render(() => (
      <SectionTable title="Assets" data={DATA} columns={COLUMNS} />
    ));
    expect(titleText(container)).toBe("Assets");
    expect(bodyRows(container).length).toBe(3);
  });

  it("header and table share one container, header first", () => {
    // The "bound as one unit" claim. If they ever became siblings under
    // different parents, the header would stop spanning the table's width and
    // the count would drift off the table's right edge — a purely visual
    // regression that no other assertion here would catch.
    const { container } = render(() => (
      <SectionTable title="Assets" data={DATA} columns={COLUMNS} />
    ));
    const stack = container.querySelector(".stack") as HTMLElement;
    expect(stack).not.toBeNull();
    expect(stack.querySelector(".text--label")).not.toBeNull();
    expect(stack.querySelector(".hud-table")).not.toBeNull();
    // Header precedes the table in document order.
    const children = Array.from(stack.children);
    const headerIdx = children.findIndex((c) =>
      c.querySelector(".text--label"),
    );
    const tableIdx = children.findIndex(
      (c) => c.classList.contains("hud-table") || c.querySelector(".hud-table"),
    );
    expect(headerIdx).toBeGreaterThanOrEqual(0);
    expect(tableIdx).toBeGreaterThan(headerIdx);
  });
});

describe("SectionTable derived count", () => {
  it("counts the rows actually passed", () => {
    const { container } = render(() => (
      <SectionTable title="Assets" data={DATA} columns={COLUMNS} />
    ));
    expect(countText(container)).toBe("3 records");
  });

  it("reads 'N of TOTAL' when data is a filtered subset", () => {
    const { container } = render(() => (
      <SectionTable title="Assets" data={DATA} columns={COLUMNS} total={24} />
    ));
    // 3 shown of 24 — the count follows `data`, the total follows the prop.
    expect(countText(container)).toBe("3 of 24 records");
  });

  it("count tracks data, not total, when the two disagree", () => {
    // The load-bearing fixture: data.length (1) and total (24) are far apart
    // and neither equals the other's value, so wiring the count to `total`
    // would read "24 of 24" and wiring total to data.length would read
    // "1 record". Only the correct wiring produces this string.
    const { container } = render(() => (
      <SectionTable
        title="Assets"
        data={[DATA[0]]}
        columns={COLUMNS}
        total={24}
      />
    ));
    expect(countText(container)).toBe("1 of 24 records");
  });

  it("an unfiltered view omits the 'of TOTAL' clause", () => {
    const { container } = render(() => (
      <SectionTable title="Assets" data={DATA} columns={COLUMNS} total={3} />
    ));
    expect(countText(container)).toBe("3 records");
  });

  it("an empty table still reports its count", () => {
    const { container } = render(() => (
      <SectionTable title="Assets" data={[] as Row[]} columns={COLUMNS} />
    ));
    expect(countText(container)).toBe("0 records");
    expect(bodyRows(container).length).toBe(0);
  });

  it("forwards countNoun to the header", () => {
    const { container } = render(() => (
      <SectionTable
        title="Assets"
        data={DATA}
        columns={COLUMNS}
        countNoun="alarm"
      />
    ));
    expect(countText(container)).toBe("3 alarms");
  });
});

describe("SectionTable prop routing", () => {
  it("forwards ordinary table props to BaseTable", () => {
    const { getByText } = render(() => (
      <SectionTable title="Assets" data={DATA} columns={COLUMNS} />
    ));
    expect(getByText("Region")).toBeTruthy();
    expect(getByText("Engine-1")).toBeTruthy();
  });

  it("does not leak its own props onto the table element", () => {
    // splitProps consumes title/total/countNoun. `title` is the dangerous one:
    // leaked onto a DOM element it becomes a NATIVE tooltip attribute, which
    // renders fine and silently adds a hover tooltip nobody asked for.
    const { container } = render(() => (
      <SectionTable
        title="Assets"
        data={DATA}
        columns={COLUMNS}
        total={24}
        countNoun="alarm"
      />
    ));
    const table = container.querySelector(".hud-table") as HTMLElement;
    expect(table.hasAttribute("title")).toBe(false);
    expect(table.hasAttribute("total")).toBe(false);
    expect(table.hasAttribute("countNoun")).toBe(false);
  });

  it("passes fill through to the table", () => {
    const { container } = render(() => (
      <SectionTable title="Assets" data={DATA} columns={COLUMNS} fill />
    ));
    expect(container.querySelector(".hud-table--fill")).not.toBeNull();
  });
});
