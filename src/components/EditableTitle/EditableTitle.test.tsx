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

  it("doubleClick mode: renders a non-button title so a single click can fall through", () => {
    const { getByText } = render(() => (
      <EditableTitle title="hello" onChange={vi.fn()} editTrigger="doubleClick" />
    ));
    expect(getByText("hello").tagName).toBe("SPAN");
  });

  it("doubleClick mode: a single click does NOT open the editor", () => {
    const { getByText, container } = render(() => (
      <EditableTitle title="hello" onChange={vi.fn()} editTrigger="doubleClick" />
    ));
    fireEvent.click(getByText("hello"));
    expect(container.querySelector("input")).toBeNull();
  });

  it("doubleClick mode: a double click opens the editor and commits on Enter", () => {
    const onChange = vi.fn();
    const { getByText, container } = render(() => (
      <EditableTitle title="hello" onChange={onChange} editTrigger="doubleClick" />
    ));
    fireEvent.dblClick(getByText("hello"));
    const input = container.querySelector("input")! as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.input(input, { target: { value: "world" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("world");
  });

  it("clickSelected mode: a click on an UNSELECTED row does NOT open the editor", () => {
    const { getByText, container } = render(() => (
      <EditableTitle
        title="hello"
        onChange={vi.fn()}
        editTrigger="clickSelected"
        rowSelected={false}
      />
    ));
    fireEvent.click(getByText("hello"));
    expect(container.querySelector("input")).toBeNull();
  });

  it("clickSelected mode: a click on the ALREADY-SELECTED row opens the editor", () => {
    const onChange = vi.fn();
    const { getByText, container } = render(() => (
      <EditableTitle
        title="hello"
        onChange={onChange}
        editTrigger="clickSelected"
        rowSelected={true}
      />
    ));
    fireEvent.click(getByText("hello"));
    const input = container.querySelector("input")! as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.input(input, { target: { value: "world" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("world");
  });

  it("clickSelected mode: a modifier click on a selected row does NOT edit (stays a selection gesture)", () => {
    const { getByText, container } = render(() => (
      <EditableTitle
        title="hello"
        onChange={vi.fn()}
        editTrigger="clickSelected"
        rowSelected={true}
      />
    ));
    fireEvent.click(getByText("hello"), { shiftKey: true });
    expect(container.querySelector("input")).toBeNull();
  });
});
