import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import type { JSX } from "solid-js";
import { Chart } from "./Chart";
import { HighlightSegments, type HighlightSegment } from "./HighlightSegments";
import { AccentHighlightSegments } from "./HighlightSegments.variants";
import type { Id } from "./slot-types";

const wrapper = (slot: () => JSX.Element) =>
  render(() => (
    <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
      {slot()}
    </Chart>
  ));

describe("HighlightSegments — render", () => {
  it("renders one rect per segment", () => {
    const segs: HighlightSegment[] = [
      { id: "a", start: 1, end: 3, color: "var(--sui-accent)" },
      { id: "b", start: 5, end: 8, color: "var(--sui-warning)" },
    ];
    const { container } = wrapper(() => <HighlightSegments data={segs} />);
    expect(container.querySelectorAll(".sui-chart__highlight-segment").length).toBe(2);
  });
});

describe("HighlightSegments — reactivity", () => {
  it("appending a segment adds a new rect", async () => {
    const [segs, setSegs] = createSignal<HighlightSegment[]>([
      { id: "a", start: 1, end: 3, color: "#fff" },
    ]);
    const { container } = wrapper(() => <HighlightSegments data={segs()} />);
    expect(container.querySelectorAll(".sui-chart__highlight-segment").length).toBe(1);
    setSegs([...segs(), { id: "b", start: 4, end: 6, color: "#fff" }]);
    expect(container.querySelectorAll(".sui-chart__highlight-segment").length).toBe(2);
  });

  it("toggling selectedIds flips data-selected attribute", () => {
    const [sel, setSel] = createSignal<ReadonlySet<Id>>(new Set());
    const segs: HighlightSegment[] = [{ id: "a", start: 1, end: 3, color: "#fff" }];
    const { container } = wrapper(() => (
      <HighlightSegments data={segs} selectedIds={sel()} />
    ));
    let rect = container.querySelector(".sui-chart__highlight-segment")!;
    expect(rect.getAttribute("data-selected")).toBeNull();
    setSel(new Set(["a"]));
    rect = container.querySelector(".sui-chart__highlight-segment")!;
    expect(rect.getAttribute("data-selected")).toBe("true");
  });
});

describe("HighlightSegments — callbacks", () => {
  it("onClick fires with domain item + event", () => {
    const seg: HighlightSegment = { id: "a", start: 1, end: 3, color: "#fff" };
    const calls: HighlightSegment[] = [];
    const { container } = wrapper(() => (
      <HighlightSegments data={[seg]} onClick={(s) => calls.push(s)} />
    ));
    fireEvent.pointerDown(container.querySelector(".sui-chart__highlight-segment")!);
    expect(calls).toEqual([seg]);
  });

  it("onHover receives null on pointer-leave", () => {
    const seg: HighlightSegment = { id: "a", start: 1, end: 3, color: "#fff" };
    const calls: (HighlightSegment | null)[] = [];
    const { container } = wrapper(() => (
      <HighlightSegments data={[seg]} onHover={(s) => calls.push(s)} />
    ));
    const rect = container.querySelector(".sui-chart__highlight-segment")!;
    fireEvent.pointerEnter(rect);
    fireEvent.pointerLeave(rect);
    expect(calls).toEqual([seg, null]);
  });
});

describe("HighlightSegments — clip-path", () => {
  it("wraps rects in a group with clip-path set to ctx.clipPathUrl()", () => {
    const seg: HighlightSegment = { id: "a", start: 1, end: 3, color: "#fff" };
    const { container } = wrapper(() => <HighlightSegments data={[seg]} />);
    const group = container.querySelector(".sui-chart__highlight-segments");
    expect(group).toBeTruthy();
    expect(group!.getAttribute("clip-path")).toMatch(/^url\(#sui-chart-clip-/);
  });
});

describe("HighlightSegments — curried variants", () => {
  it("AccentHighlightSegments bakes fillOpacity 0.22", () => {
    const seg: HighlightSegment = { id: "a", start: 1, end: 3, color: "#fff" };
    const { container } = wrapper(() => <AccentHighlightSegments data={[seg]} />);
    const rect = container.querySelector(".sui-chart__highlight-segment")!;
    expect(parseFloat(rect.getAttribute("opacity")!)).toBeCloseTo(0.22, 2);
  });
});
