import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DatePicker, createDatePicker } from "./DatePicker";

describe("DatePicker", () => {
  it("renders the fixed-width control: ISO display + invisible native input", () => {
    const { container } = render(() => (
      <DatePicker value="2026-06-02" onChange={() => {}} />
    ));
    const root = container.querySelector(".sui-date-picker")!;
    expect(root).toBeTruthy();
    expect(root.tagName).toBe("SPAN");
    // The display ALWAYS reads ISO — independent of browser locale.
    expect(root.querySelector(".sui-date-picker__display")!.textContent).toBe(
      "2026-06-02",
    );
    // The native input carries the value for the picker + keyboard entry.
    const input = root.querySelector(
      ".sui-date-picker__native",
    ) as HTMLInputElement;
    expect(input.type).toBe("date");
    expect(input.value).toBe("2026-06-02");
  });

  it("shows the YYYY-MM-DD placeholder when empty", () => {
    const { container } = render(() => (
      <DatePicker value="" onChange={() => {}} />
    ));
    const display = container.querySelector(".sui-date-picker__display")!;
    expect(display.textContent).toBe("YYYY-MM-DD");
    expect(display.classList.contains("sui-date-picker__display--empty")).toBe(
      true,
    );
  });

  it("calls onChange with the ISO YYYY-MM-DD string", () => {
    let got: string | null = null;
    const { container } = render(() => (
      <DatePicker value="2026-06-02" onChange={(iso) => (got = iso)} />
    ));
    const input = container.querySelector(
      ".sui-date-picker__native",
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "2026-12-25" } });
    expect(got).toBe("2026-12-25");
  });

  it("createDatePicker bakes defaults", () => {
    const Picker = createDatePicker({ name: "due" });
    const { container } = render(() => (
      <Picker value="2026-01-01" onChange={() => {}} />
    ));
    const input = container.querySelector(
      ".sui-date-picker__native",
    ) as HTMLInputElement;
    expect(input.getAttribute("name")).toBe("due");
    expect(input.value).toBe("2026-01-01");
  });
});
