import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal, type JSX } from "solid-js";
import { Chart } from "./Chart";
import { GhostArc, type ArcPoint } from "./GhostArc";
import { WarningGhostArc } from "./GhostArc.variants";

const wrapper = (slot: () => JSX.Element) =>
  render(() => (
    <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
      {slot()}
    </Chart>
  ));

describe("GhostArc — render", () => {
  it("renders nothing when from is null", () => {
    const { container } = wrapper(() => <GhostArc from={null} to={{ x: 5, y: 50 }} />);
    expect(container.querySelector(".sui-chart__ghost-arc")).toBeNull();
  });

  it("renders nothing when to is null", () => {
    const { container } = wrapper(() => <GhostArc from={{ x: 1, y: 10 }} to={null} />);
    expect(container.querySelector(".sui-chart__ghost-arc")).toBeNull();
  });

  it("renders a path when both endpoints are set", () => {
    const { container } = wrapper(() => (
      <GhostArc from={{ x: 1, y: 10 }} to={{ x: 9, y: 90 }} />
    ));
    const path = container.querySelector(".sui-chart__ghost-arc");
    expect(path).toBeTruthy();
    expect(path!.getAttribute("d")).toMatch(/^M\s+[\d.-]+\s+[\d.-]+\s+Q\s+[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+[\d.-]+$/);
  });

  it("accepts Date endpoints when chart has a time domain", () => {
    const t0 = new Date(2026, 0, 1);
    const t1 = new Date(2026, 0, 2);
    const tm = new Date(2026, 0, 1, 12);
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[t0, t1]} yDomain={[0, 100]}>
        <GhostArc from={{ x: tm, y: 30 }} to={{ x: t1, y: 70 }} />
      </Chart>
    ));
    expect(container.querySelector(".sui-chart__ghost-arc")).toBeTruthy();
  });

  it("has pointer-events='none' so it doesn't intercept clicks underneath", () => {
    const { container } = wrapper(() => (
      <GhostArc from={{ x: 1, y: 10 }} to={{ x: 9, y: 90 }} />
    ));
    const path = container.querySelector(".sui-chart__ghost-arc")!;
    expect(path.getAttribute("pointer-events")).toBe("none");
  });
});

describe("GhostArc — reactivity", () => {
  it("path updates when endpoints change", () => {
    const [from, setFrom] = createSignal<ArcPoint | null>({ x: 1, y: 10 });
    const { container } = wrapper(() => <GhostArc from={from()} to={{ x: 9, y: 90 }} />);
    const d1 = container.querySelector(".sui-chart__ghost-arc")!.getAttribute("d");
    setFrom({ x: 3, y: 30 });
    const d2 = container.querySelector(".sui-chart__ghost-arc")!.getAttribute("d");
    expect(d1).not.toBe(d2);
  });

  it("hides when from flips to null", () => {
    const [from, setFrom] = createSignal<ArcPoint | null>({ x: 1, y: 10 });
    const { container } = wrapper(() => <GhostArc from={from()} to={{ x: 9, y: 90 }} />);
    expect(container.querySelector(".sui-chart__ghost-arc")).toBeTruthy();
    setFrom(null);
    expect(container.querySelector(".sui-chart__ghost-arc")).toBeNull();
  });
});

describe("GhostArc — anchor mode", () => {
  it("defaults to 'data' anchor — endpoint y reflects yScale(y) and group is clipped", () => {
    const { container } = wrapper(() => (
      <GhostArc from={{ x: 1, y: 10 }} to={{ x: 9, y: 90 }} />
    ));
    const path = container.querySelector(".sui-chart__ghost-arc")!;
    const group = path.parentElement!;
    // Data mode: clip-path attribute IS set (group clipped to plot).
    expect(group.getAttribute("clip-path")).toMatch(/^url\(#/);
    // The "M ax ay" — ay should differ between two different y data values.
    const d1 = path.getAttribute("d")!;
    const { container: c2 } = wrapper(() => (
      <GhostArc from={{ x: 1, y: 90 }} to={{ x: 9, y: 90 }} />
    ));
    const d2 = c2.querySelector(".sui-chart__ghost-arc")!.getAttribute("d")!;
    expect(d1).not.toBe(d2);
  });

  it("anchors at y=0 (plot-local) when anchor='above' — endpoint y is fixed regardless of data y", () => {
    const { container } = wrapper(() => (
      <GhostArc anchor="above" from={{ x: 1, y: 10 }} to={{ x: 9, y: 90 }} />
    ));
    const path = container.querySelector(".sui-chart__ghost-arc")!;
    // Path begins with "M ax 0 ..." — both endpoints sit at y=0 in plot coords.
    expect(path.getAttribute("d")).toMatch(/^M\s+[\d.-]+\s+0\s+Q\s+[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+0$/);
  });

  it("anchor='above' produces identical path for different data-y values (y ignored)", () => {
    const { container: a } = wrapper(() => (
      <GhostArc anchor="above" from={{ x: 2, y: 10 }} to={{ x: 8, y: 90 }} />
    ));
    const { container: b } = wrapper(() => (
      <GhostArc anchor="above" from={{ x: 2, y: 50 }} to={{ x: 8, y: 50 }} />
    ));
    expect(
      a.querySelector(".sui-chart__ghost-arc")!.getAttribute("d"),
    ).toBe(b.querySelector(".sui-chart__ghost-arc")!.getAttribute("d"));
  });

  it("anchor='above' bypasses the plot clip (so apex above y=0 is visible)", () => {
    const { container } = wrapper(() => (
      <GhostArc anchor="above" from={{ x: 1, y: 10 }} to={{ x: 9, y: 90 }} />
    ));
    const group = container.querySelector(".sui-chart__ghost-arc")!.parentElement!;
    expect(group.hasAttribute("clip-path")).toBe(false);
  });

  it("anchor='above' apex sits ABOVE y=0 (negative y in plot-local coords)", () => {
    const { container } = wrapper(() => (
      <GhostArc anchor="above" from={{ x: 1, y: 0 }} to={{ x: 9, y: 0 }} />
    ));
    const d = container.querySelector(".sui-chart__ghost-arc")!.getAttribute("d")!;
    // Bezier control y (the second number after Q) should be negative.
    const match = d.match(/Q\s+[\d.-]+\s+(-?[\d.]+)/)!;
    expect(Number(match[1])).toBeLessThan(0);
  });
});

describe("GhostArc — curried variants", () => {
  it("WarningGhostArc uses warning color", () => {
    const { container } = wrapper(() => (
      <WarningGhostArc from={{ x: 1, y: 10 }} to={{ x: 9, y: 90 }} />
    ));
    expect(container.querySelector(".sui-chart__ghost-arc")!.getAttribute("stroke")).toBe("var(--sui-warning)");
  });
});
