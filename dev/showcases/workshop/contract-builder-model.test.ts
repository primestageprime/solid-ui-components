import { describe, expect, it } from "vitest";
import { every, flatMap, map, pipe } from "../../../src/fn";
import { CONFIG, TYPES } from "./contract-builder.fixtures";
import {
  type Cell,
  type Config,
  type Period,
  cellOf,
  monthOf,
  observe,
  periodsOf,
  plannedOf,
} from "./contract-builder-model";

const cell = (config: Config, type: "O" | "I" | "F", month: number): Cell =>
  cellOf(
    config,
    TYPES[{ O: 0, I: 1, F: 2 }[type]],
    month,
  );

const allCells = (config: Config): readonly Cell[] =>
  pipe(
    periodsOf(config),
    flatMap((p: Period) => p.cells),
  );

describe("contract-builder model — headless observation", () => {
  it("prints the year, month × type", () => {
    const table = observe(CONFIG);
    console.log(`\n${table}\n`);
    expect(table.split("\n")).toHaveLength(1 + 12 * 3);
  });
});

describe("contract-builder model — consumption laws", () => {
  it("within + unplanned = planned, and within + remainder = projected", () => {
    const ok = every(
      (c: Cell) =>
        c.within + c.unplanned === c.planned &&
        c.within + c.remainder === c.projected &&
        c.shown === Math.max(c.planned, c.projected) &&
        c.delta === c.planned - c.projected,
      allCells(CONFIG),
    );
    expect(ok).toBe(true);
  });

  it("an unplanned win and a remainder never share a cell", () => {
    const ok = every(
      (c: Cell) => c.unplanned === 0 || c.remainder === 0,
      allCells(CONFIG),
    );
    expect(ok).toBe(true);
  });

  it("matches Peter's worked example: 4 hoped, 2 → 3 → 6 booked", () => {
    const one = (planned: number) =>
      cellOf(
        {
          types: [{ id: "O", name: "Exterior", typical: 1, qty: [4] }],
          jobs: [
            {
              id: "j",
              name: "j",
              type: "O",
              use: true,
              start: "2026-01-01",
              duration: 1,
              payments: [{ label: "p", on: "2026-01-02", amount: planned }],
            },
          ],
        },
        { id: "O", name: "Exterior", typical: 1, qty: [4] },
        0,
      );
    expect(
      map((c: Cell) => [c.within, c.remainder, c.unplanned, c.shown], [
        one(2),
        one(3),
        one(6),
      ]),
    ).toEqual([
      [2, 2, 0, 4],
      [3, 1, 0, 4],
      [4, 0, 2, 6],
    ]);
  });
});

describe("contract-builder fixtures — planted signals", () => {
  it("January interior is an unplanned win", () => {
    const c = cell(CONFIG, "I", 0);
    expect(c).toMatchObject({ projected: 12500, planned: 18000, unplanned: 5500 });
  });

  it("June exterior is behind", () => {
    const c = cell(CONFIG, "O", 5);
    expect(c.delta).toBe(13000 - 20000);
    expect(c.unplanned).toBe(0);
  });

  it("a deposit lands in its own month, a month before the work", () => {
    const alvarez = CONFIG.jobs.find((j) => j.id === "alvarez");
    expect(monthOf(alvarez?.start ?? "")).toBe(4);
    expect(plannedOf(CONFIG, "O", 3)).toBe(5000);
    // May holds Alvarez's prep payment and Marsh's deposit — not Alvarez's deposit.
    expect(plannedOf(CONFIG, "O", 4)).toBe(8000 + 3000);
  });

  it("December exterior is hoped at zero yet wins on a final payment", () => {
    expect(cell(CONFIG, "O", 11)).toMatchObject({
      projected: 0,
      planned: 4500,
      unplanned: 4500,
    });
  });

  it("a job not in use contributes nothing", () => {
    expect(plannedOf(CONFIG, "O", 6)).toBe(18000);
    const used = {
      ...CONFIG,
      jobs: map((j) => (j.id === "pemberton" ? { ...j, use: true } : j), CONFIG.jobs),
    };
    expect(plannedOf(used, "O", 6)).toBe(28000);
  });

  it("April furniture is an unplanned win", () => {
    expect(cell(CONFIG, "F", 3)).toMatchObject({ projected: 2400, unplanned: 1600 });
  });
});
