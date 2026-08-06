import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { Chart } from "../Chart";

import { AlarmBands } from "./AlarmBands";
import type { Range } from "./alarm";

// Mounted in a REAL <Chart>, matching the eleven existing slot tests in
// src/components/Chart/. <Chart> takes width/height as plain number props and
// measures nothing, so jsdom is not a problem here — and an explicit zero
// margin makes inner == outer, so a domain value and its pixel are the same
// number and the geometry assertions read directly.
const renderInChart = (
  slot: () => JSX.Element,
  opts: {
    innerWidth?: number;
    innerHeight?: number;
    xDomain?: [number, number];
  } = {},
) =>
  render(() => (
    <Chart
      width={opts.innerWidth ?? 100}
      height={opts.innerHeight ?? 100}
      xDomain={opts.xDomain ?? [0, 100]}
      yDomain={[0, 100]}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
    >
      {slot()}
    </Chart>
  ));

// AlarmBands is a pure renderer — `alarm.ts` owns the range
// pipeline and has its own tests — so what is pinned here is the LANE MATH and
// the degenerate-range floor, neither of which lives in alarm.ts.
const bands = (c: HTMLElement) => [
  ...c.querySelectorAll<SVGRectElement>(".sui-alarm-band"),
];
const box = (el: SVGRectElement) => ({
  x: Number(el.getAttribute("x")),
  y: Number(el.getAttribute("y")),
  width: Number(el.getAttribute("width")),
  height: Number(el.getAttribute("height")),
});

const r = (start: number, end: number): Range => ({ start, end });

describe("AlarmBands — placement", () => {
  it("renders one rect per range, positioned by the chart's x scale", () => {
    const { container } = renderInChart(() => (
      <AlarmBands ranges={[r(10, 30), r(60, 80)]} />
    ));
    expect(bands(container).map(box)).toEqual([
      { x: 10, y: 0, width: 20, height: 100 },
      { x: 60, y: 0, width: 20, height: 100 },
    ]);
  });

  it("renders nothing for an empty range list", () => {
    const { container } = renderInChart(() => <AlarmBands ranges={[]} />);
    expect(bands(container)).toHaveLength(0);
  });

  it("scales placement with the chart's domain rather than assuming 1:1", () => {
    const { container } = renderInChart(
      () => <AlarmBands ranges={[r(0, 5)]} />,
      { xDomain: [0, 10], innerWidth: 200 },
    );
    // 0–5 of a 0–10 domain across 200px → x=0, width=100.
    expect(box(bands(container)[0])).toMatchObject({ x: 0, width: 100 });
  });

  // `Math.max(1, ...)` — a range whose start and end land on the same pixel
  // would otherwise render a zero-width rect, i.e. an alarm that happened but
  // is invisible. The floor is what makes an instantaneous alarm visible.
  it("floors a degenerate range to 1px rather than rendering it invisibly", () => {
    const { container } = renderInChart(() => (
      <AlarmBands ranges={[r(50, 50)]} />
    ));
    expect(box(bands(container)[0])).toMatchObject({ x: 50, width: 1 });
  });
});

describe("AlarmBands — lane subdivision", () => {
  it("fills the full height as a single lane by default", () => {
    const { container } = renderInChart(
      () => <AlarmBands ranges={[r(0, 10)]} />,
      { innerHeight: 60 },
    );
    expect(box(bands(container)[0])).toMatchObject({ y: 0, height: 60 });
  });

  it("stair-steps each lane down by its own height", () => {
    const { container: top } = renderInChart(
      () => <AlarmBands ranges={[r(0, 10)]} laneIndex={0} laneCount={3} />,
      { innerHeight: 90 },
    );
    const { container: mid } = renderInChart(
      () => <AlarmBands ranges={[r(0, 10)]} laneIndex={1} laneCount={3} />,
      { innerHeight: 90 },
    );
    const { container: low } = renderInChart(
      () => <AlarmBands ranges={[r(0, 10)]} laneIndex={2} laneCount={3} />,
      { innerHeight: 90 },
    );
    expect(box(bands(top)[0])).toMatchObject({ y: 0, height: 30 });
    expect(box(bands(mid)[0])).toMatchObject({ y: 30, height: 30 });
    expect(box(bands(low)[0])).toMatchObject({ y: 60, height: 30 });
  });

  // `Math.max(1, laneCount ?? 1)` guards the division. A zero laneCount would
  // otherwise make laneH Infinity and the rect height unrenderable.
  it("treats a zero or negative lane count as a single lane", () => {
    for (const laneCount of [0, -2]) {
      const { container } = renderInChart(
        () => <AlarmBands ranges={[r(0, 10)]} laneCount={laneCount} />,
        { innerHeight: 60 },
      );
      expect(box(bands(container)[0])).toMatchObject({ y: 0, height: 60 });
    }
  });

  // `clamp(laneIndex ?? 0, 0, lanes - 1)` — an index past the last lane must
  // land IN the last lane, not below the plot where it would be invisible.
  it("clamps an out-of-range lane index into the last lane", () => {
    const { container } = renderInChart(
      () => <AlarmBands ranges={[r(0, 10)]} laneIndex={9} laneCount={2} />,
      { innerHeight: 80 },
    );
    expect(box(bands(container)[0])).toMatchObject({ y: 40, height: 40 });
  });

  it("clamps a negative lane index into the first lane", () => {
    const { container } = renderInChart(
      () => <AlarmBands ranges={[r(0, 10)]} laneIndex={-5} laneCount={2} />,
      { innerHeight: 80 },
    );
    expect(box(bands(container)[0])).toMatchObject({ y: 0, height: 40 });
  });
});

describe("AlarmBands — theming", () => {
  // Paint goes through CSS vars with literal fallbacks so an unthemed host
  // still shows the alarm. Geometry cannot use vars (SVG geometry attributes
  // do not resolve var()), which is why only paint is tokenised here.
  it("paints via CSS vars with a literal fallback", () => {
    const { container } = renderInChart(() => (
      <AlarmBands ranges={[r(0, 10)]} />
    ));
    const rect = bands(container)[0];
    expect(rect.getAttribute("fill")).toContain("--sui-alarm-band-fill");
    expect(rect.getAttribute("fill")).toContain("#ff4040");
    expect(rect.getAttribute("fill-opacity")).toContain(
      "--sui-alarm-band-fill-opacity",
    );
  });
});
