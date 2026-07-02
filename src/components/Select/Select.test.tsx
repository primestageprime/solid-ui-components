import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
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
