import { describe, expect, it } from "vitest";
import {
  isPaintedStroke,
  readEmphasisColors,
  sameColorMap,
} from "./emphasisColor";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Builds an `<svg>` holding one tagged, painted-stroke `<line>`. */
function svgWithTaggedLine(
  attribute: string,
  value: string,
  stroke: string,
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute(attribute, value);
  // jsdom's `getComputedStyle` does not resolve an SVG presentation
  // attribute (`stroke="…"`) the way a real browser does — it only sees an
  // inline `style` rule, so the fixture sets the stroke that way.
  line.setAttribute("style", `stroke: ${stroke}`);
  svg.appendChild(line);
  document.body.appendChild(svg);
  return svg;
}

describe("isPaintedStroke", () => {
  it("rejects the empty string, none, and transparent black", () => {
    expect(isPaintedStroke("")).toBe(false);
    expect(isPaintedStroke("none")).toBe(false);
    expect(isPaintedStroke("rgba(0, 0, 0, 0)")).toBe(false);
  });

  it("accepts any other resolved colour", () => {
    expect(isPaintedStroke("rgb(192, 132, 252)")).toBe(true);
  });
});

describe("readEmphasisColors", () => {
  it("maps a tagged element's resolved stroke through idOf", () => {
    const root = svgWithTaggedLine("data-series-id", "upside", "rgb(1, 2, 3)");
    const colors = readEmphasisColors([
      { root, attribute: "data-series-id", idOf: (v) => `series:${v}` },
    ]);
    expect(colors["series:upside"]).toBe("rgb(1, 2, 3)");
  });

  it("merges more than one source, first match wins per id", () => {
    const primaryRoot = svgWithTaggedLine(
      "data-primary-line",
      "primary",
      "rgb(9, 9, 9)",
    );
    const seriesRoot = svgWithTaggedLine(
      "data-series-id",
      "upside",
      "rgb(1, 2, 3)",
    );
    const colors = readEmphasisColors([
      {
        root: primaryRoot,
        attribute: "data-primary-line",
        idOf: () => "primary",
      },
      {
        root: seriesRoot,
        attribute: "data-series-id",
        idOf: (v) => `series:${v}`,
      },
    ]);
    expect(colors.primary).toBe("rgb(9, 9, 9)");
    expect(colors["series:upside"]).toBe("rgb(1, 2, 3)");
  });

  it("skips an element whose resolved stroke paints nothing", () => {
    const root = svgWithTaggedLine("data-series-id", "hidden", "none");
    const colors = readEmphasisColors([
      { root, attribute: "data-series-id", idOf: (v) => v },
    ]);
    expect(colors.hidden).toBeUndefined();
  });

  it("returns an empty map for an undefined root", () => {
    const colors = readEmphasisColors([
      { root: undefined, attribute: "data-series-id", idOf: (v) => v },
    ]);
    expect(colors).toEqual({});
  });
});

describe("sameColorMap", () => {
  it("is true for two maps with the same keys and colours", () => {
    expect(sameColorMap({ a: "red" }, { a: "red" })).toBe(true);
  });

  it("is false when a key's colour differs", () => {
    expect(sameColorMap({ a: "red" }, { a: "blue" })).toBe(false);
  });

  it("is false when the key sets differ in size", () => {
    expect(sameColorMap({ a: "red" }, { a: "red", b: "blue" })).toBe(false);
  });
});
