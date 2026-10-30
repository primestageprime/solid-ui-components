// ============================================
// createKeyPress — what a `hotkeys` press does to a HotkeyButton.
//
// - PENDING (loading, an unsettled action) or SPENT: nothing happens.
// - DISABLED: nothing fires; a button with a reason shows it for
//   DISABLED_REASON_MS.
// - Otherwise PAINT FIRST, THEN CLICK (owner, 2026-10-30: "I don't see the
//   flash on keypress"). The click can hold the main thread past the flash
//   (an import step re-renders its tab), so a flash set in the same task
//   never paints. The pressed state paints on the second frame, then the
//   click runs, then the flash holds for HOTKEY_FLASH_MS, as a mouse press
//   paints `:active` before its click. A press while one is pending does
//   nothing.
// ============================================
import { type Accessor, createSignal, onCleanup } from "solid-js";

/** How long a hotkey press shows the pressed state. */
export const HOTKEY_FLASH_MS = 150;
/** How long a hotkey press on a disabled button shows its reason. */
export const DISABLED_REASON_MS = 1500;

interface KeyPressOptions {
	/** Loading, pending or spent: the key does nothing. */
	busy: Accessor<boolean>;
	/** The caller's `disabled`. */
	disabled: Accessor<boolean>;
	/** The button has a reason to show. */
	hasReason: Accessor<boolean>;
	/** Runs the button's own click path. */
	click: () => void;
}

export interface KeyPress {
	/** The pressed state is showing (`data-hotkey-flash`). */
	flashing: Accessor<boolean>;
	/** A press on the disabled button shows its reason. */
	reasonByKey: Accessor<boolean>;
	press: () => void;
}

export function createKeyPress(opts: KeyPressOptions): KeyPress {
	const [flashing, setFlashing] = createSignal(false);
	const [reasonByKey, setReasonByKey] = createSignal(false);
	let flashTimer: ReturnType<typeof setTimeout> | undefined;
	let reasonTimer: ReturnType<typeof setTimeout> | undefined;
	let pressFrame: number | undefined;
	onCleanup(() => {
		clearTimeout(flashTimer);
		clearTimeout(reasonTimer);
		if (pressFrame !== undefined) cancelAnimationFrame(pressFrame);
	});

	const showReason = () => {
		setReasonByKey(true);
		clearTimeout(reasonTimer);
		reasonTimer = setTimeout(() => setReasonByKey(false), DISABLED_REASON_MS);
	};

	const press = () => {
		if (opts.busy()) return;
		if (opts.disabled()) {
			if (opts.hasReason()) showReason();
			return;
		}
		if (pressFrame !== undefined) return;
		setFlashing(true);
		clearTimeout(flashTimer);
		pressFrame = requestAnimationFrame(() => {
			pressFrame = requestAnimationFrame(() => {
				pressFrame = undefined;
				opts.click();
				flashTimer = setTimeout(() => setFlashing(false), HOTKEY_FLASH_MS);
			});
		});
	};

	return { flashing, reasonByKey, press };
}
