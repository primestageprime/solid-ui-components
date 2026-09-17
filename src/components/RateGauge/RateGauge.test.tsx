// ============================================
// The gauge is a readout, not a control: these tests carry the ARIA
// announcement, the zone that lights, and the marks that appear or vanish.
//
// Geometry has its own suite (geometry.test.ts) and prints its table there.
// Nothing here re-asserts a coordinate — this file only checks that the paint
// follows what geometry decided.
//
// The wording tests are the load-bearing ones since the generic audit. Every
// noun the gauge says about the numbers now comes from the consumer's
// `formatAgainst` / `formatDelta`, so the suite plays TWO consumers: a money
// one that asks for "over breakeven" and "off payroll", and no consumer at all
// — the second is the one that would catch a domain word creeping back into a
// default.
// ============================================
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { RateGauge, createRateGauge } from "./RateGauge";
import { RateDial } from "./variants";

const DOMAIN: readonly [number, number] = [-30000, 30000];

/**
 * A consumer's own wording. It returns the WHOLE line — the component adds no
 * words around it — so these two strings are the only place "breakeven" and
 * "payroll" exist anywhere in this component's world.
 */
const against = (value: number): string =>
  value === 0
    ? "at breakeven"
    : `$${Math.abs(value).toLocaleString("en-US")}/mo ${
        value > 0 ? "over" : "below"
      } breakeven`;

/**
 * The same consumer's brace line, and it FLIPS the sign on purpose: a rate that
 * falls is payroll that rises. That flip is exactly the decision the component
 * must not make for anyone, which is why the prop hands over a raw signed delta
 * and takes back a finished sentence.
 */
const delta = (value: number): string =>
  `$${Math.abs(value).toLocaleString("en-US")}/mo ${
    value < 0 ? "to" : "off"
  } payroll`;

const MONEY = { formatAgainst: against, formatDelta: delta } as const;

