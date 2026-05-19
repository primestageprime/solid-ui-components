import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import type { JSX } from "solid-js";
import { Chart } from "./Chart";
import { HighlightSegments, type HighlightSegment } from "./HighlightSegments";
import { AccentHighlightSegments } from "./HighlightSegments.variants";
import { slotId, type Id } from "./slot-types";

const wrapper = (slot: () => JSX.Element) =>
  render(() => (
    <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
      {slot()}
    </Chart>
  ));

describe("HighlightSegments — render", () => {
  it("renders one rect per segment", () => {
    const segs: HighlightSegment[] = [
      { id: slotId("a"), start: 1, end: 3, color: "var(--sui-accent)" },
      { id: slotId("b"), start: 5, end: 8, color: "var(--sui-warning)" },
    ];
    const { container } = wrapper(() => <HighlightSegments data={segs} />);
    expect(container.querySelectorAll(".sui-chart__highlight-segment").length).toBe(2);
  });
});

describe("HighlightSegments — reactivity", () => {
  it("appending a segment adds a new rect", async () => {
    const [segs, setSegs] = createSignal<HighlightSegment[]>([
      { id: slotId("a"), start: 1, end: 3, color: "#fff" },
    ]);
    const { container } = wrapper(() => <HighlightSegments data={segs()} />);
    expect(container.querySelectorAll(".sui-chart__highlight-segment").length).toBe(1);
    setSegs([...segs(), { id: slotId("b"), start: 4, end: 6, color: "#fff" }]);
    expect(container.querySelectorAll(".sui-chart__highlight-segment").length).toBe(2);
  });

  it("toggling selectedIds flips data-selected attribute", () => {
    const [sel, setSel] = createSignal<ReadonlySet<Id>>(new Set());
    const segs: HighlightSegment[] = [{ id: slotId("a"), start: 1, end: 3, color: "#fff" }];
    const { container } = wrapper(() => (
      <HighlightSegments data={segs} selectedIds={sel()} />
    ));
    let rect = container.querySelector(".sui-chart__highlight-segment")!;
    expect(rect.getAttribute("data-selected")).toBeNull();
    setSel(new Set([slotId("a")]));
    rect = container.querySelector(".sui-chart__highlight-segment")!;
    expect(rect.getAttribute("data-selected")).toBe("true");
  });
});

