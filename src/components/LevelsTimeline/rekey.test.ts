/** G22 — a dragged flag survives the consumer re-keying it mid-drag. */
import { describe, expect, it } from "vitest";
import { join, map } from "../../fn";
import { type Mutation, rekeyPressedMutation } from "./geometry";

const D = (day: number) => Date.UTC(2025, 0, day);
const list = (...rows: Array<[string, number]>): Mutation[] =>
  map(([id, day]: [string, number]) => ({ id, at: D(day), label: id }), rows);

describe("rekeyPressedMutation (G22)", () => {
  it("prints the table", () => {
    const cases: Array<[string, Mutation[], { id: string; lastAt?: number; index: number }]> = [
      ["same id", list(["a", 1], ["b", 5]), { id: "a", index: 0 }],
      ["re-keyed, found at last time", list(["a@3", 3], ["b", 5]), { id: "a", lastAt: D(3), index: 0 }],
      ["re-keyed, no move yet → index", list(["x", 1], ["y", 5]), { id: "a", index: 1 }],
      ["index past end → last", list(["x", 1]), { id: "a", index: 4 }],
      ["empty list", [], { id: "a", index: 0 }],
    ];
    const rows = map(
      ([name, mutations, pressed]: (typeof cases)[number]) =>
        `${name.padEnd(30)} → ${
          rekeyPressedMutation(mutations, { lastAt: undefined, ...pressed }) ?? "(none)"
        }`,
      cases,
    );
    expect(join("\n", rows)).toMatchInlineSnapshot(`
      "same id                        → a
      re-keyed, found at last time   → a@3
      re-keyed, no move yet → index  → y
      index past end → last          → x
      empty list                     → (none)"
    `);
  });
});
