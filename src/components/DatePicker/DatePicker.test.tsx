import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DatePicker, createDatePicker } from "./DatePicker";

describe("DatePicker", () => {
  it("renders a native date input with the ISO value", () => {
    const { container } = render(() => (
      <DatePicker value="2026-06-02" onChange={() => {}} />
    ));
    const input = container.querySelector(
      ".sui-date-picker",
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("date");
    expect(input.value).toBe("2026-06-02");
  });

  it("calls onChange with the ISO YYYY-MM-DD string", () => {
    let got: string | null = null;
    const { container } = render(() => (
      <DatePicker value="2026-06-02" onChange={(iso) => (got = iso)} />
    ));
    const input = container.querySelector(
      ".sui-date-picker",
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
      ".sui-date-picker",
    ) as HTMLInputElement;
    expect(input.getAttribute("name")).toBe("due");
    expect(input.value).toBe("2026-01-01");
  });
});
