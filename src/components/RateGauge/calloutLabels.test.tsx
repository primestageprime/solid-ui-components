// G20 — `rateGaugeCalloutLabels(props)`: EXACTLY the texts the leader
// callouts draw, so an app can pick leaders vs corners with
// `calloutModeFor(box, labels)` without drifting from the gauge. Printed
// headless, then checked against what RateGauge actually renders.
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { join, map } from "../../fn";
import { calloutModeFor } from "./geometry";
import {
  RateGauge,
  type RateGaugeCalloutLabelProps,
  rateGaugeCalloutLabels,
} from "./RateGauge";

const money = (v: number): string =>
  `${v < 0 ? "−" : ""}$${Math.abs(Math.round(v / 1000))}K/mo`;

const CASES: readonly [string, RateGaugeCalloutLabelProps][] = [
  ["plain words", { domain: [-40000, 40000], baseline: 5000, value: 23000, label: "Scenario A" }],
  ["needles coincide", { domain: [-40000, 40000], baseline: 5000, value: 5000, label: "Scenario A" }],
  ["value past the pole", { domain: [-40000, 40000], baseline: 0, value: 90000, label: "Scenario A" }],
  [
    "consumer wording",
    {
      domain: [-40000, 40000],
      baseline: 12000,
      value: 18000,
      label: "Draft payroll",
      baselineLabel: "Baseline",
      formatAgainst: money,
      formatDelta: (d) => `${d < 0 ? "−" : "+"}${money(Math.abs(d))}`,
    },
  ],
];

describe("rateGaugeCalloutLabels — the printed texts", () => {
  it("prints the texts and the mode they pick at a narrow and a wide box", () => {
    const rowOf = ([name, props]: [string, RateGaugeCalloutLabelProps]): string => {
      const labels = rateGaugeCalloutLabels(props);
      const narrow = calloutModeFor({ width: 220, height: 200 }, labels);
      const wide = calloutModeFor({ width: 600, height: 200 }, labels);
      return `${name.padEnd(20)} ${narrow.padEnd(8)} ${wide.padEnd(8)} ${join(" | ", labels)}`;
    };
    expect(join("\n", map(rowOf, [...CASES]))).toMatchInlineSnapshot(`
      "plain words          leaders  leaders  Scenario A | +18,000 | Reference | 23,000 | 5,000
      needles coincide     corners  leaders  Scenario A = Reference | 5,000 | 5,000
      value past the pole  leaders  leaders  Scenario A | +40,000 | Reference | 40,000 | at zero
      consumer wording     leaders  leaders  Draft payroll | +$6K/mo | Baseline | $18K/mo | $12K/mo"
    `);
  });

  it("is exactly what RateGauge draws — every drawn row is built from these texts", () => {
    for (const [, props] of CASES) {
      const { container, unmount } = render(() => <RateGauge {...props} />);
      let drawn = join(
        "",
        map(
          (node: Element) => node.textContent ?? "",
          [...container.querySelectorAll(".sui-rate-gauge__row")],
        ),
      );
      // Strike each builder text out of the drawn words, once. Nothing may be
      // left over (the gauge drew no word the builder didn't list), and every
      // text must be found (the builder lists no word the gauge didn't draw) —
      // except a relative repeated when the needles coincide, drawn once.
      for (const text of rateGaugeCalloutLabels(props)) {
        const at = drawn.indexOf(text);
        if (at >= 0) drawn = drawn.slice(0, at) + drawn.slice(at + text.length);
      }
      expect(drawn).toBe("");
      unmount();
    }
  });
});
