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
