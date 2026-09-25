// ============================================
// MutationSliders item runs — the headless observation.
//
//   npx vitest run src/components/MutationSliders/items.test.ts --reporter=verbose
// ============================================
import { describe, expect, it } from "vitest";
import { join, map } from "../../fn";
import { type ItemRun, itemLayout, itemRuns } from "./items";
import { GUTTERED_DIAL_SLOT, GUTTER_GAP } from "./rows";

// The bench fixture's shape: Person 3 holds TWO positions (two dials).
const ITEMS = ["p1", "p2", "p3", "p3", "p4", "p5"];
const LABELS = ["P1", "P2", "P3·main", "P3·evening", "P4", "P5"];

describe("itemRuns — which dials are one item", () => {
  it("groups consecutive dials with one key; unkeyed dials stand alone", () => {
    const cases: readonly [string, readonly (string | undefined)[]][] = [
      ["bench: P3 has two positions", ITEMS],
      ["no keys: every dial alone", [undefined, undefined, undefined]],
      ["key interrupted: two runs", ["a", "b", "a"]],
    ];
    const rows = map(
      ([name, items]) => ({
        case: name,
        runs: join(
          " | ",
          map((run: ItemRun) => join(",", run.indices), itemRuns(items)),
        ),
      }),
      cases,
    );
    console.table(rows);
    expect(map((r) => r.runs, rows)).toEqual([
      "0 | 1 | 2,3 | 4 | 5",
      "0 | 1 | 2",
      "0 | 1 | 2",
    ]);
  });
});

describe("itemLayout — pages by whole items, never splitting one", () => {
  it("prints which dials each width shows", () => {
    const runs = itemRuns(ITEMS);
    const slot = GUTTERED_DIAL_SLOT; // 112
    const cases: readonly [string, number, number][] = [
      ["everything fits (6×112)", 672, 0],
      ["room for 3 dials, from 0", 3 * slot + 2 * 48, 0],
      ["room for 3 dials, from P2", 3 * slot + 2 * 48, 1],
      ["room for 3 dials, from P3", 3 * slot + 2 * 48, 2],
      ["room for 1 dial, from P3 → P3 alone, clipped", slot + 2 * 48, 2],
      ["stale offset past the end", 3 * slot + 2 * 48, 99],
    ];
    const rows = map(([name, width, offset]) => {
      const out = itemLayout(width, runs, offset, false, slot, GUTTER_GAP);
      return {
        case: name,
        width,
        shows: join(" ", LABELS.slice(out.start, out.end)),
        paging: out.paging,
      };
    }, cases);
    console.table(rows);
    expect(map((r) => r.shows, rows)).toEqual([
      "P1 P2 P3·main P3·evening P4 P5",
      "P1 P2",
      "P2 P3·main P3·evening",
      "P3·main P3·evening P4",
      "P3·main P3·evening",
      // Clamped to the last run, pulled back while whole runs fit: P3 cannot.
      "P4 P5",
    ]);
  });
});
