import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { Chart } from "../Chart";

import { AlarmOverlay } from "./AlarmOverlay";
import {
  detectRanges,
  padRanges,
  findHotZones,
  subtractZones,
  clampRanges,
  type Pt,
} from "./alarm";

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

// AlarmOverlay is a Composite whose job is WIRING: read the domain off the
// chart, run each series through the alarm.ts pipeline, and emit defs + bands
// + zones in the right paint order with per-series lanes. The pipeline itself
// is alarm.ts's and has its own tests, so the expectations here are computed
// with the same helpers rather than hardcoded — a change to the detection rule
// updates in one place.

/** A series that alarms across x ∈ [20, 40]. */
const alarming = (): Pt[] =>
  Array.from({ length: 101 }, (_, x) => ({
    x,
    y: x >= 20 && x <= 40 ? 90 : 10,
  }));

/** Three short bursts that OVERLAP once padded — the input hot-zone detection
 *  actually needs. `findHotZones` counts CONCURRENT ranges (`active >
 *  threshold`), so one contiguous alarm can never form a zone no matter how
 *  long it is or how low the threshold goes. With padFraction 0.1 over a
 *  100-wide domain each range widens by 10, so [10,14] [18,22] [26,30] become
 *  [0,24] [8,32] [16,40] and overlap three deep. */
const bursty = (): Pt[] =>
  Array.from({ length: 101 }, (_, x) => ({
    x,
    y:
      (x >= 10 && x <= 14) || (x >= 18 && x <= 22) || (x >= 26 && x <= 30)
        ? 90
        : 10,
  }));

/** A series that never crosses the threshold. */
const quiet = (): Pt[] => Array.from({ length: 101 }, (_, x) => ({ x, y: 10 }));

const bands = (c: HTMLElement) => [...c.querySelectorAll(".sui-alarm-band")];
const zoneGroups = (c: HTMLElement) => [
  ...c.querySelectorAll(".sui-alarm-zone"),
];

describe("AlarmOverlay — composition", () => {
  it("emits the stripe defs the hot zones depend on", () => {
    const { container } = renderInChart(() => (
      <AlarmOverlay series={[{ data: alarming(), threshold: 60 }]} />
    ));
    expect(container.querySelector("pattern")?.getAttribute("id")).toBe(
      "alarm-stripe",
    );
  });

  // The overlay's own comment says SVG paints in document order and bands must
  // come FIRST so the striped blocks sit on top. Reversing them is invisible
  // until a band and a zone overlap, then the band hides the stripe.
  it("emits the defs, then the bands, then the hot zones, in paint order", () => {
    const { container } = renderInChart(() => (
      <AlarmOverlay
        series={[{ data: bursty(), threshold: 60 }]}
        depthThreshold={1}
        padFraction={0.1}
      />
    ));
    const marks = [
      ...container.querySelectorAll(
        "pattern, .sui-alarm-band, .sui-alarm-zone",
      ),
    ].map((el) =>
      el.tagName.toLowerCase() === "pattern"
        ? "defs"
        : el.classList.contains("sui-alarm-band")
          ? "band"
          : "zone",
    );
    expect(marks[0]).toBe("defs");
    expect(marks.lastIndexOf("band")).toBeLessThan(marks.indexOf("zone"));
  });

  it("threads a custom pattern id through both the defs and the zones", () => {
    const { container } = renderInChart(() => (
      <AlarmOverlay
        series={[{ data: bursty(), threshold: 60 }]}
        depthThreshold={1}
        padFraction={0.1}
        patternId="overlay-b"
      />
    ));
    expect(container.querySelector("pattern")?.getAttribute("id")).toBe(
      "overlay-b",
    );
    expect(
      zoneGroups(container)[0]?.querySelector("rect")?.getAttribute("fill"),
    ).toBe("url(#overlay-b)");
  });
});

