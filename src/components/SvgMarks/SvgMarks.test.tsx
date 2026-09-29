import { render } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { describe, expect, it } from "vitest";
import {
  BoxRing,
  EndLabels,
  GlyphBadge,
  HatchPattern,
  SegmentBar,
} from "./index";

const inSvg = (mark: () => JSX.Element) =>
  render(() => (
    <svg width="400" height="100" role="img" aria-label="marks">
      {mark()}
    </svg>
  ));

const box = { x: 10, y: 20, width: 200, height: 26 };

describe("HatchPattern", () => {
  it("renders a pattern with the caller's id, ground and stripe in the given colour", () => {
    const { container } = inSvg(() => (
      <HatchPattern id="wait-hatch" color="var(--sui-warning)" />
    ));
    const pattern = container.querySelector("pattern#wait-hatch");
    expect(pattern).not.toBeNull();
    const rects = pattern?.querySelectorAll("rect") ?? [];
    expect(rects).toHaveLength(2);
    expect(rects[0].getAttribute("fill")).toBe("var(--sui-warning)");
    expect(pattern?.getAttribute("patternTransform")).toBe("rotate(45)");
  });
});

describe("SegmentBar", () => {
  it("draws one rect per segment, clipped, with a seam where two segments touch", () => {
    const { container } = inSvg(() => (
      <SegmentBar
        box={box}
        segments={[
          { from: 0, to: 0.5, fill: "red" },
          { from: 0.5, to: 1, fill: "url(#wait-hatch)" },
        ]}
      />
    ));
    const clipped = container.querySelector(".sui-segment-bar g[clip-path]");
    expect(clipped?.querySelectorAll(":scope > rect")).toHaveLength(2);
    expect(container.querySelectorAll(".sui-segment-bar__seam")).toHaveLength(
      1,
    );
    expect(container.querySelector("clipPath rect")?.getAttribute("rx")).toBe(
      "4",
    );
  });

  it("flags itself hovered for the outline", () => {
    const { container } = inSvg(() => (
      <SegmentBar
        box={box}
        segments={[{ from: 0, to: 1, fill: "red" }]}
        hovered
      />
    ));
    expect(
      container.querySelector(".sui-segment-bar")?.hasAttribute("data-hovered"),
    ).toBe(true);
  });

  it("gives every bar its own clip id", () => {
    const { container } = inSvg(() => (
      <>
        <SegmentBar box={box} segments={[{ from: 0, to: 1, fill: "red" }]} />
        <SegmentBar
          box={{ ...box, y: 60 }}
          segments={[{ from: 0, to: 1, fill: "red" }]}
        />
      </>
    ));
    const ids = [...container.querySelectorAll("clipPath")].map((c) => c.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("BoxRing", () => {
  it("stands the ring off the box by its offset, in the given colour", () => {
    const { container } = inSvg(() => (
      <BoxRing box={box} color="var(--sui-danger)" />
    ));
    const ring = container.querySelector(".sui-box-ring");
    expect(ring?.getAttribute("x")).toBe("7");
    expect(ring?.getAttribute("width")).toBe("206");
    expect(ring?.getAttribute("stroke")).toBe("var(--sui-danger)");
  });
});

describe("GlyphBadge", () => {
  it("draws a disc the size of the box's shorter side with a text glyph at its centre", () => {
    const { container } = inSvg(() => (
      <GlyphBadge
        box={{ x: 0, y: 0, width: 16, height: 16 }}
        color="red"
        glyph={{ text: "!" }}
        glyphColor="white"
      />
    ));
    expect(container.querySelector("circle")?.getAttribute("r")).toBe("8");
    expect(container.querySelector(".sui-glyph-badge__text")?.textContent).toBe(
      "!",
    );
  });

  it("draws a path glyph instead of text when given one", () => {
    const { container } = inSvg(() => (
      <GlyphBadge
        box={{ x: 0, y: 0, width: 16, height: 16 }}
        color="red"
        glyph={{ path: "M2 2 L14 14" }}
        glyphColor="white"
      />
    ));
    expect(
      container.querySelector(".sui-glyph-badge__path")?.getAttribute("d"),
    ).toBe("M2 2 L14 14");
    expect(container.querySelector(".sui-glyph-badge__text")).toBeNull();
  });
});

describe("EndLabels", () => {
  it("draws both labels when they fit", () => {
    const { container } = inSvg(() => (
      <EndLabels box={box} lead="#3" trail="$33.8k" color="black" />
    ));
    const texts = [...container.querySelectorAll(".sui-end-labels__text")].map(
      (t) => t.textContent,
    );
    expect(texts).toEqual(["#3", "$33.8k"]);
  });

  it("drops the trail when the box is too narrow for both", () => {
    const { container } = inSvg(() => (
      <EndLabels
        box={{ ...box, width: 50 }}
        lead="#3"
        trail="$33.8k"
        color="black"
      />
    ));
    const texts = [...container.querySelectorAll(".sui-end-labels__text")].map(
      (t) => t.textContent,
    );
    expect(texts).toEqual(["#3"]);
  });
});
