import { describe, it, expect } from "vitest";
import { computeTreeDiffLayout, CHART_WIDTH } from "./layout";
import {
  ROOT_BASELINE_ID,
  ROOT_COMPARE_ID,
  SAME_ID,
  type TreeDiffBand,
  type TreeDiffEntry,
} from "./types";

const e = (id: string, label = id): TreeDiffEntry => ({ id, label, hash: id });

const roots = {
  baseline: { label: "Baseline", hash: "3f7ac10" },
  compare: { label: "Foo", hash: "c05e8b2" },
};

// Situation 1 from the prototype: one value changes. Payroll forks (tax and
// Ana move, Bo stays shared); opex and revenue are identical.
const payroll: TreeDiffBand = {
  name: "bucket:payroll",
  baseline: e("g_pay_b", "bucket:payroll"),
  compare: e("g_pay_f", "bucket:payroll"),
  children: [
    { name: "line:salary-bo", baseline: e("l_bo"), compare: e("l_bo") },
    { name: "line:salary-ana", baseline: e("l_ana85"), compare: e("l_ana88") },
    { name: "line:payroll-tax", baseline: e("l_tax"), compare: e("l_tax_f") },
  ],
};
const opex: TreeDiffBand = {
  name: "bucket:opex",
  baseline: e("g_opex"),
  compare: e("g_opex"),
  children: [
    { name: "line:office-rent", baseline: e("l_rent"), compare: e("l_rent") },
  ],
};
const revenue: TreeDiffBand = {
  name: "side:revenue",
  baseline: e("g_rev"),
  compare: e("g_rev"),
  children: [],
};

const byId = (layout: ReturnType<typeof computeTreeDiffLayout>) =>
  new Map(layout.nodes.map((n) => [n.id, n]));

describe("computeTreeDiffLayout — differences mode", () => {
  const layout = computeTreeDiffLayout({
    ...roots,
    bands: [opex, revenue, payroll],
    mode: "differences",
  });
  const n = byId(layout);

  it("mints both roots at the top, mirrored about the center", () => {
    const b = n.get(ROOT_BASELINE_ID)!;
    const c = n.get(ROOT_COMPARE_ID)!;
    expect(b.side).toBe("baseline");
    expect(c.side).toBe("compare");
    expect(b.y).toBe(c.y);
    expect(b.x + c.x).toBeCloseTo(CHART_WIDTH);
    expect(b.hash).toBe("root 3f7ac10");
  });

  it("shows only the diverged band, then prunes the rest into [SAME]", () => {
    expect(layout.bands.map((b) => b.name)).toEqual([
      "bucket:payroll",
      "identical subtrees",
    ]);
    expect(layout.bands[0].note).toBe("2 lines moved");
    expect(layout.bands[1].note).toBe("2 root entries · pruned");
    expect(layout.bands[1].same).toBe(true);
    expect(n.get(SAME_ID)?.hash).toBe("2 subtrees · pruned");
    expect(n.has("g_opex")).toBe(false);
  });

  it("puts group nodes on their own side and shared leaves in the center", () => {
    const gb = n.get("g_pay_b")!;
    const gc = n.get("g_pay_f")!;
    const bo = n.get("l_bo")!;
    expect(gb.side).toBe("baseline");
    expect(gc.side).toBe("compare");
    expect(gb.x).toBeLessThan(bo.x);
    expect(bo.x).toBeLessThan(gc.x);
    expect(bo.side).toBe("shared");
    expect(bo.x).toBeCloseTo(CHART_WIDTH / 2);
    expect(n.get("l_ana85")!.x).toBeLessThan(bo.x);
    expect(n.get("l_ana88")!.x).toBeGreaterThan(bo.x);
  });

  it("orders children changed before identical", () => {
    const rows = ["l_ana85", "l_tax", "l_bo"].map((id) => n.get(id)!.y);
    expect(rows[0]).toBeLessThan(rows[2]);
    expect(rows[1]).toBeLessThan(rows[2]);
  });

  it("colours each edge by its target and dedupes the shared arrows", () => {
    const into = (to: string) => layout.edges.filter((x) => x.to === to);
    expect(into("g_pay_b")).toEqual([
      { from: ROOT_BASELINE_ID, to: "g_pay_b", side: "baseline" },
    ]);
    expect(into("l_ana88")[0].side).toBe("compare");
    expect(
      into("l_bo")
        .map((x) => x.from)
        .sort(),
    ).toEqual(["g_pay_b", "g_pay_f"]);
    expect(
      into(SAME_ID)
        .map((x) => x.from)
        .sort(),
    ).toEqual([ROOT_BASELINE_ID, ROOT_COMPARE_ID]);
    expect(layout.edges.every((x) => n.has(x.from) && n.has(x.to))).toBe(true);
  });

  it("grows the height with the bands", () => {
    const last = layout.bands[layout.bands.length - 1];
    expect(layout.height).toBeGreaterThan(last.y + last.height);
  });
});

describe("computeTreeDiffLayout — full mode", () => {
  const layout = computeTreeDiffLayout({
    ...roots,
    bands: [opex, revenue, payroll],
    mode: "full",
  });
  const n = byId(layout);

  it("draws every band, diverged first, with no [SAME] node", () => {
    expect(layout.bands.map((b) => b.name)).toEqual([
      "bucket:payroll",
      "bucket:opex",
      "side:revenue",
    ]);
    expect(layout.bands[1].note).toBe("identical");
    expect(n.has(SAME_ID)).toBe(false);
  });

  it("draws an identical subtree once, as shared, fed from both roots", () => {
    const g = n.get("g_opex")!;
    expect(g.side).toBe("shared");
    expect(n.get("l_rent")!.side).toBe("shared");
    expect(
      layout.edges
        .filter((x) => x.to === "g_opex")
        .map((x) => x.from)
        .sort(),
    ).toEqual([ROOT_BASELINE_ID, ROOT_COMPARE_ID]);
  });

  it("centers a childless identical group", () => {
    expect(n.get("g_rev")!.x).toBeCloseTo(CHART_WIDTH / 2);
  });
});

describe("computeTreeDiffLayout — added and removed entries", () => {
  it("draws a band one side lacks as a lone group on the other side", () => {
    const added: TreeDiffBand = {
      name: "bucket:new",
      compare: e("g_new"),
      children: [{ name: "line:x", compare: e("l_x") }],
    };
    const layout = computeTreeDiffLayout({
      ...roots,
      bands: [added],
      mode: "differences",
    });
    const n = byId(layout);
    expect(n.get("g_new")!.side).toBe("compare");
    expect(n.get("l_x")!.side).toBe("compare");
    expect(n.get("l_x")!.x).toBeGreaterThan(CHART_WIDTH / 2);
    expect(layout.bands[0].note).toBe("1 line moved");
    expect(layout.edges.some((x) => x.from === ROOT_BASELINE_ID)).toBe(false);
  });
});
