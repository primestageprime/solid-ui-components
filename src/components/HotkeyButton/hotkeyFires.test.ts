// ============================================
// HotkeyButton guard — the headless observation.
//
//   npx vitest run src/components/HotkeyButton/hotkeyFires.test.ts --reporter=verbose
// ============================================
import { describe, expect, it } from "vitest";
import { map } from "../../fn";
import { type HotkeyPress, hotkeyFires } from "./HotkeyButton";

const on = (tag: string, editable = false): HTMLElement => {
  const el = document.createElement(tag);
  if (editable) el.contentEditable = "true";
  // jsdom does not compute isContentEditable from the attribute.
  if (editable) Object.defineProperty(el, "isContentEditable", { value: true });
  return el;
};

const press = (
  key: string,
  target: EventTarget | null,
  mods: Partial<Pick<HotkeyPress, "metaKey" | "ctrlKey" | "altKey">> = {},
): HotkeyPress => ({
  key,
  target,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...mods,
});

describe("hotkeyFires — should 'a' fire Add?", () => {
  it("fires on the page and on a button, never in a field or with a chord", () => {
    const cases: readonly [string, HotkeyPress][] = [
      ["a on body", press("a", document.body)],
      ["A (shift) on body", press("A", document.body)],
      ["a on a button", press("a", on("button"))],
      ["a in an input", press("a", on("input"))],
      ["a in a textarea", press("a", on("textarea"))],
      ["a in a select", press("a", on("select"))],
      ["a in contenteditable", press("a", on("div", true))],
      ["⌘a on body", press("a", document.body, { metaKey: true })],
      ["ctrl+a on body", press("a", document.body, { ctrlKey: true })],
      ["alt+a on body", press("a", document.body, { altKey: true })],
      ["b on body", press("b", document.body)],
      ["a, no target", press("a", null)],
    ];
    const rows = map(([name, p]) => ({ press: name, fires: hotkeyFires(p, "a") }), cases);
    console.table(rows);
    expect(map((row) => row.fires, rows)).toEqual([
      true, true, true, false, false, false, false, false, false, false, false, true,
    ]);
  });

  it("an empty hotkey never fires", () => {
    expect(hotkeyFires(press("a", document.body), "")).toBe(false);
  });
});
