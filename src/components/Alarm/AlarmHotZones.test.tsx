import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { Chart } from "../Chart";

import { AlarmHotZones } from "./AlarmHotZones";
import type { HotZone } from "./alarm";

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

const zones = (c: HTMLElement) => [
  ...c.querySelectorAll<SVGGElement>(".sui-alarm-zone"),
];
const rectIn = (g: SVGGElement) => g.querySelector("rect")!;
const textIn = (g: SVGGElement) => g.querySelector("text")!;
const box = (el: Element) => ({
  x: Number(el.getAttribute("x")),
  y: Number(el.getAttribute("y")),
  width: Number(el.getAttribute("width")),
  height: Number(el.getAttribute("height")),
});

const z = (start: number, end: number, count: number): HotZone => ({
  start,
  end,
  count,
});

describe("AlarmHotZones — placement", () => {
  it("renders one group per zone, positioned by the chart's x scale", () => {
    const { container } = renderInChart(() => (
      <AlarmHotZones zones={[z(10, 30, 4), z(60, 70, 9)]} />
    ));
    expect(zones(container)).toHaveLength(2);
    expect(box(rectIn(zones(container)[0]))).toMatchObject({
      x: 10,
      width: 20,
    });
    expect(box(rectIn(zones(container)[1]))).toMatchObject({
      x: 60,
      width: 10,
    });
  });

  it("renders nothing for an empty zone list", () => {
    const { container } = renderInChart(() => <AlarmHotZones zones={[]} />);
    expect(zones(container)).toHaveLength(0);
  });

  // Same 1px floor as AlarmBands, and for the same reason: a dense cluster
  // collapsed onto a single pixel is the case this component exists for, so
  // it must not be the case that renders invisibly.
  it("floors a degenerate zone to 1px", () => {
    const { container } = renderInChart(() => (
      <AlarmHotZones zones={[z(50, 50, 12)]} />
    ));
    expect(box(rectIn(zones(container)[0]))).toMatchObject({ x: 50, width: 1 });
  });
});

describe("AlarmHotZones — lane subdivision", () => {
  it("stair-steps lanes and sizes each to its share of the height", () => {
    const { container: top } = renderInChart(
      () => <AlarmHotZones zones={[z(0, 10, 3)]} laneIndex={0} laneCount={2} />,
      { innerHeight: 80 },
    );
    const { container: low } = renderInChart(
      () => <AlarmHotZones zones={[z(0, 10, 3)]} laneIndex={1} laneCount={2} />,
      { innerHeight: 80 },
    );
    expect(box(rectIn(zones(top)[0]))).toMatchObject({ y: 0, height: 40 });
    expect(box(rectIn(zones(low)[0]))).toMatchObject({ y: 40, height: 40 });
  });

  it("clamps an out-of-range lane index into the last lane", () => {
    const { container } = renderInChart(
      () => <AlarmHotZones zones={[z(0, 10, 3)]} laneIndex={9} laneCount={2} />,
      { innerHeight: 80 },
    );
    expect(box(rectIn(zones(container)[0]))).toMatchObject({ y: 40 });
  });

  it("treats a zero lane count as a single full-height lane", () => {
    const { container } = renderInChart(
      () => <AlarmHotZones zones={[z(0, 10, 3)]} laneCount={0} />,
      { innerHeight: 60 },
    );
    expect(box(rectIn(zones(container)[0]))).toMatchObject({
      y: 0,
      height: 60,
    });
  });
});

describe("AlarmHotZones — count badge", () => {
  it("renders the zone's count with a × prefix", () => {
    const { container } = renderInChart(() => (
      <AlarmHotZones zones={[z(10, 40, 17)]} />
    ));
    expect(textIn(zones(container)[0]).textContent).toBe("×17");
  });

  // The badge is anchored to the TOP-RIGHT INSIDE of its own lane — 6px in
  // from the right edge, 14px down from the lane top — so it stays legible on
  // a narrow block and does not drift into the lane below.
  it("anchors the badge inside the top-right of its own lane", () => {
    const { container } = renderInChart(
      () => (
        <AlarmHotZones zones={[z(20, 60, 5)]} laneIndex={1} laneCount={2} />
      ),
      { innerHeight: 100 },
    );
    const t = textIn(zones(container)[0]);
    // x = zoneX + width - 6 = 20 + 40 - 6; y = laneTop + 14 = 50 + 14.
    expect(Number(t.getAttribute("x"))).toBe(54);
    expect(Number(t.getAttribute("y"))).toBe(64);
    expect(t.getAttribute("text-anchor")).toBe("end");
  });
});

describe("AlarmHotZones — stripe pattern wiring", () => {
  // The rect's fill is a url(#…) reference that MUST match the id registered
  // by AlarmStripeDefs. A mismatch renders an unfilled rect — the block
  // silently loses its stripe while keeping its border.
  it("fills from the default stripe pattern id", () => {
    const { container } = renderInChart(() => (
      <AlarmHotZones zones={[z(0, 10, 3)]} />
    ));
    expect(rectIn(zones(container)[0]).getAttribute("fill")).toBe(
      "url(#alarm-stripe)",
    );
  });

  it("fills from a supplied pattern id so two overlays do not collide", () => {
    const { container } = renderInChart(() => (
      <AlarmHotZones zones={[z(0, 10, 3)]} patternId="alarm-stripe-b" />
    ));
    expect(rectIn(zones(container)[0]).getAttribute("fill")).toBe(
      "url(#alarm-stripe-b)",
    );
  });

  it("keeps the border themed through CSS vars", () => {
    const { container } = renderInChart(() => (
      <AlarmHotZones zones={[z(0, 10, 3)]} />
    ));
    expect(rectIn(zones(container)[0]).getAttribute("stroke")).toContain(
      "--sui-alarm-zone-stroke",
    );
  });
});
