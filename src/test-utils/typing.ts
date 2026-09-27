// ============================================
// Keystroke driver for text inputs.
//
// `fireEvent.input(el, { target: { value } })` REPLACES the whole value, so it
// cannot tell a field that selected its text on focus from one that left the
// caret at the end. That difference is the whole bug behind "$0.00" + "550"
// committing 0.0055 instead of 550. `typeText` inserts one character at a
// time where a real keystroke would: over the current selection, or at the
// caret when the selection is collapsed.
//
// NOT a keyboard simulator — no keydown/keyup, no beforeinput, no IME. Use
// `fireEvent.keyDown` when the assertion is about a key handler.
// ============================================
import { fireEvent } from "@solidjs/testing-library";

/** Replace `[start, end)` of `value` with `text`. */
function spliceText(
  value: string,
  start: number,
  end: number,
  text: string,
): string {
  return value.slice(0, start) + text + value.slice(end);
}

/** Type one character over the input's current selection, then fire `input`. */
function typeChar(input: HTMLInputElement, char: string): void {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const next = spliceText(input.value, start, end, char);
  const caret = start + char.length;
  fireEvent.input(input, { target: { value: next } });
  input.setSelectionRange(caret, caret);
}

/** Type `text` into `input` one character at a time, honouring the selection. */
export function typeText(input: HTMLInputElement, text: string): void {
  for (const char of text) typeChar(input, char);
}
