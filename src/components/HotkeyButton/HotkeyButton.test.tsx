import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { HotkeyButton, createHotkeyButton, isEditableTarget } from "./index";

describe("isEditableTarget", () => {
  it("is true for inputs and false for buttons/null", () => {
    const input = document.createElement("input");
    const button = document.createElement("button");
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(button)).toBeFalsy();
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("HotkeyButton", () => {
  it("emphasizes the first occurrence of the hotkey char in the label", () => {
    const { container } = render(() => (
      <HotkeyButton hotkey="d" onTrigger={() => {}}>
        Mark Done
      </HotkeyButton>
    ));
    const key = container.querySelector(".sui-hotkey-btn__key")!;
    expect(key.textContent).toBe("D");
    expect(container.querySelector(".sui-hotkey-btn__label")!.textContent).toBe(
      "Mark Done",
    );
  });

  // The hint used to render as a small trailing "[Z]"; 8180f96 moved it ahead
  // of the label and sized it up (a numbered-list-style marker, for digit
  // hotkeys on word labels), which drops the brackets. The test wasn't updated
  // with the component.
  it("falls back to a leading hint when the char is absent from the label", () => {
    const { container } = render(() => (
      <HotkeyButton hotkey="z" onTrigger={() => {}}>
        Save
      </HotkeyButton>
    ));
    expect(container.querySelector(".sui-hotkey-btn__key")).toBeNull();
    expect(container.querySelector(".sui-hotkey-btn__hint")!.textContent).toBe("Z");
  });

  it("fires onTrigger on click", () => {
    const onTrigger = vi.fn();
    const { container } = render(() => (
      <HotkeyButton hotkey="g" onTrigger={onTrigger}>
        Go
      </HotkeyButton>
    ));
    fireEvent.click(container.querySelector("button")!);
    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it("fires onTrigger when the armed hotkey is pressed on window", () => {
    const onTrigger = vi.fn();
    render(() => (
      <HotkeyButton hotkey="d" onTrigger={onTrigger}>
        Done
      </HotkeyButton>
    ));
    fireEvent.keyDown(window, { key: "d" });
    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it("does not fire the hotkey when a modifier is held or when disabled", () => {
    const onTrigger = vi.fn();
    render(() => (
      <HotkeyButton hotkey="d" onTrigger={onTrigger} disabled>
        Done
      </HotkeyButton>
    ));
    fireEvent.keyDown(window, { key: "d" });
    fireEvent.keyDown(window, { key: "d", metaKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("does not bind the window listener when armed is false", () => {
    const onTrigger = vi.fn();
    render(() => (
      <HotkeyButton hotkey="d" onTrigger={onTrigger} armed={false}>
        Done
      </HotkeyButton>
    ));
    fireEvent.keyDown(window, { key: "d" });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("createHotkeyButton bakes variant/size overrides onto the underlying button", () => {
    const Curried = createHotkeyButton({ variant: "primary", size: "sm" });
    const { container } = render(() => (
      <Curried hotkey="s" onTrigger={() => {}}>
        Save
      </Curried>
    ));
    const btn = container.querySelector("button")!;
    expect(btn.classList.contains("sui-btn--primary")).toBe(true);
    expect(btn.classList.contains("sui-btn--sm")).toBe(true);
  });
});
