// ============================================
// The rail is the library's first true slider, so these tests carry the
// keyboard and ARIA contract as well as the drawing.
//
// The domain is [0, 100] and the rect is 700px wide throughout, which makes
// the pointer arithmetic exact rather than approximate: the rail runs from
// x=22 to x=678, so clientX 350 is the midpoint and reads back as 50.
// ============================================
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installPointerCapture,
  installRects,
  pointer,
  rectOf,
} from "../../test-utils";
import { createThresholdRail, ThresholdRail } from "./ThresholdRail";
import type { Threshold } from "./types";

const RECT_WIDTH = 700;
let restoreRects: (() => void) | undefined;

const sizeTheRail = (): void => {
  restoreRects = installRects((el) =>
    el.tagName.toLowerCase() === "svg"
      ? rectOf({ left: 0, top: 0, width: RECT_WIDTH, height: 150 })
      : null,
  );
};

afterEach(() => {
  restoreRects?.();
  restoreRects = undefined;
});

const THRESHOLDS: Threshold[] = [
  { value: 25, label: "safe in 6 mo", tone: "success" },
  { value: 60, label: "or hire a bookkeeper", tone: "warning" },
  { value: 90, label: "max draw", tone: "muted", side: "below" },
];

const key = (el: Element, k: string, shiftKey = false): void => {
  el.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: k,
      shiftKey,
      bubbles: true,
      cancelable: true,
    }),
  );
};

/** The host — it carries the slider role, the ARIA state and every handler. */
const railOf = (container: HTMLElement): HTMLElement =>
  container.querySelector(".sui-threshold-rail") as HTMLElement;

/** The canvas — aria-hidden, and the element whose rect the rail measures. */
const canvasOf = (container: HTMLElement): SVGSVGElement =>
  container.querySelector("svg")!;

describe("ThresholdRail — the slider contract", () => {
  it("announces itself as a slider carrying the whole domain", () => {
    const { container } = render(() => (
      <ThresholdRail domain={[0, 100]} value={40} label="Monthly draw" />
    ));
    const rail = railOf(container);
    expect(rail.getAttribute("role")).toBe("slider");
    expect(rail.getAttribute("aria-label")).toBe("Monthly draw");
    expect(rail.getAttribute("aria-valuemin")).toBe("0");
    expect(rail.getAttribute("aria-valuemax")).toBe("100");
    expect(rail.getAttribute("aria-valuenow")).toBe("40");
    expect(rail.getAttribute("tabindex")).toBe("0");
  });

  it("hides the canvas from assistive tech, so the tick text does not compete with aria-valuetext", () => {
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        thresholds={THRESHOLDS}
        label="Monthly draw"
      />
    ));
    expect(canvasOf(container).getAttribute("aria-hidden")).toBe("true");
    expect(canvasOf(container).getAttribute("role")).toBeNull();
  });

  it("names the threshold it is sitting on in aria-valuetext, so the ring is not colour-only", () => {
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={25}
        thresholds={THRESHOLDS}
        label="Monthly draw"
        format={(v) => `$${v}`}
      />
    ));
    expect(railOf(container).getAttribute("aria-valuetext")).toBe(
      "$25, safe in 6 mo",
    );
  });

  it("reports the plain value when the thumb is between thresholds", () => {
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        thresholds={THRESHOLDS}
        label="Monthly draw"
        format={(v) => `$${v}`}
      />
    ));
    expect(railOf(container).getAttribute("aria-valuetext")).toBe("$40");
  });

  it("clamps a value handed in from outside the domain instead of drawing off the rail", () => {
    const { container } = render(() => (
      <ThresholdRail domain={[0, 100]} value={250} label="Monthly draw" />
    ));
    expect(railOf(container).getAttribute("aria-valuenow")).toBe("100");
  });
});

