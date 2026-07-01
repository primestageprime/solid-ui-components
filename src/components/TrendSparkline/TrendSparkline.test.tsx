import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { TrendSparkline, trendOf } from "./TrendSparkline";

describe("trendOf (the color rule)", () => {
  it("final above initial → up (green)", () => {
    expect(trendOf(100, 200)).toBe("up");
  });
  it("final below initial → down (red)", () => {
    expect(trendOf(100, -50)).toBe("down");
  });
  it("EXACTLY equal → flat (grey)", () => {
    expect(trendOf(100, 100)).toBe("flat");
  });
});

describe("TrendSparkline", () => {
  it("renders the polyline with the trend modifier class", () => {
    const { container } = render(() => (
      <TrendSparkline values={[1, 3, 2, 5]} trend="up" />
    ));
    const root = container.querySelector(".sui-trend-sparkline")!;
    expect(root.classList.contains("sui-trend-sparkline--up")).toBe(true);
    const line = root.querySelector(".sui-trend-sparkline__line")!;
    expect(line.getAttribute("points")!.split(" ").length).toBe(4);
  });

  it("downsamples long series to capacity, keeping the endpoints", () => {
    const values = Array.from({ length: 730 }, (_, i) => i);
    const { container } = render(() => (
      <TrendSparkline
        values={values}
        trend="down"
        capacity={50}
        width={100}
        height={20}
      />
    ));
    const pts = container
      .querySelector(".sui-trend-sparkline__line")!
      .getAttribute("points")!
      .split(" ");
    expect(pts.length).toBe(50);
    // first point at x=0, last at x=width
    expect(pts[0].startsWith("0")).toBe(true);
    expect(pts[pts.length - 1].startsWith("100")).toBe(true);
  });

  it("renders empty cleanly", () => {
    const { container } = render(() => (
      <TrendSparkline values={[]} trend="flat" />
    ));
    expect(
      container
        .querySelector(".sui-trend-sparkline__line")!
        .getAttribute("points"),
    ).toBe("");
  });
});
