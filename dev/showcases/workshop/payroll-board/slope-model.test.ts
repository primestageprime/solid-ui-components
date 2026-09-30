import { describe, expect, it } from "vitest";
import { NATURAL_GAUGE_WIDTH } from "../../../../src/components/RateGauge/geometry";
import {
  amountPerMonth,
  SLOPE_FIXTURE,
  boxProportions,
  cornerBlocks,
  cornerDelta,
  calloutsFit,
  columnTextsFor,
  observeGaugeBoxes,
  observeProportions,
  proportionsRow,
} from "./slope-model";

const LABELS = columnTextsFor(SLOPE_FIXTURE.baseline, SLOPE_FIXTURE.scenario);

describe("payroll board — slope rail proportions", () => {
  it("words the callouts the way thorcasting's screen does", () => {
    expect(LABELS).toEqual(["Scenario", "-$2,921/mo", "Baseline", "$35,057/mo", "$37,978/mo"]);
  });

  it("prints rail height → gauge box → ring → callout fit", () => {
    console.log(observeProportions());
    console.log(observeProportions(340));
  });

  it("at today's 292px rail, a 540px rail card is height-bound and a 600px one is not", () => {
    expect(proportionsRow(540, NATURAL_GAUGE_WIDTH, LABELS).bound).toBe("height");
    expect(proportionsRow(600, NATURAL_GAUGE_WIDTH, LABELS).bound).toBe("width");
  });

  it("the callouts keep their whole column whichever dimension binds", () => {
    for (const height of [360, 480, 600, 720]) {
      expect(calloutsFit(proportionsRow(height, NATURAL_GAUGE_WIDTH, LABELS))).toBe(true);
    }
  });

  it("a rail at minRailWidth is height-bound, one px narrower is not", () => {
    const { minRailWidth } = proportionsRow(720, NATURAL_GAUGE_WIDTH, LABELS);
    expect(proportionsRow(720, minRailWidth, LABELS).bound).toBe("height");
    expect(proportionsRow(720, minRailWidth - 2, LABELS).bound).toBe("width");
  });

  it("words the corner blocks: scenario with its amount and the diff, baseline with its amount", () => {
    expect(cornerBlocks(75_000, 125_000)).toEqual({
      value: ["Scenario", "$125,000/mo", "+$50,000/mo (67%)"],
      baseline: ["Baseline", "$75,000/mo"],
    });
  });

  it("words the diff as a signed amount and a whole percent of the baseline", () => {
    expect(cornerDelta(100_000, 150_000)).toBe("+$50,000/mo (50%)");
    expect(cornerDelta(SLOPE_FIXTURE.baseline, SLOPE_FIXTURE.scenario)).toBe("-$2,921/mo (-8%)");
  });

  it("switches to corners exactly where the leaders stop being height-bound", () => {
    const blocks = cornerBlocks(SLOPE_FIXTURE.baseline, SLOPE_FIXTURE.scenario);
    const at = (width: number) => boxProportions({ width, height: 430 }, LABELS, blocks);
    const threshold = at(10_000).minLeadersWidth;
    expect(at(threshold).calloutMode).toBe("leaders");
    expect(at(threshold).bound).toBe("height");
    expect(at(threshold - 1).calloutMode).toBe("corners");
    // The corner ring still fills the height at Peter's 286px rail.
    expect(at(268).fitBound).toBe("height");
  });

  it("prints gauge box height → leaders need → mode per rail width", () => {
    console.log(observeGaugeBoxes());
  });

  it("signs a value's amount only when it is negative", () => {
    expect(amountPerMonth(-40_000)).toBe("-$40,000/mo");
    expect(amountPerMonth(35_057)).toBe("$35,057/mo");
    expect(amountPerMonth(0)).toBe("$0/mo");
  });
});
