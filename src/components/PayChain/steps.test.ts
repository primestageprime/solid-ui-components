import { describe, expect, it } from "vitest";
import { cadenceSuffix, cadenceTag, cleanSteps, dollars, toChainSteps, unitOf } from "./steps";

describe("cleanSteps", () => {
  it("drops a zero-length $0 gap step", () => {
    const out = cleanSteps([
      { amount_cents: 603_100, months: 2 },
      { amount_cents: 0, months: 0 },
      { amount_cents: 835_700, months: 13 },
    ]);
    expect(out.map((s) => s.amount_cents)).toEqual([603_100, 835_700]);
  });

  it("keeps a $0 step that has a length, or none (an open $0 end)", () => {
    expect(cleanSteps([{ amount_cents: 100, months: 1 }, { amount_cents: 0, months: 3 }])).toHaveLength(2);
    expect(cleanSteps([{ amount_cents: 100, months: 1 }, { amount_cents: 0 }])).toHaveLength(2);
  });

  it("keeps a zero-length step that is not $0", () => {
    expect(cleanSteps([{ amount_cents: 500, months: 0 }, { amount_cents: 600, months: 2 }])).toHaveLength(2);
  });

  it("merges equal consecutive amounts and adds their durations", () => {
    const out = cleanSteps([
      { amount_cents: 500_000, months: 3 },
      { amount_cents: 500_000, months: 4 },
      { amount_cents: 900_000, months: 2 },
    ]);
    expect(out).toEqual([
      { amount_cents: 500_000, months: 7, weeks: undefined },
      { amount_cents: 900_000, months: 2 },
    ]);
  });

  it("merges across a dropped gap: $5 -> $0 for 0 -> $5", () => {
    const out = cleanSteps([
      { amount_cents: 500, weeks: 4 },
      { amount_cents: 0, weeks: 0 },
      { amount_cents: 500, weeks: 6 },
    ], "biweekly");
    expect(out).toHaveLength(1);
    expect(out[0]?.weeks).toBe(10);
  });

  it("does not merge equal amounts that are not adjacent", () => {
    const out = cleanSteps([
      { amount_cents: 1, months: 1 },
      { amount_cents: 2, months: 1 },
      { amount_cents: 1, months: 1 },
    ]);
    expect(out).toHaveLength(3);
  });

  it("an open-ended step stays open when merged", () => {
    const out = cleanSteps([{ amount_cents: 700, months: 3 }, { amount_cents: 700 }]);
    expect(out).toEqual([{ amount_cents: 700 }]);
  });

  it("does not mutate its input", () => {
    const input = [{ amount_cents: 1, months: 1 }, { amount_cents: 1, months: 1 }];
    cleanSteps(input);
    expect(input[0]?.months).toBe(1);
  });
});

describe("wording", () => {
  it("whole dollars, thousands separated", () => {
    expect(dollars(625_049)).toBe("$6,250");
    expect(dollars(625_050)).toBe("$6,251");
    expect(dollars(0)).toBe("$0");
  });

  it("units and suffixes follow the cadence", () => {
    expect(unitOf("monthly")).toBe("mo");
    expect(unitOf("biweekly")).toBe("wk");
    expect(unitOf("Bi-Weekly")).toBe("wk");
    expect(unitOf("quarterly")).toBeUndefined();
    expect(cadenceSuffix("monthly")).toBe("/mo");
    expect(cadenceSuffix("biweekly")).toBe("/biwk");
    expect(cadenceSuffix("quarterly")).toBe("");
    expect(cadenceTag("biweekly")).toBe("bi-weekly");
    expect(cadenceTag("monthly")).toBe("monthly");
  });

  it("the first amount carries the suffix, later ones are bare; durations in the cadence's unit", () => {
    expect(
      toChainSteps(
        [
          { amount_cents: 625_000, months: 6 },
          { amount_cents: 3_750_000, months: 1 },
          { amount_cents: 1_666_700 },
        ],
        "monthly",
      ),
    ).toEqual([
      { label: "$6,250/mo", span: "6mo" },
      { label: "$37,500", span: "1mo" },
      { label: "$16,667", span: undefined },
    ]);
    const bi = toChainSteps([{ amount_cents: 278_400, weeks: 4 }, { amount_cents: 385_700, weeks: 52 }], "biweekly");
    expect(bi.map((s) => s.label)).toEqual(["$2,784/biwk", "$3,857"]);
    expect(bi.map((s) => s.span)).toEqual(["4wk", "52wk"]);
  });

  it("falls back to the other unit when the cadence's field is absent", () => {
    expect(toChainSteps([{ amount_cents: 100, weeks: 3 }], "monthly")[0]?.span).toBe("3wk");
  });
});
