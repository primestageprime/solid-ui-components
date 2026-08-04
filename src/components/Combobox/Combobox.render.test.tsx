// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Combobox, type ComboboxOption } from "./Combobox";

afterEach(cleanup);

// Render coverage for the Combobox component itself.
//
// `Combobox.test.tsx` exhaustively covers `computeBackspaceAction` — the pure
// transition — but pins itself to `@vitest-environment node` and never calls
// `render`, leaving 589 lines of component (Combobox + ComboboxSingle +
// ComboboxMulti) with no render coverage at all. Its header blames a jsdom
// breakage (html-encoding-sniffer / ERR_REQUIRE_ESM); that no longer
// reproduces — every test below runs under the default jsdom environment.
//
// The emphasis here is the WIRING, which is where the pure suite stops: that
// each backspace action the transition returns is actually applied to the
// component's state, and that Kobalte's own `removeOnBackspace` stays out of
// the way (ComboboxMulti.tsx:182 disables it precisely so this module owns the
// contract).

const OPTIONS: ComboboxOption[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Bravo" },
  { value: "c", label: "Charlie" },
];

const input = (c: Element) =>
  c.querySelector(".sui-combobox__input") as HTMLInputElement;
const chips = (c: Element) => [...c.querySelectorAll(".sui-combobox__chip")];
const chipLabels = (c: Element) =>
  [...c.querySelectorAll(".sui-combobox__chip-label")].map(
    (el) => el.textContent,
  );
const highlighted = (c: Element) =>
  c.querySelector(".sui-combobox__chip--highlighted");

describe("Combobox — single mode", () => {
  const mountSingle = (
    props: Partial<{
      value: ComboboxOption | null;
      disabled: boolean;
      onInputChange: (s: string) => void;
    }> = {},
  ) => {
    const [options] = createSignal(OPTIONS);
    const [value] = createSignal<ComboboxOption | null>(props.value ?? null);
    const { container } = render(() => (
      <Combobox
        options={options}
        value={value}
        placeholder="Pick one"
        disabled={props.disabled}
        onInputChange={props.onInputChange}
      />
    ));
    return container;
  };

  it("renders the control, input and trigger", () => {
    const c = mountSingle();
    expect(c.querySelector(".sui-combobox")).toBeTruthy();
    expect(c.querySelector(".sui-combobox__control")).toBeTruthy();
    expect(c.querySelector(".sui-combobox__trigger")).toBeTruthy();
    expect(input(c)).toBeTruthy();
  });

  it("is not in multi-mode", () => {
    const c = mountSingle();
    expect(c.querySelector(".sui-combobox--multi")).toBeNull();
    expect(c.querySelector(".sui-combobox__chips")).toBeNull();
  });

  it("carries the placeholder onto the input", () => {
    expect(input(mountSingle()).placeholder).toBe("Pick one");
  });

  it("shows no clear button until something is selected", () => {
    expect(mountSingle().querySelector(".sui-combobox__clear")).toBeNull();
  });

  it("shows the clear button once a value is selected", () => {
    const c = mountSingle({ value: OPTIONS[0] });
    expect(c.querySelector(".sui-combobox__clear")).toBeTruthy();
  });

  it("disables the trigger when disabled", () => {
    const c = mountSingle({ disabled: true });
    const trigger = c.querySelector(".sui-combobox__trigger") as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(trigger.hasAttribute("data-disabled")).toBe(true);
  });

  it("does not open the listbox from a disabled trigger", () => {
    const c = mountSingle({ disabled: true });
    fireEvent.click(c.querySelector(".sui-combobox__trigger") as HTMLElement);
    expect(document.querySelector(".sui-combobox__content")).toBeNull();
  });

  // KNOWN GAP — documents current behaviour, not desired behaviour.
  //
  // `disabled` reaches the trigger but NOT the text input: the input stays
  // editable and carries no `disabled` / `aria-disabled` / `data-disabled`.
  // ComboboxSingle.tsx:130 clearly intends otherwise — it passes
  // `disabled={local.disabled}` straight to Kobalte's Input — but Kobalte's
  // ROOT owns `disabled` and propagates it to the parts through context, and
  // `disabled` is split into `local` (Combobox.tsx:100) so the root never
  // receives it.
  //
  // When that is fixed, this test will fail. Delete it and assert `true`.
  it("leaves the text input editable when disabled (known gap)", () => {
    const el = input(mountSingle({ disabled: true }));
    expect(el.disabled).toBe(false);
    expect(el.hasAttribute("aria-disabled")).toBe(false);
  });

  it("reports input changes to the parent", () => {
    const onInputChange = vi.fn();
    const c = mountSingle({ onInputChange });
    fireEvent.input(input(c), { target: { value: "Al" } });
    expect(onInputChange).toHaveBeenCalledWith("Al");
  });
});

