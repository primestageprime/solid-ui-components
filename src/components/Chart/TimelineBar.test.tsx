import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal, type JSX } from "solid-js";
import { Chart } from "./Chart";
import { TimelineBar, type TimelineBarDatum } from "./TimelineBar";
import { DenseTimelineBar, SparseTimelineBar } from "./TimelineBar.variants";
import { slotId, type Id } from "./slot-types";

const wrapper = (slot: () => JSX.Element) =>
  render(() => (
    <Chart width={400} height={120} xDomain={[0, 10]} yDomain={[0, 100]}>
      {slot()}
    </Chart>
  ));

describe("TimelineBar — render", () => {
  it("renders one rect per datum", () => {
    const bars: TimelineBarDatum[] = [
      { id: slotId("a"), start: 0, end: 2, lane: "scheduled", color: "var(--sui-accent)" },
      { id: slotId("b"), start: 3, end: 5, lane: "detected", color: "var(--sui-warning)" },
    ];
    const { container } = wrapper(() => <TimelineBar data={bars} />);
    expect(container.querySelectorAll(".sui-chart__timeline-bar").length).toBe(2);
  });

  it("places each lane at a distinct y position", () => {
    const bars: TimelineBarDatum[] = [
      { id: slotId("a"), start: 0, end: 2, lane: "scheduled", color: "#fff" },
      { id: slotId("b"), start: 0, end: 2, lane: "detected", color: "#fff" },
    ];
    const { container } = wrapper(() => <TimelineBar data={bars} lanes={["scheduled", "detected"]} />);
    const rects = Array.from(container.querySelectorAll<SVGRectElement>(".sui-chart__timeline-bar"));
    expect(rects[0].getAttribute("y")).not.toBe(rects[1].getAttribute("y"));
  });

  it("skips bars whose lane is missing from explicit lanes prop", () => {
    const bars: TimelineBarDatum[] = [
      { id: slotId("a"), start: 1, end: 3, lane: "ghost", color: "#fff" },
    ];
    const { container } = wrapper(() => (
      <TimelineBar data={bars} lanes={["scheduled", "detected"]} />
    ));
    expect(container.querySelectorAll(".sui-chart__timeline-bar").length).toBe(0);
  });

  it("unknown-lane drop is silent + warns once (mirrors HighlightSegments posture)", () => {
    // Locks the warn-once invariant: an unknown lane skips the rect AND
    // emits exactly one console.warn — even if the same unknown lane
    // appears multiple times in the same render (the module-level dedupe
    // set in TimelineBar.tsx tracks lanes across instances).
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bars: TimelineBarDatum[] = [
      // Use a lane name unique to this test so the module-level dedupe set
      // from earlier tests doesn't swallow our warning.
      { id: slotId("a"), start: 1, end: 3, lane: "phantom-zone-1", color: "#fff" },
      { id: slotId("b"), start: 4, end: 6, lane: "phantom-zone-1", color: "#fff" },
    ];
    const { container } = wrapper(() => (
      <TimelineBar data={bars} lanes={["scheduled", "detected"]} />
    ));
    // Bars silently dropped.
    expect(container.querySelectorAll(".sui-chart__timeline-bar").length).toBe(0);
    // Warned at least once for the unknown lane.
    expect(warn).toHaveBeenCalled();
    const matchingCalls = warn.mock.calls.filter((args) =>
      typeof args[0] === "string" && args[0].includes("phantom-zone-1"),
    );
    // Warn-once: only one warning emitted regardless of how many bars use the lane.
    expect(matchingCalls.length).toBe(1);
    warn.mockRestore();
  });
});

describe("TimelineBar — reactivity", () => {
  it("toggling selectedId updates data-selected", () => {
    const [sel, setSel] = createSignal<Id | null>(null);
    const bar: TimelineBarDatum = { id: slotId("a"), start: 1, end: 3, lane: "x", color: "#fff" };
    const { container } = wrapper(() => <TimelineBar data={[bar]} selectedId={sel()} />);
    expect(container.querySelector(".sui-chart__timeline-bar")!.getAttribute("data-selected")).toBeNull();
    setSel(slotId("a"));
    expect(container.querySelector(".sui-chart__timeline-bar")!.getAttribute("data-selected")).toBe("true");
  });
});

describe("TimelineBar — callbacks", () => {
  it("onBarClick fires with domain item + event", () => {
    const bar: TimelineBarDatum = { id: slotId("a"), start: 1, end: 3, lane: "x", color: "#fff" };
    const calls: TimelineBarDatum[] = [];
    const { container } = wrapper(() => (
      <TimelineBar data={[bar]} onBarClick={(b) => calls.push(b)} />
    ));
    fireEvent.pointerDown(container.querySelector(".sui-chart__timeline-bar")!);
    expect(calls).toEqual([bar]);
  });

  it("onBarHover fires with bar on pointerenter and null on pointerleave", () => {
    const bar: TimelineBarDatum = { id: slotId("a"), start: 1, end: 3, lane: "x", color: "#fff" };
    const calls: Array<TimelineBarDatum | null> = [];
    const { container } = wrapper(() => (
      <TimelineBar data={[bar]} onBarHover={(b) => calls.push(b)} />
    ));
    const rect = container.querySelector(".sui-chart__timeline-bar")!;
    fireEvent.pointerEnter(rect);
    fireEvent.pointerLeave(rect);
    expect(calls).toEqual([bar, null]);
  });
});

