// ============================================
// The hotkey rules as trace tables (#53325): the key guard, ranks, Shift,
// the e.code fallback, repeat, IME, Mod chords, the hint glyphs.
//
//   npx vitest run src/hooks/hotkeys/hotkeyRules.test.ts --reporter=verbose
// ============================================
import { describe, expect, it } from "vitest";
import { type HotkeyEntry, traceHotkeys } from "../hotkeyDispatch";
import { hotkeyGuard, isEditableTarget } from "./hotkeyGuard";
import {
	ariaKeyShortcut,
	isLetterKey,
	isReservedKey,
	keyGlyph,
	parseStep,
} from "./hotkeyKeys";

const el = (tag: string, attrs: Record<string, string> = {}): HTMLElement => {
	const node = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
	return node;
};

describe("hotkeyGuard — one row per case", () => {
	it("sorts each press into editable, owns-key or free", () => {
		const editableDiv = el("div");
		Object.defineProperty(editableDiv, "isContentEditable", { value: true });
		const optionInList = el("div", { role: "option" });
		el("div", { role: "listbox" }).appendChild(optionInList);
		const cases: ReadonlyArray<[string, EventTarget | null, string]> = [
			["Enter, nothing focused", null, "Enter"],
			["Enter on body", document.body, "Enter"],
			["Enter in a text input", el("input"), "Enter"],
			["z in a text input", el("input", { type: "text" }), "z"],
			["Enter in a textarea", el("textarea"), "Enter"],
			["Enter in a select", el("select"), "Enter"],
			["Enter in contentEditable", editableDiv, "Enter"],
			["Enter on a button", el("button"), "Enter"],
			["Space on a button", el("button"), " "],
			["i on a button", el("button"), "i"],
			["Enter on a link", el("a", { href: "#" }), "Enter"],
			["Enter on role=button", el("div", { role: "button" }), "Enter"],
			["Enter on role=option", optionInList, "Enter"],
			["Enter on a checkbox", el("input", { type: "checkbox" }), "Enter"],
			["Space on a checkbox", el("input", { type: "checkbox" }), " "],
			["Enter on a radio", el("input", { type: "radio" }), "Enter"],
			["Enter on a strip tab", el("button", { role: "tab" }), "Enter"],
			["Space on a strip tab", el("div", { role: "tab" }), " "],
			[
				"Escape on an open popup",
				el("button", { "aria-expanded": "true" }),
				"Escape",
			],
			["Escape in a listbox", optionInList, "Escape"],
			["Escape on body", document.body, "Escape"],
		];
		const rows = cases.map(([name, target, key]) => ({
			press: name,
			guard: hotkeyGuard(target, key),
		}));
		console.table(rows);
		expect(rows.map((r) => r.guard)).toEqual([
			"free",
			"free",
			"editable",
			"editable",
			"editable",
			"editable",
			"editable",
			"owns-key",
			"owns-key",
			"free",
			"owns-key",
			"owns-key",
			"owns-key",
			"free",
			"owns-key",
			"free",
			// A strip tab (here a <button role="tab">) does not keep Enter: the role wins over the tag.
			"free",
			"owns-key",
			"owns-key",
			"owns-key",
			"free",
		]);
	});

	it("a checkbox and a radio are not editable; a text input is", () => {
		expect(
			[
				el("input", { type: "checkbox" }),
				el("input", { type: "radio" }),
				el("input"),
				el("input", { type: "submit" }),
			].map(isEditableTarget),
		).toEqual([false, false, true, false]);
	});
});

const REG = (
	keys: string,
	action: string,
	extra: Partial<HotkeyEntry<"r">> = {},
): HotkeyEntry<"r"> => ({
	action,
	keys,
	scope: "r",
	match: "keys",
	...extra,
});
const trace = (
	table: HotkeyEntry<"r">[],
	presses: Parameters<typeof traceHotkeys>[2],
	mac = false,
) =>
	traceHotkeys<"r">(table, ["r"], presses, { mac }).map((r) => [
		r.key,
		r.outcome,
		r.action,
	]);

