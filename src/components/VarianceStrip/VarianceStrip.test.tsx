import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { Chart } from "../Chart";
import { VarianceStrip } from "./VarianceStrip";

const DAYS = [
  { x: 0, v: 50, k: "revenue" as const },
  { x: 1, v: -100, k: "costs" as const },
  { x: 2, v: 5, k: "other" as const },
];

const host = (placement: "below" | "plot") =>
  render(() => (
    <Chart width={400} height={200} xDomain={[0, 3]} yDomain={[0, 10]} margin={{ bottom: 100, left: 40, right: 10, top: 10 }}>
      <VarianceStrip data={DAYS} x={(d) => d.x} value={(d) => d.v} kind={(d) => d.k} step={1} placement={placement} format={(v) => String(v)} title="by day" />
    </Chart>
  ));

describe("VarianceStrip", () => {
  it("draws one bar per day with the kind as a mark", () => {
    const { container } = host("below");
    const bars = container.querySelectorAll(".sui-variance-strip__bar");
    expect(bars.length).toBe(3);
    expect(bars[0]!.classList.contains("sui-variance-strip__bar--revenue")).toBe(true);
    expect(bars[1]!.getAttribute("fill")).toMatch(/^url\(#sui-variance-strip-hatch-/);
    expect(bars[2]!.classList.contains("sui-variance-strip__bar--other")).toBe(true);
  });

  it("sits in the bottom margin by default, under the plot", () => {
    const { container } = host("below");
    const zero = container.querySelector(".sui-variance-strip__zero")!;
    // Plot is 200 − 10 − 100 = 90px tall; the strip starts 22px under it.
    expect(Number(zero.getAttribute("y1"))).toBe(90 + 22 + 32);
    const labels = [...container.querySelectorAll(".sui-variance-strip__label")].map((l) => l.textContent);
    expect(labels).toEqual(["100", "-100"]);
    expect(container.querySelector(".sui-variance-strip__title")!.textContent).toBe("by day");
  });

  it("spans the plot when placed there", () => {
    const { container } = host("plot");
    const zero = container.querySelector(".sui-variance-strip__zero")!;
    expect(Number(zero.getAttribute("y1"))).toBe(45);
  });
});
