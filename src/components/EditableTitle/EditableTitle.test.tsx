import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { EditableTitle } from "./index";

afterEach(cleanup);

describe("EditableTitle", () => {
  it("renders the title text", () => {
    const { getByText } = render(() => <EditableTitle title="hello" />);
    expect(getByText("hello")).toBeTruthy();
  });

  it("is inert (no edit button role) without onChange", () => {
    const { getByText } = render(() => <EditableTitle title="hello" />);
    const btn = getByText("hello") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("commits a rename on Enter", () => {
    const onChange = vi.fn();
    const { getByText, container } = render(() => (
      <EditableTitle title="hello" onChange={onChange} />
    ));
    fireEvent.click(getByText("hello"));
    const input = container.querySelector("input")! as HTMLInputElement;
    input.value = "world";
    fireEvent.input(input, { target: { value: "world" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("world");
  });

  it("Escape cancels without committing", () => {
    const onChange = vi.fn();
    const { getByText, container } = render(() => (
      <EditableTitle title="hello" onChange={onChange} />
    ));
    fireEvent.click(getByText("hello"));
    const input = container.querySelector("input")! as HTMLInputElement;
    input.value = "world";
    fireEvent.input(input, { target: { value: "world" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });
});
