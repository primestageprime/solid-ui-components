import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHotkey } from "../../hooks/hotkeys/useHotkey";
import { createSignal } from "solid-js";
import { Modal } from "./Modal";

afterEach(cleanup);

const Claim = (props: { keys: string[]; run: () => void }) => {
	useHotkey({ keys: props.keys, run: props.run });
	return null;
};

describe("Modal — the hotkey layer (#53325)", () => {
	it("one Escape closes only the top modal, once", () => {
		const outer = vi.fn();
		const inner = vi.fn();
		render(() => (
			<Modal open onClose={outer} title="Outer">
				<Modal open onClose={inner} title="Inner" />
			</Modal>
		));
		fireEvent.keyDown(document, { key: "Escape" });
		expect(inner).toHaveBeenCalledTimes(1);
		expect(outer).not.toHaveBeenCalled();
	});

	it("blocks page keys while open; its own claims fire", () => {
		const page = vi.fn();
		const inModal = vi.fn();
		render(() => (
			<>
				<Claim keys={["Enter"]} run={page} />
				<Modal open onClose={() => {}} title="T">
					<Claim keys={["Enter"]} run={inModal} />
				</Modal>
			</>
		));
		fireEvent.keyDown(document, { key: "Enter" });
		expect(inModal).toHaveBeenCalledTimes(1);
		expect(page).not.toHaveBeenCalled();
	});

	it("Escape in a field of the modal still closes it", () => {
		const onClose = vi.fn();
		render(() => (
			<Modal open onClose={onClose} title="T">
				<input data-testid="field" />
			</Modal>
		));
		const field = document.querySelector(
			'[data-testid="field"]',
		) as HTMLInputElement;
		fireEvent.keyDown(field, { key: "Escape" });
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("page keys come back when the modal closes", () => {
		const page = vi.fn();
		const [open, setOpen] = createSignal(true);
		render(() => (
			<>
				<Claim keys={["n"]} run={page} />
				<Modal open={open()} onClose={() => setOpen(false)} title="T" />
			</>
		));
		fireEvent.keyDown(document, { key: "n" });
		expect(page).not.toHaveBeenCalled();
		fireEvent.keyDown(document, { key: "Escape" });
		fireEvent.keyDown(document, { key: "n" });
		expect(page).toHaveBeenCalledTimes(1);
	});
});
