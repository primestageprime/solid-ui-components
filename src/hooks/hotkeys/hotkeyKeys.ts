// ============================================
// hotkeyKeys — how a key name reads, matches and shows (#53325). Pure.
//
// A KEY is one step or a chord of steps joined by a space: "Enter", "i",
// "?", "Mod+z", "g t". A STEP is a key with optional modifiers joined by "+":
// `Mod` (⌘ on macOS, Ctrl elsewhere), `Meta`, `Ctrl`, `Alt`, `Shift`.
//
// MATCHING (the "keys" mode; the registry's):
// - A printable key with no modifiers matches `e.key` case-insensitively,
//   and Shift is ignored: `?` works, Caps Lock does not disarm `i`.
// - A named key (`Enter`, `Escape`) or a step with modifiers matches the
//   modifiers EXACTLY, Shift included: `Mod+z` is not `Mod+Shift+z`.
// - ⌘, Ctrl and Alt must always match: `i` does not fire on ⌘I.
// - When `e.key` is not ASCII (a Cyrillic layout, macOS Alt), the character
//   comes from `e.code` (`KeyZ` → z, `Digit1` → 1).
// The "exact" mode is the old `dispatchHotkey` rule, kept for its tables:
// `e.key` equals the key string, case and all, with no ⌘ / Ctrl / Alt held.
// ============================================
import type { HotkeyPress } from "./hotkeyGuard";

export interface KeyStep {
	/** The key: one printable character ("z", "?") or a named key ("Enter"). */
	key: string;
	mod: boolean;
	meta: boolean;
	ctrl: boolean;
	alt: boolean;
	shift: boolean;
}

/** How a step is compared with a press. */
export type KeyMatchMode = "keys" | "exact";

const MODIFIERS: Readonly<Record<string, keyof Omit<KeyStep, "key">>> = {
	mod: "mod",
	meta: "meta",
	cmd: "meta",
	ctrl: "ctrl",
	control: "ctrl",
	alt: "alt",
	option: "alt",
	shift: "shift",
};

const NO_MODS = {
	mod: false,
	meta: false,
	ctrl: false,
	alt: false,
	shift: false,
};

/** One step: "Mod+z" → { key: "z", mod: true }. "Mod++" is the plus key. */
export function parseStep(step: string): KeyStep {
	const plusKey = step.length > 1 && step.endsWith("++");
	const body = plusKey ? step.slice(0, -2) : step;
	const parts = body === "+" ? ["+"] : body.split("+");
	const key = plusKey ? "+" : (parts[parts.length - 1] ?? "");
	const mods = (plusKey ? parts : parts.slice(0, -1)).filter((p) => p !== "");
	return mods.reduce<KeyStep>(
		(acc, m) => {
			const flag = MODIFIERS[m.toLowerCase()];
			return flag ? { ...acc, [flag]: true } : acc;
		},
		{ key, ...NO_MODS },
	);
}

/** A whole key: "g t" → two steps. A lone " " is the Space key. */
export const parseKey = (keys: string): KeyStep[] =>
	keys === " "
		? [parseStep(" ")]
		: keys
				.split(" ")
				.filter((s) => s !== "")
				.map(parseStep);

const hasMods = (s: KeyStep): boolean =>
	s.mod || s.meta || s.ctrl || s.alt || s.shift;
const isPrintable = (key: string): boolean => [...key].length === 1;
const isAscii = (key: string): boolean => /^[\x20-\x7e]$/.test(key);

/** The character a press stands for: `e.key`, or from `e.code` when `e.key` is not ASCII. */
export function pressChar(press: Pick<HotkeyPress, "key" | "code">): string {
	if (!isPrintable(press.key) || isAscii(press.key)) return press.key;
	const code = press.code ?? "";
	const letter = /^Key([A-Z])$/.exec(code);
	if (letter) return letter[1].toLowerCase();
	const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code);
	return digit ? digit[1] : press.key;
}

/** The text a step is known by in a chord prefix ("g", "Mod+k"). */
export const stepName = (s: KeyStep): string =>
	[
		s.mod && "Mod",
		s.meta && "Meta",
		s.ctrl && "Ctrl",
		s.alt && "Alt",
		s.shift && "Shift",
		s.key,
	]
		.filter(Boolean)
		.join("+");

