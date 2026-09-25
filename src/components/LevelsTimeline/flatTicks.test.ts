/**
 * G19 — flat and near-flat levels get DISTINCT y-tick labels. Printed as a
 * table: levels → derived domain → the tick labels a whole-dollar currency
 * formatter prints for them. Two mechanisms: a flat derived range is padded
 * (`padFlatRange`), and ticks the formatter would print alike are coarsened
 * (`valueTickMarks`) — the second covers small values and pinned domains.
 */
import { describe, expect, it } from "vitest";
import { join, map } from "../../fn";
import {
  DEFAULT_FRAME,
  type Level,
  valueDomainFor,
  valueTickMarks,
} from "./geometry";

const dollars = (value: number): string =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const levelsOf = (values: readonly number[]): readonly Level[] =>
  map(
    (value: number, i: number) => ({
      id: `l${i}`,
      label: `L${i}`,
      value,
      points: [{ at: Date.UTC(2025, 0, 1), count: 1 }],
    }),
    values,
  );

const ticksFor = (values: readonly number[]): readonly string[] => {
  const domain = valueDomainFor(levelsOf(values));
  return map(
    (tick: { label: string }) => tick.label,
    valueTickMarks(domain, (v) => v, DEFAULT_FRAME, dollars),
  );
};

const row = (name: string, values: readonly number[]): string => {
  const [lo, hi] = valueDomainFor(levelsOf(values));
  return join("  ", [
    name.padEnd(10),
    join(",", map(String, values)).padEnd(24),
    `${lo}..${hi}`.padEnd(15),
    join(" ", ticksFor(values)),
  ]);
};

describe("flat levels get distinct y ticks (G19)", () => {
  it("prints the table", () => {
    const table = join("\n", [
      "case        levels                    domain           y tick labels",
      row("flat", [100000]),
      row("flat x3", [100000, 100000, 100000]),
      row("near-flat", [100000, 100400]),
      row("zero", [0]),
      row("small", [12]),
      row("normal", [60000, 100000, 160000]),
      row("normal-2", [4300, 9100]),
    ]);
    expect(table).toMatchInlineSnapshot(`
      "case        levels                    domain           y tick labels
      flat        100000                    94000..106000    $94,000 $96,000 $98,000 $100,000 $102,000 $104,000 $106,000
      flat x3     100000,100000,100000      94000..106000    $94,000 $96,000 $98,000 $100,000 $102,000 $104,000 $106,000
      near-flat   100000,100400             94000..106000    $94,000 $96,000 $98,000 $100,000 $102,000 $104,000 $106,000
      zero        0                         -1..1            -$1 $0 $1
      small       12                        11..13           $11 $12 $13
      normal      60000,100000,160000       60000..160000    $60,000 $80,000 $100,000 $120,000 $140,000 $160,000
      normal-2    4300,9100                 4000..10000      $4,000 $5,000 $6,000 $7,000 $8,000 $9,000 $10,000"
    `);
  });

  it("never prints the same label twice", () => {
    const cases = [[100000], [100000, 100400], [0], [12], [60000, 160000]];
    for (const values of cases) {
      const labels = ticksFor(values);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });
});
