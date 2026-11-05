import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { AmountShapeGlyph, CadenceGlyph, DirectionGlyph, cadenceLabel } from ".";

const svg = (c: HTMLElement) => c.querySelector("svg")!;

describe("DirectionGlyph", () => {
  it("expense is a red down arrow with words", () => {
    const { container } = render(() => <DirectionGlyph direction="expense" />);
    expect(svg(container).getAttribute("aria-label")).toBe("Expense: money going out");
    expect(container.querySelector(".sui-glyph--danger")).not.toBeNull();
    expect(svg(container).querySelector("path")!.getAttribute("d")).toBe("M8 3v10M4 9l4 4 4-4");
  });
  it("revenue is a green up arrow with words", () => {
    const { container } = render(() => <DirectionGlyph direction="revenue" />);
    expect(svg(container).getAttribute("aria-label")).toBe("Revenue: money coming in");
    expect(container.querySelector(".sui-glyph--success")).not.toBeNull();
    expect(svg(container).querySelector("path")!.getAttribute("d")).toBe("M8 13V3M4 7l4-4 4 4");
  });
});

describe("AmountShapeGlyph", () => {
  it("fixed draws a metronome, variable draws three error bars", () => {
    const fixed = render(() => <AmountShapeGlyph shape="fixed" />);
    expect(svg(fixed.container).getAttribute("aria-label")).toBe("Fixed amount: the same every time");
    expect(svg(fixed.container).querySelectorAll("circle")).toHaveLength(1);
    const variable = render(() => <AmountShapeGlyph shape="variable" />);
    expect(svg(variable.container).getAttribute("aria-label")).toBe("Variable amount: a range");
    expect(svg(variable.container).querySelectorAll("circle")).toHaveLength(3);
  });
});

describe("CadenceGlyph", () => {
  it("words every cadence", () => {
    expect(cadenceLabel("weekly")).toBe("Weekly");
    expect(cadenceLabel("biweekly")).toBe("Every two weeks");
    expect(cadenceLabel("monthly")).toBe("Monthly");
    expect(cadenceLabel("annual")).toBe("Every year");
    expect(cadenceLabel("once")).toBe("Once");
    expect(cadenceLabel("every-n", 3)).toBe("Every 3 months");
    expect(cadenceLabel("every-n")).toBe("Every N months");
  });
  it("weekly is five lines inside the calendar", () => {
    const { container } = render(() => <CadenceGlyph cadence="weekly" />);
    // frame: 2 paths? count the rhythm lines: calendar has 1 rect + 1 path of rules, then 5 day lines
    expect(svg(container).querySelectorAll("path")).toHaveLength(6);
  });
  it("fortnightly is two rows of five, only the second filled", () => {
    const { container } = render(() => <CadenceGlyph cadence="biweekly" />);
    const cells = svg(container).querySelectorAll("rect[width='1.4']");
    expect(cells).toHaveLength(10);
    expect(svg(container).querySelectorAll("rect[fill='currentColor']")).toHaveLength(5);
  });
  it("monthly lights one day", () => {
    const { container } = render(() => <CadenceGlyph cadence="monthly" />);
    expect(svg(container).querySelectorAll("rect[fill='currentColor']")).toHaveLength(1);
  });
  it("annual, every-n and once are a letter on the calendar", () => {
    const letter = (c: "annual" | "every-n" | "once") =>
      render(() => <CadenceGlyph cadence={c} />).container.querySelector("text")!.textContent;
    expect(letter("annual")).toBe("Y");
    expect(letter("every-n")).toBe("N");
    expect(letter("once")).toBe("1");
  });
});
