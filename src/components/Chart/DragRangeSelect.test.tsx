import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import type { Component } from "solid-js";
import { Chart } from "./Chart";
import { DragRangeSelect } from "./DragRangeSelect";
import { CommitOnReleaseDragRangeSelect } from "./DragRangeSelect.variants";
import { useChart } from "./context";

describe("DragRangeSelect — render", () => {
  it("renders no band when drag.range is null", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <DragRangeSelect onRange={() => {}} />
      </Chart>
    ));
    expect(container.querySelector(".sui-chart__drag-range")).toBeNull();
  });

  it("renders a band reflecting context.drag.range", () => {
    let setDrag: ((r: { start: number; end: number } | null) => void) | null =
      null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.drag.setRange;
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
  it("band width updates when drag.range.end moves", () => {
    let setDrag: ((r: { start: number; end: number } | null) => void) | null =
      null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.drag.setRange;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <DragRangeSelect onRange={() => {}} />
      </Chart>
    ));
    setDrag!({ start: 2, end: 4 });
    const w1 = parseFloat(
      container.querySelector(".sui-chart__drag-range")!.getAttribute("width")!,
    );
    setDrag!({ start: 2, end: 8 });
    const w2 = parseFloat(
      container.querySelector(".sui-chart__drag-range")!.getAttribute("width")!,
    );
    expect(w2).toBeGreaterThan(w1);
  });
});

describe("DragRangeSelect — callbacks", () => {
  it("onRange fires only when minPixelDelta is exceeded (commit semantics)", () => {
    let setCommit: ((r: { start: number; end: number } | null) => void) | null =
      null;
    const Probe: Component = () => {
      const ctx = useChart();
      setCommit = ctx.drag.setCommitted;
      return null;
    };
    const calls: Array<[number, number]> = [];
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 100]} yDomain={[0, 100]}>
        <Probe />
        <DragRangeSelect
          minPixelDelta={10}
          onRange={(a, b) => calls.push([a, b])}
        />
      </Chart>
    ));
    // A commit below the pixel threshold does NOT fire onRange.
    setCommit!({ start: 10, end: 12 });
    expect(calls.length).toBe(0);
    // A commit above the threshold fires once.
    setCommit!({ start: 10, end: 30 });
    expect(calls).toEqual([[10, 30]]);
  });

  it("onRange does NOT fire during live drag; only when drag.committed is set", () => {
    let setDrag: ((r: { start: number; end: number } | null) => void) | null =
      null;
    let setCommit: ((r: { start: number; end: number } | null) => void) | null =
      null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.drag.setRange;
      setCommit = ctx.drag.setCommitted;
      return null;
    };
    const calls: Array<[number, number]> = [];
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 100]} yDomain={[0, 100]}>
        <Probe />
        <DragRangeSelect
          minPixelDelta={5}
          onRange={(a, b) => calls.push([a, b])}
        />
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

  it("onRangePreview fires for every drag.range update", () => {
    let setDrag: ((r: { start: number; end: number } | null) => void) | null =
      null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.drag.setRange;
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
    let setDrag: ((r: { start: number; end: number } | null) => void) | null =
      null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.drag.setRange;
      return null;
    };
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <Probe />
        <DragRangeSelect onRange={() => {}} />
      </Chart>
    ));
    setDrag!({ start: 2, end: 5 });
    const band = container.querySelector(
      ".sui-chart__drag-range",
    ) as SVGRectElement;
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
  it("CommitOnReleaseDragRangeSelect suppresses onRange that the default DragRangeSelect would fire", () => {
    // Locks variant differentiation: a commit whose pixel span exceeds the
    // default minPixelDelta (5) but is BELOW CommitOnRelease's (15) must
    // fire under the default and stay silent under CommitOnRelease. If
    // anyone later swaps the baked threshold this test catches it.
    let setCommitDefault:
      | ((r: { start: number; end: number } | null) => void)
      | null = null;
    let setCommitCommit:
      | ((r: { start: number; end: number } | null) => void)
      | null = null;
    const ProbeDefault: Component = () => {
      const ctx = useChart();
      setCommitDefault = ctx.drag.setCommitted;
      return null;
    };
    const ProbeCommit: Component = () => {
      const ctx = useChart();
      setCommitCommit = ctx.drag.setCommitted;
      return null;
    };
    const defaultCalls: Array<[number, number]> = [];
    const commitCalls: Array<[number, number]> = [];
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 100]} yDomain={[0, 100]}>
        <ProbeDefault />
        <DragRangeSelect onRange={(a, b) => defaultCalls.push([a, b])} />
      </Chart>
    ));
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 100]} yDomain={[0, 100]}>
        <ProbeCommit />
        <CommitOnReleaseDragRangeSelect
          onRange={(a, b) => commitCalls.push([a, b])}
        />
      </Chart>
    ));
    // xDomain=[0,100], width=200 → 2px per data-unit. A 10→16 commit = 12px.
    // > default minPixelDelta (5) → fires.
    // < CommitOnRelease minPixelDelta (15) → silent.
    setCommitDefault!({ start: 10, end: 16 });
    setCommitCommit!({ start: 10, end: 16 });
    expect(defaultCalls).toEqual([[10, 16]]);
    expect(commitCalls).toEqual([]);
  });

  it("CommitOnReleaseDragRangeSelect uses lower opacity", () => {
    let setDrag: ((r: { start: number; end: number } | null) => void) | null =
      null;
    const Probe: Component = () => {
      const ctx = useChart();
      setDrag = ctx.drag.setRange;
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
      container
        .querySelector(".sui-chart__drag-range")!
        .getAttribute("fill-opacity")!,
    );
    expect(opacity).toBeCloseTo(0.12, 2);
  });
});
