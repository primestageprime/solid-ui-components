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

// ─── A. Labels ellipsize inside the box, full value in a tooltip ──────────
describe("TreeDiffChart labels", () => {
  const LONG = "Bookkeeping retainer for the northern region";

  const longBands: TreeDiffBand[] = [
    {
      name: "bucket:opex",
      baseline: e("g_b", "bucket:opex"),
      compare: e("g_c", "bucket:opex"),
      children: [
        { name: "book", baseline: e("l_b1", LONG), compare: e("l_b2", LONG) },
      ],
    },
  ];

  it("renders a data label as ellipsizing HTML inside a foreignObject sized to the box", () => {
    const { container } = mount({ bands: longBands });
    const leaf = nodeById(container, "l_b1");
    const fo = leaf.querySelector("foreignObject")!;
    expect(fo).not.toBeNull();

    // The box width is the constraint — the label may never widen it.
    const box = leaf.querySelector("rect.sui-tree-diff__body")!;
    expect(Number(fo.getAttribute("width"))).toBeLessThanOrEqual(
      Number(box.getAttribute("width")),
    );

    // Ellipsizing is the Text variant's job, so the element must carry it.
    const label = fo.querySelector(".sui-tree-diff__label")!;
    expect(label.textContent).toBe(LONG);
    expect(label.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
  });

  it("wraps the label in a tooltip trigger carrying the complete value", () => {
    const { container } = mount({ bands: longBands });
    const leaf = nodeById(container, "l_b1");
    const trigger = leaf.querySelector(".sui-tooltip__trigger")!;
    expect(trigger).not.toBeNull();
    // A span trigger, never a button — the <g> is already role="button".
    expect(trigger.tagName.toLowerCase()).toBe("span");
    expect(trigger.textContent).toBe(LONG);
    // The full value also stays on the accessible name of the node.
    expect(leaf.getAttribute("aria-label")).toContain(LONG);
  });

  it("leaves the chart's own minted labels as plain SVG text", () => {
    const { container } = mount();
    const same = nodeById(container, "__same");
    expect(same.querySelector("foreignObject")).toBeNull();
    const text = same.querySelector("text.sui-tree-diff__label")!;
    expect(text.textContent).toBe("[SAME]");
  });

  it("keeps the hash line as fixed-width SVG text", () => {
    const { container } = mount({ bands: longBands });
    const hash = nodeById(container, "l_b1").querySelector(
      "text.sui-tree-diff__hash",
    )!;
    expect(hash.textContent).toBe("l_b1");
  });
});

// ─── B. Change kind and the legend ───────────────────────────────────────
describe("TreeDiffChart change kinds", () => {
  const k = (
    id: string,
    label: string,
    kind: TreeDiffEntry["kind"],
  ): TreeDiffEntry => ({ id, label, hash: id, kind });

  const kindBands: TreeDiffBand[] = [
    {
      name: "bucket:opex",
      baseline: k("g_b", "bucket:opex", "changed"),
      compare: k("g_c", "bucket:opex", "changed"),
      children: [
        {
          name: "rent",
          baseline: k("l_rent", "Office rent", "unchanged"),
          compare: k("l_rent", "Office rent", "unchanged"),
        },
        { name: "saas", baseline: k("l_saas", "SaaS stack", "removed") },
        { name: "book", compare: k("l_book", "Bookkeeping", "added") },
      ],
    },
  ];

  it("puts the consumer's kind on the node as a class and a data attribute", () => {
    const { container } = mount({ bands: kindBands });
    const cases: [string, string][] = [
      ["g_c", "changed"],
      ["l_rent", "unchanged"],
      ["l_saas", "removed"],
      ["l_book", "added"],
    ];
    for (const [id, kind] of cases) {
      const g = nodeById(container, id);
      expect(g.dataset.kind).toBe(kind);
      expect(g.classList.contains(`sui-tree-diff__node--kind-${kind}`)).toBe(
        true,
      );
    }
  });

  it("gives an edge the kind of the node it points at, arrowhead included", () => {
    const { container } = mount({ bands: kindBands });
    const edge = container.querySelector<SVGPathElement>(
      "path.sui-tree-diff__edge--kind-removed",
    )!;
    expect(edge).not.toBeNull();
    expect(edge.dataset.kind).toBe("removed");
    // A kind-coloured line with a side-coloured arrowhead is the bug.
    expect(edge.getAttribute("marker-end")).toBe(
      "url(#sui-tree-diff-arrow-kind-removed)",
    );
  });

  it("renders a legend of only the kinds present, keyed to tone tokens", () => {
    const { container } = mount({ bands: kindBands });
    const labels = [
      ...container.querySelectorAll(".sui-legend__label"),
    ].map((n) => n.textContent);
    expect(labels).toEqual(["Unchanged", "Changed", "Added", "Removed"]);

    const swatches = [
      ...container.querySelectorAll<HTMLElement>(".sui-legend__swatch"),
    ].map((n) => n.style.backgroundColor);
    expect(swatches).toEqual([
      "var(--sui-text-muted)",
      "var(--sui-accent)",
      "var(--sui-success)",
      "var(--sui-danger)",
    ]);
  });

  it("omits a kind nothing in the data uses", () => {
    const onlyChanged: TreeDiffBand[] = [
      {
        name: "bucket:opex",
        baseline: k("g_b", "bucket:opex", "changed"),
        compare: k("g_c", "bucket:opex", "changed"),
        children: [],
      },
    ];
    const { container } = mount({ bands: onlyChanged });
    const labels = [
      ...container.querySelectorAll(".sui-legend__label"),
    ].map((n) => n.textContent);
    expect(labels).toEqual(["Changed"]);
  });

  it("is purely additive: no kinds means no legend and side paint as before", () => {
    const { container } = mount();
    expect(container.querySelector(".sui-legend")).toBeNull();
    const g = nodeById(container, "g_c");
    expect(g.dataset.kind).toBeUndefined();
    expect(g.classList.contains("sui-tree-diff__node--compare")).toBe(true);
    expect(
      container.querySelector("path.sui-tree-diff__edge--compare")
        ?.getAttribute("marker-end"),
    ).toBe("url(#sui-tree-diff-arrow-compare)");
  });

  it("suppresses the legend when the caller asks", () => {
    const { container } = mount({ bands: kindBands, legend: false });
    expect(container.querySelector(".sui-legend")).toBeNull();
    // The paint stays regardless — legend is presentation, kind is data.
    expect(nodeById(container, "l_saas").dataset.kind).toBe("removed");
  });
});
