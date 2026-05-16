import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal, type JSX } from "solid-js";
import { Chart } from "./Chart";
import { TimelineBar, type TimelineBarDatum } from "./TimelineBar";
import { DenseTimelineBar } from "./TimelineBar.variants";
import type { Id } from "./slot-types";

const wrapper = (slot: () => JSX.Element) =>
  render(() => (
    <Chart width={400} height={120} xDomain={[0, 10]} yDomain={[0, 100]}>
      {slot()}
    </Chart>
  ));

describe("TimelineBar — render", () => {
  it("renders one rect per datum", () => {
    const bars: TimelineBarDatum[] = [
      { id: "a", start: 0, end: 2, lane: "scheduled", color: "var(--sui-accent)" },
      { id: "b", start: 3, end: 5, lane: "detected", color: "var(--sui-warning)" },
    ];
    const { container } = wrapper(() => <TimelineBar data={bars} />);
    expect(container.querySelectorAll(".sui-chart__timeline-bar").length).toBe(2);
  });

  it("places each lane at a distinct y position", () => {
    const bars: TimelineBarDatum[] = [
      { id: "a", start: 0, end: 2, lane: "scheduled", color: "#fff" },
      { id: "b", start: 0, end: 2, lane: "detected", color: "#fff" },
    ];
    const { container } = wrapper(() => <TimelineBar data={bars} lanes={["scheduled", "detected"]} />);
    const rects = Array.from(container.querySelectorAll<SVGRectElement>(".sui-chart__timeline-bar"));
    expect(rects[0].getAttribute("y")).not.toBe(rects[1].getAttribute("y"));
  });
});

describe("TimelineBar — reactivity", () => {
  it("toggling selectedId updates data-selected", () => {
    const [sel, setSel] = createSignal<Id | null>(null);
    const bar: TimelineBarDatum = { id: "a", start: 1, end: 3, lane: "x", color: "#fff" };
    const { container } = wrapper(() => <TimelineBar data={[bar]} selectedId={sel()} />);
    expect(container.querySelector(".sui-chart__timeline-bar")!.getAttribute("data-selected")).toBeNull();
    setSel("a");
    expect(container.querySelector(".sui-chart__timeline-bar")!.getAttribute("data-selected")).toBe("true");
  });
});

describe("TimelineBar — callbacks", () => {
  it("onBarClick fires with domain item + event", () => {
    const bar: TimelineBarDatum = { id: "a", start: 1, end: 3, lane: "x", color: "#fff" };
    const calls: TimelineBarDatum[] = [];
    const { container } = wrapper(() => (
      <TimelineBar data={[bar]} onBarClick={(b) => calls.push(b)} />
    ));
    fireEvent.pointerDown(container.querySelector(".sui-chart__timeline-bar")!);
    expect(calls).toEqual([bar]);
  });
});

describe("TimelineBar — curried variants", () => {
  it("DenseTimelineBar renders bars at 90% lane height", () => {
    const bar: TimelineBarDatum = { id: "a", start: 1, end: 3, lane: "x", color: "#fff" };
    const { container } = wrapper(() => <DenseTimelineBar data={[bar]} />);
    const rect = container.querySelector(".sui-chart__timeline-bar") as SVGRectElement;
    expect(parseFloat(rect.getAttribute("height")!)).toBeGreaterThan(60);
  });
});
