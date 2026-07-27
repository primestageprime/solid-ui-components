import { describe, it, expect } from "vitest";
import { advanceSelection } from "./selection";

const set = (...keys: string[]) => new Set(keys);

describe("advanceSelection", () => {
  it("advances to the next item still waiting in the source bucket", () => {
    expect(
      advanceSelection({
        selectedKey: "b",
        before: ["a", "b", "c", "d"],
        after: set("a", "c", "d"),
      }),
    ).toEqual({ kind: "select", key: "c" });
  });

  it("falls back UP when the processed item was the last in the queue", () => {
    expect(
      advanceSelection({
        selectedKey: "c",
        before: ["a", "b", "c"],
        after: set("a", "b"),
      }),
    ).toEqual({ kind: "select", key: "b" });
  });

  it("skips rows that departed in the SAME batch", () => {
    // b (selected), c and d all moved at once — the next waiting row is e.
    expect(
      advanceSelection({
        selectedKey: "b",
        before: ["a", "b", "c", "d", "e"],
        after: set("a", "e"),
      }),
    ).toEqual({ kind: "select", key: "e" });
  });

  it("CLEARS when the processed item emptied the queue", () => {
    expect(
      advanceSelection({ selectedKey: "a", before: ["a"], after: set() }),
    ).toEqual({ kind: "clear" });
  });

  it("clears when a multi-item move empties the queue", () => {
    expect(
      advanceSelection({
        selectedKey: "b",
        before: ["a", "b", "c"],
        after: set(),
      }),
    ).toEqual({ kind: "clear" });
  });

  it("distinguishes 'queue drained' from 'not my business'", () => {
    // Both would be `null` under a nullable-key return; only one of them should
    // make a consumer clear its detail panel.
    const drained = advanceSelection({
      selectedKey: "a",
      before: ["a"],
      after: set(),
    });
    const untouched = advanceSelection({
      selectedKey: "z",
      before: ["a"],
      after: set(),
    });
    expect(drained.kind).toBe("clear");
    expect(untouched.kind).toBe("keep");
  });

  it("keeps the selection when the selected row did not move", () => {
    // Someone ELSE transferred out of this bucket; the user's row is untouched.
    expect(
      advanceSelection({ selectedKey: "a", before: ["a", "b"], after: set("a") }),
    ).toEqual({ kind: "keep" });
  });

  it("keeps the selection when it lives in another bucket", () => {
    expect(
      advanceSelection({ selectedKey: "z", before: ["a", "b"], after: set("a") }),
    ).toEqual({ kind: "keep" });
  });

  it("keeps the selection when nothing is selected", () => {
    expect(
      advanceSelection({
        selectedKey: undefined,
        before: ["a", "b"],
        after: set("a"),
      }),
    ).toEqual({ kind: "keep" });
  });

  it("advances by the order the user was READING, not the order after the move", () => {
    // `after` is membership only. Even handed a differently-ordered bucket, the
    // successor is chosen from `before` — what was actually below the row.
    expect(
      advanceSelection({
        selectedKey: "b",
        before: ["a", "b", "c"],
        after: set("c", "a"),
      }),
    ).toEqual({ kind: "select", key: "c" });
  });
});
