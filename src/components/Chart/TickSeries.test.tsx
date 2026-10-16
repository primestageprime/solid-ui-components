import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "./Chart";
import { TickSeries, type TickSeriesProps } from "./TickSeries";

interface Hit {
  readonly x: number;
  readonly late: boolean;
}

const hits: readonly Hit[] = [
  { x: 10, late: false },
  { x: 60, late: true },
];

// The plot is 200px wide over a domain of 100; y = 0 sits at 40px.
const mount = (extra: Partial<TickSeriesProps<Hit>> = {}) =>
  render(() => (
    <Chart width={236} height={100} xDomain={[0, 100]} yDomain={[-1, 1]} margin={{ top: 10, right: 0, bottom: 10, left: 36 }}>
      <TickSeries data={hits} x={(h) => h.x} y={() => 0} {...extra} />
    </Chart>
  ));

const lines = (c: HTMLElement) => [...c.querySelectorAll<SVGLineElement>(".sui-chart__tick")];
const n = (l: Element, a: string) => Number(l.getAttribute(a));

describe("TickSeries", () => {
  it("draws one vertical tick per point, centred on it, 20px by default", () => {
    const ls = lines(mount().container);
    expect(ls.map((l) => [n(l, "x1"), n(l, "x2"), n(l, "y1"), n(l, "y2")])).toEqual([
      [20, 20, 30, 50],
      [120, 120, 30, 50],
    ]);
    expect(ls[0]!.getAttribute("stroke-width")).toBe("2.5");
  });

  it("takes a length, a width and a stroke per datum", () => {
    const ls = lines(
      mount({ length: 10, strokeWidth: 1, stroke: (h) => (h.late ? "red" : "green") }).container,
    );
    expect([n(ls[0]!, "y1"), n(ls[0]!, "y2")]).toEqual([35, 45]);
    expect(ls[0]!.getAttribute("stroke-width")).toBe("1");
    expect(ls.map((l) => l.style.stroke)).toEqual(["green", "red"]);
  });

  it("leaves the stroke to the stylesheet when none is given", () => {
    expect(lines(mount().container)[0]!.getAttribute("style")).toBeNull();
  });

  it("titles each tick", () => {
    const c = mount({ title: (h) => `day ${h.x}` }).container;
    expect([...c.querySelectorAll(".sui-chart__tick title")].map((t) => t.textContent)).toEqual(["day 10", "day 60"]);
  });
});