/** Whether one press is this step. `mac` decides what `Mod` is. */
export function stepMatches(
	step: KeyStep,
	press: HotkeyPress,
	mac: boolean,
	mode: KeyMatchMode = "keys",
): boolean {
	if (mode === "exact") {
		return (
			!press.metaKey &&
			!press.ctrlKey &&
			!press.altKey &&
			press.key === stepName(step)
		);
	}
	const meta = step.meta || (step.mod && mac);
	const ctrl = step.ctrl || (step.mod && !mac);
	if (
		press.metaKey !== meta ||
		press.ctrlKey !== ctrl ||
		press.altKey !== step.alt
	)
		return false;
	const printable = isPrintable(step.key);
	// Shift is ignored only for a bare printable key ("?", "i").
	const shiftFree = printable && !hasMods(step);
	if (!shiftFree && (press.shiftKey ?? false) !== step.shift) return false;
	return printable
		? pressChar(press).toLowerCase() === step.key.toLowerCase()
		: press.key === step.key;
}

/** True on macOS and iOS, where `Mod` is ⌘. False on the server. */
export function isMacPlatform(): boolean {
	if (typeof navigator === "undefined") return false;
	const nav = navigator as Navigator & {
		userAgentData?: { platform?: string };
	};
	return /mac|iphone|ipad|ipod/i.test(
		nav.userAgentData?.platform ?? nav.platform ?? "",
	);
}

/** Chords the browser keeps (close tab, new tab, new window, quit). Registering one is a dev error. */
const RESERVED = new Set(["w", "t", "n", "q"]);

export const isReservedKey = (keys: string): boolean =>
	parseKey(keys).some(
		(s) =>
			(s.mod || s.meta || s.ctrl) &&
			!s.alt &&
			RESERVED.has(s.key.toLowerCase()),
	);

const NAMED_GLYPHS: Readonly<Record<string, string>> = {
	Enter: "↵",
	Escape: "Esc",
	" ": "Space",
	Tab: "Tab",
	Backspace: "⌫",
	Delete: "Del",
	ArrowUp: "↑",
	ArrowDown: "↓",
	ArrowLeft: "←",
	ArrowRight: "→",
};

const glyphOfKey = (key: string): string =>
	NAMED_GLYPHS[key] ?? (isPrintable(key) ? key.toUpperCase() : key);

/** The hint for one step: "↵", "Esc", "⌘Z" (macOS) or "Ctrl+Z". */
export function stepGlyph(s: KeyStep, mac: boolean): string {
	const key = glyphOfKey(s.key);
	if (mac) {
		const mods = [
			(s.ctrl && "⌃") || "",
			(s.alt && "⌥") || "",
			(s.shift && "⇧") || "",
			((s.mod || s.meta) && "⌘") || "",
		].join("");
		return `${mods}${key}`;
	}
	const mods = [
		(s.mod || s.ctrl) && "Ctrl",
		s.meta && "Meta",
		s.alt && "Alt",
		s.shift && "Shift",
	].filter(Boolean);
	return [...mods, key].join("+");
}

/** The hint for a whole key: "↵", "⌘Z", "G T". */
export const keyGlyph = (keys: string, mac: boolean): string =>
	parseKey(keys)
		.map((s) => stepGlyph(s, mac))
		.join(" ");

/** True when the key is one bare letter or digit: the hint is an underlined letter. */
export const isLetterKey = (keys: string): boolean => {
	const steps = parseKey(keys);
	return (
		steps.length === 1 && !hasMods(steps[0]) && /^[a-z0-9]$/i.test(steps[0].key)
	);
};

const ARIA_KEY: Readonly<Record<string, string>> = { " ": "Space" };

/** One key in `aria-keyshortcuts` form ("Control+Z", "Enter"), or null for a chord, which it cannot express. */
export function ariaKeyShortcut(keys: string, mac: boolean): string | null {
	const steps = parseKey(keys);
	if (steps.length !== 1) return null;
	const s = steps[0];
	const key =
		ARIA_KEY[s.key] ?? (isPrintable(s.key) ? s.key.toUpperCase() : s.key);
	return [
		(s.meta || (s.mod && mac)) && "Meta",
		(s.ctrl || (s.mod && !mac)) && "Control",
		s.alt && "Alt",
		s.shift && "Shift",
		key,
	]
		.filter(Boolean)
		.join("+");
}
