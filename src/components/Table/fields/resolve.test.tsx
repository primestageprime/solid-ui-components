import { describe, it, expect } from "vitest";
import { col, resolveFields } from "./resolve";
import { textCol } from "./text";
import { intCol } from "./int";

interface Row {
  postal_code: string;
  note: string;
  n: number;
}

describe("resolveFields — the width model under auto layout (ruled 2026-07-21)", () => {
  it("every column emits width = max and min-width = min; variable columns are contained", () => {
    const registry = {
      postal_code: textCol<Row>("postal_code"), // "Postal Code" floors min at 11ch
      note: textCol<Row>("note"), // "Note" fits inside the 8ch base min
    };
    const { columns } = resolveFields<Row>(["postal_code", "note"], registry);
    expect(columns[0].width).toBe("calc(40ch + 16px)");
    expect(columns[0].minWidth).toBe("calc(11ch + 16px)");
    expect(columns[0].contained).toBe(true);
    expect(columns[1].width).toBe("calc(40ch + 16px)");
    expect(columns[1].minWidth).toBe("calc(8ch + 16px)");
  });

  it("fixed-geometry columns keep their css width as the max; content-fit min becomes min-width", () => {
    const registry = { n: intCol<Row>("n") };
    const { columns } = resolveFields<Row>(["n"], registry);
    expect(columns[0].width).toBe("calc(9ch + 18px)");
    expect(columns[0].minWidth).toBe("calc(4ch + 18px)"); // int's content-fit floor ("N" label fits)
  });

  it("col() aligns like the real factory of its geometry — numerics right, dates center", () => {
    expect(col<Row>("m", "SCR.JM_Ti", () => "1.0", "float").align).toBe("right");
    expect(col<Row>("n", "Count", () => "2", "int").align).toBe("right");
    expect(col<Row>("t", "Time", () => "01:00", "dateTime").align).toBe("center");
    expect(col<Row>("s", "State", () => "OK", "status").align).toBe("right");
    expect(col<Row>("x", "Notes", () => "words", "text").align).toBeUndefined();
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
    expect(columns[1].width).toBe("calc(42ch + 16px)"); // 40ch max + 2ch glyph
    expect(columns[1].minWidth).toBe("calc(13ch + 16px)"); // 11ch floor + 2ch glyph
  });
});
