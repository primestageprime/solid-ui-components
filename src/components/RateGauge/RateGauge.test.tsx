// ============================================
// The gauge is a readout, not a control: these tests carry the ARIA
// announcement, the zone that lights, and the marks that appear or vanish.
//
// Geometry has its own suite (geometry.test.ts) and prints its table there.
// Nothing here re-asserts a coordinate — this file only checks that the paint
// follows what geometry decided.
// ============================================
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { RateGauge } from "./RateGauge";

const DOMAIN: readonly [number, number] = [-30000, 30000];

/** The bench's formatter, real minus sign and all. */
const money = (delta: number): string =>
  `${delta < 0 ? "−" : "+"}$${Math.abs(delta).toLocaleString("en-US")}/mo`;

describe("RateGauge", () => {
  it("announces the value, the baseline and the delta on one meter", () => {
    const { getByRole } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={23000}
        label="Foo"
        format={money}
      />
    ));
    const meter = getByRole("meter");
    expect(meter.getAttribute("aria-valuenow")).toBe("23000");
    expect(meter.getAttribute("aria-valuemin")).toBe("-30000");
    expect(meter.getAttribute("aria-valuemax")).toBe("30000");
    expect(meter.getAttribute("aria-valuetext")).toContain("Foo");
    expect(meter.getAttribute("aria-valuetext")).toContain("5000");
    expect(meter.getAttribute("aria-valuetext")).toContain("+$18,000/mo");
  });

  it("lights the positive zone above the baseline and the negative zone below", () => {
    const [value, setValue] = createSignal(23000);
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={value()}
        label="Foo"
        format={money}
      />
    ));
    const lit = () =>
      container.querySelectorAll(".sui-rate-gauge__zone-positive--lit").length;
    expect(lit()).toBe(1);
    setValue(-8833);
    expect(lit()).toBe(0);
    expect(
      container.querySelectorAll(".sui-rate-gauge__zone-negative--lit"),
    ).toHaveLength(1);
  });

  it("stacks three labels above the baseline and reverses them below", () => {
    const [value, setValue] = createSignal(23000);
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={value()}
        label="Foo"
        format={money}
      />
    ));
    const labels = () => [
      ...container.querySelectorAll(".sui-rate-gauge__label"),
    ].map((node) => node.textContent);
    expect(labels()).toEqual(["Foo", "+$18,000/mo", "Baseline"]);
    setValue(-8833);
    expect(labels()).toEqual(["Baseline", "−$13,833/mo", "Foo"]);
  });

  it("drops the bracket and the delta row when the value sits on the baseline", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={5000}
        label="Foo"
        format={money}
      />
    ));
    expect(container.querySelectorAll(".sui-rate-gauge__bracket")).toHaveLength(0);
    expect(container.querySelectorAll(".sui-rate-gauge__label")).toHaveLength(2);
  });

  it("takes the consumer's name for the baseline needle", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={0}
        value={1200}
        label="Foo"
        format={money}
        baselineLabel="Today"
      />
    ));
    expect(container.textContent).toContain("Today");
  });

  it("paints no NaN coordinate for a value past the end of the domain", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={999999}
        label="Foo"
        format={money}
      />
    ));
    expect(container.innerHTML).not.toContain("NaN");
  });

  // The picture is clamped, so the announcement has to be too: a meter that
  // read out 999999 beside a needle parked at the pole and a delta of
  // +$25,000/mo would be describing a different gauge.
  it("announces the value it DREW, never the one past the end of the domain", () => {
    const { getByRole } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={999999}
        label="Foo"
        format={money}
      />
    ));
    const meter = getByRole("meter");
    expect(meter.getAttribute("aria-valuenow")).toBe("30000");
    expect(meter.getAttribute("aria-valuetext")).not.toContain("999999");
    expect(meter.getAttribute("aria-valuetext")).toContain("+$25,000/mo");
  });
});
