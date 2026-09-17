import { render, fireEvent } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "../Modal/Modal";
import { Select, type SelectOption } from "./Select";

const OPTIONS: SelectOption[] = [
  { value: "a", label: "Apple" },
  { value: "b", label: "Banana" },
  { value: "c", label: "Cherry" },
];

const opts = () => OPTIONS;
const trigger = () =>
  document.querySelector<HTMLElement>(".sui-select__trigger");
const valueText = () =>
  document.querySelector(".sui-select__value")?.textContent ?? "";

describe("Select (single)", () => {
  it("renders the label and shows the default placeholder when empty", () => {
    render(() => <Select options={opts} label="Fruit" />);
    expect(document.querySelector(".sui-select__label")?.textContent).toBe(
      "Fruit",
    );
    expect(valueText()).toBe("Select an option…");
  });

  it("honours a custom placeholder", () => {
    render(() => <Select options={opts} placeholder="Pick one" />);
    expect(valueText()).toBe("Pick one");
  });

  it("renders the selected option's label in the trigger", () => {
    render(() => <Select options={opts} value={() => OPTIONS[1]} />);
    expect(valueText()).toContain("Banana");
  });

  it("renders the description helper text", () => {
    render(() => <Select options={opts} description="Choose your fruit" />);
    expect(
      document.querySelector(".sui-select__description")?.textContent,
    ).toBe("Choose your fruit");
  });

  it("mirrors the field label onto the trigger for a11y", () => {
    render(() => <Select options={opts} label="Fruit" />);
    expect(trigger()?.getAttribute("aria-label")).toBe("Fruit");
  });

  it("forwards an id to the underlying control", () => {
    render(() => <Select options={opts} id="fruit-select" label="Fruit" />);
    expect(document.querySelector("#fruit-select")).not.toBeNull();
  });

  it("reflects a reactive value change in the trigger", () => {
    const [value, setValue] = createSignal<SelectOption | null>(null);
    render(() => <Select options={opts} value={value} />);
    expect(valueText()).toBe("Select an option…");
    setValue(OPTIONS[2]);
    expect(valueText()).toContain("Cherry");
  });
});

describe("Select (multiple)", () => {
  it("comma-joins the selected labels", () => {
    render(() => (
      <Select multiple options={opts} value={() => [OPTIONS[0], OPTIONS[2]]} />
    ));
    expect(
      document.querySelector(".sui-select__value-text")?.textContent,
    ).toBe("Apple, Cherry");
  });

  it("shows the placeholder and no clear button when nothing is selected", () => {
    render(() => <Select multiple options={opts} value={() => []} />);
    expect(valueText()).toBe("Select an option…");
    expect(document.querySelector(".sui-select__clear")).toBeNull();
  });

  it("renders a clear button that clears the selection", () => {
    const [value, setValue] = createSignal<SelectOption[]>([OPTIONS[0]]);
    const onChange = vi.fn((next: SelectOption[]) => setValue(next));
    render(() => <Select multiple options={opts} value={value} onChange={onChange} />);
    const clear = document.querySelector<HTMLButtonElement>(
      ".sui-select__clear",
    );
    expect(clear).not.toBeNull();
    fireEvent.click(clear!);
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.lastCall?.[0]).toEqual([]);
  });
});

// Peter, 2026-09-16, on the scenario board's hire form: "I don't see any
// options in the role selector." The listbox was there, focused and
// announced — and painted underneath the modal, because Kobalte portals it to
// `document.body`, where it is a SIBLING of the overlay rather than a child.
//
// Two tests, because the bug has two halves and each half can break alone: the
// options have to RENDER inside a dialog, and the popover has to OUTRANK it.
describe("Select inside a Modal", () => {
  it("renders its options when it is opened from inside a dialog", () => {
    render(() => (
      <Modal open onClose={() => {}} title="Hire">
        <Select options={opts} label="Fruit" defaultOpen />
      </Modal>
    ));
    const options = [...document.querySelectorAll('[role="option"]')].map(
      (option) => option.textContent,
    );
    expect(options).toEqual(["Apple", "Banana", "Cherry"]);
  });

  // jsdom applies no stylesheet, so the stacking rule is asserted against the
  // CSS ITSELF. It is a real guard rather than a tautology: the two numbers
  // live in different files, and the one that broke was changed without the
  // other ever being consulted.
  it("paints above the modal overlay", () => {
    const zIndexOf = (css: string, selector: string): number => {
      const block = css.slice(css.indexOf(selector));
      const match = block.slice(0, block.indexOf("}")).match(/z-index:\s*(\d+)/);
      return Number(match?.[1]);
    };
    const here = join(__dirname, "..");
    const popover = zIndexOf(
      readFileSync(join(here, "Select/Select.css"), "utf8"),
      ".sui-select__content {",
    );
    const overlay = zIndexOf(
      readFileSync(join(here, "Modal/Modal.css"), "utf8"),
      ".sui-modal-overlay {",
    );
    expect(overlay).toBeGreaterThan(0);
    expect(popover).toBeGreaterThan(overlay);
  });
});
