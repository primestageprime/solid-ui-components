// The canvas on its own, with no Composite above it. Two things this proves
// that RateGauge.test.tsx cannot:
//
//  1. every WORD arrives through `lines` and `valueText` — the canvas invents
//     none of them, so nonsense words here land verbatim on the readout;
//  2. the label seam is a seam. The canvas draws the <foreignObject> and the
//     label box, and whatever `renderLabel` returns is what goes inside. Here
//     that is a bare <b>, nowhere near a SUI Tooltip — so the canvas is
//     provably not the thing that chose Tooltip.
import { describe, it, expect, afterEach } from "vitest";
import type { JSX } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import {
  RateGaugeCanvas,
  type RateGaugeLabelSlot,
  type RateGaugeLine,
} from "./RateGaugeCanvas";
import type { Callout, GaugeGeometry } from "./geometry";

afterEach(cleanup);

const mount = (over: {
  lines?: (c: Callout, g: GaugeGeometry) => readonly RateGaugeLine[];
  renderLabel?: (slot: RateGaugeLabelSlot) => JSX.Element;
} = {}) =>
  render(() => (
    <RateGaugeCanvas
      domain={[-100, 100]}
      baseline={10}
      value={40}
      labels={["a name", "+30"]}
      lines={
        over.lines ??
        ((c) => [{ text: `words for ${c.id}`, unbounded: false }])
      }
      valueText={(g) => `announced ${g.drawnValue} of ${g.drawnBaseline}`}
      ariaLabel="A dial"
      renderLabel={over.renderLabel ?? (() => null)}
    />
  ));

describe("RateGaugeCanvas", () => {
  it("draws the meter host and the dial, and says only what it was given", () => {
    const { container } = mount();
    const host = container.querySelector(".sui-rate-gauge") as HTMLElement;
    expect(host.getAttribute("role")).toBe("meter");
    expect(host.getAttribute("aria-label")).toBe("A dial");
    expect(host.getAttribute("aria-valuemin")).toBe("-100");
    expect(host.getAttribute("aria-valuemax")).toBe("100");
    expect(host.getAttribute("aria-valuenow")).toBe("40");
    expect(host.getAttribute("aria-valuetext")).toBe("announced 40 of 10");
    expect(container.querySelector("svg.sui-rate-gauge__canvas")).not.toBeNull();
    expect(
      container.querySelectorAll("path.sui-rate-gauge__band").length,
    ).toBeGreaterThan(0);
    // Every callout line is the caller's string, painted as SVG text because
    // the caller marked it bounded.
    const texts = [
      ...container.querySelectorAll("text.sui-rate-gauge__label"),
    ].map((t) => t.textContent);
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.every((t) => t?.startsWith("words for "))).toBe(true);
    expect(container.querySelector("foreignObject")).toBeNull();
  });

  it("sends an unbounded line to the label seam and draws what comes back", () => {
    const seen: RateGaugeLabelSlot[] = [];
    const { container } = mount({
      lines: (c) => [
        { text: `long ${c.id}`, unbounded: c.id !== "delta" },
        { text: "short", unbounded: false },
      ],
      renderLabel: (slot) => {
        seen.push(slot);
        return <b>{slot.text}</b>;
      },
    });
    expect(seen.length).toBeGreaterThan(0);
    const box = container.querySelector(
      "foreignObject .sui-rate-gauge__label-box",
    )!;
    expect(box).not.toBeNull();
    expect(box.querySelector("b")?.textContent).toBe(seen[0].text);
    // The bounded second line never reaches the seam.
    expect(seen.every((s) => s.text !== "short")).toBe(true);
  });
});
