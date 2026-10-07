import { afterEach, describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Chart } from "./Chart";
import { LineSeries } from "./Series";

// A `stroke` prop is an SVG presentation attribute, and a presentation
// attribute loses to every author rule. Chart.css once set the accent stroke
// unconditionally, so every LineSeries painted accent whatever it was given
// (found 2026-10-07 on the contract-builder bench: attribute
// `var(--sui-series-2)`, computed `rgb(0, 212, 255)`).
const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "Chart.css"),
  "utf8",
);

const pts = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

const lineWith = (stroke?: string): SVGPathElement => {
  const { container } = render(() => (
    <Chart width={100} height={60} xDomain={[0, 1]} yDomain={[0, 1]}>
      <LineSeries data={pts} x={(p) => p.x} y={(p) => p.y} stroke={stroke} />
    </Chart>
  ));
  return container.querySelector("path.sui-chart__line") as SVGPathElement;
};

describe("LineSeries stroke", () => {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("no stylesheet rule overrides a caller's stroke", () => {
    const path = lineWith("var(--sui-series-2)");
    expect(path.getAttribute("stroke")).toBe("var(--sui-series-2)");
    expect(getComputedStyle(path).stroke).not.toContain("--sui-accent");
  });

  it("falls back to the accent when no stroke is given", () => {
    const path = lineWith();
    expect(path.hasAttribute("stroke")).toBe(false);
    expect(getComputedStyle(path).stroke).toBe("var(--sui-accent)");
  });
});
