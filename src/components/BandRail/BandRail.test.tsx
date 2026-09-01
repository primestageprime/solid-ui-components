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
import { createBandRail, BandRail } from "./BandRail";
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
  container.querySelector(".sui-band-rail") as HTMLElement;

/** The canvas — aria-hidden, and the element whose rect the rail measures. */
const canvasOf = (container: HTMLElement): SVGSVGElement =>
  container.querySelector("svg")!;

describe("BandRail — the slider contract", () => {
  it("announces itself as a slider carrying the whole domain", () => {
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={40} label="Monthly draw" />
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
      <BandRail
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
      <BandRail
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
      <BandRail
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
      <BandRail domain={[0, 100]} value={250} label="Monthly draw" />
    ));
    expect(railOf(container).getAttribute("aria-valuenow")).toBe("100");
  });
});

describe("BandRail — drawing", () => {
  it("draws one tick and two text lines per threshold", () => {
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={40}
        thresholds={THRESHOLDS}
        label="Monthly draw"
        format={(v) => `$${v}`}
      />
    ));
    expect(container.querySelectorAll(".sui-band-rail__tick").length).toBe(3);
    expect(container.querySelectorAll(".sui-band-rail__name").length).toBe(3);
    expect(container.querySelectorAll(".sui-band-rail__value").length).toBe(3);
  });

  it("puts the tone on the group, so a tick and its labels can never disagree", () => {
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={40}
        thresholds={THRESHOLDS}
        label="Monthly draw"
      />
    ));
    const groups = container.querySelectorAll(".sui-band-rail__threshold");
    const classes = Array.from(groups).map((g) => g.getAttribute("class"));
    expect(classes).toContain(
      "sui-band-rail__threshold sui-band-rail__threshold--success",
    );
    expect(classes).toContain(
      "sui-band-rail__threshold sui-band-rail__threshold--warning",
    );
    expect(classes).toContain(
      "sui-band-rail__threshold sui-band-rail__threshold--muted",
    );
  });

  it("gives a default-toned threshold no modifier class", () => {
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={40}
        thresholds={[{ value: 50, label: "plain" }]}
        label="Monthly draw"
      />
    ));
    expect(
      container
        .querySelector(".sui-band-rail__threshold")
        ?.getAttribute("class"),
    ).toBe("sui-band-rail__threshold");
  });

  it("keeps the arrow thumb while no band holds, whatever the thresholds say", () => {
    // The arrow used to mean "between thresholds". It now means "no band holds
    // here", which is a clearer job — landing on a crossing is said by the
    // crossing, not by the thumb.
    const [value, setValue] = createSignal(40);
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={value()}
        thresholds={THRESHOLDS}
        label="Monthly draw"
      />
    ));
    expect(container.querySelector("polygon")).not.toBeNull();

    setValue(25);
    expect(container.querySelector("polygon")).not.toBeNull();
    expect(container.querySelector(".sui-band-rail__arc")).toBeNull();
  });

  it("swaps the arrow for one arc per holding band", () => {
    const [value, setValue] = createSignal(90);
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={value()}
        bands={[
          { start: 0, end: 50, label: "safe", tone: "success" },
          { start: 20, end: 60, label: "also safe", tone: "accent" },
        ]}
        label="Monthly draw"
      />
    ));
    // Outside every band: the arrow, and no arcs.
    expect(container.querySelector("polygon")).not.toBeNull();
    expect(container.querySelectorAll(".sui-band-rail__arc")).toHaveLength(0);

    setValue(10);
    expect(container.querySelector("polygon")).toBeNull();
    expect(container.querySelectorAll(".sui-band-rail__arc")).toHaveLength(1);

    setValue(30);
    expect(container.querySelectorAll(".sui-band-rail__arc")).toHaveLength(2);
  });

  it("gives each arc the tone of its own band, in the consumer's order", () => {
    // The ring used to borrow the nested THRESHOLD's colour, which only ever
    // said "you are on one of them". The bands own that colour now.
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={30}
        bands={[
          { start: 0, end: 50, label: "safe", tone: "success" },
          { start: 20, end: 60, label: "watch", tone: "warning" },
        ]}
        label="Monthly draw"
      />
    ));
    const arcs = [...container.querySelectorAll(".sui-band-rail__arc")];
    expect(arcs.map((a) => a.getAttribute("class"))).toEqual([
      "sui-band-rail__arc sui-band-rail__arc--success",
      "sui-band-rail__arc sui-band-rail__arc--warning",
    ]);
  });

  it("marks the crossing the value sits on, rather than colouring the thumb", () => {
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={60}
        thresholds={THRESHOLDS}
        label="Monthly draw"
      />
    ));
    const nested = container.querySelectorAll(
      ".sui-band-rail__threshold--nested",
    );
    expect(nested).toHaveLength(1);
    expect(nested[0].getAttribute("class")).toContain(
      "sui-band-rail__threshold--warning",
    );
  });

  it("grows the viewBox when a collision forces a second lane", () => {
    const single = render(() => (
      <BandRail
        domain={[0, 100]}
        value={0}
        thresholds={[{ value: 50, label: "alone" }]}
        label="Monthly draw"
      />
    ));
    const stacked = render(() => (
      <BandRail
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

describe("BandRail — keyboard", () => {
  it("moves by one hundredth of the domain on an arrow key", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={40} label="Draw" onChange={onChange} />
    ));
    key(railOf(container), "ArrowRight");
    expect(onChange).toHaveBeenCalledWith(41);
    key(railOf(container), "ArrowLeft");
    expect(onChange).toHaveBeenLastCalledWith(39);
  });

  it("treats up and down the same as right and left", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={40} label="Draw" onChange={onChange} />
    ));
    key(railOf(container), "ArrowUp");
    expect(onChange).toHaveBeenCalledWith(41);
    key(railOf(container), "ArrowDown");
    expect(onChange).toHaveBeenLastCalledWith(39);
  });

  it("multiplies the step by ten while shift is held", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={40} label="Draw" onChange={onChange} />
    ));
    key(railOf(container), "ArrowRight", true);
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it("jumps to the ends of the domain on Home and End", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={40} label="Draw" onChange={onChange} />
    ));
    key(railOf(container), "Home");
    expect(onChange).toHaveBeenCalledWith(0);
    key(railOf(container), "End");
    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it("steps between thresholds on PageUp and PageDown, because they are what the user is aiming at", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <BandRail
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
      <BandRail
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
      <BandRail domain={[0, 100]} value={0} label="Draw" onChange={onChange} />
    ));
    key(railOf(container), "ArrowLeft");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores keys it does not own", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={40} label="Draw" onChange={onChange} />
    ));
    key(railOf(container), "a");
    key(railOf(container), "Enter");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("BandRail — bands", () => {
  const bandsOf = (c: HTMLElement) => [
    ...c.querySelectorAll(".sui-band-rail__band"),
  ];

  it("draws a bar with a cap and a tick at each end it claims", () => {
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={50}
        bands={[{ start: 25, end: 75, label: "safe" }]}
        label="Draw"
      />
    ));
    expect(container.querySelectorAll(".sui-band-rail__bar")).toHaveLength(1);
    expect(container.querySelectorAll(".sui-band-rail__cap")).toHaveLength(2);
    expect(
      container.querySelectorAll(".sui-band-rail__band-tick"),
    ).toHaveLength(2);
  });

  it("draws neither cap nor tick at an end that ran off the domain", () => {
    // "insolvent above $9.3k" has no crossing at the right end to mark.
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={50}
        bands={[{ start: 25, label: "insolvent" }]}
        label="Draw"
      />
    ));
    expect(container.querySelectorAll(".sui-band-rail__cap")).toHaveLength(1);
    expect(
      container.querySelectorAll(".sui-band-rail__band-tick"),
    ).toHaveLength(1);
  });

  it("carries the band's label on the bar, so meaning is never colour-only", () => {
    const { getByText } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={50}
        bands={[{ start: 25, end: 75, label: "safe in 12 mo" }]}
        label="Draw"
      />
    ));
    expect(getByText("safe in 12 mo")).toBeTruthy();
  });

  it("dims a band the value has left, and never hides it", () => {
    // Dimming IS the direction answer: the reader drags and watches which
    // bars light up. A hidden band teaches nothing.
    const [value, setValue] = createSignal(30);
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={value()}
        bands={[{ start: 25, end: 75, label: "safe" }]}
        label="Draw"
      />
    ));
    const band = () => bandsOf(container)[0];
    expect(band().classList.contains("sui-band-rail__band--inactive")).toBe(
      false,
    );

    setValue(90);
    expect(bandsOf(container)).toHaveLength(1);
    expect(band().classList.contains("sui-band-rail__band--inactive")).toBe(
      true,
    );
  });

  it("grows the box for band lanes and pushes the threshold labels outside them", () => {
    const heightOf = (c: HTMLElement): number =>
      Number(canvasOf(c).getAttribute("viewBox")!.split(" ")[3]);
    const bare = render(() => (
      <BandRail domain={[0, 100]} value={50} label="Draw" />
    ));
    const banded = render(() => (
      <BandRail
        domain={[0, 100]}
        value={50}
        bands={[{ start: 0, end: 100, label: "a" }]}
        label="Draw"
      />
    ));
    expect(heightOf(banded.container)).toBeGreaterThan(
      heightOf(bare.container),
    );
  });

  it("tells a screen reader what holds here, not just where the thumb is", () => {
    // The dimming answers this for a sighted reader and says nothing to
    // anyone else. Without the labels here the two readers get different
    // answers to the same question.
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={30}
        bands={[
          { start: 0, end: 50, label: "safe in 12 mo" },
          { start: 20, end: 60, label: "or hire a bookkeeper" },
          { start: 80, end: 100, label: "insolvent" },
        ]}
        format={(v) => `$${v}`}
        label="Draw"
      />
    ));
    expect(railOf(container).getAttribute("aria-valuetext")).toBe(
      "$30, safe in 12 mo, or hire a bookkeeper",
    );
  });

  it("stops PageUp at a band end as well as a threshold", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={10}
        bands={[{ start: 40, end: 70, label: "safe" }]}
        label="Draw"
        onChange={onChange}
      />
    ));
    key(railOf(container), "PageUp");
    expect(onChange).toHaveBeenCalledWith(40);
  });

  it("renders exactly as before when no bands are passed", () => {
    const { container } = render(() => (
      <BandRail
        domain={[0, 100]}
        value={50}
        thresholds={THRESHOLDS}
        label="Draw"
      />
    ));
    expect(bandsOf(container)).toHaveLength(0);
    expect(container.querySelector("polygon")).not.toBeNull();
  });
});

