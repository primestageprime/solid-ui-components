import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { ImportStepShell } from "./ImportStepShell";

const mount = (paused = false) => {
	const [step, setStep] = createSignal(0);
	render(() => (
		<ImportStepShell
			steps={["Auto", "Manual", "Summary"]}
			step={step()}
			onStep={setStep}
			done={[true, false, false]}
			advanced={false}
			onAdvancedChange={() => {}}
			paused={paused}
		>
			<p>{`body ${step()}`}</p>
		</ImportStepShell>
	));
};

describe("ImportStepShell", () => {
	it("goes to the next step on the arrow key and on Next", () => {
		mount();
		expect(screen.getByText("body 0")).toBeTruthy();
		fireEvent.keyDown(window, { key: "ArrowRight" });
		expect(screen.getByText("body 1")).toBeTruthy();
		fireEvent.click(screen.getByText("Next: Summary"));
		expect(screen.getByText("Start again")).toBeTruthy();
	});

	it("ignores the keys while paused", () => {
		mount(true);
		fireEvent.keyDown(window, { key: "ArrowRight" });
		expect(screen.getByText("body 0")).toBeTruthy();
	});

	it("shows a tick on a done step", () => {
		mount();
		expect(screen.getByText("✓")).toBeTruthy();
	});
});
