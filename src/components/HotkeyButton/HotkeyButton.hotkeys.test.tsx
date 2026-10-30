import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "../Modal/Modal";
import { HotkeyButton, DISABLED_REASON_MS, HOTKEY_FLASH_MS } from "./HotkeyButton";
import { HotkeyPrimaryButton, HotkeySecondaryButton } from "./variants";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

const button = () =>
	document.querySelector("button.sui-btn") as HTMLButtonElement;

describe("HotkeyButton hotkeys (#53325)", () => {
	it("a key press paints the pressed state first, then clicks once, then holds the flash ~150 ms", () => {
		vi.useFakeTimers();
		const onClick = vi.fn();
		render(() => (
			<HotkeyButton hotkeys={["Enter"]} onClick={onClick}>
				Next
			</HotkeyButton>
		));
		fireEvent.keyDown(document.body, { key: "Enter" });
		expect(button().hasAttribute("data-hotkey-flash")).toBe(true);
		expect(onClick).not.toHaveBeenCalled();
		// A second press while the first is pending does nothing.
		fireEvent.keyDown(document.body, { key: "Enter" });
		vi.advanceTimersByTime(40);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(button().hasAttribute("data-hotkey-flash")).toBe(true);
		vi.advanceTimersByTime(HOTKEY_FLASH_MS);
		expect(button().hasAttribute("data-hotkey-flash")).toBe(false);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("shows the hint aria-hidden after the label, and names the key in aria-keyshortcuts", () => {
		render(() => <HotkeyPrimaryButton hotkeys={["Mod+z", "u"]}>Undo</HotkeyPrimaryButton>);
		const hint = button().querySelector(".sui-btn__hotkey") as HTMLElement;
		expect(hint.getAttribute("aria-hidden")).toBe("true");
		expect(hint.textContent).toMatch(/^(⌘Z|Ctrl\+Z)$/);
		expect(button().getAttribute("aria-keyshortcuts")).toMatch(
			/^(Meta|Control)\+Z U$/,
		);
		expect(button().querySelector(".sui-btn__content")?.firstChild?.textContent).toBe(
			"Undo",
		);
		expect(button().querySelector(".sui-btn__content")?.lastElementChild).toBe(hint);
	});

	it("a one-letter key shows as an underlined letter", () => {
		render(() => <HotkeySecondaryButton hotkeys={["i"]}>Ignore</HotkeySecondaryButton>);
		expect(
			button().querySelector(".sui-btn__hotkey--letter")?.textContent,
		).toBe("I");
	});

	it("a disabled button with a reason does not fire; the key opens its reason for ~1.5 s", async () => {
		vi.useFakeTimers();
		const onClick = vi.fn();
		render(() => (
			<HotkeyPrimaryButton
				hotkeys={["Enter"]}
				disabled
				disabledReason="Finish Manual first"
				onClick={onClick}
			>
				Next
			</HotkeyPrimaryButton>
		));
		expect(document.body.textContent).not.toContain("Finish Manual first");
		fireEvent.keyDown(document.body, { key: "Enter" });
		await vi.advanceTimersByTimeAsync(50);
		expect(onClick).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain("Finish Manual first");
		await vi.advanceTimersByTimeAsync(DISABLED_REASON_MS + 500);
		expect(document.body.textContent).not.toContain("Finish Manual first");
	});

	it("the reason slot wraps the button in a span trigger; the DOM disabled is unchanged", () => {
		render(() => (
			<HotkeyPrimaryButton disabled disabledReason={undefined}>
				Save
			</HotkeyPrimaryButton>
		));
		expect(button().parentElement?.tagName).toBe("SPAN");
		expect(button().disabled).toBe(true);
	});

	it("a pending button does not fire and shows nothing", async () => {
		let settle: () => void = () => {};
		const work = vi.fn(() => new Promise<void>((r) => (settle = r)));
		render(() => (
			<HotkeyButton hotkeys={["Enter"]} onAction={work} disabledReason="never shown">
				Save
			</HotkeyButton>
		));
		fireEvent.keyDown(document.body, { key: "Enter" });
		await new Promise((r) => setTimeout(r, 100));
		expect(work).toHaveBeenCalledTimes(1);
		fireEvent.keyDown(document.body, { key: "Enter" });
		await new Promise((r) => setTimeout(r, 100));
		expect(work).toHaveBeenCalledTimes(1);
		expect(document.body.textContent).not.toContain("never shown");
		settle();
	});

	it("a loading button does not fire", () => {
		const onClick = vi.fn();
		render(() => (
			<HotkeyButton hotkeys={["Enter"]} loading onClick={onClick}>
				Save
			</HotkeyButton>
		));
		fireEvent.keyDown(document.body, { key: "Enter" });
		expect(onClick).not.toHaveBeenCalled();
	});

	it("a focused button whose own key is the hotkey does not fire twice", () => {
		const onClick = vi.fn();
		render(() => (
			<HotkeyButton hotkeys={["Enter"]} onClick={onClick}>
				Next
			</HotkeyButton>
		));
		button().focus();
		const e = new KeyboardEvent("keydown", {
			key: "Enter",
			bubbles: true,
			cancelable: true,
		});
		button().dispatchEvent(e);
		// The registry leaves the key to the focused button: its native click
		// is the one press (jsdom does not synthesise it).
		expect(onClick).not.toHaveBeenCalled();
		expect(e.defaultPrevented).toBe(false);
	});

	it("the hotkey follows its prop without a remount", () => {
		vi.useFakeTimers();
		const onClick = vi.fn();
		const [keys, setKeys] = createSignal<readonly string[] | undefined>(
			undefined,
		);
		render(() => (
			<HotkeyButton hotkeys={keys()} onClick={onClick}>
				Next
			</HotkeyButton>
		));
		const first = button();
		fireEvent.keyDown(document.body, { key: "Enter" });
		vi.advanceTimersByTime(40);
		setKeys(["Enter"]);
		fireEvent.keyDown(document.body, { key: "Enter" });
		vi.advanceTimersByTime(40);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(button()).toBe(first);
	});

	it("inside an open Modal the modal's button holds the key, not the page's", () => {
		vi.useFakeTimers();
		const page = vi.fn();
		const dialog = vi.fn();
		render(() => (
			<>
				<HotkeyButton hotkeys={["Enter"]} onClick={page}>
					Next
				</HotkeyButton>
				<Modal open onClose={() => {}} title="T">
					<HotkeyButton hotkeys={["Enter"]} onClick={dialog}>
						Confirm
					</HotkeyButton>
				</Modal>
			</>
		));
		fireEvent.keyDown(document.body, { key: "Enter" });
		vi.advanceTimersByTime(40);
		expect(dialog).toHaveBeenCalledTimes(1);
		expect(page).not.toHaveBeenCalled();
	});

	it("forwards a caller's ref", () => {
		let got: HTMLButtonElement | undefined;
		render(() => <HotkeyButton ref={(el: HTMLButtonElement) => (got = el)}>X</HotkeyButton>);
		expect(got).toBe(button());
	});
});
