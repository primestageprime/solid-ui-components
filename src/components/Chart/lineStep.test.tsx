import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "./Chart";
import { LineSeries } from "./Series";

const pts = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 0 },
];

const pathOf = (curve?: "linear" | "step"): string => {
  const { container } = render(() => (
    <Chart width={100} height={60} xDomain={[0, 2]} yDomain={[0, 1]}>
      <LineSeries data={pts} x={(p) => p.x} y={(p) => p.y} curve={curve} />
    </Chart>
  ));
  return container.querySelector("path.sui-chart__line")!.getAttribute("d")!;
};

const commands = (d: string): [number, number][] =>
  [...d.matchAll(/[ML]([\d.]+),([\d.]+)/g)].map((m) => [+m[1]!, +m[2]!]);

describe("LineSeries curve", () => {
  it("draws a straight segment between points by default", () => {
    expect(commands(pathOf())).toHaveLength(3);
  });

  it("step holds each y until the next x and turns there", () => {
    const c = commands(pathOf("step"));
    expect(c).toHaveLength(5);
    // M(x0,y0) L(x1,y0) L(x1,y1) L(x2,y1) L(x2,y2): every segment is
    // horizontal or vertical, never sloped.
    for (let i = 1; i < c.length; i++) {
      const [ax, ay] = c[i - 1]!;
      const [bx, by] = c[i]!;
      expect(ax === bx || ay === by).toBe(true);
    }
    expect(c[1]).toEqual([c[2]![0], c[0]![1]]);
  });

  it("step draws the same pixels as linear when nothing changes", () => {
    const { container } = render(() => (
      <Chart width={100} height={60} xDomain={[0, 2]} yDomain={[0, 1]}>
        <LineSeries data={[{ x: 0, y: 1 }, { x: 2, y: 1 }]} x={(p) => p.x} y={(p) => p.y} curve="step" />
      </Chart>
    ));
    const d = container.querySelector("path.sui-chart__line")!.getAttribute("d")!;
    expect(commands(d)).toHaveLength(2);
  });
});
