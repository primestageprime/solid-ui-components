import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { DayOfMonthField, PopoverField, dayOfMonthText } from ".";

describe("dayOfMonthText", () => {
  it("writes ordinals and last day", () => {
    expect(["1", "2", "3", "4", "11", "12", "13", "21", "22", "23", "28"].map((n) => dayOfMonthText(Number(n))))
      .toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "28th"]);
    expect(dayOfMonthText("last")).toBe("Last day");
  });
});

describe("PopoverField", () => {
  it("shows the value, opens on click, closes when the picker calls close", async () => {
    render(() => (
      <PopoverField label="Colour" value="Red">
        {(close) => <button type="button" onClick={close}>Pick blue</button>}
      </PopoverField>
    ));
    const field = screen.getByRole("button", { name: "Colour: Red" });
    expect(screen.queryByText("Pick blue")).toBeNull();
    fireEvent.click(field);
    const pick = await screen.findByText("Pick blue");
    fireEvent.click(pick);
    await vi.waitFor(() => expect(screen.queryByText("Pick blue")).toBeNull());
  });

  it("does not open on hover", () => {
    render(() => (
      <PopoverField label="Colour" value="Red">
        <span>Body</span>
      </PopoverField>
    ));
    fireEvent.pointerEnter(screen.getByRole("button"));
    expect(screen.queryByText("Body")).toBeNull();
  });

  it("closes on Escape", async () => {
    render(() => (
      <PopoverField label="Colour" value="Red">
        <span>Body</span>
      </PopoverField>
    ));
    fireEvent.click(screen.getByRole("button"));
    await screen.findByText("Body");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await vi.waitFor(() => expect(screen.queryByText("Body")).toBeNull());
  });
});

describe("DayOfMonthField", () => {
  it("reads 5th, picks 12, reports it and closes", async () => {
    const onChange = vi.fn();
    render(() => <DayOfMonthField value={5} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Day of month: 5th" }));
    fireEvent.click(await screen.findByText("12"));
    expect(onChange).toHaveBeenCalledWith(12);
    await vi.waitFor(() => expect(screen.queryByText("12")).toBeNull());
  });

  it("reports last day and shows it selected", async () => {
    const onChange = vi.fn();
    render(() => <DayOfMonthField value={5} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Day of month: 5th" }));
    fireEvent.click(await screen.findByLabelText("Last of month"));
    expect(onChange).toHaveBeenCalledWith("last");
  });

  it("names itself Last day when the value is last", () => {
    render(() => <DayOfMonthField value="last" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Day of month: Last day" })).toBeTruthy();
  });
});
