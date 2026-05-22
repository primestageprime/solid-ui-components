// ============================================
// Tests cover the pure bucketByDims util plus a smoke pass on the visual
// components (PivotTreemap + PivotPills).
// ============================================
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import {
  bucketByDims,
  EMPTY_INNER_KEY,
  PivotAccessors,
} from "./bucketByDims";
import { PivotTreemap } from "./PivotTreemap";
import { PivotPills } from "./PivotPills";

type Dim = "CLIENT" | "PROJECT" | "FEATURE";

interface Row {
  id: string;
  tags: string[];
  status?: "todo" | "doing" | "done";
}

const accessors: PivotAccessors<Row, Dim> = {
  dims: ["CLIENT", "PROJECT", "FEATURE"] as const,
  values: (row, dim) =>
    row.tags
      .filter((t) => t.startsWith(`${dim}:`))
      .map((t) => t.slice(dim.length + 1)),
};

describe("bucketByDims", () => {
  it("buckets a single-valued axis", () => {
    const rows: Row[] = [
      { id: "1", tags: ["CLIENT:A", "PROJECT:X"] },
      { id: "2", tags: ["CLIENT:A", "PROJECT:Y"] },
      { id: "3", tags: ["CLIENT:B", "PROJECT:X"] },
    ];
    const out = bucketByDims(rows, "CLIENT", "PROJECT", accessors);
    expect(out.map((b) => b.key)).toEqual(["A", "B"]);
    expect(out[0].total).toBe(2);
    expect(out[0].children.map((c) => c.key).sort()).toEqual(["X", "Y"]);
    expect(out[1].total).toBe(1);
  });

  it("multi-valued axis: row contributes to every matching bucket", () => {
    const rows: Row[] = [
      { id: "1", tags: ["CLIENT:A", "FEATURE:F1", "FEATURE:F2"] },
      { id: "2", tags: ["CLIENT:A", "FEATURE:F1"] },
    ];
    const out = bucketByDims(rows, "CLIENT", "FEATURE", accessors);
    expect(out).toHaveLength(1);
    const a = out[0];
    expect(a.total).toBe(2);
    // F1 has both rows, F2 has just row 1 → child sum = 3 > parent total 2.
    const childSum = a.children.reduce((acc, c) => acc + c.total, 0);
    expect(childSum).toBe(3);
    const f1 = a.children.find((c) => c.key === "F1")!;
    const f2 = a.children.find((c) => c.key === "F2")!;
    expect(f1.total).toBe(2);
    expect(f2.total).toBe(1);
  });

  it("empty input returns []", () => {
    expect(bucketByDims([] as Row[], "CLIENT", "PROJECT", accessors)).toEqual(
      [],
    );
  });

  it("missing inner-dim values fall under EMPTY_INNER_KEY", () => {
    const rows: Row[] = [
      { id: "1", tags: ["CLIENT:A"] },
      { id: "2", tags: ["CLIENT:A", "PROJECT:X"] },
    ];
    const out = bucketByDims(rows, "CLIENT", "PROJECT", accessors);
    const keys = new Set(out[0].children.map((c) => c.key));
    expect(keys.has(EMPTY_INNER_KEY)).toBe(true);
    expect(keys.has("X")).toBe(true);
    expect(keys.size).toBe(2);
  });

  it("metrics accumulate done/doing counts per bucket", () => {
    const rows: Row[] = [
      { id: "1", tags: ["CLIENT:A", "PROJECT:X"], status: "done" },
      { id: "2", tags: ["CLIENT:A", "PROJECT:X"], status: "doing" },
      { id: "3", tags: ["CLIENT:A", "PROJECT:Y"], status: "todo" },
    ];
    const out = bucketByDims(rows, "CLIENT", "PROJECT", accessors, {
      done: (r) => r.status === "done",
      doing: (r) => r.status === "doing",
    });
    expect(out[0].metrics).toEqual({ done: 1, doing: 1 });
    const x = out[0].children.find((c) => c.key === "X")!;
    expect(x.metrics).toEqual({ done: 1, doing: 1 });
    const y = out[0].children.find((c) => c.key === "Y")!;
    expect(y.metrics).toEqual({ done: 0, doing: 0 });
  });

  it("sorts buckets and children by total descending", () => {
    const rows: Row[] = [
      { id: "1", tags: ["CLIENT:A", "PROJECT:X"] },
      { id: "2", tags: ["CLIENT:B", "PROJECT:X"] },
      { id: "3", tags: ["CLIENT:B", "PROJECT:Y"] },
      { id: "4", tags: ["CLIENT:B", "PROJECT:Y"] },
      { id: "5", tags: ["CLIENT:B", "PROJECT:Y"] },
    ];
    const out = bucketByDims(rows, "CLIENT", "PROJECT", accessors);
    expect(out.map((b) => b.key)).toEqual(["B", "A"]);
    expect(out[0].children.map((c) => c.key)).toEqual(["Y", "X"]);
  });

  it("omits metrics field when no spec supplied", () => {
    const rows: Row[] = [{ id: "1", tags: ["CLIENT:A", "PROJECT:X"] }];
    const out = bucketByDims(rows, "CLIENT", "PROJECT", accessors);
    expect(out[0].metrics).toBeUndefined();
  });
});