describe("TimelineBar — curried variants", () => {
  it("DenseTimelineBar renders bars at 90% lane height", () => {
    const bar: TimelineBarDatum = { id: slotId("a"), start: 1, end: 3, lane: "x", color: "#fff" };
    const { container } = wrapper(() => <DenseTimelineBar data={[bar]} />);
    const rect = container.querySelector(".sui-chart__timeline-bar") as SVGRectElement;
    expect(parseFloat(rect.getAttribute("height")!)).toBeGreaterThan(60);
  });

  it("SparseTimelineBar produces lower visual density than DenseTimelineBar (identical input)", () => {
    // Locks variant differentiation: given the same data, Sparse's rendered
    // bars must occupy strictly less vertical area than Dense's. If anyone
    // later swaps the baked `barHeight` defaults this test catches it.
    const bars: TimelineBarDatum[] = [
      { id: slotId("a"), start: 0, end: 2, lane: "scheduled", color: "#fff" },
      { id: slotId("b"), start: 3, end: 5, lane: "detected", color: "#fff" },
    ];
    const lanes = ["scheduled", "detected"] as const;
    const totalRectArea = (root: ParentNode): number =>
      Array.from(root.querySelectorAll<SVGRectElement>(".sui-chart__timeline-bar"))
        .map((r) => parseFloat(r.getAttribute("height")!) * parseFloat(r.getAttribute("width")!))
        .reduce((sum, a) => sum + a, 0);

    const denseRender = wrapper(() => <DenseTimelineBar data={bars} lanes={lanes} />);
    const sparseRender = wrapper(() => <SparseTimelineBar data={bars} lanes={lanes} />);

    const denseArea = totalRectArea(denseRender.container);
    const sparseArea = totalRectArea(sparseRender.container);

    // Same count (input is identical).
    expect(denseRender.container.querySelectorAll(".sui-chart__timeline-bar").length).toBe(2);
    expect(sparseRender.container.querySelectorAll(".sui-chart__timeline-bar").length).toBe(2);
    // Sparse < Dense (visual density: 0.4 vs 0.9 of lane height).
    expect(sparseArea).toBeLessThan(denseArea);
  });
});