describe('registry matching (match: "keys")', () => {
	it("a bare printable key ignores Shift and case; a named key and a Mod chord do not", () => {
		const table = [
			REG("i", "ignore"),
			REG("?", "help"),
			REG("Enter", "next"),
			REG("Mod+z", "undo"),
		];
		expect(
			trace(table, [
				"i",
				{ key: "I", shift: true },
				{ key: "?", shift: true },
				{ key: "Enter", shift: true },
				"Enter",
				{ key: "z", ctrl: true },
				{ key: "Z", ctrl: true, shift: true },
				{ key: "z", meta: true },
				{ key: "i", meta: true },
			]),
		).toEqual([
			["i", "fire", "ignore"],
			["I", "fire", "ignore"],
			["?", "fire", "help"],
			["Enter", "ignored", ""],
			["Enter", "fire", "next"],
			["z", "fire", "undo"],
			["Z", "ignored", ""],
			["z", "ignored", ""],
			["i", "ignored", ""],
		]);
	});

	it("Mod is ⌘ on macOS", () => {
		const table = [REG("Mod+z", "undo")];
		expect(
			trace(
				table,
				[
					{ key: "z", meta: true },
					{ key: "z", ctrl: true },
				],
				true,
			),
		).toEqual([
			["z", "fire", "undo"],
			["z", "ignored", ""],
		]);
	});

	it("a non-ASCII e.key matches by e.code (a Cyrillic layout)", () => {
		const table = [REG("Mod+z", "undo"), REG("i", "ignore")];
		expect(
			trace(table, [
				{ key: "я", code: "KeyZ", ctrl: true },
				{ key: "ш", code: "KeyI" },
				{ key: "я", code: "KeyQ", ctrl: true },
			]),
		).toEqual([
			["я", "fire", "undo"],
			["ш", "fire", "ignore"],
			["я", "ignored", ""],
		]);
	});

	it("an auto-repeat is cancelled and fires nothing; an IME composition is ignored", () => {
		const table = [REG("Enter", "next"), REG("j", "down", { repeats: true })];
		expect(
			trace(table, [
				"Enter",
				{ key: "Enter", repeat: true },
				{ key: "Enter", composing: true },
				{ key: "j", repeat: true },
			]),
		).toEqual([
			["Enter", "fire", "next"],
			["Enter", "repeat", ""],
			["Enter", "ignored", ""],
			["j", "fire", "down"],
		]);
	});

	it("ranks: modal > step > page; a tie goes to the lower order", () => {
		const table = [
			REG("Enter", "page-next", { rank: "page", order: 0 }),
			REG("Enter", "step-next", { rank: "step", order: 5 }),
			REG("Escape", "first", { order: 2 }),
			REG("Escape", "second", { order: 1 }),
			REG("x", "page-x", { rank: "page" }),
			REG("x", "modal-x", { rank: "modal" }),
		];
		expect(trace(table, ["Enter", "Escape", "x"])).toEqual([
			["Enter", "fire", "step-next"],
			["Escape", "fire", "second"],
			["x", "fire", "modal-x"],
		]);
	});

	it("the focused control keeps its own key; a text field keeps every key unless the entry fires in fields", () => {
		const button = document.createElement("button");
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		const field = document.createElement("input");
		const table = [
			REG("Enter", "next"),
			REG("Mod+z", "undo"),
			REG("Escape", "close", { inFields: true }),
		];
		expect(
			trace(table, [
				{ key: "Enter", target: button },
				{ key: "Enter", target: checkbox },
				{ key: "Enter", target: field },
				{ key: "z", ctrl: true, target: field },
				{ key: "Escape", target: field },
			]),
		).toEqual([
			["Enter", "ignored", ""],
			["Enter", "fire", "next"],
			["Enter", "ignored", ""],
			["z", "ignored", ""],
			["Escape", "fire", "close"],
		]);
	});

	it("a chord can hold modifiers", () => {
		const table = [REG("Mod+k Mod+s", "save-all"), REG("g t", "tasks")];
		expect(
			trace(table, [
				{ key: "k", ctrl: true },
				{ key: "s", ctrl: true },
				"g",
				"t",
			]),
		).toEqual([
			["k", "chord", ""],
			["s", "fire", "save-all"],
			["g", "chord", ""],
			["t", "fire", "tasks"],
		]);
	});
});

describe("hotkeyKeys", () => {
	it("parses modifiers and the plus key", () => {
		expect(parseStep("Mod+Shift+z")).toMatchObject({
			key: "z",
			mod: true,
			shift: true,
		});
		expect(parseStep("Mod++")).toMatchObject({ key: "+", mod: true });
		expect(parseStep("+")).toMatchObject({ key: "+", mod: false });
	});

	it("the reserved browser chords are flagged", () => {
		expect(
			["Mod+w", "Mod+t", "Mod+n", "Mod+q", "Mod+z", "n"].map(isReservedKey),
		).toEqual([true, true, true, true, false, false]);
	});

	it("prints the hint glyph and aria-keyshortcuts", () => {
		const keys = ["Enter", "Escape", "Mod+z", "i", "g t"];
		const rows = keys.map((k) => ({
			key: k,
			mac: keyGlyph(k, true),
			other: keyGlyph(k, false),
			aria: ariaKeyShortcut(k, false),
			letter: isLetterKey(k),
		}));
		console.table(rows);
		expect(rows).toEqual([
			{ key: "Enter", mac: "↵", other: "↵", aria: "Enter", letter: false },
			{
				key: "Escape",
				mac: "Esc",
				other: "Esc",
				aria: "Escape",
				letter: false,
			},
			{
				key: "Mod+z",
				mac: "⌘Z",
				other: "Ctrl+Z",
				aria: "Control+Z",
				letter: false,
			},
			{ key: "i", mac: "I", other: "I", aria: "I", letter: true },
			{ key: "g t", mac: "G T", other: "G T", aria: null, letter: false },
		]);
	});
});