describe("Combobox — multi mode", () => {
  const mountMulti = (initial: ComboboxOption[] = []) => {
    const [options] = createSignal(OPTIONS);
    const [value, setValue] = createSignal<ComboboxOption[]>(initial);
    const onChange = vi.fn((next: ComboboxOption[]) => setValue(next));
    const { container } = render(() => (
      <Combobox
        multiple
        options={options}
        value={value}
        onChange={onChange}
        placeholder="Pick some"
      />
    ));
    return { c: container, onChange, value };
  };

  it("renders in multi mode", () => {
    const { c } = mountMulti();
    expect(c.querySelector(".sui-combobox--multi")).toBeTruthy();
    expect(c.querySelector(".sui-combobox__control--multi")).toBeTruthy();
  });

  it("renders no chip list while nothing is selected", () => {
    const { c } = mountMulti();
    expect(chips(c).length).toBe(0);
  });

  it("renders one chip per selected option", () => {
    const { c } = mountMulti([OPTIONS[0], OPTIONS[1]]);
    expect(chipLabels(c)).toEqual(["Alpha", "Bravo"]);
  });

  it("shows the selected count", () => {
    const { c } = mountMulti([OPTIONS[0], OPTIONS[1]]);
    expect(
      c.querySelector(".sui-combobox__chips-count")?.textContent,
    ).toContain("2");
  });

  it("clears every selection from the chips header", () => {
    const { c, onChange } = mountMulti([OPTIONS[0], OPTIONS[1]]);
    fireEvent.click(
      c.querySelector(".sui-combobox__chips-clear") as HTMLElement,
    );
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("removes a single chip from its remove button", () => {
    const { c, onChange } = mountMulti([OPTIONS[0], OPTIONS[1]]);
    const remove = c.querySelectorAll(".sui-combobox__chip-remove");
    fireEvent.click(remove[0] as HTMLElement);
    expect(onChange).toHaveBeenCalledWith([OPTIONS[1]]);
  });
});

describe("Combobox — two-step backspace wiring", () => {
  // computeBackspaceAction is covered exhaustively in Combobox.test.tsx. These
  // assert the component APPLIES each of its three outcomes.
  const mountMulti = (initial: ComboboxOption[]) => {
    const [options] = createSignal(OPTIONS);
    const [value, setValue] = createSignal<ComboboxOption[]>(initial);
    const onChange = vi.fn((next: ComboboxOption[]) => setValue(next));
    const { container } = render(() => (
      <Combobox multiple options={options} value={value} onChange={onChange} />
    ));
    return { c: container, onChange };
  };

  const backspace = (c: Element) =>
    fireEvent.keyDown(input(c), { key: "Backspace" });

  it("arms the last chip on the first backspace over an empty input", () => {
    const { c, onChange } = mountMulti([OPTIONS[0], OPTIONS[1]]);
    expect(highlighted(c)).toBeNull();

    backspace(c);

    expect(highlighted(c)).toBeTruthy();
    expect(highlighted(c)?.textContent).toContain("Bravo");
    // Arming must not delete anything yet — that is the whole point of the
    // two-step contract.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("deletes the armed chip on the second backspace", () => {
    const { c, onChange } = mountMulti([OPTIONS[0], OPTIONS[1]]);
    backspace(c);
    backspace(c);
    expect(onChange).toHaveBeenCalledWith([OPTIONS[0]]);
  });

  it("disarms after the delete rather than running on", () => {
    const { c } = mountMulti([OPTIONS[0], OPTIONS[1]]);
    backspace(c);
    backspace(c);
    // One chip left, and it must NOT be armed — otherwise a third backspace
    // would delete it without warning.
    expect(chipLabels(c)).toEqual(["Alpha"]);
    expect(highlighted(c)).toBeNull();
  });

  it("passes through while the input still has text", () => {
    const { c, onChange } = mountMulti([OPTIONS[0]]);
    fireEvent.input(input(c), { target: { value: "Ch" } });
    backspace(c);
    expect(highlighted(c)).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does nothing on backspace with no chips at all", () => {
    const { c, onChange } = mountMulti([]);
    backspace(c);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disarms on Escape", () => {
    const { c, onChange } = mountMulti([OPTIONS[0], OPTIONS[1]]);
    backspace(c);
    expect(highlighted(c)).toBeTruthy();

    fireEvent.keyDown(input(c), { key: "Escape" });

    expect(highlighted(c)).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
