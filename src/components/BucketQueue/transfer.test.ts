import { describe, it, expect } from "vitest";
import { diffTransfers } from "./transfer";

const ORDER = ["done", "todo", "hold"];
const m = (pairs: [string, string][]) => new Map(pairs);

describe("diffTransfers", () => {
  it("reports nothing when no item changed bucket", () => {
    const prev = m([["1", "todo"]]);
    expect(diffTransfers(prev, m([["1", "todo"]]), ORDER)).toEqual([]);
  });

  it("reports a move UP the bucket order with direction -1", () => {
    const moves = diffTransfers(m([["1", "todo"]]), m([["1", "done"]]), ORDER);
    expect(moves).toEqual([{ key: "1", from: "todo", to: "done", direction: -1 }]);
  });

  it("reports a move DOWN the bucket order with direction 1", () => {
    const moves = diffTransfers(m([["1", "done"]]), m([["1", "todo"]]), ORDER);
    expect(moves).toEqual([{ key: "1", from: "done", to: "todo", direction: 1 }]);
  });

  it("reports a non-adjacent move in one hop", () => {
    const moves = diffTransfers(m([["1", "hold"]]), m([["1", "done"]]), ORDER);
    expect(moves).toEqual([{ key: "1", from: "hold", to: "done", direction: -1 }]);
  });

  it("reports every move when several change at once", () => {
    const prev = m([["1", "todo"], ["2", "todo"], ["3", "done"]]);
    const next = m([["1", "done"], ["2", "hold"], ["3", "done"]]);
    const moves = diffTransfers(prev, next, ORDER);
    expect(moves.map((t) => t.key).sort()).toEqual(["1", "2"]);
  });

  it("does not report an item that is newly present (an add is not a move)", () => {
    expect(diffTransfers(m([]), m([["1", "todo"]]), ORDER)).toEqual([]);
  });

  it("does not report an item that disappeared (a remove is not a move)", () => {
    expect(diffTransfers(m([["1", "todo"]]), m([]), ORDER)).toEqual([]);
  });

  it("does not report a reorder inside one bucket", () => {
    const prev = m([["1", "todo"], ["2", "todo"]]);
    const next = m([["2", "todo"], ["1", "todo"]]);
    expect(diffTransfers(prev, next, ORDER)).toEqual([]);
  });
});
