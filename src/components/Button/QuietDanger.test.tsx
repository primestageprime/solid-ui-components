import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { QuietDangerButton, SmallQuietDangerButton } from "./variants";
import { HotkeyQuietDangerButton } from "../HotkeyButton/variants";

const btn = (c: HTMLElement) => c.querySelector("button")!;

describe("quiet-danger button", () => {
  it("QuietDangerButton carries the quiet-danger class at default size", () => {
    const { container } = render(() => <QuietDangerButton>Delete</QuietDangerButton>);
    expect(btn(container).className).toContain("sui-btn--quiet-danger");
    expect(btn(container).className).not.toContain("sui-btn--sm");
  });

  it("SmallQuietDangerButton is the small twin", () => {
    const { container } = render(() => <SmallQuietDangerButton>Delete</SmallQuietDangerButton>);
    expect(btn(container).className).toContain("sui-btn--quiet-danger");
    expect(btn(container).className).toContain("sui-btn--sm");
  });

  it("HotkeyQuietDangerButton fires on its key and shows the hint", () => {
    const onTrigger = vi.fn();
    const { container } = render(() => (
      <HotkeyQuietDangerButton hotkey="d" onTrigger={onTrigger}>Delete</HotkeyQuietDangerButton>
    ));
    expect(btn(container).className).toContain("sui-btn--quiet-danger");
    expect(container.querySelector(".sui-hotkey-btn__key")!.textContent).toBe("D");
    fireEvent.click(btn(container));
    expect(onTrigger).toHaveBeenCalled();
  });

  it("styles: muted and borderless at rest, red on hover and focus", () => {
    const css = readFileSync("src/themes/_baseline.css", "utf8");
    const rest = css.match(/\.sui-btn--quiet-danger \{([^}]*)\}/)![1];
    expect(rest).toContain("border: 1px solid transparent");
    expect(rest).toContain("var(--sui-text-muted)");
    const hover = css.match(/\.sui-btn--quiet-danger:hover:not\(:disabled\),\s*\.sui-btn--quiet-danger:focus-visible \{([^}]*)\}/)![1];
    expect(hover).toContain("color: var(--sui-danger)");
  });
});
