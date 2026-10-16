// Column helpers size a column to its DATA (ruled 2026-10-16): width is the
// longest rendered value in ch + cell padding, floored at the header; dates
// size from their pattern even with no sample; legacy no-sample calls keep
// their old defaults; every helper carries a raw sortValue.
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  CELL_PAD_PX,
  columnCh,
  dateCol,
  dateTimeCol,
  floatCol,
  intCol,
  statusCol,
  textCol,
  widthForValues,
} from "./columnHelpers";
import { BaseTable } from "./BaseTable";

interface Row {
  hour: string;
  samples: number;
  ratio: number;
  name: string;
  status: string;
}

const rows: Row[] = [
  {
    hour: "2026-01-15T08:00:00",
    samples: 60,
    ratio: 0.5,
    name: "MV Indus Mariner",
    status: "Active",
  },
  {
    hour: "2026-01-15T09:00:00",
    samples: 1234567,
    ratio: 12.25,
    name: "SS Aegean",
    status: "Berthed",
  },
];

describe("columnCh / widthForValues", () => {
  it("takes the longest rendered value, counting a null as the 1ch empty mark", () => {
    expect(columnCh(["ab", "abcd", null], "")).toBe(4);
    expect(columnCh([null], "")).toBe(1);
  });
  it("floors at the header label with uppercase tracking", () => {
    // "Samples" = 7 chars × 1.17 → 9ch beats a 2-digit value.
    expect(columnCh(["60"], "Samples")).toBe(9);
  });
  it("adds the cell padding", () => {
    expect(widthForValues(["2026-01-15 08:00"], "Hour")).toBe(
      `calc(16ch + ${CELL_PAD_PX}px)`,
    );
  });
});

describe("dateTimeCol", () => {
  it("keeps the legacy 160px with no opts (unchanged call sites)", () => {
    expect(dateTimeCol<Row>("hour", "Hour").width).toBe("160px");
  });
  it("sizes a minute-precision column from its pattern with no sample", () => {
    expect(
      dateTimeCol<Row>("hour", "Hour", { precision: "minute" }).width,
    ).toBe(`calc(16ch + ${CELL_PAD_PX}px)`);
  });
  it("sizes from the data's RENDERED text, not the raw ISO string", () => {
    const col = dateTimeCol<Row>("hour", "Hour", {
      data: rows,
      precision: "minute",
    });
    expect(col.width).toBe(`calc(16ch + ${CELL_PAD_PX}px)`);
  });
  it("an explicit width wins over the sample", () => {
    expect(
      dateTimeCol<Row>("hour", "Hour", { data: rows, width: "9rem" }).width,
    ).toBe("9rem");
  });
  it("renders minute precision and carries the raw sortValue", () => {
    const col = dateTimeCol<Row>("hour", "Hour", { precision: "minute" });
    const { container } = render(() => (
      <BaseTable data={rows} columns={[col]} />
    ));
    const cells = container.querySelectorAll("td");
    expect(cells[0].textContent).toBe("2026-01-15 08:00");
    expect(cells[0].querySelector(".sui-value-datetime")).not.toBeNull();
    expect(col.sortValue?.(rows[1])).toBe("2026-01-15T09:00:00");
  });
  it("passes group through for a two-row header", () => {
    expect(dateTimeCol<Row>("hour", "Hour", { group: "FTIR" }).group).toBe(
      "FTIR",
    );
  });
});

describe("dateCol", () => {
  it("sizes from the YYYY-MM-DD pattern with no sample", () => {
    expect(dateCol<Row>("hour", "Day").width).toBe(
      `calc(10ch + ${CELL_PAD_PX}px)`,
    );
  });
});

describe("intCol / floatCol", () => {
  it("stay unsized with no sample (legacy default)", () => {
    expect(intCol<Row>("samples", "N").width).toBeUndefined();
    expect(floatCol<Row>("ratio", "R").width).toBeUndefined();
  });
  it("size from the formatted value — grouping separators count", () => {
    // "1,234,567" is 9ch; header "N" is 2ch after tracking.
    expect(intCol<Row>("samples", "N", { data: rows }).width).toBe(
      `calc(9ch + ${CELL_PAD_PX}px)`,
    );
    // "12.25" at precision 2 is 5ch.
    expect(floatCol<Row>("ratio", "R", 2, { values: [0.5, 12.25] }).width).toBe(
      `calc(5ch + ${CELL_PAD_PX}px)`,
    );
  });
  it("right-align by default and carry a raw sortValue", () => {
    const col = intCol<Row>("samples", "N");
    expect(col.align).toBe("right");
    expect(col.sortValue?.(rows[1])).toBe(1234567);
  });
});

describe("textCol / statusCol", () => {
  it("textCol stays unsized by default and passes ellipsis through", () => {
    const col = textCol<Row>("name", "Name", { ellipsis: true });
    expect(col.width).toBeUndefined();
    expect(col.ellipsis).toBe(true);
  });
  it("textCol sizes to its longest value when asked", () => {
    expect(textCol<Row>("name", "Name", { data: rows }).width).toBe(
      `calc(16ch + ${CELL_PAD_PX}px)`,
    );
  });
  it("statusCol renders a StatusCell and sizes from the mapped label plus badge chrome", () => {
    const col = statusCol<Row>("status", "Status", {
      data: rows,
      statusMap: {
        active: { label: "Up", variant: "success" },
        berthed: { variant: "inactive" },
      },
    });
    // "Berthed" (7) + 3ch chrome = 10 > header "Status" 6×1.17 → 8.
    expect(col.width).toBe(`calc(10ch + ${CELL_PAD_PX}px)`);
    const { container } = render(() => (
      <BaseTable data={rows} columns={[col]} />
    ));
    expect(container.querySelector("td")?.textContent).toBe("Up");
  });
});