describe("PivotTreemap", () => {
  const rows: Row[] = [
    { id: "1", tags: ["CLIENT:A", "PROJECT:X"], status: "done" },
    { id: "2", tags: ["CLIENT:A", "PROJECT:Y"], status: "todo" },
    { id: "3", tags: ["CLIENT:B", "PROJECT:X"], status: "doing" },
  ];

  it("renders outer columns and inner leaves with their keys", () => {
    const { container } = render(() => (
      <PivotTreemap
        rows={rows}
        outer="CLIENT"
        inner="PROJECT"
        accessors={accessors}
      />
    ));
    // The chip-label rendering EllipsizedChipLabel is the first <span> in
    // each outer-header / inner-cell. Querying by tag rather than class
    // keeps this stable through future renames of the Layout Row class.
    const outerKeys = Array.from(
      container.querySelectorAll(".sui-treemap__outer-header"),
    ).map((el) => el.querySelector("span")?.textContent);
    expect(outerKeys).toContain("A");
    expect(outerKeys).toContain("B");
    const leafKeys = Array.from(
      container.querySelectorAll(".sui-treemap__inner"),
    ).map((el) => el.querySelector("span")?.textContent);
    expect(leafKeys).toContain("X");
    expect(leafKeys).toContain("Y");
  });

  it("calls onSelect when a leaf is clicked", () => {
    const onSelect = vi.fn();
    const { container } = render(() => (
      <PivotTreemap
        rows={rows}
        outer="CLIENT"
        inner="PROJECT"
        accessors={accessors}
        selection={null}
        onSelect={onSelect}
      />
    ));
    const leaf = container.querySelector(".sui-treemap__inner")!;
    fireEvent.click(leaf);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const arg = onSelect.mock.calls[0][0];
    expect(arg.scope).toBe("tagged");
    expect(typeof arg.outerKey).toBe("string");
    expect(typeof arg.innerKey).toBe("string");
  });

  it("untagged sidebar is omitted when untaggedCount is 0 and rendered when > 0", () => {
    const { container: noUntagged } = render(() => (
      <PivotTreemap
        rows={rows}
        outer="CLIENT"
        inner="PROJECT"
        accessors={accessors}
        untaggedCount={0}
      />
    ));
    expect(
      noUntagged.querySelector(".sui-treemap__sidebar"),
    ).toBeNull();

    const { container: withUntagged } = render(() => (
      <PivotTreemap
        rows={rows}
        outer="CLIENT"
        inner="PROJECT"
        accessors={accessors}
        untaggedCount={5}
      />
    ));
    const sidebar = withUntagged.querySelector(".sui-treemap__sidebar");
    expect(sidebar).not.toBeNull();
    expect(sidebar!.textContent).toContain("5");
  });
});

describe("PivotPills", () => {
  it("renders one pill per dim", () => {
    const order: Dim[] = ["CLIENT", "PROJECT", "FEATURE"];
    const { container } = render(() => (
      <PivotPills order={order} setOrder={() => {}} />
    ));
    const pills = container.querySelectorAll(".sui-pivot-pills__pill");
    expect(pills.length).toBe(3);
    const labels = Array.from(pills).map((p) => p.textContent ?? "");
    expect(labels.some((l) => l.includes("CLIENT"))).toBe(true);
    expect(labels.some((l) => l.includes("PROJECT"))).toBe(true);
    expect(labels.some((l) => l.includes("FEATURE"))).toBe(true);
  });

  it("swap on drop reorders", () => {
    const order: Dim[] = ["CLIENT", "PROJECT", "FEATURE"];
    const setOrder = vi.fn();
    const { container } = render(() => (
      <PivotPills order={order} setOrder={setOrder} />
    ));
    const pills = container.querySelectorAll(".sui-pivot-pills__pill");
    // Drag the third pill (FEATURE, idx=2) onto the first (CLIENT, idx=0).
    // jsdom lacks DataTransfer; the component tolerates a null dataTransfer
    // because it only calls optional-chained methods on it.
    fireEvent.dragStart(pills[2]);
    fireEvent.dragOver(pills[0]);
    fireEvent.drop(pills[0]);
    expect(setOrder).toHaveBeenCalledTimes(1);
    expect(setOrder.mock.calls[0][0]).toEqual(["FEATURE", "PROJECT", "CLIENT"]);
  });

  it("uses custom slot labels when provided", () => {
    const order: Dim[] = ["CLIENT", "PROJECT"];
    const { container } = render(() => (
      <PivotPills
        order={order}
        setOrder={() => {}}
        slotLabels={["X", "Y", "Z"]}
      />
    ));
    const labels = Array.from(
      container.querySelectorAll(".sui-pivot-pills__slot-label"),
    ).map((el) => el.textContent ?? "");
    expect(labels[0]).toContain("X");
    expect(labels[1]).toContain("Y");
  });
});
