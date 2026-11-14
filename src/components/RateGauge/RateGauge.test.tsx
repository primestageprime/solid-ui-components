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
import { type JSX, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { RateGauge, createRateGauge } from "./RateGauge";
import { RateDial } from "./variants";
import { installRects, rectOf } from "../../test-utils";

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

  // The Hourly board's own regression (Peter, 2026-09-17): a ~420×580 gauge
  // card, a COLLAPSED callout, and a line-two sentence ("$69.6k/yr over
  // breakeven") longer than the collapsed name. The ring used to be sized
  // against a capped guess of the column's width and grew into the space the
  // column actually needed, so the card rendered "SCENARIO = BASE…" — a
  // <foreignObject> narrower than the text it was asked to carry — even
  // though the card had the width to show it whole.
  it("never renders a foreignObject narrower than its measured text, at 420×580", () => {
    const restore = installRects((el) =>
      el.classList.contains("sui-rate-gauge")
        ? rectOf({ left: 0, top: 0, width: 420, height: 580 })
        : null,
    );
    const breakevenPerYear = (value: number): string =>
      value === 0
        ? "at breakeven"
        : `$${(Math.abs(value) / 1000).toFixed(1)}k/yr ${
            value > 0 ? "over" : "below"
          } breakeven`;
    try {
      const { container } = render(() => (
        <RateGauge
          domain={DOMAIN}
          baseline={69600}
          value={69600}
          label="Scenario"
          baselineLabel="Baseline"
          formatAgainst={breakevenPerYear}
          formatDelta={delta}
        />
      ));
      const nameText = "Scenario = Baseline";
      const fo = container.querySelector("foreignObject");
      expect(fo).not.toBeNull();
      // The estimate `labelColumnWidth` itself uses (LABEL_CHAR_WIDTH, 7.3)
      // — the same figure the column-sizing tests above pin against.
      expect(Number(fo?.getAttribute("width"))).toBeGreaterThanOrEqual(
        nameText.length * 7.3,
      );
      // And the row reads whole, not clipped to an ellipsis.
      expect(
        container.querySelector(".sui-rate-gauge__label-box")?.textContent,
      ).toBe(nameText);
    } finally {
      restore();
    }
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

describe("callouts — the corners gauge", () => {
  const perMonth = (value: number): string =>
    `$${Math.abs(Math.round(value)).toLocaleString("en-US")}/mo`;
  const signed = (delta: number): string => `${delta < 0 ? "-" : "+"}${perMonth(delta)}`;
  const wording = { baselineLabel: "Baseline", formatAgainst: perMonth, formatDelta: signed };
  const LeaderGauge = createRateGauge(wording);
  const CornerGauge = createRateGauge({ ...wording, callouts: "corners" });
  const renderIn = (width: number, height: number, gauge: () => JSX.Element) => {
    const restore = installRects((el) =>
      el.classList.contains("sui-rate-gauge")
        ? rectOf({ left: 0, top: 0, width, height })
        : null,
    );
    try {
      return render(gauge).container;
    } finally {
      restore();
    }
  };
  const texts = (container: HTMLElement): string[] =>
    Array.from(container.querySelectorAll("text, foreignObject")).map(
      (el) => el.textContent ?? "",
    );
  const reading = { domain: [-200000, 200000] as const, baseline: 75000, value: 125000 };

  it("draws corner blocks with no leaders, value block on top", () => {
    const container = renderIn(260, 430, () => <CornerGauge {...reading} label="Scenario" />);
    expect(container.querySelectorAll(".sui-rate-gauge__leader")).toHaveLength(0);
    expect(texts(container)).toEqual([
      "Scenario",
      "$125,000/mo",
      "+$50,000/mo (67%)",
      "Baseline",
      "$75,000/mo",
    ]);
    const anchors = Array.from(container.querySelectorAll("text")).map((t) =>
      t.getAttribute("text-anchor"),
    );
    expect(new Set(anchors)).toEqual(new Set(["end"]));
    expect(
      container.querySelector(".sui-rate-gauge__row--delta .sui-rate-gauge__label--delta"),
    ).not.toBeNull();
  });

  it("draws corners even in a wide box, and leaders even in a narrow one — it never picks", () => {
    const wide = renderIn(900, 300, () => <CornerGauge {...reading} label="Scenario" />);
    expect(wide.querySelectorAll(".sui-rate-gauge__leader")).toHaveLength(0);
    const narrow = renderIn(200, 500, () => <LeaderGauge {...reading} label="Scenario" />);
    expect(narrow.querySelectorAll(".sui-rate-gauge__leader").length).toBeGreaterThan(0);
  });

  it("takes the consumer's corner delta wording whole", () => {
    const Worded = createRateGauge({
      ...wording,
      callouts: "corners",
      formatCornerDelta: (delta, baseline) => `${signed(delta)} vs ${perMonth(baseline)}`,
    });
    const container = renderIn(260, 430, () => <Worded {...reading} label="Scenario" />);
    expect(texts(container)).toContain("+$50,000/mo vs $75,000/mo");
  });

  it("renders the SAME markup under the default as under explicit leaders", () => {
    const Explicit = createRateGauge({ ...wording, callouts: "leaders" });
    const a = renderIn(260, 430, () => <LeaderGauge {...reading} label="Scenario" />);
    const b = renderIn(260, 430, () => <Explicit {...reading} label="Scenario" />);
    expect(a.innerHTML).toBe(b.innerHTML);
  });

  it("keeps ONE dial radius as the value sweeps the whole scale", () => {
    const ringOf = (value: number) =>
      Array.from(
        renderIn(240, 395, () => <CornerGauge {...reading} value={value} label="Scenario" />)
          .querySelectorAll(".sui-rate-gauge__band"),
      )
        .map((band) => band.getAttribute("d"))
        .join("|");
    const rings = new Set(
      [-200000, -100000, 0, 74999, 75000, 75001, 125000, 200000].map(ringOf),
    );
    expect(rings.size).toBe(1);
  });

  it("draws corners unmeasured too", () => {
    const container = render(() => <CornerGauge {...reading} label="Scenario" />).container;
    expect(container.querySelectorAll(".sui-rate-gauge__leader")).toHaveLength(0);
    expect(texts(container)).toHaveLength(5);
  });
});

// ── align: "center" through the component (thorcasting #4517) ─────────────
describe("align: center — the drawing is centred in a wide box and holds still", () => {
  const perMonth = (value: number): string =>
    `$${Math.abs(Math.round(value)).toLocaleString("en-US")}/mo`;
  const signed = (delta: number): string => `${delta < 0 ? "-" : "+"}${perMonth(delta)}`;
  const wording = { baselineLabel: "Baseline", formatAgainst: perMonth, formatDelta: signed };
  const Centred = createRateGauge({ ...wording, align: "center" });
  const Start = createRateGauge(wording);
  const viewBoxIn = (gauge: () => JSX.Element): string => {
    const restore = installRects((el) =>
      el.classList.contains("sui-rate-gauge")
        ? rectOf({ left: 0, top: 0, width: 1500, height: 600 })
        : null,
    );
    try {
      const svg = render(gauge).container.querySelector("svg.sui-rate-gauge__canvas");
      return svg?.getAttribute("viewBox") ?? "";
    } finally {
      restore();
    }
  };
  const originOf = (viewBox: string): number => Number(viewBox.split(" ")[0]);

  it("default stays on the left margin; centred moves the origin left", () => {
    const start = viewBoxIn(() => <Start domain={DOMAIN} baseline={0} value={1200} label="Scenario" />);
    const centred = viewBoxIn(() => (
      <Centred domain={DOMAIN} baseline={0} value={1200} label="Scenario" />
    ));
    expect(start).toBe("0 0 1500 600");
    expect(originOf(centred)).toBeLessThan(0);
  });

  it("the centre does not move when the value (and so the words' length) changes", () => {
    const small = viewBoxIn(() => <Centred domain={DOMAIN} baseline={0} value={7} label="Scenario" />);
    const large = viewBoxIn(() => (
      <Centred domain={DOMAIN} baseline={0} value={-28500} label="Scenario" />
    ));
    expect(originOf(small)).toBe(originOf(large));
  });
});

// ── textScale (thorcasting #4517, 2026-11-13) ─────────────────────────────
// Full screen grows the dial, but the words stayed 11px. `textScale` lays the
// drawing out in a box `textScale` times smaller and lets the svg fill the
// real one, so words, row pitch, column width, gaps and strokes all scale by
// the same factor and stay consistent with each other, in both layouts.
describe("textScale — the annotation scales with the box", () => {
  const perMonth = (value: number): string =>
    `$${Math.abs(Math.round(value)).toLocaleString("en-US")}/mo`;
  const signed = (delta: number): string => `${delta < 0 ? "-" : "+"}${perMonth(delta)}`;
  const wording = { baselineLabel: "Baseline", formatAgainst: perMonth, formatDelta: signed };
  const Leaders = createRateGauge(wording);
  const Corners = createRateGauge({ ...wording, callouts: "corners" });
  const drawIn = (gauge: () => JSX.Element) => {
    const restore = installRects((el) =>
      el.classList.contains("sui-rate-gauge")
        ? rectOf({ left: 0, top: 0, width: 1500, height: 600 })
        : null,
    );
    try {
      const svg = render(gauge).container.querySelector("svg.sui-rate-gauge__canvas");
      return {
        viewBox: svg?.getAttribute("viewBox") ?? "",
        text: [...(svg?.querySelectorAll("text") ?? [])].map((t) => t.textContent),
      };
    } finally {
      restore();
    }
  };

  it("default (and 1) draws in the box at one unit per pixel", () => {
    const plain = drawIn(() => <Leaders domain={DOMAIN} baseline={0} value={1200} label="Scenario" />);
    const one = drawIn(() => (
      <Leaders domain={DOMAIN} baseline={0} value={1200} label="Scenario" textScale={1} />
    ));
    expect(plain.viewBox).toBe("0 0 1500 600");
    expect(one).toEqual(plain);
  });

  it("2 lays the leader drawing out in a half-size box, so everything draws twice as large", () => {
    const scaled = drawIn(() => (
      <Leaders domain={DOMAIN} baseline={0} value={1200} label="Scenario" textScale={2} />
    ));
    const plain = drawIn(() => <Leaders domain={DOMAIN} baseline={0} value={1200} label="Scenario" />);
    expect(scaled.viewBox).toBe("0 0 750 300");
    expect(scaled.text).toEqual(plain.text);
  });

  it("scales the corner layout the same way", () => {
    const scaled = drawIn(() => (
      <Corners domain={DOMAIN} baseline={0} value={1200} label="Scenario" textScale={1.5} />
    ));
    expect(scaled.viewBox).toBe("0 0 1000 400");
  });

  it("ignores a scale that is not a positive number", () => {
    const zero = drawIn(() => (
      <Leaders domain={DOMAIN} baseline={0} value={1200} label="Scenario" textScale={0} />
    ));
    expect(zero.viewBox).toBe("0 0 1500 600");
  });
});
