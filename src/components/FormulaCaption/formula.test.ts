import { describe, expect, it } from "vitest";
import { formulaText } from "./formula";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

describe("formulaText", () => {
  it("states the operator, the factor and the result of operand × factor", () => {
    expect(
      formulaText(8, 125, {
        operator: "×",
        formatFactor: money,
        formatResult: money,
      }),
    ).toBe("× $125 = $1,000");
  });

  it("says nothing when either side is missing", () => {
    expect(
      formulaText(null, 125, {
        operator: "×",
        formatFactor: money,
        formatResult: money,
      }),
    ).toBeNull();
    expect(
      formulaText(8, null, {
        operator: "×",
        formatFactor: money,
        formatResult: money,
      }),
    ).toBeNull();
  });

  it("formats with String by default", () => {
    expect(formulaText(3, 4, { operator: "×" })).toBe("× 4 = 12");
  });
});
