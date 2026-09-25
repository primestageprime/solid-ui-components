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

  it("autoEdit opens the editor on mount; an inert title never does", () => {
    const onChange = vi.fn();
    const live = render(() => (
      <EditableTitle title="New scenario" onChange={onChange} autoEdit />
    ));
    const input = live.container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("New scenario");
    fireEvent.input(input, { target: { value: "Lean 2027" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("Lean 2027");
    const inert = render(() => <EditableTitle title="x" autoEdit />);
    expect(inert.container.querySelector("input")).toBeNull();
  });

  it("fill: the whole slot is the click target; default callers are unchanged", () => {
    const filled = render(() => (
      <EditableTitle title="Lean" onChange={vi.fn()} fill />
    ));
    const root = filled.container.querySelector(".sui-editable-title")!;
    expect(root.classList.contains("sui-editable-title--fill")).toBe(true);
    // The target is the flex item that spans the slot — a click anywhere in
    // it (here, far right of the text) opens the editor.
    const target = root.querySelector(".sui-editable-title__text")!;
    expect(target.parentElement).toBe(root);
    fireEvent.click(target, { clientX: 999 });
    expect(filled.container.querySelector("input")).toBeTruthy();
    const plain = render(() => <EditableTitle title="x" onChange={vi.fn()} />);
    expect(
      plain.container
        .querySelector(".sui-editable-title")!
        .classList.contains("sui-editable-title--fill"),
    ).toBe(false);
  });

  it("fill: the field's affordance is drawn INSIDE it, so the clipping host cannot hide it", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "EditableTitle.css"),
      "utf8",
    );
    const at = css.indexOf(".sui-editable-title--fill .sui-editable-title__input {");
    expect(at).toBeGreaterThan(-1);
    const rule = css.slice(at, css.indexOf("}", at));
    expect(rule).toMatch(/outline-offset:\s*-1px/);
    expect(rule).toMatch(/background:/);
    expect(rule).toMatch(/caret-color:/);
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
