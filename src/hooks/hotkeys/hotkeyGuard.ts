// ============================================
// hotkeyGuard — the key guard of the hotkey registry (#53325). Pure, no Solid.
// One function sorts each press by what has focus:
//
//   editable  a text field, textarea, select or contentEditable. The field
//             keeps EVERY key: Ctrl-Z there is the browser's undo, Enter in a
//             form field is the form's submit (`submitOnEnter`).
//   owns-key  the focused control has its own meaning for this key:
//             - Enter and Space on a button, a link, `role="button"` or
//               `role="option"`;
//             - Space (NOT Enter) on a checkbox or a radio, native or by role;
//             - Space (NOT Enter) on a strip tab, `role="tab"` (thorcasting
//               rules ps1, 2026-10-09: Enter on a tab is the page's key);
//             - Escape on an open popup (`aria-expanded="true"`) or inside a
//               listbox or a menu, which close themselves on Escape.
//   free      the registry dispatches the press.
//
// `isEditableTarget` is the `editable` half alone. It used to call EVERY
// <input> editable; a checkbox, a radio and the button-like inputs are not.
// ============================================

/** The parts of a keydown the hotkey guard and the dispatcher read. */
export interface HotkeyPress {
	readonly key: string;
	readonly metaKey: boolean;
	readonly ctrlKey: boolean;
	readonly altKey: boolean;
	readonly target: EventTarget | null;
	/** Default false. */
	readonly shiftKey?: boolean;
	/** The physical key (`KeyZ`), read when `key` is not ASCII. */
	readonly code?: string;
	/** An auto-repeat of a held key. */
	readonly repeat?: boolean;
	/** An IME composition is in progress. */
	readonly isComposing?: boolean;
}

/** What has focus, for one press. */
export type HotkeyGuard = "editable" | "owns-key" | "free";

/** Input types that are a control, not a text field. */
const BUTTON_INPUTS: ReadonlySet<string> = new Set([
	"button",
	"submit",
	"reset",
	"image",
]);
const TOGGLE_INPUTS: ReadonlySet<string> = new Set(["checkbox", "radio"]);

const isElement = (el: EventTarget | null): el is HTMLElement =>
	typeof HTMLElement !== "undefined" && el instanceof HTMLElement;

const inputType = (el: HTMLElement): string =>
	el.tagName === "INPUT"
		? ((el as HTMLInputElement).type || "text").toLowerCase()
		: "";

/** True when the target is a text-editing surface (a text field, textarea,
 *  select or contentEditable). A checkbox, a radio and a button-like input
 *  are NOT. Exported so other keyboard-shortcut owners (ActionList's
 *  Escape-clears-selection) can defer to an active inline editor. */
export function isEditableTarget(el: EventTarget | null): boolean {
	if (!isElement(el)) return false;
	const tag = el.tagName;
	if (tag === "INPUT") {
		const type = inputType(el);
		return !BUTTON_INPUTS.has(type) && !TOGGLE_INPUTS.has(type);
	}
	return (
		tag === "TEXTAREA" || tag === "SELECT" || (el.isContentEditable ?? false)
	);
}

const roleOf = (el: HTMLElement): string => el.getAttribute("role") ?? "";

/** Enter and Space activate it. */
const activatesOnEnter = (el: HTMLElement): boolean =>
	el.tagName === "BUTTON" ||
	(el.tagName === "A" && el.hasAttribute("href")) ||
	BUTTON_INPUTS.has(inputType(el)) ||
	roleOf(el) === "button" ||
	roleOf(el) === "option";

/** Space toggles or selects it; Enter stays the page's key. */
const activatesOnSpaceOnly = (el: HTMLElement): boolean =>
	TOGGLE_INPUTS.has(inputType(el)) ||
	roleOf(el) === "checkbox" ||
	roleOf(el) === "radio" ||
	roleOf(el) === "tab";

/** An open popup, or a list that closes itself on Escape. */
const closesOnEscape = (el: HTMLElement): boolean =>
	el.getAttribute("aria-expanded") === "true" ||
	el.closest('[role="listbox"], [role="menu"]') !== null;

/** Sort one press: `editable`, `owns-key` or `free`. */
export function hotkeyGuard(
	target: EventTarget | null,
	key: string,
): HotkeyGuard {
	if (!isElement(target)) return "free";
	if (isEditableTarget(target)) return "editable";
	const space = key === " " || key === "Spacebar";
	// A strip tab gives Enter to the page, even a <button role="tab">.
	const tab = roleOf(target) === "tab";
	if (key === "Enter" && !tab && activatesOnEnter(target)) return "owns-key";
	if (space && (activatesOnEnter(target) || activatesOnSpaceOnly(target)))
		return "owns-key";
	if (key === "Escape" && closesOnEscape(target)) return "owns-key";
	return "free";
}
