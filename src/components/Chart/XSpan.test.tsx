import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Chart } from "./Chart";
import { XSpan, type XSpanProps } from "./XSpan";

// The plot is 200px wide over a domain of 100, and 80px tall.
const mount = (props: XSpanProps) =>
  render(() => (
    <Chart width={236} height={100} xDomain={[0, 100]} yDomain={[-1, 1]} margin={{ top: 10, right: 0, bottom: 10, left: 36 }}>
      <XSpan {...props} />
    </Chart>
  ));

const rectOf = (c: HTMLElement) => c.querySelector<SVGRectElement>(".sui-chart__x-span rect")!;
const n = (r: Element, a: string) => Number(r.getAttribute(a));

describe("XSpan", () => {
  it("covers the window on x and the full plot height", () => {
    const r = rectOf(mount({ from: 20, to: 50 }).container);
    expect([n(r, "x"), n(r, "y"), n(r, "width"), n(r, "height")]).toEqual([40, 0, 60, 80]);
  });

  it("clamps to the plot and accepts the ends in either order", () => {
    const r = rectOf(mount({ from: 150, to: 90 }).container);
    expect([n(r, "x"), n(r, "width")]).toEqual([180, 20]);
  });

  it("takes no pointer events", () => {
    const g = mount({ from: 0, to: 10 }).container.querySelector(".sui-chart__x-span")!;
    expect(g.getAttribute("pointer-events")).toBe("none");
  });

  it("carries its tone, default neutral, and a paint replaces it", () => {
    const toned = mount({ from: 0, to: 10, tone: "warning" }).container;
    expect(toned.querySelector(".sui-chart__x-span")!.getAttribute("data-tone")).toBe("warning");
    const neutral = mount({ from: 0, to: 10 }).container;
    expect(neutral.querySelector(".sui-chart__x-span")!.getAttribute("data-tone")).toBe("default");
    const painted = mount({ from: 0, to: 10, paint: "url(#hatch)" }).container;
    expect(painted.querySelector(".sui-chart__x-span")!.hasAttribute("data-tone")).toBe(false);
    expect(rectOf(painted).style.fill).toBe('url("#hatch")');
  });

  it("draws the label at the top centre, and none without one", () => {
    const t = mount({ from: 20, to: 50, label: "no data" }).container.querySelector(".sui-chart__x-span-label")!;
    expect(t.textContent).toBe("no data");
    expect(n(t, "x")).toBe(70);
    expect(mount({ from: 20, to: 50 }).container.querySelector(".sui-chart__x-span-label")).toBeNull();
  });
});
