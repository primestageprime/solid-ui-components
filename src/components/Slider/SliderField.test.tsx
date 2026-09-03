import { render, fireEvent } from "@solidjs/testing-library";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { installFakeSizer, type FakeSizer } from "../../test-utils";
import { Slider } from "./Slider";
import { SliderField } from "./SliderField";

// Kobalte's Slider measures its track through ResizeObserver; jsdom lacks it.
// Only the byte-identity test below mounts a whole Slider, but the double is
// installed once for the file.
let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

const input = (container: HTMLElement): HTMLInputElement =>
  container.querySelector(".sui-slider__value--editable") as HTMLInputElement;

const mirror = (container: HTMLElement): HTMLElement =>
  container.querySelector(".sui-slider__field-mirror") as HTMLElement;

const affixes = (container: HTMLElement): readonly string[] =>
  Array.from(
    container.querySelectorAll(".sui-slider__field-affix"),
    (node) => node.textContent ?? "",
  );

describe("SliderField", () => {
  // ── the split ─────────────────────────────────────────────────────────

  it("puts only the number in the input and the unit beside it", () => {
    const { container } = render(() => (
      <SliderField
        label="Price per month"
        prefix="$"
        suffix="/mo"
        value="132.61"
        onCommit={() => {}}
      />
    ));
    expect(input(container).value).toBe("132.61");
    expect(affixes(container)).toEqual(["$", "/mo"]);
  });

  it("draws a suffix on its own, without a prefix", () => {
    const { container } = render(() => (
      <SliderField
        label="Discount percent"
        suffix="%"
        value="11"
        onCommit={() => {}}
      />
    ));
    expect(affixes(container)).toEqual(["%"]);
    expect(input(container).value).toBe("11");
  });

  // The affixes are decoration: the input's own `label` carries the unit, so a
  // screen reader hears "Price per month", not "dollar 132.61 slash mo".
  it("keeps the affixes out of the accessibility tree", () => {
    const { container } = render(() => (
      <SliderField
        label="Price per month"
        prefix="$"
        suffix="/mo"
        value="132.61"
        onCommit={() => {}}
      />
    ));
    const drawn = container.querySelectorAll(
      '.sui-slider__field-affix[aria-hidden="true"]',
    );
    expect(drawn).toHaveLength(2);
  });

  // The whole group is one control. A press on the "$" or the "/mo" must land
  // on the number, so the group is the `<label>` of the input inside it.
  it("makes the group the label of its input, so a press anywhere focuses it", () => {
    const { container } = render(() => (
      <SliderField
        label="Price per month"
        prefix="$"
        suffix="/mo"
        value="132.61"
        onCommit={() => {}}
      />
    ));
    const group = container.querySelector(".sui-slider__field") as HTMLElement;
    expect(group.tagName).toBe("LABEL");
    expect(Array.from(input(container).labels ?? [])).toEqual([group]);
  });

  // ── width ─────────────────────────────────────────────────────────────

  // The mirror is the width. jsdom performs no layout, so the assertion is on
  // the MECHANISM: hidden text that carries exactly what the input shows.
  it("mirrors the shown text in a hidden span, which sizes the field", () => {
    const { container } = render(() => (
      <SliderField
        label="Yearly price"
        suffix="/yr"
        value="1,591.32"
        onCommit={() => {}}
      />
    ));
    expect(mirror(container).textContent).toBe("1,591.32");
    expect(mirror(container).getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps the mirror in step with the text while a person types", () => {
    const { container } = render(() => (
      <SliderField label="Yearly price" value="1,591.32" onCommit={() => {}} />
    ));
    const field = input(container);
    fireEvent.focus(field);
    fireEvent.input(field, { target: { value: "1200" } });
    expect(mirror(container).textContent).toBe("1200");
    expect(field.value).toBe("1200");
  });

  // The bug this replaced: `size` counted characters and the browser
  // multiplied by the AVERAGE character width, which clipped "$1,591.32/yr".
  // `size` is now a floor of one character, whatever the text.
  it("never sizes itself from the `size` attribute", () => {
    const { container } = render(() => (
      <SliderField label="Yearly price" value="1,591.32" onCommit={() => {}} />
    ));
    const field = input(container);
    expect(field.getAttribute("size")).toBe("1");
    fireEvent.focus(field);
    fireEvent.input(field, { target: { value: "123456789012" } });
    expect(field.getAttribute("size")).toBe("1");
  });

  // ── commit and revert ─────────────────────────────────────────────────

  it("shows `editValue` on focus and selects it", () => {
    const { container } = render(() => (
      <SliderField
        label="Runway"
        value="6 months"
        editValue="6"
        onCommit={() => {}}
      />
    ));
    const field = input(container);
    expect(field.value).toBe("6 months");
    fireEvent.focus(field);
    expect(field.value).toBe("6");
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(1);
  });

  it("falls back to `value` on focus when there is no `editValue`", () => {
    const { container } = render(() => (
      <SliderField label="Runway" value="6" onCommit={() => {}} />
    ));
    const field = input(container);
    fireEvent.focus(field);
    expect(field.value).toBe("6");
  });

  it("commits the typed text on blur", () => {
    const onCommit = vi.fn();
    const { container } = render(() => (
      <SliderField label="Runway" value="6" onCommit={onCommit} />
    ));
    const field = input(container);
    fireEvent.focus(field);
    fireEvent.input(field, { target: { value: "11" } });
    fireEvent.blur(field);
    expect(onCommit).toHaveBeenCalledWith("11");
  });

  it("commits the typed text on Enter", () => {
    const onCommit = vi.fn();
    const { container } = render(() => (
      <SliderField label="Runway" value="6" onCommit={onCommit} />
    ));
    const field = input(container);
    fireEvent.focus(field);
    fireEvent.input(field, { target: { value: "11" } });
    fireEvent.keyDown(field, { key: "Enter" });
    fireEvent.blur(field);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("11");
  });

  // Escape reverts. The blur that follows it must commit nothing: the field
  // holds a state, not a flag, so "reverting" and "editing" cannot both be on.
  it("reverts on Escape and commits nothing", () => {
    const onCommit = vi.fn();
    const { container } = render(() => (
      <SliderField label="Runway" value="6" onCommit={onCommit} />
    ));
    const field = input(container);
    fireEvent.focus(field);
    fireEvent.input(field, { target: { value: "11" } });
    fireEvent.keyDown(field, { key: "Escape" });
    fireEvent.blur(field);
    expect(onCommit).not.toHaveBeenCalled();
    expect(field.value).toBe("6");
  });

  it("commits nothing when a person focuses and leaves without typing", () => {
    const onCommit = vi.fn();
    const { container } = render(() => (
      <SliderField label="Runway" value="6" editValue="6" onCommit={onCommit} />
    ));
    const field = input(container);
    fireEvent.blur(field);
    expect(onCommit).not.toHaveBeenCalled();
  });

  // The slider root moves the thumb on arrow keys. Inside the field those keys
  // belong to the caret.
  it("stops a key from reaching the slider root", () => {
    const onKeyDown = vi.fn();
    const { container } = render(() => (
      <div onKeyDown={onKeyDown}>
        <SliderField label="Runway" value="6" onCommit={() => {}} />
      </div>
    ));
    fireEvent.keyDown(input(container), { key: "ArrowRight" });
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it("disables the input and marks the group", () => {
    const { container } = render(() => (
      <SliderField label="Runway" value="6" onCommit={() => {}} disabled />
    ));
    expect(input(container).disabled).toBe(true);
    expect(
      container
        .querySelector(".sui-slider__field")
        ?.getAttribute("data-disabled"),
    ).toBe("");
  });

  // ── the built-in path is unchanged ────────────────────────────────────

  // `Slider editable` is most callers, and it must not shift by one byte. It
  // draws a `SliderField` with no prefix and no suffix, so the two markups are
  // compared directly rather than pinned separately and left to drift.
  it("renders `Slider editable` and a bare field as the same markup", () => {
    const inSlider = render(() => (
      <Slider
        label="Buffer"
        value={6}
        onChange={() => {}}
        min={3}
        max={18}
        editable
        format={(n) => `${n} months`}
      />
    ));
    const alone = render(() => (
      <SliderField
        label="Buffer value"
        value="6 months"
        editValue="6"
        onCommit={() => {}}
      />
    ));
    const group = (root: HTMLElement): string =>
      (root.querySelector(".sui-slider__field") as HTMLElement).outerHTML;
    expect(group(inSlider.container)).toBe(group(alone.container));
  });

  // The attribute set of the built-in field, pinned. `type="text"` keeps the
  // browser's spinner arrows away from a control that already has a thumb.
  it("keeps the built-in field's own attributes", () => {
    const { container } = render(() => (
      <Slider
        label="Buffer"
        value={6}
        onChange={() => {}}
        min={3}
        max={18}
        editable
      />
    ));
    const field = input(container);
    expect(field.getAttribute("type")).toBe("text");
    expect(field.getAttribute("inputmode")).toBe("decimal");
    expect(field.getAttribute("aria-label")).toBe("Buffer value");
    expect(field.className).toBe(
      "sui-slider__value sui-slider__value--editable",
    );
    expect(affixes(container)).toEqual([]);
    expect(field.value).toBe("6");
  });
});
