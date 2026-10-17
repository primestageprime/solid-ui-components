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

// A `fold` HotkeyButton is its icon alone at phone width (Peter, 2026-10-17:
// "for the phone button there is no keyboard, so you do not need a hotkey"),
// and the keyed text button wider. The fold is the AppBar's.
import { FoldingHotkeyButton, HOTKEY_BUTTON_FOLD_QUERY } from "./index";
import { APP_BAR_FOLD_QUERY } from "../AppBar/AppBar";

/** Swap jsdom's always-false matchMedia for one that matches `query` only. */
const withMatchingQuery = (query: string): (() => void) => {
  const original = window.matchMedia;
  window.matchMedia = ((q: string) =>
    ({
      matches: q === query,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
};

describe("HotkeyButton fold", () => {
  it("folds at the AppBar's phone width", () => {
    expect(HOTKEY_BUTTON_FOLD_QUERY).toBe(APP_BAR_FOLD_QUERY);
  });

  it("wider than the fold, a FoldingHotkeyButton is the keyed text button with its icon", () => {
    const { container } = render(() => (
      <FoldingHotkeyButton hotkey="c" icon="check" onTrigger={() => {}}>
        Complete
      </FoldingHotkeyButton>
    ));
    const btn = container.querySelector("button")!;
    expect(btn.classList.contains("sui-hotkey-btn--folded")).toBe(false);
    expect(container.querySelector(".sui-hotkey-btn__label")!.textContent).toBe("Complete");
    expect(container.querySelector(".sui-hotkey-btn__key")!.textContent).toBe("C");
    expect(container.querySelector(".sui-hotkey-btn__icon")).not.toBeNull();
    expect(btn.getAttribute("aria-label")).toBeNull();
  });

  it("at phone width it is the icon alone: no label, no key, no hint, the label as aria-label", () => {
    const restore = withMatchingQuery(HOTKEY_BUTTON_FOLD_QUERY);
    try {
      const onTrigger = vi.fn();
      const { container } = render(() => (
        <FoldingHotkeyButton hotkey="z" icon="trash" onTrigger={onTrigger}>
          Delete
        </FoldingHotkeyButton>
      ));
      const btn = container.querySelector("button")!;
      expect(btn.classList.contains("sui-hotkey-btn--folded")).toBe(true);
      expect(container.querySelector(".sui-hotkey-btn__label")).toBeNull();
      expect(container.querySelector(".sui-hotkey-btn__key")).toBeNull();
      expect(container.querySelector(".sui-hotkey-btn__hint")).toBeNull();
      expect(container.querySelector(".sui-hotkey-btn__icon--alone")).not.toBeNull();
      expect(btn.getAttribute("aria-label")).toBe("Delete");
      expect(btn.textContent).not.toContain("Delete");
      fireEvent.click(btn);
      fireEvent.keyDown(window, { key: "z" });
      expect(onTrigger).toHaveBeenCalledTimes(2);
    } finally {
      restore();
    }
  });

  it("without an icon it never folds, and a plain HotkeyButton ignores the fold", () => {
    const restore = withMatchingQuery(HOTKEY_BUTTON_FOLD_QUERY);
    try {
      const { container } = render(() => (
        <>
          <FoldingHotkeyButton hotkey="e" onTrigger={() => {}}>
            Edit
          </FoldingHotkeyButton>
          <HotkeyButton hotkey="s" icon="play" onTrigger={() => {}}>
            Start
          </HotkeyButton>
        </>
      ));
      const labels = container.querySelectorAll(".sui-hotkey-btn__label");
      expect(labels.length).toBe(2);
      expect(container.querySelector(".sui-hotkey-btn--folded")).toBeNull();
    } finally {
      restore();
    }
  });
});
