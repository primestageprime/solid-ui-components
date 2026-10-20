import { describe, expect, it } from "vitest";
import {
  LAYER,
  groupedList,
  neighbourAfterRemove,
  neighbourId,
  nextInCycle,
  toggled,
  unwindLayer,
  visibleIds,
  type ListSpec,
  type ListView,
} from "./listkit";

// The kit is generic, so it is tested on an invented entity.
type Row = { id: string; name: string; stage: "open" | "closed"; rank: number; deleted?: boolean };
type Sort = "rank" | "name";
const spec: ListSpec<Row, Row["stage"], Sort> = {
  groupOf: (r) => r.stage,
  groupOrder: ["open", "closed"],
  textOf: (r) => r.name,
  sorters: { rank: (a, b) => a.rank - b.rank, name: (a, b) => a.name.localeCompare(b.name) },
  sortOrder: ["rank", "name"],
  defaultSort: "rank",
};
const rows: Row[] = [
  { id: "1", name: "pear", stage: "open", rank: 2 },
  { id: "2", name: "apple", stage: "closed", rank: 1 },
  { id: "3", name: "fig", stage: "open", rank: 1 },
  { id: "4", name: "gone", stage: "open", rank: 0, deleted: true },
];
const view = (v: Partial<ListView<Sort>> = {}): ListView<Sort> => ({ search: "", sort: "rank", collapsed: [], ...v });

describe("listkit", () => {
  it("groups in the spec's order, sorted, skipping deleted, and keeps empty groups", () => {
    const g = groupedList(rows, spec, view());
    expect(g.map((x) => [x.id, x.items.map((r) => r.id)])).toEqual([["open", ["3", "1"]], ["closed", ["2"]]]);
    expect(groupedList(rows, spec, view({ search: "zzz" })).map((x) => x.count)).toEqual([0, 0]);
  });

  it("sorts by the view's key", () => {
    expect(groupedList(rows, spec, view({ sort: "name" }))[0].items.map((r) => r.name)).toEqual(["fig", "pear"]);
  });

  it("search is case-insensitive over textOf", () => {
    expect(visibleIds(rows, spec, view({ search: "  APP " }))).toEqual(["2"]);
  });

  it("collapsed groups keep their count but leave the walk", () => {
    const g = groupedList(rows, spec, view({ collapsed: ["open"] }));
    expect(g[0]).toMatchObject({ count: 2, collapsed: true });
    expect(visibleIds(rows, spec, view({ collapsed: ["open"] }))).toEqual(["2"]);
    expect(visibleIds(rows, spec, view())).toEqual(["3", "1", "2"]);
  });

  it("neighbours clamp, start at the first, and survive a removal", () => {
    expect(neighbourId(["a", "b"], "b", 1)).toBe("b");
    expect(neighbourId(["a", "b"], null, 1)).toBe("a");
    expect(neighbourId(["a", "b"], "gone", -1)).toBe("a");
    expect(neighbourId([], "a", 1)).toBeNull();
    expect(neighbourAfterRemove(["a", "b", "c"], "b")).toBe("c");
    expect(neighbourAfterRemove(["a", "b", "c"], "c")).toBe("b");
    expect(neighbourAfterRemove(["a"], "a")).toBeNull();
  });

  it("cycles and toggles", () => {
    expect(nextInCycle(["x", "y", "z"], "z")).toBe("x");
    expect(toggled(["a"], "b")).toEqual(["a", "b"]);
    expect(toggled(["a", "b"], "a")).toEqual(["b"]);
  });

  it("Escape closes the innermost layer first", () => {
    expect(unwindLayer({ modalOpen: true, editing: true, selectedId: "a" })).toBe(LAYER.dialog);
    expect(unwindLayer({ modalOpen: false, editing: true, selectedId: "a" })).toBe(LAYER.field);
    expect(unwindLayer({ modalOpen: false, editing: false, selectedId: "a" })).toBe(LAYER.selected);
    expect(unwindLayer({ modalOpen: false, editing: false, selectedId: null })).toBe(LAYER.idle);
  });
});
