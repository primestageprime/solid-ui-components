import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { SmallButton } from "../Button";
import { HotkeyButton } from "../HotkeyButton";
import { ShortcutHelp, groupShortcuts } from ".";

const SHORTCUTS = [
  { keys: "d", label: "Delete", group: "Actions" },
  { keys: "s", label: "Save", group: "Actions" },
  { keys: "Enter", label: "Save from a field", group: "Fields" },
];

const press = (key: string) => fireEvent.keyDown(document.body, { key });

describe("groupShortcuts", () => {
  it("keeps groups in first-use order and rows in order", () => {
    const g = groupShortcuts([
      { keys: "a", label: "A", group: "X" },
      { keys: "b", label: "B" },
      { keys: "c", label: "C", group: "X" },
    ]);
    expect(g.map((x) => [x.title, x.rows.map((r) => r.label)])).toEqual([
      ["X", ["A", "C"]],
      [undefined, ["B"]],
    ]);
  });
});

describe("ShortcutHelp", () => {
  it("is closed until the ? button is clicked, then lists every shortcut by group", () => {
    render(() => <ShortcutHelp shortcuts={SHORTCUTS} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Keyboard shortcuts" }));
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(dialog.textContent).toContain("Delete");
    expect(dialog.textContent).toContain("Fields");
    expect(Array.from(dialog.querySelectorAll("kbd")).map((k) => k.textContent)).toContain("D");
  });

  it("opens on the ? key and closes on Escape", () => {
    render(() => <ShortcutHelp shortcuts={SHORTCUTS} />);
    press("?");
    expect(screen.getByRole("dialog")).toBeTruthy();
    press("Escape");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("? closes it again", () => {
    render(() => <ShortcutHelp shortcuts={SHORTCUTS} />);
    press("?");
    press("?");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on a click on the scrim but not on the panel", () => {
    render(() => <ShortcutHelp shortcuts={SHORTCUTS} />);
    press("?");
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(document.querySelector(".sui-shortcut-help__scrim")!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("blocks page keys while open", () => {
    const onDelete = vi.fn();
    render(() => (
      <>
        <HotkeyButton hotkey="d" onTrigger={onDelete}>Delete</HotkeyButton>
        <ShortcutHelp shortcuts={SHORTCUTS} />
        <SmallButton>x</SmallButton>
      </>
    ));
    press("?");
    press("d");
    expect(onDelete).not.toHaveBeenCalled();
    press("Escape");
    press("d");
    expect(onDelete).toHaveBeenCalled();
  });
});
