import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { ThemedInput } from "./ThemedInput";
import { ThemedTextarea } from "./ThemedTextarea";
import { NameInput } from "./NameInput";

describe("ThemedInput", () => {
  it("renders an input carrying the themed-input class", () => {
    const { container } = render(() => <ThemedInput />);
    const input = container.querySelector("input")!;
    expect(input.classList.contains("themed-input")).toBe(true);
  });

  it("renders a label wired to the input via for/id", () => {
    const { container } = render(() => <ThemedInput label="Email" />);
    const label = container.querySelector("label")!;
    const input = container.querySelector("input")!;
    expect(label.textContent).toBe("Email");
    expect(label.getAttribute("for")).toBe(input.id);
    expect(input.id).toBeTruthy();
  });

  it("forwards native input attributes", () => {
    const { container } = render(() => (
      <ThemedInput placeholder="type here" value="hi" />
    ));
    const input = container.querySelector("input")!;
    expect(input.getAttribute("placeholder")).toBe("type here");
  });
});

describe("ThemedTextarea", () => {
  it("renders a textarea carrying the themed-textarea class", () => {
    const { container } = render(() => <ThemedTextarea label="Notes" />);
    const ta = container.querySelector("textarea")!;
    expect(ta.classList.contains("themed-textarea")).toBe(true);
    expect(container.querySelector("label")!.textContent).toBe("Notes");
  });
});

describe("NameInput", () => {
  it("layers the anti-autofill attributes", () => {
    const { container } = render(() => <NameInput label="Scenario" />);
    const input = container.querySelector("input")!;
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(input.getAttribute("data-1p-ignore")).toBe("true");
    expect(input.getAttribute("data-lpignore")).toBe("true");
    expect(input.getAttribute("data-form-type")).toBe("other");
    // Randomized name breaks the browser's field-correlation heuristic.
    expect(input.getAttribute("name")).toMatch(/^nm-/);
  });

  it("starts readonly and drops readonly on focus", () => {
    const { container } = render(() => <NameInput />);
    const input = container.querySelector("input")!;
    expect(input.readOnly).toBe(true);
    fireEvent.focus(input);
    expect(input.readOnly).toBe(false);
  });
});