describe("BandRail — affordance", () => {
  // The gesture was never the weak part: the host takes the pointer and a
  // click anywhere moves the thumb. Every one of these covers the SIGNAL that
  // says so, which is what was missing.
  const fillOf = (container: HTMLElement): SVGLineElement =>
    container.querySelector(".sui-band-rail__fill") as SVGLineElement;

  it("fills the track from the rail's left end to the thumb", () => {
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={25} label="Draw" />
    ));
    const fill = fillOf(container);
    // The rail runs x=22 to x=678, so a quarter of the domain lands at 186.
    expect(Number(fill.getAttribute("x1"))).toBe(22);
    expect(Number(fill.getAttribute("x2"))).toBe(186);
  });

  it("moves the fill's far end with the value, and leaves its origin alone", () => {
    const [value, setValue] = createSignal(25);
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={value()} label="Draw" />
    ));
    const fill = fillOf(container);
    setValue(75);
    expect(Number(fill.getAttribute("x1"))).toBe(22);
    expect(Number(fill.getAttribute("x2"))).toBe(514);
  });

  it("takes the dragging modifier on pointer down and drops it on release", () => {
    sizeTheRail();
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={0} label="Draw" onChange={() => {}} />
    ));
    const rail = railOf(container);
    installPointerCapture(rail);

    expect(rail.classList.contains("sui-band-rail--dragging")).toBe(false);
    pointer(rail).down({ clientX: 350, clientY: 75 });
    expect(rail.classList.contains("sui-band-rail--dragging")).toBe(true);
    pointer(rail).up({ clientX: 350, clientY: 75 });
    expect(rail.classList.contains("sui-band-rail--dragging")).toBe(false);
  });

  it("drops the dragging modifier when the pointer is cancelled, not only released", () => {
    sizeTheRail();
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={0} label="Draw" onChange={() => {}} />
    ));
    const rail = railOf(container);
    installPointerCapture(rail);

    pointer(rail).down({ clientX: 350, clientY: 75 });
    expect(rail.classList.contains("sui-band-rail--dragging")).toBe(true);
    pointer(rail).cancel({ clientX: 350, clientY: 75 });
    expect(rail.classList.contains("sui-band-rail--dragging")).toBe(false);
  });

  it("never takes the dragging modifier while disabled", () => {
    sizeTheRail();
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={0} label="Draw" disabled />
    ));
    const rail = railOf(container);
    installPointerCapture(rail);
    pointer(rail).down({ clientX: 350, clientY: 75 });
    expect(rail.classList.contains("sui-band-rail--dragging")).toBe(false);
  });
});

