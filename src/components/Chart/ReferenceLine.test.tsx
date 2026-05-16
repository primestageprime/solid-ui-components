import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Chart, ReferenceLine } from "./index";
import type { ReferenceLineProps } from "./Series";

describe("ReferenceLine — orientation API", () => {
  it("orientation='horizontal' draws a horizontal line at the Y value", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <ReferenceLine orientation="horizontal" value={50} />
      </Chart>
    ));
    const line = container.querySelector(".sui-chart__ref line")!;
    expect(line.getAttribute("y1")).toBe(line.getAttribute("y2"));
  });

  it("orientation='vertical' draws a vertical line at the X value", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <ReferenceLine orientation="vertical" value={5} />
      </Chart>
    ));
    const line = container.querySelector(".sui-chart__ref line")!;
    expect(line.getAttribute("x1")).toBe(line.getAttribute("x2"));
  });

  it("accepts Date value when chart has a time domain", () => {
    const t0 = new Date(2026, 0, 1);
    const t1 = new Date(2026, 0, 2);
    const mid = new Date(2026, 0, 1, 12);
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[t0, t1]} yDomain={[0, 100]}>
        <ReferenceLine orientation="vertical" value={mid} />
      </Chart>
    ));
    expect(container.querySelector(".sui-chart__ref line")).toBeTruthy();
  });

  it("legacy x/y props still work (back-compat)", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <ReferenceLine x={3} />
      </Chart>
    ));
    expect(container.querySelector(".sui-chart__ref line")).toBeTruthy();
  });
});

describe("ReferenceLine — type-level enforcement", () => {
  it("rejects empty props at compile time", () => {
    // @ts-expect-error — props must include one of orientation+value, x, or y
    const _empty: ReferenceLineProps = {};
    // @ts-expect-error — orientation without value is incomplete
    const _partial: ReferenceLineProps = { orientation: "horizontal" };
    // Valid forms compile:
    const _new: ReferenceLineProps = { orientation: "horizontal", value: 50 };
    const _legacyX: ReferenceLineProps = { x: 5 };
    const _legacyY: ReferenceLineProps = { y: 50 };
    void _empty; void _partial; void _new; void _legacyX; void _legacyY;
    expect(true).toBe(true);
  });
});