describe("RateGauge", () => {
  it("announces the value, the baseline and the delta on one meter", () => {
    const { getByRole } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={23000}
        label="Scenario A"
        {...MONEY}
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

  // The generic audit, asserted rather than asserted-about. A default that
  // said "breakeven" or carried a currency would fail here and nowhere else,
  // because every other test hands the gauge a consumer's words.
  it("says nothing domain-specific when the consumer supplies no wording", () => {
    const { container, getByRole } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={23000}
        label="Scenario A"
      />
    ));
    const said = getByRole("meter").getAttribute("aria-valuetext") ?? "";
    for (const word of ["breakeven", "payroll", "$", "/mo", "comfortable"]) {
      expect(said).not.toContain(word);
    }
    // Plain grouped numbers, and the reference needle named generically.
    expect(
      [...container.querySelectorAll(".sui-rate-gauge__row")].map(
        (node) => node.textContent,
      ),
    ).toEqual(["Scenario A23,000", "+18,000", "Reference5,000"]);
  });

  it("gives zero its own default sentence rather than a bare '0'", () => {
    const { container } = render(() => (
      <RateGauge domain={DOMAIN} baseline={0} value={12000} label="Scenario A" />
    ));
    expect(
      container.querySelector(".sui-rate-gauge__row--baseline")?.textContent,
    ).toBe("Referenceat zero");
  });

  // The fill-height contract (Peter, 2026-09-16: charts absorb their
  // container). ONE declaration serves both callers, so both are pinned here —
  // a regression to `height: auto` would pass the first and fail the second,
  // and a regression to a hard pixel height would do the reverse.
  it("asks for its container's height, and keeps its aspect while doing it", () => {
    const { container } = render(() => (
      <RateGauge domain={[-100, 100]} baseline={0} value={50} label="Foo" />
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

  it("lights the positive band above zero and the negative band below", () => {
    const [value, setValue] = createSignal(23000);
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={value()}
        label="Scenario A"
        {...MONEY}
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

  // The consumer's own opinion about the numbers: a positive value below
  // `caution` is positive, but not yet clear of caution, so it takes the
  // warning tone.
  it("splits the positive band at the caution threshold and lights the one it is in", () => {
    const [value, setValue] = createSignal(4000);
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={0}
        value={value()}
        caution={12000}
        label="Scenario A"
        {...MONEY}
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
        caution={12000}
        label="Scenario A"
        {...MONEY}
      />
    ));
    expect(getByRole("meter").getAttribute("aria-valuetext")).toContain(
      "Below the caution threshold",
    );
    unmount();
    const plain = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={0}
        value={4000}
        label="Scenario A"
        {...MONEY}
      />
    ));
    expect(
      plain.getByRole("meter").getAttribute("aria-valuetext"),
    ).not.toContain("caution");
  });

  it("ignores a caution threshold that is not positive", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={0}
        value={4000}
        caution={-5000}
        label="Scenario A"
        {...MONEY}
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
        {...MONEY}
      />
    ));
    const labels = () => [
      ...container.querySelectorAll(".sui-rate-gauge__row"),
    ].map((node) => node.textContent);
    // Each callout is two lines — a name and the consumer's line about where
    // it stands — except the brace's, whose one line is already relative.
    expect(labels()).toEqual([
      "Scenario A$23,000/mo over breakeven",
      "$18,000/mo off payroll",
      "Reference$5,000/mo over breakeven",
    ]);
    setValue(-8833);
    expect(labels()).toEqual([
      "Reference$5,000/mo over breakeven",
      "$13,833/mo to payroll",
      "Scenario A$8,833/mo below breakeven",
    ]);
  });

  // The brace's line is the consumer's sentence about the delta, whatever they
  // decide that delta MEANS — here a payroll change, which is the sign flipped.
  // The component prints no sign of its own around it, so the consumer's
  // direction is the only one on the row.
  it("hands the raw signed delta over and prints the sentence it gets back", () => {
    const [value, setValue] = createSignal(23000);
    const seen: number[] = [];
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={value()}
        label="Scenario A"
        formatAgainst={against}
        formatDelta={(d) => {
          seen.push(d);
          return delta(d);
        }}
      />
    ));
    const row = () =>
      container.querySelector(".sui-rate-gauge__row--delta")?.textContent;
    // The value is UP against the baseline, so this consumer says it comes off.
    expect(row()).toBe("$18,000/mo off payroll");
    expect(seen).toContain(18000);
    setValue(-8833);
    expect(row()).toBe("$13,833/mo to payroll");
    expect(seen).toContain(-13833);
    // No sign of the component's own beside the consumer's words.
    expect(row()).not.toContain("+");
    expect(row()).not.toContain("−");
  });

  it("drops the bracket and the delta row when the value sits on the baseline", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={5000}
        label="Scenario A"
        {...MONEY}
      />
    ));
    expect(container.querySelectorAll(".sui-rate-gauge__bracket")).toHaveLength(
      0,
    );
    // ONE row, naming both, rather than two rows pointing at the same dot.
    const rows = container.querySelectorAll(".sui-rate-gauge__row");
    expect(rows).toHaveLength(1);
    // Still two lines: the collapsed pair, and where that pair stands. This is
    // the case a consumer flagged as confusing — "SCENARIO = REFERENCE" alone
    // says the two agree but never says what they agree ON.
    expect(rows[0].textContent).toBe(
      "Scenario A = Reference$5,000/mo over breakeven",
    );
  });

  it("ellipsizes the consumer's own name and offers it whole in a tooltip", () => {
    const long = "Bookkeeping retainer · Northern";
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={23000}
        label={long}
        {...MONEY}
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
  // never going to draw — and the board's card clipped "Scenario = Reference"
  // to "SCENA…" beside 500px of empty space.
  it("sizes the column for the collapsed row's own words", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={5000}
        value={5000}
        label="Scenario A"
        {...MONEY}
      />
    ));
    const box = container.querySelector("foreignObject");
    // "Scenario A = Reference" is 22 characters; "Reference" alone is 9, and a
    // column cut to the shorter one would truncate the row it actually draws.
    expect(Number(box?.getAttribute("width"))).toBeGreaterThan(9 * 7.3 * 1.5);
  });

  it("takes the consumer's name for the baseline needle", () => {
    const { container } = render(() => (
      <RateGauge
        domain={DOMAIN}
        baseline={0}
        value={1200}
        label="Scenario A"
        baselineLabel="Today"
        {...MONEY}
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
        {...MONEY}
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
        {...MONEY}
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

// ── the curried surface ──────────────────────────────────────────────────────
// The point of currying here is that a call site carries DATA and nothing else.
// These two tests are the proof of that claim, not a re-test of the dial.
describe("createRateGauge", () => {
  it("bakes the wording so the call site passes data only", () => {
    const Dial = createRateGauge({ baselineLabel: "Today", ...MONEY });
    const { container } = render(() => (
      <Dial domain={DOMAIN} baseline={5000} value={23000} label="Scenario A" />
    ));
    expect(
      [...container.querySelectorAll(".sui-rate-gauge__row")].map(
        (node) => node.textContent,
      ),
    ).toEqual([
      "Scenario A$23,000/mo over breakeven",
      "$18,000/mo off payroll",
      "Today$5,000/mo over breakeven",
    ]);
  });

  it("still takes caution at the call site, because the threshold is data", () => {
    const Dial = createRateGauge(MONEY);
    const { container } = render(() => (
      <Dial
        domain={DOMAIN}
        baseline={0}
        value={4000}
        caution={12000}
        label="Scenario A"
      />
    ));
    expect(container.querySelectorAll(".sui-rate-gauge__band")).toHaveLength(3);
  });
});

describe("RateDial", () => {
  it("reads bare numbers against zero", () => {
    const { container } = render(() => (
      <RateDial
        domain={DOMAIN}
        baseline={5000}
        value={23000}
        label="Scenario A"
      />
    ));
    expect(
      [...container.querySelectorAll(".sui-rate-gauge__row")].map(
        (node) => node.textContent,
      ),
    ).toEqual(["Scenario A23,000", "+18,000", "Reference5,000"]);
  });
});
