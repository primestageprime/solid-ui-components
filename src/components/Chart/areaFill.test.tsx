import { afterEach, describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Chart } from "./Chart";
import { AreaSeries } from "./Series";

// The twin of lineStroke.test.tsx: Chart.css once set the accent fill on every
// `.sui-chart__area`, so an AreaSeries `fill` prop (a presentation attribute,
// which loses to every author rule) never painted.
const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "Chart.css"),
  "utf8",
);

const pts = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

const areaWith = (fill?: string): SVGPathElement => {
  const { container } = render(() => (
    <Chart width={100} height={60} xDomain={[0, 1]} yDomain={[0, 1]}>
      <AreaSeries data={pts} x={(p) => p.x} y={(p) => p.y} fill={fill} />
    </Chart>
  ));
  return container.querySelector("path.sui-chart__area") as SVGPathElement;
};

describe("AreaSeries fill", () => {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("no stylesheet rule overrides a caller's fill", () => {
    const path = areaWith("var(--sui-series-2)");
    expect(path.getAttribute("fill")).toBe("var(--sui-series-2)");
    expect(getComputedStyle(path).fill).not.toContain("--sui-accent");
  });

  it("falls back to the accent when no fill is given", () => {
    const path = areaWith();
    expect(path.hasAttribute("fill")).toBe(false);
    expect(getComputedStyle(path).fill).toBe("var(--sui-accent)");
  });
});
