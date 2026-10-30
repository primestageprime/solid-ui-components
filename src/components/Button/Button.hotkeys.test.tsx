import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "../Modal/Modal";
import { Button, DISABLED_REASON_MS, HOTKEY_FLASH_MS } from "./Button";
import { PrimaryButton, SecondaryButton } from "./variants";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

const button = () =>
	document.querySelector("button.sui-btn") as HTMLButtonElement;

describe("Button hotkeys (#53325)", () => {
	it("a key press clicks once and flashes the pressed state for ~150 ms", () => {
		vi.useFakeTimers();
		const onClick = vi.fn();
		render(() => (
			<Button hotkeys={["Enter"]} onClick={onClick}>
				Next
			</Button>
		));
		fireEvent.keyDown(document.body, { key: "Enter" });
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(button().hasAttribute("data-hotkey-flash")).toBe(true);
		vi.advanceTimersByTime(HOTKEY_FLASH_MS);
		expect(button().hasAttribute("data-hotkey-flash")).toBe(false);
	});

	it("shows the hint aria-hidden after the label, and names the key in aria-keyshortcuts", () => {
		render(() => <PrimaryButton hotkeys={["Mod+z", "u"]}>Undo</PrimaryButton>);
		const hint = button().querySelector(".sui-btn__hotkey") as HTMLElement;
		expect(hint.getAttribute("aria-hidden")).toBe("true");
		expect(hint.textContent).toMatch(/^(⌘Z|Ctrl\+Z)$/);
		expect(button().getAttribute("aria-keyshortcuts")).toMatch(
			/^(Meta|Control)\+Z U$/,
		);
		expect(button().querySelector(".sui-btn__content")?.textContent).toBe(
			"Undo",
		);
	});

	it("a one-letter key shows as an underlined letter", () => {
		render(() => <SecondaryButton hotkeys={["i"]}>Ignore</SecondaryButton>);
		expect(
			button().querySelector(".sui-btn__hotkey--letter")?.textContent,
		).toBe("I");
	});

	it("a disabled button with a reason does not fire; the key opens its reason for ~1.5 s", async () => {
		vi.useFakeTimers();
		const onClick = vi.fn();
		render(() => (
			<PrimaryButton
				hotkeys={["Enter"]}
				disabled
				disabledReason="Finish Manual first"
				onClick={onClick}
			>
				Next
			</PrimaryButton>
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
			<PrimaryButton disabled disabledReason={undefined}>
				Save
			</PrimaryButton>
		));
		expect(button().parentElement?.tagName).toBe("SPAN");
		expect(button().disabled).toBe(true);
	});

	it("a pending button does not fire and shows nothing", async () => {
		let settle: () => void = () => {};
		const work = vi.fn(() => new Promise<void>((r) => (settle = r)));
		render(() => (
			<Button hotkeys={["Enter"]} onAction={work} disabledReason="never shown">
				Save
			</Button>
		));
		fireEvent.keyDown(document.body, { key: "Enter" });
		await new Promise((r) => setTimeout(r, 40));
		expect(work).toHaveBeenCalledTimes(1);
		fireEvent.keyDown(document.body, { key: "Enter" });
		await new Promise((r) => setTimeout(r, 40));
		expect(work).toHaveBeenCalledTimes(1);
		expect(document.body.textContent).not.toContain("never shown");
		settle();
	});

	it("a loading button does not fire", () => {
		const onClick = vi.fn();
		render(() => (
			<Button hotkeys={["Enter"]} loading onClick={onClick}>
				Save
			</Button>
		));
		fireEvent.keyDown(document.body, { key: "Enter" });
		expect(onClick).not.toHaveBeenCalled();
	});

	it("a focused button whose own key is the hotkey does not fire twice", () => {
		const onClick = vi.fn();
		render(() => (
			<Button hotkeys={["Enter"]} onClick={onClick}>
				Next
			</Button>
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
		const onClick = vi.fn();
		const [keys, setKeys] = createSignal<readonly string[] | undefined>(
			undefined,
		);
		render(() => (
			<Button hotkeys={keys()} onClick={onClick}>
				Next
			</Button>
		));
		const first = button();
		fireEvent.keyDown(document.body, { key: "Enter" });
		setKeys(["Enter"]);
		fireEvent.keyDown(document.body, { key: "Enter" });
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(button()).toBe(first);
	});

	it("inside an open Modal the modal's button holds the key, not the page's", () => {
		const page = vi.fn();
		const dialog = vi.fn();
		render(() => (
			<>
				<Button hotkeys={["Enter"]} onClick={page}>
					Next
				</Button>
				<Modal open onClose={() => {}} title="T">
					<Button hotkeys={["Enter"]} onClick={dialog}>
						Confirm
					</Button>
				</Modal>
			</>
		));
		fireEvent.keyDown(document.body, { key: "Enter" });
		expect(dialog).toHaveBeenCalledTimes(1);
		expect(page).not.toHaveBeenCalled();
	});

	it("forwards a caller's ref", () => {
		let got: HTMLButtonElement | undefined;
		render(() => <Button ref={(el) => (got = el)}>X</Button>);
		expect(got).toBe(button());
	});
});