describe("AlarmOverlay — the pipeline it drives", () => {
  it("renders a band over the alarming span and nothing for a quiet series", () => {
    const { container: hot } = renderInChart(() => (
      <AlarmOverlay series={[{ data: alarming(), threshold: 60 }]} />
    ));
    const { container: cold } = renderInChart(() => (
      <AlarmOverlay series={[{ data: quiet(), threshold: 60 }]} />
    ));
    expect(bands(hot).length).toBeGreaterThan(0);
    expect(bands(cold)).toHaveLength(0);
    expect(zoneGroups(cold)).toHaveLength(0);
  });

  // Recomputed with the real helpers rather than hardcoded, so this asserts
  // the overlay RUNS the documented pipeline (detect → pad → findHotZones →
  // subtract → clamp) rather than some equivalent-looking subset.
  it("places bands where the documented pipeline says they belong", () => {
    const data = alarming();
    const { container } = renderInChart(() => (
      <AlarmOverlay series={[{ data, threshold: 60 }]} padFraction={0.1} />
    ));
    const padded = padRanges(detectRanges(data, 60), 0.1, 100);
    const expected = clampRanges(
      subtractZones(padded, findHotZones(padded, 5)),
      0,
      100,
    );
    expect(bands(container).map((el) => Number(el.getAttribute("x")))).toEqual(
      expected.map((r) => r.start),
    );
  });

  // padFraction widens each detected range by a fraction of the DOMAIN width,
  // which is read off the chart context — not off the data.
  it("widens bands as padFraction grows", () => {
    const data = alarming();
    const width = (frac: number) => {
      const { container } = renderInChart(() => (
        <AlarmOverlay series={[{ data, threshold: 60 }]} padFraction={frac} />
      ));
      return Number(bands(container)[0].getAttribute("width"));
    };
    expect(width(0.1)).toBeGreaterThan(width(0));
  });

  // depthThreshold is the count at which a cluster collapses to a striped
  // block. Set it to 1 and any overlap becomes a zone; leave it high and the
  // same data stays as plain bands.
  it("collapses clusters into striped zones only past depthThreshold", () => {
    const data = bursty();
    const { container: low } = renderInChart(() => (
      <AlarmOverlay
        series={[{ data, threshold: 60 }]}
        padFraction={0.1}
        depthThreshold={1}
      />
    ));
    const { container: high } = renderInChart(() => (
      <AlarmOverlay
        series={[{ data, threshold: 60 }]}
        padFraction={0.1}
        depthThreshold={999}
      />
    ));
    expect(zoneGroups(low).length).toBeGreaterThan(0);
    expect(zoneGroups(high)).toHaveLength(0);
  });
});

describe("AlarmOverlay — per-series lanes", () => {
  // One lane per series, assigned by index, so two alarm channels stair-step
  // instead of stacking and darkening on overlap. With two series over a
  // 100px plot each band is 50 tall, the first at y=0 and the second at y=50.
  it("gives each series its own lane, sized to the series count", () => {
    const { container } = renderInChart(
      () => (
        <AlarmOverlay
          series={[
            { data: alarming(), threshold: 60 },
            { data: alarming(), threshold: 60 },
          ]}
        />
      ),
      { innerHeight: 100 },
    );
    const ys = bands(container).map((el) => Number(el.getAttribute("y")));
    const hs = bands(container).map((el) => Number(el.getAttribute("height")));
    expect(new Set(hs)).toEqual(new Set([50]));
    expect(new Set(ys)).toEqual(new Set([0, 50]));
  });

  it("uses the full height for a single series", () => {
    const { container } = renderInChart(
      () => <AlarmOverlay series={[{ data: alarming(), threshold: 60 }]} />,
      { innerHeight: 100 },
    );
    expect(Number(bands(container)[0].getAttribute("height"))).toBe(100);
  });

  // Hot-zone detection is documented as PER SERIES — two dense channels get
  // their own blocks in their own lanes rather than merging into one.
  it("detects hot zones per series rather than across the merged set", () => {
    const { container } = renderInChart(
      () => (
        <AlarmOverlay
          series={[
            { data: bursty(), threshold: 60 },
            { data: bursty(), threshold: 60 },
          ]}
          padFraction={0.1}
          depthThreshold={1}
        />
      ),
      { innerHeight: 100 },
    );
    const ys = zoneGroups(container).map((g) =>
      Number(g.querySelector("rect")?.getAttribute("y")),
    );
    expect(new Set(ys)).toEqual(new Set([0, 50]));
  });

  it("renders nothing at all for an empty series list", () => {
    const { container } = renderInChart(() => <AlarmOverlay series={[]} />);
    expect(bands(container)).toHaveLength(0);
    expect(zoneGroups(container)).toHaveLength(0);
    // The defs still render — harmless, and cheaper than conditionalising.
    expect(container.querySelector("pattern")).not.toBeNull();
  });
});