describe("ThresholdRail — drawing", () => {
  it("draws one tick and two text lines per threshold", () => {
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        thresholds={THRESHOLDS}
        label="Monthly draw"
        format={(v) => `$${v}`}
      />
    ));
    expect(container.querySelectorAll(".sui-threshold-rail__tick").length).toBe(
      3,
    );
    expect(container.querySelectorAll(".sui-threshold-rail__name").length).toBe(
      3,
    );
    expect(
      container.querySelectorAll(".sui-threshold-rail__value").length,
    ).toBe(3);
  });

  it("puts the tone on the group, so a tick and its labels can never disagree", () => {
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        thresholds={THRESHOLDS}
        label="Monthly draw"
      />
    ));
    const groups = container.querySelectorAll(".sui-threshold-rail__threshold");
    const classes = Array.from(groups).map((g) => g.getAttribute("class"));
    expect(classes).toContain(
      "sui-threshold-rail__threshold sui-threshold-rail__threshold--success",
    );
    expect(classes).toContain(
      "sui-threshold-rail__threshold sui-threshold-rail__threshold--warning",
    );
    expect(classes).toContain(
      "sui-threshold-rail__threshold sui-threshold-rail__threshold--muted",
    );
  });

  it("gives a default-toned threshold no modifier class", () => {
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        thresholds={[{ value: 50, label: "plain" }]}
        label="Monthly draw"
      />
    ));
    expect(
      container
        .querySelector(".sui-threshold-rail__threshold")
        ?.getAttribute("class"),
    ).toBe("sui-threshold-rail__threshold");
  });

  it("draws the arrow thumb between thresholds and the nesting ring on one", () => {
    const [value, setValue] = createSignal(40);
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={value()}
        thresholds={THRESHOLDS}
        label="Monthly draw"
      />
    ));
    expect(container.querySelector("polygon")).not.toBeNull();
    expect(container.querySelector(".sui-threshold-rail__ring")).toBeNull();

    setValue(25);
    expect(container.querySelector("polygon")).toBeNull();
    expect(container.querySelector(".sui-threshold-rail__ring")).not.toBeNull();
  });

  it("gives the nesting ring the colour of the threshold it landed on", () => {
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={60}
        thresholds={THRESHOLDS}
        label="Monthly draw"
      />
    ));
    const ring = container.querySelector(".sui-threshold-rail__ring")!;
    expect(ring.parentElement?.getAttribute("class")).toBe(
      "sui-threshold-rail__threshold sui-threshold-rail__threshold--warning",
    );
  });

  it("grows the viewBox when a collision forces a second lane", () => {
    const single = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={0}
        thresholds={[{ value: 50, label: "alone" }]}
        label="Monthly draw"
      />
    ));
    const stacked = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={0}
        thresholds={[
          { value: 50, label: "a very long label indeed" },
          { value: 51, label: "another very long label" },
        ]}
        label="Monthly draw"
      />
    ));
    const heightOf = (c: HTMLElement): number =>
      Number(canvasOf(c).getAttribute("viewBox")!.split(" ")[3]);
    expect(heightOf(stacked.container)).toBe(heightOf(single.container) + 22);
  });
});

