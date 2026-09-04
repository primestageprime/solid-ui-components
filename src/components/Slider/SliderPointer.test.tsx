// Pointer behaviour on a REAL Slider — the suite dside sui#41120 asked for.
//
// These tests could not exist before `src/testing/jsdomNaNDeclarationShim.ts`.
// Kobalte writes `calc(NaN%)` on the thumb's first render, jsdom 30 throws on
// it, and so every consumer stubbed the component instead of mounting it. Drag,
// snap and clamp therefore had no coverage at all. The shim drops that one
// declaration the way a browser drops it, and the component mounts.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Slider } from "./Slider";
import {
  installFakeSizer,
  installRects,
  installPointerCapture,
  pointer,
  rectOf,
  type FakeSizer,
} from "../../test-utils";

/** Track geometry the whole file shares: 200 CSS pixels wide, flush at x=0. */
const TRACK = { left: 0, top: 0, width: 200, height: 8 } as const;

let sizer: FakeSizer;
let restoreRects: () => void;

beforeEach(() => {
  sizer = installFakeSizer();
  // Kobalte reads the track rect to turn a clientX into a value; jsdom reports
  // every rect as zero, which would make every position read as `min`.
  restoreRects = installRects((el) =>
    el.classList.contains("sui-slider__track") ? rectOf(TRACK) : null,
  );
});

afterEach(() => {
  restoreRects();
  sizer.restore();
});

/**
 * Mount a controlled Slider over the shared track and return the track plus the
 * `onChange` spy. The value signal is wired back into the prop, so the control
 * behaves the way a real caller's does rather than staying frozen.
 */
const mountSlider = (options: {
  value: number;
  min: number;
  max: number;
  step?: number;
}) => {
  const onChange = vi.fn();
  const [value, setValue] = createSignal(options.value);
  const { container } = render(() => (
    <Slider
      label="Draw"
      value={value()}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
      min={options.min}
      max={options.max}
      step={options.step ?? 1}
    />
  ));
  const track = container.querySelector(".sui-slider__track");
  if (!track) throw new Error("the Slider rendered no track");
  installPointerCapture(track);
  return { track, onChange, value, container };
};

describe("Slider — pointer", () => {
  it("mounts a real Slider, thumb and track included", () => {
    const { container, track } = mountSlider({ value: 0, min: 0, max: 100 });
    expect(track).toBeTruthy();
    expect(container.querySelector(".sui-slider__fill")).toBeTruthy();
    const thumb = container.querySelector('[role="slider"]');
    expect(thumb?.getAttribute("aria-valuenow")).toBe("0");
  });

  it("takes the value from where the pointer lands on the track", () => {
    const { track, onChange } = mountSlider({ value: 0, min: 0, max: 100 });
    // Half way along a 200px track reads as half the domain.
    pointer(track).down({ clientX: 100, clientY: 4 });
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it("snaps a landing between two steps to the nearer one", () => {
    const { track, onChange } = mountSlider({
      value: 0,
      min: 0,
      max: 100,
      step: 10,
    });
    // 137/200 of [0,100] is 68.5, which is nearer 70 than 60.
    pointer(track).down({ clientX: 137, clientY: 4 });
    expect(onChange).toHaveBeenCalledWith(70);
  });

  it("clamps a landing past the track end to max rather than overshooting", () => {
    const { track, onChange } = mountSlider({
      value: 0,
      min: 0,
      max: 100,
      step: 10,
    });
    // 500px on a 200px track scales to 250 — a browser lets the pointer leave
    // the element, so the clamp is the only thing holding the domain.
    pointer(track).down({ clientX: 500, clientY: 4 });
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it("counts the step from min, not from zero", () => {
    const { track, onChange } = mountSlider({
      value: 3,
      min: 3,
      max: 18,
      step: 5,
    });
    // 100/200 of [3,18] is 10.5. Steps counted from min sit at 3, 8, 13, 18,
    // so the nearest is 13 — a step counted from zero would answer 10.
    pointer(track).down({ clientX: 100, clientY: 4 });
    expect(onChange).toHaveBeenCalledWith(13);
  });

  it("drags: a move after the press keeps emitting", () => {
    const { track, onChange, value } = mountSlider({
      value: 0,
      min: 0,
      max: 100,
    });
    const gesture = pointer(track);
    gesture.down({ clientX: 50, clientY: 4 });
    gesture.move({ clientX: 150, clientY: 4 });
    gesture.up();
    expect(onChange.mock.calls.length).toBeGreaterThan(1);
    expect(value()).toBe(75);
  });

  it("emits nothing when the control is disabled", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <Slider
        label="Draw"
        value={20}
        onChange={onChange}
        min={0}
        max={100}
        disabled
      />
    ));
    const track = container.querySelector(".sui-slider__track");
    if (!track) throw new Error("the Slider rendered no track");
    installPointerCapture(track);
    pointer(track).down({ clientX: 180, clientY: 4 });
    expect(onChange).not.toHaveBeenCalled();
  });
});
