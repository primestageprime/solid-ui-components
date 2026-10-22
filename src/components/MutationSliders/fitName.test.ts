import { describe, expect, it } from "vitest";
import { ellipsize, fitName, nameForms } from "./fitName";

/** 7px per character: widths are exact, so each step of the ladder is pinned. */
const measure = (text: string): number => text.length * 7;

describe("fitName", () => {
  it("lists the forms longest first", () => {
    expect(nameForms("Dana Whitfield")).toEqual([
      "Dana Whitfield",
      "D. Whitfield",
      "Whitfield",
    ]);
    expect(nameForms("Roofer")).toEqual(["Roofer"]);
  });

  it.each([
    [100, "Dana Whitfield"],
    [84, "D. Whitfield"],
    [63, "Whitfield"],
    [42, "Whitf…"],
  ])("at %ipx picks %s", (width, expected) => {
    expect(fitName("Dana Whitfield", width, measure)).toBe(expected);
  });

  it("sends a one-word name straight to the ellipsis", () => {
    expect(fitName("Whitfield", 42, measure)).toBe("Whitf…");
    expect(fitName("Whitfield", 200, measure)).toBe("Whitfield");
  });

  it("never exceeds the column at any width that holds an ellipsis", () => {
    const widths = Array.from({ length: 120 }, (_, i) => i + 7);
    widths.forEach((width) => {
      ["Dana Whitfield", "Luis Ortega", "Marcus Reyes", "Madonna"].forEach(
        (name) => {
          expect(measure(fitName(name, width, measure))).toBeLessThanOrEqual(width);
        },
      );
    });
  });

  it("falls back to a bare ellipsis when nothing fits", () => {
    expect(ellipsize("Whitfield", 1, measure)).toBe("…");
  });
});
