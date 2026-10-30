import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ButtonReason } from "./ButtonReason";

afterEach(cleanup);

const tip = () => document.querySelector("[role=tooltip]") as HTMLElement | null;

describe("ButtonReason", () => {
	it("portals the reason to the body while open, names it on the span, and places it", async () => {
		const [open, setOpen] = createSignal(false);
		const { container } = render(() => (
			<ButtonReason open={open()} onHover={() => {}} reason="Finish Manual first">
				<button type="button" disabled>
					Next
				</button>
			</ButtonReason>
		));
		const span = container.querySelector(".sui-btn-reason") as HTMLElement;
		expect(tip()).toBeNull();
		setOpen(true);
		await Promise.resolve();
		expect(tip()?.textContent).toBe("Finish Manual first");
		expect(span.contains(tip())).toBe(false);
		expect(span.getAttribute("aria-describedby")).toBe(tip()?.id);
		expect(tip()?.hasAttribute("data-placed")).toBe(true);
		setOpen(false);
		expect(tip()).toBeNull();
		expect(span.hasAttribute("aria-describedby")).toBe(false);
	});

	it("reports pointer enter and leave on the span", () => {
		const onHover = vi.fn();
		const { container } = render(() => (
			<ButtonReason open={false} onHover={onHover} reason="r">
				<button type="button" disabled>
					Save
				</button>
			</ButtonReason>
		));
		const span = container.querySelector(".sui-btn-reason") as HTMLElement;
		fireEvent.pointerEnter(span);
		fireEvent.pointerLeave(span);
		expect(onHover.mock.calls).toEqual([[true], [false]]);
	});
});
