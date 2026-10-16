import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { FillTextArea } from "./FillTextArea";

afterEach(cleanup);

describe("FillTextArea", () => {
  it("renders a textarea that fills: no handle, flex growth class, in a fill column", () => {
    const { container } = render(() => <FillTextArea />);
    const area = container.querySelector("textarea")!;
    expect(area.classList.contains("themed-textarea")).toBe(true);
    expect(area.classList.contains("themed-textarea--fill")).toBe(true);
    const group = container.firstElementChild as HTMLElement;
    expect(group.classList.contains("themed-input-group--fill")).toBe(true);
    expect(group.style.flex).toContain("1");
    expect(group.style.minHeight).toBe("0px");
  });

  it("wires the label to the textarea", () => {
    const { container } = render(() => <FillTextArea label="Notes" />);
    const label = container.querySelector("label")!;
    const area = container.querySelector("textarea")!;
    expect(label.textContent).toBe("Notes");
    expect(label.getAttribute("for")).toBe(area.id);
  });

  it("keeps a stated id and forwards native attributes and events", () => {
    const onInput = vi.fn();
    const { container } = render(() => (
      <FillTextArea id="task-notes" label="Notes" placeholder="Write here" value="hi" onInput={onInput} />
    ));
    const area = container.querySelector("textarea")!;
    expect(area.id).toBe("task-notes");
    expect(area.getAttribute("placeholder")).toBe("Write here");
    fireEvent.input(area, { target: { value: "more" } });
    expect(onInput).toHaveBeenCalledTimes(1);
  });
});
