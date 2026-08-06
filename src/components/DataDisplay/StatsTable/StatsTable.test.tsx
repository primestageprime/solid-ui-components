import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { StatsTable, type StatsColumn } from "./StatsTable";

type Row = { name: string; count: number };

const rows: Row[] = [
  { name: "Aang", count: 3 },
  { name: "Katara", count: 7 },
];

const cells = (c: HTMLElement) =>
  [...c.querySelectorAll(".stats-table__cell")].map((el) => el.textContent);

describe("StatsTable — accessors", () => {
  // `accessor` is a union: a key of the row, or a function of it. Both arms
  // run through `getCellValue`, and the key arm is the one a refactor to
  // "always call it" would break.
  it("reads a cell by key", () => {
    const columns: StatsColumn<Row>[] = [
      { header: "Name", accessor: "name" },
      { header: "Count", accessor: "count" },
    ];
    const { container } = render(() => (
      <StatsTable columns={columns} rows={rows} />
    ));
    expect(cells(container)).toEqual(["Aang", "3", "Katara", "7"]);
  });

  it("reads a cell by function, receiving the whole row", () => {
    const columns: StatsColumn<Row>[] = [
      { header: "Summary", accessor: (r) => `${r.name}=${r.count}` },
    ];
    const { container } = render(() => (
      <StatsTable columns={columns} rows={rows} />
    ));
    expect(cells(container)).toEqual(["Aang=3", "Katara=7"]);
  });

  it("renders one header cell per column, in order", () => {
    const columns: StatsColumn<Row>[] = [
      { header: "Name", accessor: "name" },
      { header: "Count", accessor: "count" },
    ];
    const { container } = render(() => (
      <StatsTable columns={columns} rows={rows} />
    ));
    expect(
      [...container.querySelectorAll(".stats-table__header-cell")].map(
        (el) => el.textContent,
      ),
    ).toEqual(["Name", "Count"]);
  });

  it("renders a header-only table when there are no rows", () => {
    const columns: StatsColumn<Row>[] = [{ header: "Name", accessor: "name" }];
    const { container } = render(() => (
      <StatsTable columns={columns} rows={[]} />
    ));
    expect(
      container.querySelectorAll(".stats-table__header-cell"),
    ).toHaveLength(1);
    expect(container.querySelectorAll(".stats-table__row")).toHaveLength(0);
  });
});

describe("StatsTable — alignment and width", () => {
  // `align` defaults to "left" via `col.align || "left"`, and the default is
  // written to BOTH the header and the body cell so a column cannot drift
  // between the two.
  it("defaults alignment to left on header and cell alike", () => {
    const columns: StatsColumn<Row>[] = [{ header: "Name", accessor: "name" }];
    const { container } = render(() => (
      <StatsTable columns={columns} rows={rows} />
    ));
    expect(
      container.querySelector<HTMLElement>(".stats-table__header-cell")?.style
        .textAlign,
    ).toBe("left");
    expect(
      container.querySelector<HTMLElement>(".stats-table__cell")?.style
        .textAlign,
    ).toBe("left");
  });

  it("honours an explicit alignment on header and cell alike", () => {
    const columns: StatsColumn<Row>[] = [
      { header: "Count", accessor: "count", align: "right" },
    ];
    const { container } = render(() => (
      <StatsTable columns={columns} rows={rows} />
    ));
    expect(
      container.querySelector<HTMLElement>(".stats-table__header-cell")?.style
        .textAlign,
    ).toBe("right");
    expect(
      container.querySelector<HTMLElement>(".stats-table__cell")?.style
        .textAlign,
    ).toBe("right");
  });

  // Width is deliberately header-only — a colgroup-free table sizes from the
  // header row, and repeating it per cell would fight that.
  it("applies width to the header only", () => {
    const columns: StatsColumn<Row>[] = [
      { header: "Name", accessor: "name", width: "120px" },
    ];
    const { container } = render(() => (
      <StatsTable columns={columns} rows={rows} />
    ));
    expect(
      container.querySelector<HTMLElement>(".stats-table__header-cell")?.style
        .width,
    ).toBe("120px");
    expect(
      container.querySelector<HTMLElement>(".stats-table__cell")?.style.width,
    ).toBe("");
  });
});

describe("StatsTable — row classes", () => {
  it("passes the row and its index to getRowClass", () => {
    const seen: Array<[string, number]> = [];
    const columns: StatsColumn<Row>[] = [{ header: "Name", accessor: "name" }];
    render(() => (
      <StatsTable
        columns={columns}
        rows={rows}
        getRowClass={(r, i) => {
          seen.push([r.name, i]);
          return "flagged";
        }}
      />
    ));
    expect(seen).toEqual([
      ["Aang", 0],
      ["Katara", 1],
    ]);
  });

  it("appends the returned class to the base row class", () => {
    const columns: StatsColumn<Row>[] = [{ header: "Name", accessor: "name" }];
    const { container } = render(() => (
      <StatsTable
        columns={columns}
        rows={rows}
        getRowClass={(r) => (r.count > 5 ? "hot" : undefined)}
      />
    ));
    const classes = [...container.querySelectorAll(".stats-table__row")].map(
      (el) => el.className,
    );
    expect(classes[0]).toContain("stats-table__row");
    expect(classes[0]).not.toContain("hot");
    expect(classes[1]).toContain("hot");
  });

  // The `?? ""` is load-bearing. Without it a row whose callback returns
  // undefined gets the literal class "undefined", which silently matches any
  // stray `.undefined` rule and reads as a real class in devtools.
  it("never writes the string 'undefined' as a class", () => {
    const columns: StatsColumn<Row>[] = [{ header: "Name", accessor: "name" }];
    const { container } = render(() => (
      <StatsTable columns={columns} rows={rows} getRowClass={() => undefined} />
    ));
    for (const el of container.querySelectorAll(".stats-table__row")) {
      expect(el.className).not.toContain("undefined");
    }
  });
});

describe("StatsTable — caption and root", () => {
  it("renders the caption only when one is supplied", () => {
    const columns: StatsColumn<Row>[] = [{ header: "Name", accessor: "name" }];
    const { container: with_ } = render(() => (
      <StatsTable columns={columns} rows={rows} caption="Episodes" />
    ));
    const { container: without } = render(() => (
      <StatsTable columns={columns} rows={rows} />
    ));
    expect(with_.querySelector(".stats-table__caption")?.textContent).toBe(
      "Episodes",
    );
    expect(without.querySelector(".stats-table__caption")).toBeNull();
  });

  it("appends a consumer class and forwards unconsumed attributes", () => {
    const columns: StatsColumn<Row>[] = [{ header: "Name", accessor: "name" }];
    const { container } = render(() => (
      <StatsTable columns={columns} rows={rows} class="tall" id="stats" />
    ));
    const root = container.querySelector<HTMLElement>(".stats-table");
    expect(root?.className).toContain("stats-table");
    expect(root?.className).toContain("tall");
    expect(root?.id).toBe("stats");
  });
});
