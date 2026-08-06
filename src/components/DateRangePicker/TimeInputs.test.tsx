import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { TimeInputs } from "./TimeInputs";

const mount = (start = "09:00", end = "17:30") => {
  const onStartTimeChange = vi.fn();
  const onEndTimeChange = vi.fn();
  const r = render(() => (
    <TimeInputs
      startTime={() => start}
      endTime={() => end}
      onStartTimeChange={onStartTimeChange}
      onEndTimeChange={onEndTimeChange}
    />
  ));
  return { ...r, onStartTimeChange, onEndTimeChange };
};

const inputs = (c: HTMLElement) => [
  ...c.querySelectorAll<HTMLInputElement>(".sui-drp__time-input"),
];

describe("TimeInputs — rendering", () => {
  // type="time" is the entire design decision here: the header says the
  // browser supplies the hh:mm UI and validation. Downgrading to type="text"
  // would look identical in a DOM snapshot and silently drop both.
  it("renders two native time inputs", () => {
    const { container } = mount();
    expect(inputs(container)).toHaveLength(2);
    for (const i of inputs(container)) {
      expect(i.getAttribute("type")).toBe("time");
    }
  });

  it("binds each accessor to its own input, in start-then-end order", () => {
    const { container } = mount("09:00", "17:30");
    expect(inputs(container)[0].value).toBe("09:00");
    expect(inputs(container)[1].value).toBe("17:30");
  });

  it("renders the separator between the two inputs", () => {
    const { container } = mount();
    expect(
      container.querySelector(".sui-drp__time-separator")?.textContent,
    ).toBe("to");
  });

  it("renders midnight rather than treating an empty-looking time as absent", () => {
    const { container } = mount("00:00", "00:00");
    expect(inputs(container)[0].value).toBe("00:00");
    expect(inputs(container)[1].value).toBe("00:00");
  });
});

describe("TimeInputs — change handlers", () => {
  it("reports the new start time and leaves the end handler alone", () => {
    const { container, onStartTimeChange, onEndTimeChange } = mount();
    fireEvent.input(inputs(container)[0], { target: { value: "08:15" } });
    expect(onStartTimeChange).toHaveBeenCalledWith("08:15");
    expect(onEndTimeChange).not.toHaveBeenCalled();
  });

  it("reports the new end time and leaves the start handler alone", () => {
    const { container, onStartTimeChange, onEndTimeChange } = mount();
    fireEvent.input(inputs(container)[1], { target: { value: "22:45" } });
    expect(onEndTimeChange).toHaveBeenCalledWith("22:45");
    expect(onStartTimeChange).not.toHaveBeenCalled();
  });

  // The handler reads `e.currentTarget.value`, so it reports the string the
  // input now holds. Clearing a time input yields "" — a real state the
  // parent has to be told about, not one to swallow as "no change".
  it("reports a cleared input as an empty string", () => {
    const { container, onStartTimeChange } = mount();
    fireEvent.input(inputs(container)[0], { target: { value: "" } });
    expect(onStartTimeChange).toHaveBeenCalledWith("");
  });
});