describe("ThresholdRail — keyboard", () => {
  it("moves by one hundredth of the domain on an arrow key", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        label="Draw"
        onChange={onChange}
      />
    ));
    key(railOf(container), "ArrowRight");
    expect(onChange).toHaveBeenCalledWith(41);
    key(railOf(container), "ArrowLeft");
    expect(onChange).toHaveBeenLastCalledWith(39);
  });

  it("treats up and down the same as right and left", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        label="Draw"
        onChange={onChange}
      />
    ));
    key(railOf(container), "ArrowUp");
    expect(onChange).toHaveBeenCalledWith(41);
    key(railOf(container), "ArrowDown");
    expect(onChange).toHaveBeenLastCalledWith(39);
  });

  it("multiplies the step by ten while shift is held", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        label="Draw"
        onChange={onChange}
      />
    ));
    key(railOf(container), "ArrowRight", true);
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it("jumps to the ends of the domain on Home and End", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        label="Draw"
        onChange={onChange}
      />
    ));
    key(railOf(container), "Home");
    expect(onChange).toHaveBeenCalledWith(0);
    key(railOf(container), "End");
    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it("steps between thresholds on PageUp and PageDown, because they are what the user is aiming at", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        thresholds={THRESHOLDS}
        label="Draw"
        onChange={onChange}
      />
    ));
    key(railOf(container), "PageUp");
    expect(onChange).toHaveBeenCalledWith(60);
    key(railOf(container), "PageDown");
    expect(onChange).toHaveBeenLastCalledWith(25);
  });

  it("falls back to the domain end when there is no further threshold", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={95}
        thresholds={THRESHOLDS}
        label="Draw"
        onChange={onChange}
      />
    ));
    key(railOf(container), "PageUp");
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it("never reports a value outside the domain", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={0}
        label="Draw"
        onChange={onChange}
      />
    ));
    key(railOf(container), "ArrowLeft");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores keys it does not own", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        label="Draw"
        onChange={onChange}
      />
    ));
    key(railOf(container), "a");
    key(railOf(container), "Enter");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("ThresholdRail — pointer", () => {
  it("reads a press on the rail as the value under the pointer", () => {
    sizeTheRail();
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={0}
        label="Draw"
        onChange={onChange}
      />
    ));
    const rail = railOf(container);
    installPointerCapture(rail);
    pointer(rail).down({ clientX: 350, clientY: 75 });
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it("tracks the pointer while the press is held and stops once it is released", () => {
    sizeTheRail();
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={0}
        label="Draw"
        onChange={onChange}
      />
    ));
    const rail = railOf(container);
    installPointerCapture(rail);
    const drive = pointer(rail);
    drive.down({ clientX: 22, clientY: 75 });
    drive.move({ clientX: 350, clientY: 75 });
    expect(onChange).toHaveBeenLastCalledWith(50);
    drive.up({ clientX: 350, clientY: 75 });
    drive.move({ clientX: 678, clientY: 75 });
    expect(onChange).toHaveBeenLastCalledWith(50);
  });

  it("ignores a move that was never preceded by a press", () => {
    sizeTheRail();
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={0}
        label="Draw"
        onChange={onChange}
      />
    ));
    pointer(railOf(container)).move({ clientX: 350, clientY: 75 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("pins a drag past either end to that end rather than running off the domain", () => {
    sizeTheRail();
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={50}
        label="Draw"
        onChange={onChange}
      />
    ));
    const rail = railOf(container);
    installPointerCapture(rail);
    const drive = pointer(rail);
    drive.down({ clientX: -200, clientY: 75 });
    expect(onChange).toHaveBeenLastCalledWith(0);
    drive.move({ clientX: 5000, clientY: 75 });
    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it("stays silent when the rail has no layout to read a position from", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={0}
        label="Draw"
        onChange={onChange}
      />
    ));
    pointer(railOf(container)).down({ clientX: 350, clientY: 75 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not emit the value it already has", () => {
    sizeTheRail();
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={50}
        label="Draw"
        onChange={onChange}
      />
    ));
    const rail = railOf(container);
    installPointerCapture(rail);
    pointer(rail).down({ clientX: 350, clientY: 75 });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("ThresholdRail — disabled", () => {
  it("takes neither pointer nor keyboard input and leaves the focus order", () => {
    sizeTheRail();
    const onChange = vi.fn();
    const { container } = render(() => (
      <ThresholdRail
        domain={[0, 100]}
        value={40}
        label="Draw"
        disabled
        onChange={onChange}
      />
    ));
    const rail = railOf(container);
    expect(rail.getAttribute("tabindex")).toBe("-1");
    expect(rail.getAttribute("aria-disabled")).toBe("true");
    expect(rail.classList.contains("sui-threshold-rail--disabled")).toBe(true);
    pointer(rail).down({ clientX: 350, clientY: 75 });
    key(rail, "ArrowRight");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("createThresholdRail", () => {
  it("curries the formatter so callers pass only data", () => {
    const MoneyRail = createThresholdRail({ format: (v) => `$${v}k` });
    const { container } = render(() => (
      <MoneyRail
        domain={[0, 100]}
        value={25}
        thresholds={THRESHOLDS}
        label="Draw"
      />
    ));
    const values = Array.from(
      container.querySelectorAll(".sui-threshold-rail__value"),
    ).map((n) => n.textContent);
    expect(values).toContain("$25k");
    expect(railOf(container).getAttribute("aria-valuetext")).toBe(
      "$25k, safe in 6 mo",
    );
  });
});
