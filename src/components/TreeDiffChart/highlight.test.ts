import { describe, it, expect } from "vitest";
import { computeHighlight, edgeKey } from "./highlight";
import { computeTreeDiffLayout } from "./layout";
import {
  HEAD_BASELINE_ID,
  ROOT_BASELINE_ID,
  ROOT_COMPARE_ID,
  SAME_ID,
  type TreeDiffBand,
  type TreeDiffEntry,
} from "./types";

const e = (id: string, label = id): TreeDiffEntry => ({ id, label, hash: id });

const payroll: TreeDiffBand = {
  name: "bucket:payroll",
  baseline: e("g_pay_b"),
  compare: e("g_pay_f"),
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
  children: [],
};
const bands = [payroll, opex];
const roots = {
  baseline: { label: "Baseline", hash: "a", commit: "c1" },
  compare: { label: "Foo", hash: "b", commit: "c2" },
};

describe("computeHighlight", () => {
  const layout = computeTreeDiffLayout({
    ...roots,
    bands,
    mode: "differences",
  });

  it("is empty with no selection", () => {
    const h = computeHighlight(undefined, bands, layout.edges);
    expect(h.selected.size).toBe(0);
    expect(h.hot.size).toBe(0);
    expect(h.live.size).toBe(0);
  });

  it("selects a leaf and its counterpart on the other side", () => {
    const h = computeHighlight("l_ana85", bands, layout.edges);
    expect([...h.selected].sort()).toEqual(["l_ana85", "l_ana88"]);
  });

  it("climbs both chains to the roots and lights those edges", () => {
    const h = computeHighlight("l_ana85", bands, layout.edges);
    for (const id of [
      "g_pay_b",
      "g_pay_f",
      ROOT_BASELINE_ID,
      ROOT_COMPARE_ID,
    ]) {
      expect(h.hot.has(id)).toBe(true);
    }
    expect(h.live.has(edgeKey({ from: "g_pay_b", to: "l_ana85" }))).toBe(true);
    expect(h.live.has(edgeKey({ from: ROOT_COMPARE_ID, to: "g_pay_f" }))).toBe(
      true,
    );
    expect(h.hot.has("l_bo")).toBe(false);
    expect(h.hot.has(SAME_ID)).toBe(false);
    expect(h.live.has(edgeKey({ from: ROOT_BASELINE_ID, to: SAME_ID }))).toBe(
      false,
    );
  });

  it("selects both groups of a band and lights everything they hold", () => {
    const h = computeHighlight("g_pay_f", bands, layout.edges);
    expect([...h.selected].sort()).toEqual(["g_pay_b", "g_pay_f"]);
    for (const id of ["l_bo", "l_ana85", "l_ana88", "l_tax", "l_tax_f"]) {
      expect(h.hot.has(id)).toBe(true);
    }
    expect(h.live.has(edgeKey({ from: "g_pay_b", to: "l_bo" }))).toBe(true);
    expect(h.live.has(edgeKey({ from: "g_pay_f", to: "l_bo" }))).toBe(true);
  });

  it("selects a shared leaf once and lights both groups above it", () => {
    const h = computeHighlight("l_bo", bands, layout.edges);
    expect([...h.selected]).toEqual(["l_bo"]);
    expect(h.hot.has("g_pay_b")).toBe(true);
    expect(h.hot.has("g_pay_f")).toBe(true);
  });

  it("reaches the head through the spine in the wide layout", () => {
    const wide = computeTreeDiffLayout({
      ...roots,
      bands,
      mode: "differences",
      width: 1400,
    });
    const h = computeHighlight("l_tax", bands, wide.edges);
    expect(h.hot.has(HEAD_BASELINE_ID)).toBe(true);
  });

  it("selects only the clicked node when it has no counterpart", () => {
    const h = computeHighlight("g_opex", bands, layout.edges);
    expect([...h.selected]).toEqual(["g_opex"]);
  });
});