describe("HighlightSegments — callbacks", () => {
  it("onClick fires with domain item + event", () => {
    const seg: HighlightSegment = { id: slotId("a"), start: 1, end: 3, color: "#fff" };
    const calls: HighlightSegment[] = [];
    const { container } = wrapper(() => (
      <HighlightSegments data={[seg]} onClick={(s) => calls.push(s)} />
    ));
    fireEvent.pointerDown(container.querySelector(".sui-chart__highlight-segment")!);
    expect(calls).toEqual([seg]);
  });

  it("onHover receives null on pointer-leave", () => {
    const seg: HighlightSegment = { id: slotId("a"), start: 1, end: 3, color: "#fff" };
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
    const seg: HighlightSegment = { id: slotId("a"), start: 1, end: 3, color: "#fff" };
    const { container } = wrapper(() => <HighlightSegments data={[seg]} />);
    const group = container.querySelector(".sui-chart__highlight-segments");
    expect(group).toBeTruthy();
    expect(group!.getAttribute("clip-path")).toMatch(/^url\(#sui-chart-clip-/);
  });
});

describe("HighlightSegments — lanes", () => {
  it("renders full-height when lanes is omitted", () => {
    const segs: HighlightSegment[] = [
      { id: slotId("a"), start: 1, end: 3, color: "#fff" },
    ];
    const { container } = wrapper(() => <HighlightSegments data={segs} />);
    const rect = container.querySelector(".sui-chart__highlight-segment")!;
    expect(rect.getAttribute("y")).toBe("0");
    expect(parseFloat(rect.getAttribute("height")!)).toBeGreaterThan(40);
  });

  it("lanes prop stacks segments vertically by lane", () => {
    const segs: HighlightSegment[] = [
      { id: slotId("a"), start: 1, end: 3, color: "#fff", lane: "topAlarm" },
      { id: slotId("b"), start: 5, end: 7, color: "#fff", lane: "bottomAlarm" },
    ];
    const { container } = wrapper(() => (
      <HighlightSegments data={segs} lanes={["topAlarm", "bottomAlarm"]} />
    ));
    const rects = Array.from(
      container.querySelectorAll<SVGRectElement>(".sui-chart__highlight-segment"),
    );
    expect(rects.length).toBe(2);
    const [r1, r2] = rects;
    // Top lane should have lower y than bottom lane
    expect(parseFloat(r1.getAttribute("y")!)).toBeLessThan(
      parseFloat(r2.getAttribute("y")!),
    );
    // Heights should be roughly equal (each lane = innerHeight / 2)
    expect(parseFloat(r1.getAttribute("height")!)).toBeCloseTo(
      parseFloat(r2.getAttribute("height")!),
      1,
    );
  });

  it("skips segments with unknown lane (warns once)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const segs: HighlightSegment[] = [
      { id: slotId("a"), start: 1, end: 3, color: "#fff", lane: "ghost" },
    ];
    const { container } = wrapper(() => (
      <HighlightSegments data={segs} lanes={["other"]} />
    ));
    expect(container.querySelectorAll(".sui-chart__highlight-segment").length).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("HighlightSegments — selected opacity", () => {
  it("applies SELECTED_OPACITY_MULTIPLIER to selected segments", () => {
    // Base fillOpacity 0.2 × multiplier 2.5 → 0.5 on the selected rect.
    const segs: HighlightSegment[] = [{ id: slotId("a"), start: 1, end: 3, color: "#fff" }];
    const { container } = wrapper(() => (
      <HighlightSegments data={segs} fillOpacity={0.2} selectedIds={new Set([slotId("a")])} />
    ));
    const rect = container.querySelector<SVGRectElement>(
      '.sui-chart__highlight-segment[data-selected="true"]',
    )!;
    expect(rect).toBeTruthy();
    expect(parseFloat(rect.getAttribute("opacity")!)).toBeCloseTo(0.5, 5);
  });
});

describe("HighlightSegments — emphasizedIds", () => {
  it("emphasizedIds applies data-emphasized to matching segments", () => {
    const segs: HighlightSegment[] = [
      { id: slotId("a"), start: 1, end: 3, color: "#fff" },
      { id: slotId("b"), start: 5, end: 7, color: "#fff" },
    ];
    const { container } = wrapper(() => (
      <HighlightSegments data={segs} emphasizedIds={new Set([slotId("a")])} />
    ));
    const rects = container.querySelectorAll<SVGRectElement>(".sui-chart__highlight-segment");
    expect(rects[0]?.getAttribute("data-emphasized")).toBe("true");
    expect(rects[1]?.getAttribute("data-emphasized")).toBeNull();
  });

  it("emphasizedIds is independent of selectedIds (both can apply)", () => {
    const segs: HighlightSegment[] = [{ id: slotId("a"), start: 1, end: 3, color: "#fff" }];
    const { container } = wrapper(() => (
      <HighlightSegments
        data={segs}
        selectedIds={new Set([slotId("a")])}
        emphasizedIds={new Set([slotId("a")])}
      />
    ));
    const rect = container.querySelector<SVGRectElement>(".sui-chart__highlight-segment");
    expect(rect?.getAttribute("data-selected")).toBe("true");
    expect(rect?.getAttribute("data-emphasized")).toBe("true");
  });
});

describe("HighlightSegments — curried variants", () => {
  it("AccentHighlightSegments bakes fillOpacity 0.22", () => {
    const seg: HighlightSegment = { id: slotId("a"), start: 1, end: 3, color: "#fff" };
    const { container } = wrapper(() => <AccentHighlightSegments data={[seg]} />);
    const rect = container.querySelector(".sui-chart__highlight-segment")!;
    expect(parseFloat(rect.getAttribute("opacity")!)).toBeCloseTo(0.22, 2);
  });
});
