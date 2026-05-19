import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { type Component } from "solid-js";
import { Chart } from "./Chart";
import { DragRangeSelect } from "./DragRangeSelect";
import { CommitOnReleaseDragRangeSelect } from "./DragRangeSelect.variants";
import { useChart } from "./context";

describe("DragRangeSelect — render", () => {
  it("renders no band when dragRange is null", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <DragRangeSelect onRange={() => {}} />
      </Chart>
    ));
    expect(container.querySelector(".sui-chart__drag-range")).toBeNull();
  });

  it("renders a band reflecting context.dragRange", () => {
    let setDrag: ((r: { start: number; end: number } | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.setDragRange;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <DragRangeSelect onRange={() => {}} />
      </Chart>
    ));
    setDrag!({ start: 2, end: 5 });
    expect(container.querySelector(".sui-chart__drag-range")).toBeTruthy();
  });
});

describe("DragRangeSelect — reactivity", () => {
  it("band width updates when dragRange.end moves", () => {
    let setDrag: ((r: { start: number; end: number } | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.setDragRange;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <DragRangeSelect onRange={() => {}} />
      </Chart>
    ));
    setDrag!({ start: 2, end: 4 });
    const w1 = parseFloat(container.querySelector(".sui-chart__drag-range")!.getAttribute("width")!);
    setDrag!({ start: 2, end: 8 });
    const w2 = parseFloat(container.querySelector(".sui-chart__drag-range")!.getAttribute("width")!);
    expect(w2).toBeGreaterThan(w1);
  });
});

describe("DragRangeSelect — callbacks", () => {
  it("onRange fires only when minPixelDelta is exceeded (commit semantics)", () => {
    let setCommit:
      | ((r: { start: number; end: number } | null) => void)
      | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setCommit = ctx.setCommittedDragRange;
      return null;
    };
    const calls: Array<[number, number]> = [];
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 100]} yDomain={[0, 100]}>
        <Probe />
        <DragRangeSelect minPixelDelta={10} onRange={(a, b) => calls.push([a, b])} />
      </Chart>
    ));
    // A commit below the pixel threshold does NOT fire onRange.
    setCommit!({ start: 10, end: 12 });
    expect(calls.length).toBe(0);
    // A commit above the threshold fires once.
    setCommit!({ start: 10, end: 30 });
    expect(calls).toEqual([[10, 30]]);
  });

  it("onRange does NOT fire during live drag; only when committedDragRange is set", () => {
    let setDrag:
      | ((r: { start: number; end: number } | null) => void)
      | null = null;
    let setCommit:
      | ((r: { start: number; end: number } | null) => void)
      | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.setDragRange;
      setCommit = ctx.setCommittedDragRange;
      return null;
    };
    const calls: Array<[number, number]> = [];
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 100]} yDomain={[0, 100]}>
        <Probe />
        <DragRangeSelect minPixelDelta={5} onRange={(a, b) => calls.push([a, b])} />
      </Chart>
    ));
    // Simulating live pointer-move updates — onRange must stay silent.
    setDrag!({ start: 10, end: 30 });
    setDrag!({ start: 10, end: 40 });
    setDrag!({ start: 10, end: 50 });
    expect(calls.length).toBe(0);
    // Pointerup triggers the commit; onRange fires exactly once.
    setCommit!({ start: 10, end: 50 });
    expect(calls).toEqual([[10, 50]]);
  });

  it("onRangePreview fires for every dragRange update", () => {
    let setDrag: ((r: { start: number; end: number } | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.setDragRange;
      return null;
    };
    const previews: Array<[number, number]> = [];
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 100]} yDomain={[0, 100]}>
        <Probe />
        <DragRangeSelect onRangePreview={(a, b) => previews.push([a, b])} />
      </Chart>
    ));
    setDrag!({ start: 1, end: 2 });
    setDrag!({ start: 1, end: 5 });
    setDrag!({ start: 1, end: 9 });
    expect(previews.length).toBe(3);
  });
});

describe("DragRangeSelect — spec D3 invariant", () => {
  it("rendered band attaches NO pointer listeners (per spec D3)", () => {
    let setDrag: ((r: { start: number; end: number } | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.setDragRange;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <DragRangeSelect onRange={() => {}} />
      </Chart>
    ));
    setDrag!({ start: 2, end: 5 });
    const band = container.querySelector(".sui-chart__drag-range") as SVGRectElement;
    // Solid renders onPointer* as `pointer-events` listeners on the element via the DOM API,
    // not as HTML attributes — so check pointer-events="none" is honored AND that no
    // attribute looks like a pointer handler.
    expect(band.getAttribute("pointer-events")).toBe("none");
    // Spot-check inline attrs:
    const attrs = Array.from(band.attributes).map((a) => a.name);
    expect(attrs.some((n) => /^onpointer/i.test(n))).toBe(false);
  });
});

describe("DragRangeSelect — curried variants", () => {
  it("CommitOnReleaseDragRangeSelect uses lower opacity", () => {
    let setDrag: ((r: { start: number; end: number } | null) => void) | null = null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.setDragRange;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <CommitOnReleaseDragRangeSelect onRange={() => {}} />
      </Chart>
    ));
    setDrag!({ start: 2, end: 5 });
    const opacity = parseFloat(
      container.querySelector(".sui-chart__drag-range")!.getAttribute("fill-opacity")!,
    );
    expect(opacity).toBeCloseTo(0.12, 2);
  });
});
