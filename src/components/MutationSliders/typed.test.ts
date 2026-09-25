// ============================================
// MutationSliders typed amounts — the headless observation.
//
//   npx vitest run src/components/MutationSliders/typed.test.ts --reporter=verbose
// ============================================
import { describe, expect, it } from "vitest";
import { flatMap, map } from "../../fn";
import { parseTyped, roundToPrecision, settleTyped } from "./typed";

describe("roundToPrecision — powers of ten", () => {
  it("rounds to 0.01, to units and to thousands", () => {
    const values = [1234.567, -0.005, 125_499, 125_500, 1.005];
    const rows = flatMap(
      (value: number) =>
        map(
          (precision: number) => ({
            value,
            precision,
            out: roundToPrecision(value, precision),
          }),
          [2, 0, -3],
        ),
      values,
    );
    console.table(rows);
    expect(map((row) => row.out, rows)).toEqual([
      1234.57, 1235, 1000,
      0, 0, 0,
      125_499, 125_499, 125_000,
      125_500, 125_500, 126_000,
      1.01, 1, 0,
    ]);
  });
});

describe("settleTyped — parse, round, clamp", () => {
  it("lands every typed figure inside the dial's range on its grid", () => {
    const limits = { min: 70_000, max: 115_500, precision: -3 };
    const typed = ["125499", "$98,700", "98.7k", "  90 000 ", "50000", "115400", "", "-", "abc"];
    const rows = map(
      (text: string) => ({ text, parsed: parseTyped(text), settled: settleTyped(text, limits) }),
      typed,
    );
    console.table(rows);
    expect(map((row) => row.settled, rows)).toEqual([
      115_500, 99_000, 99_000, 90_000, 70_000, 115_000, null, null, null,
    ]);
  });
});

describe("settleTyped — the figures Peter typed (2026-09-24)", () => {
  it("settles every spelling onto the thousand grid inside the range", () => {
    const limits = { min: 70_000, max: 110_000, precision: -3 };
    const typed = ["44K", "44,000", "$44k", "$10", "10", "25", "98,700", "$98.7k", "250k", "104000"];
    const rows = map(
      (text: string) => ({
        text,
        parsed: parseTyped(text),
        rounded: roundToPrecision(parseTyped(text) ?? Number.NaN, limits.precision),
        settled: settleTyped(text, limits),
      }),
      typed,
    );
    console.table(rows);
    expect(map((row) => row.settled, rows)).toEqual([
      70_000, 70_000, 70_000, 70_000, 70_000, 70_000, 99_000, 99_000, 110_000, 104_000,
    ]);
  });
});
