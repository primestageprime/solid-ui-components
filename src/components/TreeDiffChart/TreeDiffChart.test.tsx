import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { TreeDiffChart } from "./TreeDiffChart";
import type { TreeDiffBand, TreeDiffEntry } from "./types";

afterEach(cleanup);

const e = (id: string, label = id): TreeDiffEntry => ({ id, label, hash: id });

const bands: TreeDiffBand[] = [
  {
    name: "bucket:payroll",
    baseline: e("g_b", "bucket:payroll"),
    compare: e("g_c", "bucket:payroll"),
    children: [
      {
        name: "bo",
        baseline: e("l_bo", "Salary · Bo"),
        compare: e("l_bo", "Salary · Bo"),
      },
      {
        name: "ana",
        baseline: e("l_a1", "Salary · Ana"),
        compare: e("l_a2", "Salary · Ana"),
      },
    ],
  },
  { name: "bucket:opex", baseline: e("g_o"), compare: e("g_o"), children: [] },
];

const mount = (extra: Partial<Parameters<typeof TreeDiffChart>[0]> = {}) =>
  render(() => (
    <TreeDiffChart
      baseline={{ label: "Baseline", hash: "aaa" }}
      compare={{ label: "Foo", hash: "bbb" }}
      bands={bands}
      {...extra}
    />
  ));

const nodeEls = (c: Element) => [
  ...c.querySelectorAll<SVGGElement>("g.sui-tree-diff__node"),
];
const nodeById = (c: Element, id: string) =>
  c.querySelector<SVGGElement>(`g[data-node-id="${id}"]`)!;

describe("TreeDiffChart", () => {
  it("renders roots, groups, leaves and the pruned node in differences mode", () => {
    const { container } = mount();
    const ids = nodeEls(container)
      .map((g) => g.dataset.nodeId)
      .sort();
    expect(ids).toEqual(
      [
        "__root_baseline",
        "__root_compare",
        "__same",
        "g_b",
        "g_c",
        "l_a1",
        "l_a2",
        "l_bo",
      ].sort(),
    );
    expect(container.querySelectorAll("path.sui-tree-diff__edge").length).toBe(
      8,
    );
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toBe(
      "Tree diff of Baseline against Foo",
    );
    expect(
      container
        .querySelector("svg")
        ?.classList.contains("sui-tree-diff--compact"),
    ).toBe(true);
  });

  it("paints each side with its own class and marker", () => {
    const { container } = mount();
    expect(
      nodeById(container, "g_c").classList.contains(
        "sui-tree-diff__node--compare",
      ),
    ).toBe(true);
    expect(
      nodeById(container, "l_bo").classList.contains(
        "sui-tree-diff__node--shared",
      ),
    ).toBe(true);
    expect(
      nodeById(container, "__same").classList.contains(
        "sui-tree-diff__node--same",
      ),
    ).toBe(true);
    const compareEdge = container.querySelector(
      "path.sui-tree-diff__edge--compare",
    )!;
    expect(compareEdge.getAttribute("marker-end")).toBe(
      "url(#sui-tree-diff-arrow-compare)",
    );
  });

  it("draws the identical band instead of [SAME] in full mode", () => {
    const { container } = mount({ mode: "full" });
    expect(container.querySelector('g[data-node-id="__same"]')).toBeNull();
    expect(
      nodeById(container, "g_o").classList.contains(
        "sui-tree-diff__node--shared",
      ),
    ).toBe(true);
  });

  it("makes group and leaf nodes buttons only when onNodeClick is given", () => {
    const onNodeClick = vi.fn();
    const { container } = mount({ onNodeClick, selectedId: "l_a2" });
    const leaf = nodeById(container, "l_a2");
    expect(leaf.getAttribute("role")).toBe("button");
    expect(leaf.classList.contains("sui-tree-diff__node--selected")).toBe(true);
    fireEvent.click(leaf);
    fireEvent.keyDown(nodeById(container, "g_b"), { key: "Enter" });
    expect(onNodeClick.mock.calls).toEqual([["l_a2"], ["g_b"]]);
    fireEvent.click(nodeById(container, "__root_baseline"));
    expect(onNodeClick).toHaveBeenCalledTimes(2);
    expect(
      nodeById(container, "__root_baseline").getAttribute("role"),
    ).toBeNull();
  });

  it("lights the counterpart and the chain, and dims the rest", () => {
    const { container } = mount({ selectedId: "l_a2" });
    const cls = (id: string) => nodeById(container, id).classList;
    expect(cls("l_a2").contains("sui-tree-diff__node--selected")).toBe(true);
    expect(cls("l_a1").contains("sui-tree-diff__node--selected")).toBe(true);
    expect(cls("g_b").contains("sui-tree-diff__node--dim")).toBe(false);
    expect(cls("l_bo").contains("sui-tree-diff__node--dim")).toBe(true);
    expect(cls("__same").contains("sui-tree-diff__node--dim")).toBe(true);
    const hot = container.querySelectorAll("path.sui-tree-diff__edge--hot");
    const dim = container.querySelectorAll("path.sui-tree-diff__edge--dim");
    expect(hot.length).toBe(4);
    expect(dim.length).toBe(4);
  });

  it("renders no buttons without onNodeClick", () => {
    const { container } = mount();
    expect(container.querySelectorAll('g[role="button"]').length).toBe(0);
  });
});
