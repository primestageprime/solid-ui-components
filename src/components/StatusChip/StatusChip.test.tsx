import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { StatusChip } from "./index";

afterEach(cleanup);

describe("StatusChip", () => {
  it("renders the current status", () => {
    const { getByText } = render(() => <StatusChip status="TODO" title="task" />);
    expect(getByText("TODO")).toBeTruthy();
  });

  it("commits a new value on Enter", () => {
    const onChange = vi.fn();
    const { getByText, container } = render(() => (
      <StatusChip status="TODO" title="task" onChange={onChange} />
    ));
    fireEvent.click(getByText("TODO"));
    const input = container.querySelector("input")! as HTMLInputElement;
    input.value = "DOING";
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("DOING");
  });

  it("Escape cancels without committing", () => {
    const onChange = vi.fn();
    const { getByText, container } = render(() => (
      <StatusChip status="TODO" title="task" onChange={onChange} />
    ));
    fireEvent.click(getByText("TODO"));
    const input = container.querySelector("input")! as HTMLInputElement;
    input.value = "DOING";
    fireEvent.keyDown(input, { key: "Escape" });
    // The Escape-triggered blur must not commit the draft.
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("selecting an option from the caret menu commits it", () => {
    const onChange = vi.fn();
    const { getByLabelText, getByRole } = render(() => (
      <StatusChip status="TODO" title="task" options={["TODO", "DONE"]} onChange={onChange} />
    ));
    fireEvent.click(getByLabelText("Select status of task"));
    fireEvent.click(getByRole("option", { name: "DONE" }));
    expect(onChange).toHaveBeenCalledWith("DONE");
  });
});
