// One chart instance, four props toggled under it.
//
// thorcasting's AppChart mounts TWO charts behind a `<Show when={scrub}>` and
// swaps them, so a page that turns the scrub layer on or off remounts the
// chart. The fix is one instance whose `scrub`, `cellWidth`, `selected` and
// `onScrub` change under it. These tests pin that SUI allows that: the nodes
// the instance owns for its whole life stay the SAME nodes across every
// toggle, and state the instance owns (the y-fit mode) survives.
//
// Which nodes: the root, the frame, and the frame's `__defs` svg — the one
// SVG root ScrubChart renders unconditionally. The consumer chart svg
// (`.sui-cashflow-scrub-chart__chart`) is NOT among them: `renderChart(ctx())`
// is a slot called with a plain snapshot, so it redraws on every ctx change,
// a `selected` change included. That is how the slot has always worked, and
// the first test states it so nobody mistakes a redraw for a remount.
import { describe, expect, it } from "vitest";
import { createSignal } from "solid-js";
import { render } from "@solidjs/testing-library";
import { StillCashflowScrubChart, type CashflowCell } from "./CashflowScrubChart";
import { dailyCells } from "../DateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

const cells: CashflowCell[] = dailyCells(d("2026-05-01"), d("2026-05-20")).map(
  (cell, i) => ({ ...cell, cashflowCents: 1_000, balanceCents: 1_000 * (i + 1) }),
);

interface Config {
  scrub: boolean;
  cellWidth?: number;
  selected?: number;
  onScrub?: (i: number) => void;
}

/** The Timeline page's config and the plain one every other page uses. */
const TIMELINE: Config = { scrub: true, cellWidth: 72, selected: 5, onScrub: () => {} };
const PLAIN: Config = { scrub: false };

const mount = (initial: Config) => {
  const [config, setConfig] = createSignal<Config>(initial);
  const { container } = render(() => (
    <StillCashflowScrubChart
      cells={cells}
      scrub={config().scrub}
      cellWidth={config().cellWidth}
      selected={config().selected}
      onScrub={config().onScrub}
      yFitDomain={(_from, to) => [0, 1_000 * (to + 1)]}
    />
  ));
  const nodes = () => ({
    root: container.querySelector(".sui-scrub-chart"),
    frame: container.querySelector(".sui-scrub-chart__frame"),
    defs: container.querySelector("svg.sui-scrub-chart__defs"),
  });
  return { container, setConfig, nodes };
};

describe("CashflowScrubChart — props toggled on a live instance", () => {
  it("redraws the consumer chart svg on a selection change (slot semantics, not a remount)", () => {
    const chart = mount(TIMELINE);
    const before = chart.container.querySelector(".sui-cashflow-scrub-chart__chart");
    chart.setConfig({ ...TIMELINE, selected: 6 });
    const after = chart.container.querySelector(".sui-cashflow-scrub-chart__chart");
    expect(before).toBeTruthy();
    expect(after).not.toBe(before);
  });

  it("keeps the root, the frame and the defs svg across all four props toggled together", () => {
    const chart = mount(PLAIN);
    const first = chart.nodes();
    expect(first.root && first.frame && first.defs).toBeTruthy();
    for (const next of [TIMELINE, PLAIN, TIMELINE]) {
      chart.setConfig(next);
      const n = chart.nodes();
      expect(n.root).toBe(first.root);
      expect(n.frame).toBe(first.frame);
      expect(n.defs).toBe(first.defs);
    }
  });

  it.each([
    ["scrub", { ...TIMELINE, scrub: false }],
    ["cellWidth", { ...TIMELINE, cellWidth: 40 }],
    ["selected", { ...TIMELINE, selected: undefined }],
    ["onScrub", { ...TIMELINE, onScrub: undefined }],
  ] as const)("keeps the same nodes when only %s toggles", (_name, next) => {
    const chart = mount(TIMELINE);
    const first = chart.nodes();
    chart.setConfig(next);
    expect(chart.nodes().root).toBe(first.root);
    expect(chart.nodes().frame).toBe(first.frame);
    expect(chart.nodes().defs).toBe(first.defs);
    chart.setConfig(TIMELINE);
    expect(chart.nodes().frame).toBe(first.frame);
  });

  it("turns the scrub layer's pieces on and off with the prop", () => {
    const chart = mount(PLAIN);
    const q = (s: string) => chart.container.querySelector(s);
    expect(q(".sui-date-axis")).toBeNull();
    expect(q(".sui-scrub-chart__window")).toBeNull();
    chart.setConfig(TIMELINE);
    expect(q(".sui-date-axis")).toBeTruthy();
    expect(q(".sui-scrub-chart__window")).toBeTruthy();
    expect(q(".sui-cashflow-scrub-chart__selected-dot")).toBeTruthy();
    chart.setConfig(PLAIN);
    expect(q(".sui-date-axis")).toBeNull();
    expect(q(".sui-cashflow-scrub-chart__selected-dot")).toBeNull();
  });

  it("keeps state the instance owns (the y-fit mode) across the toggles", () => {
    const chart = mount(PLAIN);
    const btn = () =>
      chart.container.querySelector<HTMLButtonElement>(".sui-scrub-chart__y-fit-btn")!;
    expect(btn().getAttribute("aria-label")).toBe("Fit to all");
    btn().click();
    expect(btn().getAttribute("aria-label")).toBe("Fit to visible");
    chart.setConfig(TIMELINE);
    chart.setConfig(PLAIN);
    expect(btn().getAttribute("aria-label")).toBe("Fit to visible");
  });
});