describe("BandRail — pointer", () => {
  it("reads a press on the rail as the value under the pointer", () => {
    sizeTheRail();
    const onChange = vi.fn();
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={0} label="Draw" onChange={onChange} />
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
      <BandRail domain={[0, 100]} value={0} label="Draw" onChange={onChange} />
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
      <BandRail domain={[0, 100]} value={0} label="Draw" onChange={onChange} />
    ));
    pointer(railOf(container)).move({ clientX: 350, clientY: 75 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("pins a drag past either end to that end rather than running off the domain", () => {
    sizeTheRail();
    const onChange = vi.fn();
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={50} label="Draw" onChange={onChange} />
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
      <BandRail domain={[0, 100]} value={0} label="Draw" onChange={onChange} />
    ));
    pointer(railOf(container)).down({ clientX: 350, clientY: 75 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not emit the value it already has", () => {
    sizeTheRail();
    const onChange = vi.fn();
    const { container } = render(() => (
      <BandRail domain={[0, 100]} value={50} label="Draw" onChange={onChange} />
    ));
    const rail = railOf(container);
    installPointerCapture(rail);
    pointer(rail).down({ clientX: 350, clientY: 75 });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("BandRail — disabled", () => {
  it("takes neither pointer nor keyboard input and leaves the focus order", () => {
    sizeTheRail();
    const onChange = vi.fn();
    const { container } = render(() => (
      <BandRail
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
    expect(rail.classList.contains("sui-band-rail--disabled")).toBe(true);
    pointer(rail).down({ clientX: 350, clientY: 75 });
    key(rail, "ArrowRight");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("createBandRail", () => {
  it("curries the formatter so callers pass only data", () => {
    const MoneyRail = createBandRail({ format: (v) => `$${v}k` });
    const { container } = render(() => (
      <MoneyRail
        domain={[0, 100]}
        value={25}
        thresholds={THRESHOLDS}
        label="Draw"
      />
    ));
    const values = Array.from(
      container.querySelectorAll(".sui-band-rail__value"),
    ).map((n) => n.textContent);
    expect(values).toContain("$25k");
    expect(railOf(container).getAttribute("aria-valuetext")).toBe(
      "$25k, safe in 6 mo",
    );
  });
});
