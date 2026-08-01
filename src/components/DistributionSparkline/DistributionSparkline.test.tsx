import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  DistributionSparkline,
  createDistributionSparkline,
  distributionTrendOf,
} from "./DistributionSparkline";
import { P95Sparkline } from "./variants";

const DOMAIN: [number, number] = [0, 100];

const yOf = (el: Element, attr: string): number =>
  Number(el.getAttribute(attr));

describe("distributionTrendOf", () => {
  it("last above first → up", () => {
    expect(distributionTrendOf(10, 20)).toBe("up");
  });
  it("last below first → down", () => {
    expect(distributionTrendOf(20, 10)).toBe("down");
  });
  it("EXACTLY equal → flat", () => {
    expect(distributionTrendOf(10, 10)).toBe("flat");
  });
});

describe("DistributionSparkline", () => {
  it("draws every mark and tags the root with the trend", () => {
    const { container } = render(() => (
      <DistributionSparkline values={[10, 30, 20, 60]} yDomain={DOMAIN} />
    ));
    const root = container.querySelector(".sui-distribution-sparkline")!;
    expect(root.classList.contains("sui-distribution-sparkline--up")).toBe(true);
    expect(root.querySelector(".sui-distribution-sparkline__plot")).toBeTruthy();
    expect(root.querySelector(".sui-distribution-sparkline__range")).toBeTruthy();
    expect(root.querySelector(".sui-distribution-sparkline__mean")).toBeTruthy();
    expect(
      root.querySelectorAll(".sui-distribution-sparkline__typical").length,
    ).toBe(2);
  });

  it("keeps the percentile rules INSIDE the range box", () => {
    // A percentile band cannot escape the values it was computed from — if it
    // ever renders outside the box, the two are measuring different things.
    const { container } = render(() => (
      <DistributionSparkline
        values={[5, 20, 30, 40, 50, 60, 95]}
        yDomain={DOMAIN}
      />
    ));
    const box = container.querySelector(".sui-distribution-sparkline__range")!;
    const top = yOf(box, "y");
    const bottom = top + yOf(box, "height");
    const rules = container.querySelectorAll(
      ".sui-distribution-sparkline__typical",
    );
    for (const rule of rules) {
      // SVG y grows downward: inside means at or below the top edge and at or
      // above the bottom edge.
      expect(yOf(rule, "y1")).toBeGreaterThanOrEqual(top - 0.001);
      expect(yOf(rule, "y1")).toBeLessThanOrEqual(bottom + 0.001);
    }
  });

  it("scales to the GIVEN domain, not to its own values", () => {
    // The same series against two domains must produce different geometry;
    // that is what makes a shared domain meaningful.
    const narrow = render(() => (
      <DistributionSparkline values={[40, 60]} yDomain={[0, 100]} />
    ));
    const wide = render(() => (
      <DistributionSparkline values={[40, 60]} yDomain={[0, 1000]} />
    ));
    const heightOf = (r: ReturnType<typeof render>): number =>
      yOf(r.container.querySelector(".sui-distribution-sparkline__range")!, "height");
    expect(heightOf(narrow)).toBeGreaterThan(heightOf(wide));
  });

  it("clips rather than rescales when values exceed the domain", () => {
    const { container } = render(() => (
      <DistributionSparkline values={[50, 5000]} yDomain={DOMAIN} />
    ));
    const g = container.querySelector("g[clip-path]")!;
    expect(g.getAttribute("clip-path")).toMatch(/^url\(#sui-dist-clip-/);
  });

  it("gives each instance its own gradient id", () => {
    const { container } = render(() => (
      <>
        <DistributionSparkline values={[1, 2]} yDomain={DOMAIN} />
        <DistributionSparkline values={[2, 1]} yDomain={DOMAIN} />
      </>
    ));
    const ids = Array.from(container.querySelectorAll("linearGradient")).map(
      (g) => g.getAttribute("id"),
    );
    expect(ids.length).toBe(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("renders the plot but no marks for an empty series", () => {
    const { container } = render(() => (
      <DistributionSparkline values={[]} yDomain={DOMAIN} />
    ));
    expect(
      container.querySelector(".sui-distribution-sparkline__plot"),
    ).toBeTruthy();
    expect(
      container.querySelector(".sui-distribution-sparkline__range"),
    ).toBeNull();
  });

  it("downsamples beyond capacity, keeping the endpoints", () => {
    const values = Array.from({ length: 500 }, (_, i) => i % 97);
    const { container } = render(() => (
      <DistributionSparkline values={values} yDomain={[0, 100]} capacity={10} />
    ));
    const line = container.querySelector(".sui-distribution-sparkline__line")!;
    expect(line.getAttribute("points")!.split(" ").length).toBe(10);
  });

  it("omits the marks a variant switched off", () => {
    const { container } = render(() => (
      <DistributionSparkline
        values={[1, 5, 3]}
        yDomain={DOMAIN}
        marks={{ typical: false, mean: false }}
      />
    ));
    expect(
      container.querySelector(".sui-distribution-sparkline__range"),
    ).toBeTruthy();
    expect(
      container.querySelector(".sui-distribution-sparkline__typical"),
    ).toBeNull();
    expect(
      container.querySelector(".sui-distribution-sparkline__mean"),
    ).toBeNull();
  });
});

describe("createDistributionSparkline", () => {
  it("bakes the encoding so the call site passes data only", () => {
    const RangeOnly = createDistributionSparkline({
      marks: { range: true, typical: false, mean: false },
    });
    const { container } = render(() => (
      <RangeOnly values={[1, 9, 4]} yDomain={DOMAIN} />
    ));
    expect(
      container.querySelector(".sui-distribution-sparkline__typical"),
    ).toBeNull();
  });
});

describe("P95Sparkline", () => {
  it("draws the full encoding", () => {
    const { container } = render(() => (
      <P95Sparkline values={[10, 40, 20, 80]} yDomain={DOMAIN} />
    ));
    expect(
      container.querySelectorAll(".sui-distribution-sparkline__typical").length,
    ).toBe(2);
    expect(
      container.querySelector(".sui-distribution-sparkline__mean"),
    ).toBeTruthy();
  });
});
