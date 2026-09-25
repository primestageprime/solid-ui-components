// The consumer contract for the one piece of geometry.ts the barrel
// publishes: the leaders/corners breakpoint. Pinned from the PACKAGE ROOT
// because an ambiguous `export *` resolves to nothing, silently — and the
// qualified type names (`RateGaugeBox`, `RateGaugeCalloutMode`) are why this
// one can't collide.
import { describe, expect, it } from "vitest";
import * as sui from "../../index";
import type { RateGaugeBox, RateGaugeCalloutMode } from "../../index";

describe("RateGauge barrel — the callout breakpoint", () => {
  it("publishes calloutModeFor at the root", () => {
    const labels = ["Current $1.2M", "Baseline $1.1M"];
    const wide: RateGaugeBox = { width: 2000, height: 300 };
    const narrow: RateGaugeBox = { width: 40, height: 300 };
    const modes: RateGaugeCalloutMode[] = [
      sui.calloutModeFor(wide, labels),
      sui.calloutModeFor(narrow, labels),
    ];
    expect(modes).toEqual(["leaders", "corners"]);
  });

  it("publishes rateGaugeCalloutLabels at the root, and calloutModeFor takes its output", () => {
    const labels = sui.rateGaugeCalloutLabels({
      domain: [-40000, 40000],
      baseline: 5000,
      value: 23000,
      label: "Scenario A",
    });
    expect(sui.calloutModeFor({ width: 600, height: 200 }, labels)).toBe("leaders");
  });
});
