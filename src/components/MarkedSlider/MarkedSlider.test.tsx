// ============================================
// MarkedSlider — mounting tests.
//
// geometry.test.ts already proves every number this component draws. What is
// left to prove here is that the DOM carries them, and that the Primitive's
// OWN promises hold: the marks are painted, the thumb announces the allowed
// RANGE rather than the whole domain, a value outside the range never reaches
// a callback, a slider with no value has no thumb, and the two callbacks fire
// once each per gesture.
//
// It also pins the axiom this component exists to serve: the drawing is here,
// in a Depth-1 Primitive that owns its CSS, so no Composite has to.
// ============================================
import { fireEvent, render } from "@solidjs/testing-library";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type FakeSizer, installFakeSizer } from "../../test-utils";
import { MarkedSlider } from "./MarkedSlider";
import { ContinuousMarkedSlider } from "./variants";

// Kobalte's Slider measures its track through ResizeObserver; jsdom lacks it.
let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

const DOMAIN: readonly [number, number] = [0, 200];
const RANGE: readonly [number, number] = [40, 60];

describe("MarkedSlider", () => {
  it("draws the prior label beside the prior arrow only when asked", () => {
    const withLabel = render(() => (
      <MarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={44}
        value={52}
        priorLabel="44"
        label="Ana"
      />
    ));
    const text = withLabel.container.querySelector(
      ".sui-marked-slider__prior-label",
    );
    expect(text?.textContent).toBe("44");
    const without = render(() => (
      <MarkedSlider domain={DOMAIN} range={RANGE} prior={44} value={52} label="Bo" />
    ));
    expect(
      without.container.querySelector(".sui-marked-slider__prior-label"),
    ).toBeNull();
  });

  it("paints the track, the allowed range and both arrowheads", () => {
    const { container } = render(() => (
      <MarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={44}
        value={52}
        label="Ana"
      />
    ));
    expect(container.querySelector(".sui-marked-slider")).toBeTruthy();
    expect(container.querySelector(".sui-marked-slider__track-line")).toBeTruthy();
    expect(container.querySelector(".sui-marked-slider__band")).toBeTruthy();
    expect(
      container.querySelector(".sui-marked-slider__arrow--prior"),
    ).toBeTruthy();
    expect(
      container.querySelector(".sui-marked-slider__arrow--future"),
    ).toBeTruthy();
  });

  it("tones the change line by direction", () => {
    const rise = render(() => (
      <MarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={44}
        value={52}
        label="Up"
      />
    ));
    expect(
      rise.container.querySelector(".sui-marked-slider__change--raise"),
    ).toBeTruthy();
    const fall = render(() => (
      <MarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={52}
        value={44}
        label="Down"
      />
    ));
    expect(
      fall.container.querySelector(".sui-marked-slider__change--cut"),
    ).toBeTruthy();
  });

  it("prints the caller's delta label, and holds its space without one", () => {
    const { container } = render(() => (
      <MarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={44}
        value={52}
        deltaLabel="+8"
        label="Ana"
      />
    ));
    const delta = container.querySelector(
      ".sui-marked-slider__delta",
    ) as SVGTextElement;
    expect(delta.textContent).toBe("+8");
    expect(delta.getAttribute("class")).not.toContain(
      "sui-marked-slider__reserved",
    );

    const bare = render(() => (
      <MarkedSlider domain={DOMAIN} range={RANGE} prior={44} value={44} label="B" />
    ));
    const hidden = bare.container.querySelector(
      ".sui-marked-slider__delta",
    ) as SVGTextElement;
    // Present, merely hidden — a node that came and went would change the
    // slider's shape between states.
    expect(hidden.getAttribute("class")).toContain(
      "sui-marked-slider__reserved",
    );
    expect(hidden.textContent).toBe(" ");
  });

  it("announces the ALLOWED RANGE, not the whole domain", () => {
    const { container } = render(() => (
      <MarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={44}
        value={52}
        label="Ana"
        valueText="$52k"
      />
    ));
    const thumb = container.querySelector('[role="slider"]') as HTMLElement;
    expect(thumb.getAttribute("aria-label")).toBe("Ana");
    expect(thumb.getAttribute("aria-valuemin")).toBe("40");
    expect(thumb.getAttribute("aria-valuemax")).toBe("60");
    expect(thumb.getAttribute("aria-valuetext")).toBe("$52k");
  });

  it("has no thumb, and is disabled, with no value at all", () => {
    const { container } = render(() => (
      <MarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={44}
        value={null}
        label="Gone"
      />
    ));
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(0);
    // The range box and the prior mark stay: the comparison survives.
    expect(container.querySelector(".sui-marked-slider__band")).toBeTruthy();
    expect(
      container.querySelector(".sui-marked-slider__arrow--prior"),
    ).toBeTruthy();
    expect(container.querySelector("[data-removed]")).toBeTruthy();
  });

  it("draws the selected ring only when asked", () => {
    const off = render(() => (
      <MarkedSlider domain={DOMAIN} range={RANGE} prior={44} value={52} label="A" />
    ));
    expect(
      off.container.querySelector(".sui-marked-slider--active"),
    ).toBeNull();
    const on = render(() => (
      <MarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={44}
        value={52}
        label="A"
        active
      />
    ));
    expect(
      on.container.querySelector(".sui-marked-slider--active"),
    ).toBeTruthy();
  });

  it("steps by `keyStep` on an arrow key, and commits that step", () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    const { container } = render(() => (
      <MarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={44}
        value={50}
        label="Ana"
        keyStep={5}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
      />
    ));
    const thumb = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(thumb, { key: "ArrowUp" });
    // One arrow key is a whole gesture: it moves AND it commits.
    expect(onChange).toHaveBeenCalledWith(55);
    expect(onChangeEnd).toHaveBeenCalledWith(55);
  });

  it("never emits past the allowed range, however far the key pushes", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <MarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={44}
        value={58}
        label="Ana"
        keyStep={5}
        onChange={onChange}
      />
    ));
    const thumb = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(thumb, { key: "ArrowUp" });
    // 58 + 5 is 63; the ceiling is 60 and the ceiling wins.
    expect(onChange).toHaveBeenCalledWith(60);
  });

  it("pages by ten steps on Shift+arrow and on PageUp", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <MarkedSlider
        domain={[0, 2000]}
        range={[0, 2000]}
        prior={100}
        value={100}
        label="Ana"
        keyStep={5}
        onChange={onChange}
      />
    ));
    const thumb = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(thumb, { key: "ArrowUp", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(150);
    fireEvent.keyDown(thumb, { key: "PageDown" });
    expect(onChange).toHaveBeenLastCalledWith(50);
  });

  it("lands emitted values on the caller's grid", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <MarkedSlider
        domain={[0, 1000]}
        range={[0, 1000]}
        prior={100}
        value={100}
        label="Ana"
        keyStep={7}
        snap={10}
        onChange={onChange}
      />
    ));
    const thumb = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(thumb, { key: "ArrowUp" });
    // 107, snapped onto tens.
    expect(onChange).toHaveBeenCalledWith(110);
  });

  it("leaves a key it does not own to Kobalte", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <MarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={44}
        value={50}
        label="Ana"
        keyStep={5}
        onChange={onChange}
      />
    ));
    const thumb = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(thumb, { key: "Tab" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("curries its one look as a drop-in", () => {
    const { container } = render(() => (
      <ContinuousMarkedSlider
        domain={DOMAIN}
        range={RANGE}
        prior={44}
        value={52}
        label="Ana"
      />
    ));
    expect(container.querySelector(".sui-marked-slider")).toBeTruthy();
    expect(container.querySelector('[role="slider"]')).toBeTruthy();
  });
});
