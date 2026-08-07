import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { AlarmStripeDefs } from "./AlarmStripeDefs";

// No chart context needed — this one composes nothing and reads nothing; it is
// a pure <defs> block. Its decisions are the three defaults and the split
// between geometry (numeric, because SVG geometry attributes do not resolve
// var()) and paint (CSS vars with literal fallbacks).
const pattern = (c: HTMLElement) => c.querySelector("pattern");
const rect = (c: HTMLElement) => c.querySelector("pattern rect");
const line = (c: HTMLElement) => c.querySelector("pattern line");

describe("AlarmStripeDefs — defaults", () => {
  it("registers the pattern under the default id", () => {
    const { container } = render(() => <AlarmStripeDefs />);
    expect(pattern(container)?.getAttribute("id")).toBe("alarm-stripe");
  });

  it("defaults the tile to 10 and the stroke to 3", () => {
    const { container } = render(() => <AlarmStripeDefs />);
    expect(pattern(container)?.getAttribute("width")).toBe("10");
    expect(pattern(container)?.getAttribute("height")).toBe("10");
    expect(line(container)?.getAttribute("stroke-width")).toBe("3");
  });

  it("tiles in user space and rotates the motif 45°", () => {
    const { container } = render(() => <AlarmStripeDefs />);
    expect(pattern(container)?.getAttribute("patternUnits")).toBe(
      "userSpaceOnUse",
    );
    expect(pattern(container)?.getAttribute("patternTransform")).toBe(
      "rotate(45)",
    );
  });
});

describe("AlarmStripeDefs — configuration", () => {
  // The id is configurable precisely so two overlays on one page do not
  // collide — `fill="url(#id)"` resolves document-wide, so a fixed id would
  // silently make the second overlay adopt the first one's stripe.
  it("uses a supplied pattern id", () => {
    const { container } = render(() => (
      <AlarmStripeDefs patternId="alarm-stripe-b" />
    ));
    expect(pattern(container)?.getAttribute("id")).toBe("alarm-stripe-b");
  });

  // `spacing` drives BOTH the tile box and the line's end point. Wiring it to
  // only one of them yields a motif that no longer tiles seamlessly, which is
  // a subtle visual break rather than an obvious one.
  it("drives the tile box and the line length from one spacing value", () => {
    const { container } = render(() => <AlarmStripeDefs spacing={24} />);
    expect(pattern(container)?.getAttribute("width")).toBe("24");
    expect(pattern(container)?.getAttribute("height")).toBe("24");
    expect(rect(container)?.getAttribute("width")).toBe("24");
    expect(rect(container)?.getAttribute("height")).toBe("24");
    expect(line(container)?.getAttribute("y2")).toBe("24");
  });

  it("uses a supplied stroke width", () => {
    const { container } = render(() => <AlarmStripeDefs strokeWidth={7} />);
    expect(line(container)?.getAttribute("stroke-width")).toBe("7");
  });
});

describe("AlarmStripeDefs — geometry vs paint", () => {
  // The header states the rule: geometry must stay numeric because SVG
  // geometry attributes do not resolve var(), while paint is themed. A
  // "consistency" refactor that tokenised width/height would collapse the tile
  // to 0/NaN — this pins that geometry carries no var().
  it("keeps geometry numeric, with no CSS var anywhere in it", () => {
    const { container } = render(() => <AlarmStripeDefs spacing={12} />);
    for (const attr of ["width", "height"]) {
      expect(pattern(container)?.getAttribute(attr)).not.toContain("var(");
      expect(rect(container)?.getAttribute(attr)).not.toContain("var(");
    }
    expect(line(container)?.getAttribute("y2")).not.toContain("var(");
    expect(line(container)?.getAttribute("stroke-width")).not.toContain("var(");
  });

  it("themes paint through CSS vars with literal fallbacks", () => {
    const { container } = render(() => <AlarmStripeDefs />);
    expect(rect(container)?.getAttribute("fill")).toContain(
      "--sui-alarm-zone-stripe-fill",
    );
    expect(rect(container)?.getAttribute("fill")).toContain("#ff4040");
    expect(rect(container)?.getAttribute("fill-opacity")).toContain(
      "--sui-alarm-zone-stripe-bg-opacity",
    );
    expect(line(container)?.getAttribute("stroke-opacity")).toContain(
      "--sui-alarm-zone-stripe-line-opacity",
    );
  });
});
