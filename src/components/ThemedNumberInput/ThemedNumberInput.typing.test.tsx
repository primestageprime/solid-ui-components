import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type FakeSizer, installFakeSizer, typeText } from "../../test-utils";
import { ThemedNumberInput } from "./ThemedNumberInput";

// A controlled field: `onChange` writes the signal that `value` reads. The bug
// exists only between two keystrokes, so these tests type one key at a time.
// One `fireEvent.input` with the whole text cannot see it.
//
// Before the fix, the field pushed each new caller value back into kobalte.
// Kobalte then wrote the FORMATTED amount into the input with the caret after
// the cents. From a blank field, "8" became "$8.00" and the next digits went
// into the cents (thorcasting-ui Import Coverage, 2026-10-08).

let sizer: FakeSizer;
beforeAll(() => {
	sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

const USD = {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
} as const;

function renderControlled(initial: number | undefined) {
	const [value, setValue] = createSignal<number | undefined>(initial);
	const changes: Array<number | undefined> = [];
	const { container } = render(() => (
		<ThemedNumberInput
			name="amount"
			formatOptions={USD}
			value={value}
			onChange={(next) => {
				changes.push(next);
				setValue(next);
			}}
		/>
	));
	const input = container.querySelector(
		".sui-number-input__input",
	) as HTMLInputElement;
	return { input, value, setValue, changes };
}

/** Delete the character before the caret, then fire `input`. */
function backspace(input: HTMLInputElement): void {
	const start = input.selectionStart ?? input.value.length;
	const end = input.selectionEnd ?? start;
	const from = start === end ? Math.max(0, start - 1) : start;
	const next = input.value.slice(0, from) + input.value.slice(end);
	fireEvent.input(input, { target: { value: next } });
	input.setSelectionRange(from, from);
}

describe("ThemedNumberInput — keeps the typed text while focused", () => {
	it("types 850000 into a blank controlled field", () => {
		const { input, value, changes } = renderControlled(undefined);
		input.focus();
		typeText(input, "850000");

		expect(input.value).toBe("850000");
		expect(changes.at(-1)).toBe(850000);
		expect(value()).toBe(850000);

		fireEvent.blur(input);
		input.blur();
		expect(value()).toBe(850000);
		expect(input.value).toBe("$850,000.00");
	});

	it("types 850000 after a backspace to blank", () => {
		const { input, value, changes } = renderControlled(12);
		input.focus();
		input.setSelectionRange(input.value.length, input.value.length);
		while (input.value.length > 0) backspace(input);
		expect(changes.at(-1)).toBeUndefined();

		typeText(input, "850000");

		expect(input.value).toBe("850000");
		expect(changes.at(-1)).toBe(850000);
		expect(value()).toBe(850000);
	});

	it("shows a caller change made while focused only after blur", () => {
		const { input, setValue } = renderControlled(12);
		expect(input.value).toBe("$12.00");
		input.focus();
		typeText(input, "34");
		expect(input.value).toBe("34");

		// Another control changes the caller's value while this field has focus.
		setValue(99);
		expect(input.value).toBe("34");

		fireEvent.blur(input);
		input.blur();
		expect(input.value).toBe("$99.00");
	});

	it("reports a clear while focused and stays blank until blur", () => {
		const { input, value, changes } = renderControlled(12);
		input.focus();
		input.setSelectionRange(input.value.length, input.value.length);
		while (input.value.length > 0) backspace(input);

		expect(changes.at(-1)).toBeUndefined();
		expect(value()).toBeUndefined();
		expect(input.value).toBe("");

		fireEvent.blur(input);
		input.blur();
		expect(input.value).toBe("");
	});

	it("shows the caller's value at blur after a clear the caller refused", () => {
		// The caller keeps its own figure when the field reports a clear. The
		// field stays blank while focused, and shows the caller's figure at blur.
		const [value] = createSignal<number | undefined>(12);
		const changes: Array<number | undefined> = [];
		const { container } = render(() => (
			<ThemedNumberInput
				name="amount"
				formatOptions={USD}
				value={value}
				onChange={(next) => changes.push(next)}
			/>
		));
		const input = container.querySelector(
			".sui-number-input__input",
		) as HTMLInputElement;
		input.focus();
		input.setSelectionRange(input.value.length, input.value.length);
		while (input.value.length > 0) backspace(input);
		expect(changes.at(-1)).toBeUndefined();
		expect(input.value).toBe("");

		fireEvent.blur(input);
		input.blur();
		expect(input.value).toBe("$12.00");
	});
});