describe("TimelineBar — clip-path", () => {
  it("wraps bars in a group with clip-path set to ctx.clip.plotPathUrl()", () => {
    const bar: TimelineBarDatum = { id: slotId("a"), start: 1, end: 3, lane: "x", color: "#fff" };
    const { container } = wrapper(() => <TimelineBar data={[bar]} />);
    const group = container.querySelector(".sui-chart__timeline");
    expect(group).toBeTruthy();
    expect(group!.getAttribute("clip-path")).toMatch(/^url\(#sui-chart-clip-/);
  });
});

describe("TimelineBar — bandHeight + bandY", () => {
  // Inner-plot dims for the standard wrapper (width=400, height=120,
  // default margin top=8 bottom=28 → innerHeight = 120 - 36 = 84).
  const INNER_HEIGHT = 84;

  it("default behavior unchanged when bandHeight is undefined", () => {
    const bars: TimelineBarDatum[] = [
      { id: slotId("a"), start: 0, end: 2, lane: "scheduled", color: "#fff" },
      { id: slotId("b"), start: 0, end: 2, lane: "detected", color: "#fff" },
    ];
    const { container } = wrapper(() => (
      <TimelineBar data={bars} lanes={["scheduled", "detected"]} barHeight={0.6} />
    ));
    const rects = Array.from(
      container.querySelectorAll<SVGRectElement>(".sui-chart__timeline-bar"),
    );
    // Lanes share full innerHeight (84 / 2 = 42 each), bar = 0.6 * 42 = 25.2.
    const heights = rects.map((r) => parseFloat(r.getAttribute("height")!));
    expect(heights[0]).toBeCloseTo(25.2, 1);
    expect(heights[1]).toBeCloseTo(25.2, 1);
    // First lane sits in the top half (y < INNER_HEIGHT / 2).
    expect(parseFloat(rects[0].getAttribute("y")!)).toBeLessThan(INNER_HEIGHT / 2);
  });

  it("bandHeight=40 + bandY='bottom' places bars in the bottom 40px strip", () => {
    const bars: TimelineBarDatum[] = [
      { id: slotId("a"), start: 0, end: 2, lane: "scheduled", color: "#fff" },
      { id: slotId("b"), start: 0, end: 2, lane: "detected", color: "#fff" },
    ];
    const { container } = wrapper(() => (
      <TimelineBar
        data={bars}
        lanes={["scheduled", "detected"]}
        bandHeight={40}
        bandY="bottom"
        barHeight={0.6}
      />
    ));
    const rects = Array.from(
      container.querySelectorAll<SVGRectElement>(".sui-chart__timeline-bar"),
    );
    // Each lane = 40 / 2 = 20px; bar height = 0.6 * 20 = 12.
    rects.forEach((r) => {
      expect(parseFloat(r.getAttribute("height")!)).toBeCloseTo(12, 1);
    });
    // Top edge of the band = innerHeight - bandHeight = 84 - 40 = 44.
    // Lane 0 top = 44 + 0 + (20 - 12)/2 = 48.
    expect(parseFloat(rects[0].getAttribute("y")!)).toBeCloseTo(48, 1);
    // Lane 1 top = 44 + 20 + 4 = 68.
    expect(parseFloat(rects[1].getAttribute("y")!)).toBeCloseTo(68, 1);
    // Bars sit BELOW the chart midline.
    rects.forEach((r) => {
      expect(parseFloat(r.getAttribute("y")!)).toBeGreaterThan(INNER_HEIGHT / 2);
    });
  });

  it("bandHeight=40 defaults bandY to 'bottom' when bandY is omitted", () => {
    const bar: TimelineBarDatum = { id: slotId("a"), start: 0, end: 2, lane: "x", color: "#fff" };
    const { container } = wrapper(() => <TimelineBar data={[bar]} bandHeight={40} />);
    const rect = container.querySelector<SVGRectElement>(".sui-chart__timeline-bar")!;
    // 1 lane → laneHeight = 40; band top = 84 - 40 = 44; yTop = 44 + (40 - 24)/2 = 52.
    expect(parseFloat(rect.getAttribute("y")!)).toBeCloseTo(52, 1);
  });

  it("bandHeight=40 + bandY='top' places bars in the top 40px strip", () => {
    const bar: TimelineBarDatum = { id: slotId("a"), start: 0, end: 2, lane: "x", color: "#fff" };
    const { container } = wrapper(() => (
      <TimelineBar data={[bar]} bandHeight={40} bandY="top" />
    ));
    const rect = container.querySelector<SVGRectElement>(".sui-chart__timeline-bar")!;
    // bandTop = 0; lane 0 yTop = (40 - 24)/2 = 8.
    expect(parseFloat(rect.getAttribute("y")!)).toBeCloseTo(8, 1);
  });

  it("bandHeight=30 + bandY=10 (numeric) places bars at the given pixel anchor", () => {
    const bar: TimelineBarDatum = { id: slotId("a"), start: 0, end: 2, lane: "x", color: "#fff" };
    const { container } = wrapper(() => (
      <TimelineBar data={[bar]} bandHeight={30} bandY={10} />
    ));
    const rect = container.querySelector<SVGRectElement>(".sui-chart__timeline-bar")!;
    // bandTop = 10; lane 0 yTop = 10 + (30 - 18)/2 = 16.
    expect(parseFloat(rect.getAttribute("y")!)).toBeCloseTo(16, 1);
  });

  it("bandY='margin-bottom' renders bars below innerHeight (in bottom margin)", () => {
    const bars: TimelineBarDatum[] = [
      { id: slotId("a"), start: 1, end: 3, lane: "x", color: "#fff" },
    ];
    const { container } = wrapper(() => (
      <TimelineBar data={bars} bandHeight={20} bandY="margin-bottom" />
    ));
    const rect = container.querySelector(".sui-chart__timeline-bar") as SVGRectElement;
    const y = parseFloat(rect.getAttribute("y")!);
    // innerHeight = 84; bandTop = 84 + 0 = 84 (flush with axis line);
    // lane 0 yTop = 84 + (20 - 12)/2 = 88.
    // Strip sits BELOW the inner plot area (y > INNER_HEIGHT).
    expect(y).toBeGreaterThan(INNER_HEIGHT);
    expect(y).toBeCloseTo(88, 1);
  });

  it("bandY='margin-bottom' uses axisStripClipPathUrl (clips horizontally to plot, vertically to margin)", () => {
    const bars: TimelineBarDatum[] = [
      { id: slotId("a"), start: 1, end: 3, lane: "x", color: "#fff" },
    ];
    const { container } = wrapper(() => (
      <TimelineBar data={bars} bandHeight={12} bandY="margin-bottom" />
    ));
    const g = container.querySelector(".sui-chart__timeline");
    const clipAttr = g?.getAttribute("clip-path");
    expect(clipAttr).toBeTruthy();
    expect(clipAttr).toMatch(/^url\(#/);
    // Distinct id namespace from the plot-area clip.
    expect(clipAttr).toMatch(/^url\(#sui-chart-axis-strip-clip-/);
  });
});
