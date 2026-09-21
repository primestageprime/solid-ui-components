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
});

describe("ReferenceLine — type-level enforcement", () => {
  it("rejects incomplete props at compile time", () => {
    // @ts-expect-error — props must include orientation + value
    const _empty: ReferenceLineProps = {};
    // @ts-expect-error — orientation without value is incomplete
    const _partial: ReferenceLineProps = { orientation: "horizontal" };
    // @ts-expect-error — legacy `x` shape no longer accepted
    const _legacyX: ReferenceLineProps = { x: 5 };
    // @ts-expect-error — legacy `y` shape no longer accepted
    const _legacyY: ReferenceLineProps = { y: 50 };
    // Valid form compiles:
    const _ok: ReferenceLineProps = { orientation: "horizontal", value: 50 };
    void _empty;
    void _partial;
    void _legacyX;
    void _legacyY;
    void _ok;
    expect(true).toBe(true);
  });
});

describe("ReferenceLine — vertical caption", () => {
  const flush = { top: 0, right: 0, bottom: 0, left: 0 };

  const renderVertical = (value: number, label?: string) =>
    render(() => (
      <Chart
        width={200}
        height={100}
        margin={flush}
        xDomain={[0, 10]}
        yDomain={[0, 100]}
      >
        <ReferenceLine orientation="vertical" value={value} label={label} />
      </Chart>
    ));

  it("centres the caption on the rule at the top of the plot", () => {
    const { container } = renderVertical(5, "today");
    const text = container.querySelector(".sui-chart__ref-label")!;
    expect(text.textContent).toBe("today");
    expect(text.getAttribute("x")).toBe("100");
    expect(text.getAttribute("y")).toBe("8");
    expect(text.getAttribute("text-anchor")).toBe("middle");
  });

  it("clamps the caption inside the right plot edge", () => {
    const { container } = renderVertical(10, "end");
    const text = container.querySelector(".sui-chart__ref-label")!;
    expect(text.getAttribute("x")).toBe("182");
  });

  it("clamps the caption inside the left plot edge", () => {
    const { container } = renderVertical(0, "start");
    const text = container.querySelector(".sui-chart__ref-label")!;
    expect(text.getAttribute("x")).toBe("18");
  });

  it("drops the rule top only when a caption draws", () => {
    const captioned = renderVertical(5, "today");
    const plain = renderVertical(5);
    expect(
      captioned.container
        .querySelector(".sui-chart__ref line")!
        .getAttribute("y1"),
    ).toBe("15");
    expect(
      plain.container.querySelector(".sui-chart__ref line")!.getAttribute("y1"),
    ).toBe("0");
    expect(plain.container.querySelector(".sui-chart__ref-label")).toBeNull();
  });

  it("keeps the horizontal caption on the right edge, anchored end", () => {
    const { container } = render(() => (
      <Chart
        width={200}
        height={100}
        margin={flush}
        xDomain={[0, 10]}
        yDomain={[0, 100]}
      >
        <ReferenceLine orientation="horizontal" value={50} label="avg" />
      </Chart>
    ));
    const text = container.querySelector(".sui-chart__ref-label")!;
    expect(text.getAttribute("x")).toBe("196");
    expect(text.getAttribute("text-anchor")).toBe("end");
  });
});

describe("ReferenceLine — class prop", () => {
  it("appends the caller class to the root group", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <ReferenceLine
          orientation="horizontal"
          value={50}
          label="target"
          class="my-ref"
        />
      </Chart>
    ));
    const group = container.querySelector(".sui-chart__ref")!;
    expect(group.classList.contains("my-ref")).toBe(true);
    expect(group.querySelector("line")).toBeTruthy();
    expect(group.querySelector(".sui-chart__ref-label")).toBeTruthy();
  });

  it("keeps the base class alone when the caller omits class", () => {
    const { container } = render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <ReferenceLine orientation="vertical" value={5} />
      </Chart>
    ));
    expect(
      container.querySelector(".sui-chart__ref")!.getAttribute("class"),
    ).toBe("sui-chart__ref");
  });
});

// ── Crisp rendering is scoped to the VERTICAL rule ──────────────────────────
//
// A vertical rule takes its x from the x-scale at a datum, so it lands on a
// fraction nearly always, and a chart draws a ROW of them — a reader sees
// neighbours side by side and reads the antialiasing as two different colours.
// A horizontal rule is the threshold, usually one per chart, and snapping it
// would move it off the very value the reader measures the data against.
describe("ReferenceLine — crisp rendering", () => {
  const lineOf = (orientation: "horizontal" | "vertical", value: number) =>
    render(() => (
      <Chart width={200} height={100} xDomain={[0, 10]} yDomain={[0, 100]}>
        <ReferenceLine orientation={orientation} value={value} />
      </Chart>
    )).container.querySelector("line");

  it("centres the VERTICAL rule on a half pixel, so it covers whole ones", () => {
    for (const value of [3.7, 4.1, 6.23, 9.99]) {
      const x = Number(lineOf("vertical", value)?.getAttribute("x1"));
      expect(x % 1).toBe(0.5);
    }
  });

  it("keeps the rules in ORDER and evenly spaced through the snap", () => {
    // Rounding is the risk: it must not reorder two close rules, nor make
    // evenly spaced ones look unevenly spaced by more than the rounding.
    const xs = [2, 4, 6, 8].map((value) =>
      Number(lineOf("vertical", value)?.getAttribute("x1")),
    );
    for (let i = 1; i < xs.length; i += 1) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
  });

  it("leaves the HORIZONTAL rule alone, so a threshold keeps its exact value", () => {
    const ys = [17, 37, 53, 71].map((value) =>
      Number(lineOf("horizontal", value)?.getAttribute("y1")),
    );
    // Unsnapped, so at least one of these lands off a half pixel. Were the
    // rule snapped too, every one of them would sit exactly on one.
    expect(ys.some((y) => y % 0.5 !== 0)).toBe(true);
  });
});
