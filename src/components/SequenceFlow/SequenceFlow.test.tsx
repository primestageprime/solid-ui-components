import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { lanesOf, SequenceFlow, type SequenceNode } from "./SequenceFlow";

const NODES: SequenceNode[] = [
  { id: "a", label: "First", size: "done", progress: { done: 1, total: 1 } },
  { id: "b", label: "Second", size: "done", progress: { done: 1, total: 1 } },
  { id: "c", label: "Third", size: "active", description: "Lots of notes", estimate: "12 min", actual: "3:02", progress: { done: 0, active: 0.25, total: 1 } },
  { id: "d", label: "Fourth", size: "next", estimate: "2 min" },
];

describe("lanesOf", () => {
  it("splits done, active and next", () => {
    const l = lanesOf(NODES);
    expect(l.done.map((n) => n.id)).toEqual(["a", "b"]);
    expect(l.active?.id).toBe("c");
    expect(l.next.map((n) => n.id)).toEqual(["d"]);
  });
  it("with no active node, everything before the first next is done", () => {
    const l = lanesOf([NODES[0], NODES[3]]);
    expect(l.done.length).toBe(1);
    expect(l.active).toBeUndefined();
    expect(l.next.length).toBe(1);
  });
});

describe("SequenceFlow", () => {
  it("draws the lanes, the edge labels, the active node's text and the action", () => {
    const onSelect = vi.fn();
    const { container, getByText } = render(() => (
      <SequenceFlow nodes={NODES} edgeLabels={["18 min", "1h 2 min"]} selectedId="c" onSelect={onSelect} action={<button type="button">Complete</button>} />
    ));
    expect(container.querySelectorAll(".sui-sequence-flow__node--done").length).toBe(2);
    expect(container.querySelector(".sui-sequence-flow__node--active")).not.toBeNull();
    expect(container.querySelector(".sui-sequence-flow__node--next")).not.toBeNull();
    expect(getByText("18 min")).toBeTruthy();
    expect(getByText("1h 2 min")).toBeTruthy();
    expect(getByText("Lots of notes")).toBeTruthy();
    expect(getByText("Est 12 min")).toBeTruthy();
    expect(getByText("Act 3:02")).toBeTruthy();
    expect(getByText("est 2 min")).toBeTruthy();
    expect(container.querySelector('[data-node-id="c"]')?.getAttribute("aria-selected")).toBe("true");
    fireEvent.click(getByText("Complete"));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(getByText("Fourth"));
    expect(onSelect).toHaveBeenCalledWith("d");
  });
  it("shows the empty label without nodes", () => {
    const { getByText } = render(() => <SequenceFlow nodes={[]} emptyLabel="No nodes" />);
    expect(getByText("No nodes")).toBeTruthy();
  });
});
