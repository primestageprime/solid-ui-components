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

/** The consumer's magnitude formatter: an amount, never a sign. */
const magnitude = (amount: number): string =>
  `$${amount.toLocaleString("en-US")}/mo`;

describe("RateGauge", () => {
  it("announces the value, the baseline and the delta on one meter", () => {
    const { getByRole } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={23000}
        label="Scenario A"
        format={money}
        formatMagnitude={magnitude}
      />
    ));
    const meter = getByRole("meter");
    expect(meter.getAttribute("aria-valuenow")).toBe("23000");
    expect(meter.getAttribute("aria-valuemin")).toBe("-30000");
    expect(meter.getAttribute("aria-valuemax")).toBe("30000");
    // The announcement quotes the callouts word for word, so a screen reader
    // and a sighted reader can quote the gauge to each other.
    const said = meter.getAttribute("aria-valuetext") ?? "";
    expect(said).toContain("Scenario A");
    expect(said).toContain("$23,000/mo over breakeven");
    expect(said).toContain("$5,000/mo over breakeven");
    expect(said).toContain("$18,000/mo off payroll");
  });

  // The fill-height contract (Peter, 2026-09-16: charts absorb their
  // container). ONE declaration serves both callers, so both are pinned here —
  // a regression to `height: auto` would pass the first and fail the second,
  // and a regression to a hard pixel height would do the reverse.
  it("asks for its container's height, and keeps its aspect while doing it", () => {
    const { container } = render(() => (
      <RateGauge
        domain={[-100, 100]}
        baseline={0}
        value={50}
        label="Foo"
        format={(v) => String(v)}
      />
    ));
    const host = container.querySelector(".sui-rate-gauge") as HTMLElement;
    const canvas = container.querySelector(
      ".sui-rate-gauge__canvas",
    ) as SVGSVGElement;
    expect(host).toBeTruthy();
    expect(canvas).toBeTruthy();
    // `height: 100%` against an INDEFINITE parent height computes to `auto`,
    // so this one rule fills a sized card and content-sizes everywhere else.
    expect(host.style.height || getComputedStyle(host).height).not.toBe("0px");
    // The dial must not be stretched to the box's aspect: the ANGLE is the
    // reading, so the svg keeps the default `xMidYMid meet` rather than "none".
    expect(canvas.getAttribute("preserveAspectRatio")).toBeNull();
    expect(canvas.getAttribute("viewBox")).toBeTruthy();
  });

  it("lights the gain band above zero and the loss band below", () => {
    const [value, setValue] = createSignal(23000);
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={value()}
        label="Scenario A"
        format={money}
      />
    ));
    const litTone = () =>
      [...container.querySelectorAll(".sui-rate-gauge__band--lit")].map(
        (node) =>
          [...node.classList].find((c) =>
            /--(success|warning|danger)$/.test(c),
          ),
      );
    expect(litTone()).toEqual(["sui-rate-gauge__band--success"]);
    setValue(-8833);
    expect(litTone()).toEqual(["sui-rate-gauge__band--danger"]);
  });

  // The consumer's own opinion about the numbers: a gain below `comfortable`
  // is a gain, but not yet a comfortable one, so it takes the warning tone.
  it("splits the gain band at the comfortable gain and lights the one it is in", () => {
    const [value, setValue] = createSignal(4000);
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={0}
        value={value()}
        comfortable={12000}
        label="Scenario A"
        format={money}
      />
    ));
    const bands = () => container.querySelectorAll(".sui-rate-gauge__band");
    const lit = () =>
      [...container.querySelectorAll(".sui-rate-gauge__band--lit")].map(
        (node) =>
          [...node.classList].find((c) =>
            /--(success|warning|danger)$/.test(c),
          ),
      );
    expect(bands()).toHaveLength(3);
    expect(lit()).toEqual(["sui-rate-gauge__band--warning"]);
    setValue(20000);
    expect(lit()).toEqual(["sui-rate-gauge__band--success"]);
    setValue(-500);
    expect(lit()).toEqual(["sui-rate-gauge__band--danger"]);
  });

  it("names the band in the announcement, but only when there is one to name", () => {
    const { getByRole, unmount } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={0}
        value={4000}
        comfortable={12000}
        label="Scenario A"
        format={money}
      />
    ));
    expect(getByRole("meter").getAttribute("aria-valuetext")).toContain(
      "Below the comfortable gain",
    );
    unmount();
    const plain = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={0}
        value={4000}
        label="Scenario A"
        format={money}
      />
    ));
    expect(
      plain.getByRole("meter").getAttribute("aria-valuetext"),
    ).not.toContain("comfortable");
  });

  it("ignores a comfortable gain that is not a gain", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={0}
        value={4000}
        comfortable={-5000}
        label="Scenario A"
        format={money}
      />
    ));
    expect(container.querySelectorAll(".sui-rate-gauge__band")).toHaveLength(2);
  });

  // The rows are read off the DOM in document order, which is the order
  // geometry placed them in — top of the stack first. The value's own row is
  // an HTML caption in a <foreignObject>, the other two are SVG text, so this
  // reads whole rows rather than one kind of node.
  it("stacks three labels above the baseline and reverses them below", () => {
    const [value, setValue] = createSignal(23000);
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={value()}
        label="Scenario A"
        format={money}
      />
    ));
    const labels = () => [
      ...container.querySelectorAll(".sui-rate-gauge__row"),
    ].map((node) => node.textContent);
    // Each callout is now two lines — a name and where it stands against
    // break-even — except the brace's, whose one line is already relative.
    expect(labels()).toEqual([
      "Scenario A23,000 over breakeven",
      "18,000 off payroll",
      "Baseline5,000 over breakeven",
    ]);
    setValue(-8833);
    expect(labels()).toEqual([
      "Baseline5,000 over breakeven",
      "13,833 to payroll",
      "Scenario A8,833 below breakeven",
    ]);
  });

  // The brace's line is the delta as a PAYROLL change, which is the sign
  // flipped: a rate that falls is payroll that rises. "to" and "off" carry
  // that on their own, so there is no +/- as well — a sign here would be the
  // opposite of the one on the rate's own delta.
  it("says the delta as a payroll change, flipped and unsigned", () => {
    const [value, setValue] = createSignal(23000);
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={value()}
        label="Scenario A"
        format={money}
        formatMagnitude={magnitude}
      />
    ));
    const delta = () =>
      container.querySelector(".sui-rate-gauge__row--delta")?.textContent;
    // The rate is UP against the baseline, so that money comes off payroll.
    expect(delta()).toBe("$18,000/mo off payroll");
    setValue(-8833);
    // The rate is DOWN, so payroll has to carry the difference.
    expect(delta()).toBe("$13,833/mo to payroll");
    expect(delta()).not.toContain("+");
    expect(delta()).not.toContain("−");
  });

  it("gives zero its own sentence rather than '0 over breakeven'", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={0}
        value={12000}
        label="Scenario A"
        format={money}
        formatMagnitude={magnitude}
      />
    ));
    expect(
      container.querySelector(".sui-rate-gauge__row--baseline")?.textContent,
    ).toBe("Baselineat breakeven");
  });

  it("drops the bracket and the delta row when the value sits on the baseline", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={5000}
        label="Scenario A"
        format={money}
      />
    ));
    expect(container.querySelectorAll(".sui-rate-gauge__bracket")).toHaveLength(0);
    // ONE row, naming both, rather than two rows pointing at the same dot.
    const rows = container.querySelectorAll(".sui-rate-gauge__row");
    expect(rows).toHaveLength(1);
    // Still two lines: the collapsed pair, and where that pair stands. This is
    // the case a consumer flagged as confusing — "SCENARIO = BASELINE" alone
    // says the two agree but never says what they agree ON.
    expect(rows[0].textContent).toBe("Scenario A = Baseline5,000 over breakeven");
  });

  it("ellipsizes the consumer's own name and offers it whole in a tooltip", () => {
    const long = "Bookkeeping retainer · Northern";
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={23000}
        label={long}
        format={money}
      />
    ));
    // The name gets real HTML — only a <foreignObject> can lay that out inside
    // an <svg> — so it can truncate; the delta stays SVG text.
    const box = container.querySelector(".sui-rate-gauge__label-box");
    expect(box?.textContent).toBe(long);
    expect(container.querySelector("foreignObject")).not.toBeNull();
  });

  // The collapsed row's text is longer than any of the three props it is made
  // from, so sizing the column from the props measured a string the gauge was
  // never going to draw — and the board's card clipped "Scenario = Baseline"
  // to "SCENA…" beside 500px of empty space.
  it("sizes the column for the collapsed row's own words", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={5000}
        label="Scenario A"
        format={money}
      />
    ));
    const box = container.querySelector("foreignObject");
    // "Scenario A = Baseline" is 21 characters; "Baseline" alone is 8, and a
    // column cut to the shorter one would truncate the row it actually draws.
    expect(Number(box?.getAttribute("width"))).toBeGreaterThan(8 * 7.3 * 1.5);
  });

  it("takes the consumer's name for the baseline needle", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={0}
        value={1200}
        label="Scenario A"
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
        label="Scenario A"
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
        label="Scenario A"
        format={money}
        formatMagnitude={magnitude}
      />
    ));
    const meter = getByRole("meter");
    expect(meter.getAttribute("aria-valuenow")).toBe("30000");
    expect(meter.getAttribute("aria-valuetext")).not.toContain("999999");
    expect(meter.getAttribute("aria-valuetext")).toContain(
      "$30,000/mo over breakeven",
    );
    expect(meter.getAttribute("aria-valuetext")).toContain(
      "$25,000/mo off payroll",
    );
  });
});
