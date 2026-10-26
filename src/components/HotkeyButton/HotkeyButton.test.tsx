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

  it("falls back to a trailing hint when the char is absent from the label", () => {
    const { container } = render(() => (
      <HotkeyButton hotkey="z" onTrigger={() => {}}>
        Save
      </HotkeyButton>
    ));
    expect(container.querySelector(".sui-hotkey-btn__key")).toBeNull();
    expect(container.querySelector(".sui-hotkey-btn__hint")!.textContent).toBe("[Z]");
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

  it("by default a held key repeats: every auto-repeat fires", () => {
    const onTrigger = vi.fn();
    render(() => (
      <HotkeyButton hotkey="i" onTrigger={onTrigger}>
        Ignore
      </HotkeyButton>
    ));
    fireEvent.keyDown(window, { key: "i" });
    fireEvent.keyDown(window, { key: "i", repeat: true });
    expect(onTrigger).toHaveBeenCalledTimes(2);
  });

  it("once: a held key's auto-repeats do nothing", () => {
    const onTrigger = vi.fn();
    render(() => (
      <HotkeyButton once hotkey="i" onTrigger={onTrigger}>
        Ignore
      </HotkeyButton>
    ));
    fireEvent.keyDown(window, { key: "i" });
    const repeats = Array.from({ length: 8 }, () => fireEvent.keyDown(window, { key: "i", repeat: true }));
    expect(onTrigger).toHaveBeenCalledOnce();
    // A repeat is still swallowed, so the browser does not act on the held key.
    expect(repeats.every((notCancelled) => !notCancelled)).toBe(true);
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
