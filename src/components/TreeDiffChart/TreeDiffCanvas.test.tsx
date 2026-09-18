// The canvas on its own, mounted with a hand-built layout and no Composite
// above it. Two things this proves that TreeDiffChart.test.tsx cannot:
//
//  1. the canvas draws from the layout it is HANDED, deciding nothing — the
//     numbers below are arbitrary and land verbatim on the elements;
//  2. the label seam is a seam. `renderLabel` is called with the slot's text
//     and the canvas's own class hooks, and whatever it returns is what lands
//     inside the `<foreignObject>`. Here that is a bare `<b>`, which no SUI
//     Tooltip is anywhere near — so the canvas is provably not the thing that
//     chose Tooltip.
import { describe, it, expect, afterEach } from "vitest";
import type { JSX } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { TreeDiffCanvas, type TreeDiffLabelSlot } from "./TreeDiffCanvas";
import type { TreeDiffLayout } from "./layout-types";

afterEach(cleanup);

const EMPTY_HIGHLIGHT = {
  selected: new Set<string>(),
  hot: new Set<string>(),
  live: new Set<string>(),
};

const layout: TreeDiffLayout = {
  mode: "compact",
  width: 400,
  height: 200,
  nodes: [
    {
      id: "n1",
      side: "baseline",
      kind: "leaf",
      label: "A label long enough to want ellipsizing",
      labelFromData: true,
      hash: "abc",
      x: 100,
      y: 80,
      width: 120,
      height: 40,
    },
    {
      id: "n2",
      side: "compare",
      kind: "group",
      label: "root tree",
      labelFromData: false,
      hash: "def",
      x: 300,
      y: 80,
      width: 120,
      height: 40,
    },
  ],
  edges: [{ from: "n1", to: "n2", side: "shared" }],
  bands: [],
  guides: [{ kind: "divider", x1: 0, y1: 0, x2: 400, y2: 0 }],
  captions: [],
};

const mount = (renderLabel: (slot: TreeDiffLabelSlot) => JSX.Element) =>
  render(() => (
    <TreeDiffCanvas
      layout={layout}
      highlight={EMPTY_HIGHLIGHT}
      ariaLabel="A diff"
      renderLabel={renderLabel}
    />
  ));

describe("TreeDiffCanvas", () => {
  it("draws the layout it is handed and nothing it decided itself", () => {
    const { container } = mount(() => null);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 400 200");
    expect(svg.getAttribute("aria-label")).toBe("A diff");
    expect(svg.classList.contains("sui-tree-diff--compact")).toBe(true);
    expect(container.querySelectorAll("g.sui-tree-diff__node").length).toBe(2);
    expect(container.querySelector("line.sui-tree-diff__divider")).not.toBeNull();
    const body = container.querySelector("rect.sui-tree-diff__body")!;
    expect(body.getAttribute("x")).toBe("40");
    expect(body.getAttribute("width")).toBe("120");
  });

  it("hands the label slot its text and its own class hooks, and draws what comes back", () => {
    const seen: TreeDiffLabelSlot[] = [];
    const { container } = mount((slot: TreeDiffLabelSlot) => {
      seen.push(slot);
      return <b class={slot.triggerClass}>{slot.text}</b>;
    });
    expect(seen.length).toBe(1);
    expect(seen[0].text).toBe("A label long enough to want ellipsizing");
    expect(seen[0].triggerClass).toBe("sui-tree-diff__label-trigger");
    expect(seen[0].textClass).toBe("sui-tree-diff__label");
    const fo = container.querySelector("foreignObject")!;
    expect(fo.querySelector("b.sui-tree-diff__label-trigger")?.textContent).toBe(
      "A label long enough to want ellipsizing",
    );
    // A chart-minted label never reaches the seam — it stays SVG text.
    expect(
      [...container.querySelectorAll("text.sui-tree-diff__label")].map(
        (t) => t.textContent,
      ),
    ).toEqual(["root tree"]);
  });

  it("makes a node a hit target only when a click handler is supplied", () => {
    const { container } = mount(() => null);
    expect(container.querySelector('g[role="button"]')).toBeNull();
  });
});
