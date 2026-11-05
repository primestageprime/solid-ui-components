import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { GlyphFrame } from "./GlyphFrame";

describe("GlyphFrame", () => {
  it("draws the children in a 16 box with the label as its accessible name", () => {
    const { container } = render(() => (
      <GlyphFrame label="Something">
        <circle cx="8" cy="8" r="4" />
      </GlyphFrame>
    ));
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 16 16");
    expect(svg.getAttribute("aria-label")).toBe("Something");
    expect(svg.querySelector("circle")).not.toBeNull();
    expect(container.querySelector(".sui-glyph")!.className).not.toContain("--");
  });

  it("takes a colour role as a class", () => {
    const { container } = render(() => (
      <GlyphFrame label="x" tone="danger">
        <path d="M0 0" />
      </GlyphFrame>
    ));
    expect(container.querySelector(".sui-glyph--danger")).not.toBeNull();
  });
});
