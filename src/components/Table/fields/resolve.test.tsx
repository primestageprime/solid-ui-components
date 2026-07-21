import { describe, it, expect } from "vitest";
import { resolveFields } from "./resolve";
import { textCol } from "./text";
import { intCol } from "./int";

interface Row {
  postal_code: string;
  note: string;
  n: number;
}

describe("resolveFields — flexible width basis (ruled 2026-07-21)", () => {
  it("a flexible column's width is its floored minCh — fixed layout distributes by the floors, so the label floor is real", () => {
    const registry = {
      postal_code: textCol<Row>("postal_code"), // "Postal Code" = 11ch label
      note: textCol<Row>("note"), // "Note" fits inside the 8ch base min
    };
    const { columns } = resolveFields<Row>(["postal_code", "note"], registry);
    expect(columns[0].width).toBe("calc(11ch + 16px)");
    expect(columns[1].width).toBe("calc(8ch + 16px)");
  });

  it("fixed-geometry columns keep their css width", () => {
    const registry = { n: intCol<Row>("n") };
    const { columns } = resolveFields<Row>(["n"], registry);
    expect(columns[0].width).toBe("calc(9ch + 18px)");
  });

  it("sortable mode budgets the sort-indicator glyph into every sortable column", () => {
    const registry = {
      n: intCol<Row>("n"),
      postal_code: textCol<Row>("postal_code"),
    };
    const { columns } = resolveFields<Row>(["n", "postal_code"], registry, {
      sortable: true,
    });
    expect(columns[0].width).toBe("calc(11ch + 18px)"); // 9ch cap + 2ch glyph
    expect(columns[1].width).toBe("calc(13ch + 16px)"); // 11ch label floor + 2ch glyph
  });
});
