import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	activeHotkeyLayer,
	allocateHotkeyLayer,
	openHotkeyLayer,
	registerHotkey,
} from "./hotkeyRegistry";
import { useHotkey } from "./useHotkey";

afterEach(cleanup);

const key = (el: EventTarget, k: string, init: KeyboardEventInit = {}) => {
	const e = new KeyboardEvent("keydown", {
		key: k,
		bubbles: true,
		cancelable: true,
		...init,
	});
	el.dispatchEvent(e);
	return e;
};

describe("hotkeyRegistry", () => {
	it("one press runs one claim, and cancels the key", () => {
		const run = vi.fn();
		const off = registerHotkey({ keys: ["Enter"], run });
		const e = key(document.body, "Enter");
		expect(run).toHaveBeenCalledTimes(1);
		expect(e.defaultPrevented).toBe(true);
		off();
		key(document.body, "Enter");
		expect(run).toHaveBeenCalledTimes(1);
	});

	it("a tie on one rank goes to DOM order, not registration order, with a dev warning", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const first = document.createElement("button");
		const second = document.createElement("button");
		document.body.append(first, second);
		const ran: string[] = [];
		const offs = [
			registerHotkey({
				keys: ["Enter"],
				run: () => ran.push("second"),
				element: () => second,
			}),
			registerHotkey({
				keys: ["Enter"],
				run: () => ran.push("first"),
				element: () => first,
			}),
		];
		key(document.body, "Enter");
		expect(ran).toEqual(["first"]);
		expect(warn).toHaveBeenCalledTimes(1);
		for (const off of offs) off();
		first.remove();
		second.remove();
		warn.mockRestore();
	});

	it("a higher rank wins without a warning", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const ran: string[] = [];
		const offs = [
			registerHotkey({ keys: ["Enter"], run: () => ran.push("page") }),
			registerHotkey({
				keys: ["Enter"],
				run: () => ran.push("step"),
				rank: "step",
			}),
		];
		key(document.body, "Enter");
		expect(ran).toEqual(["step"]);
		expect(warn).not.toHaveBeenCalled();
		for (const off of offs) off();
		warn.mockRestore();
	});

	it("an open layer blocks the page; only the top layer fires", () => {
		const ran: string[] = [];
		const outer = allocateHotkeyLayer();
		const inner = allocateHotkeyLayer();
		const offs = [
			registerHotkey({ keys: ["Enter"], run: () => ran.push("page") }),
			registerHotkey({
				keys: ["Enter"],
				run: () => ran.push("outer"),
				layer: outer,
			}),
			registerHotkey({
				keys: ["Enter"],
				run: () => ran.push("inner"),
				layer: inner,
			}),
		];
		key(document.body, "Enter");
		const closeOuter = openHotkeyLayer(outer);
		key(document.body, "Enter");
		const closeInner = openHotkeyLayer(inner);
		expect(activeHotkeyLayer()).toBe(inner);
		key(document.body, "Enter");
		closeInner();
		key(document.body, "Enter");
		closeOuter();
		key(document.body, "Enter");
		expect(ran).toEqual(["page", "outer", "inner", "outer", "page"]);
		for (const off of offs) off();
	});

	it("a focused button keeps its own Enter: the claim does not fire, the key is not cancelled", () => {
		const run = vi.fn();
		const off = registerHotkey({ keys: ["Enter"], run });
		const button = document.createElement("button");
		document.body.append(button);
		const e = key(button, "Enter");
		expect(run).not.toHaveBeenCalled();
		expect(e.defaultPrevented).toBe(false);
		off();
		button.remove();
	});

	it("a held key fires once; the repeats stay cancelled", () => {
		const run = vi.fn();
		const off = registerHotkey({ keys: ["Enter"], run });
		key(document.body, "Enter");
		const repeats = [1, 2, 3].map(() =>
			key(document.body, "Enter", { repeat: true }),
		);
		expect(run).toHaveBeenCalledTimes(1);
		expect(repeats.every((e) => e.defaultPrevented)).toBe(true);
		off();
	});

	it("a browser-reserved chord is a dev error and is not registered", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const run = vi.fn();
		const off = registerHotkey({ keys: ["Mod+w"], run });
		expect(error).toHaveBeenCalledTimes(1);
		expect(key(document.body, "w", { ctrlKey: true }).defaultPrevented).toBe(
			false,
		);
		off();
		error.mockRestore();
	});

	it("a modal-rank claim stops the key reaching other listeners; a page claim does not", () => {
		const other = vi.fn();
		window.addEventListener("keydown", other);
		const offPage = registerHotkey({ keys: ["x"], run: () => {} });
		key(document.body, "x");
		expect(other).toHaveBeenCalledTimes(1);
		offPage();
		const offModal = registerHotkey({
			keys: ["x"],
			run: () => {},
			rank: "modal",
		});
		key(document.body, "x");
		expect(other).toHaveBeenCalledTimes(1);
		offModal();
		window.removeEventListener("keydown", other);
	});
});

describe("useHotkey", () => {
	it("claims while the component lives and follows its keys", () => {
		const run = vi.fn();
		const [keys, setKeys] = createSignal<readonly string[]>(["u"]);
		const Undo = () => {
			useHotkey({ keys, run });
			return null;
		};
		render(() => <Undo />);
		key(document.body, "u");
		setKeys(["Mod+z"]);
		key(document.body, "u");
		key(document.body, "z", { ctrlKey: true });
		expect(run).toHaveBeenCalledTimes(2);
		cleanup();
		key(document.body, "z", { ctrlKey: true });
		expect(run).toHaveBeenCalledTimes(2);
	});

	it("is not there while enabled() says no, so the key stays the browser's", () => {
		const [on, setOn] = createSignal(false);
		const run = vi.fn();
		const Keys = () => {
			useHotkey({ keys: ["n"], run, enabled: on });
			return null;
		};
		render(() => <Keys />);
		expect(key(document.body, "n").defaultPrevented).toBe(false);
		setOn(true);
		expect(key(document.body, "n").defaultPrevented).toBe(true);
		expect(run).toHaveBeenCalledTimes(1);
	});
});
