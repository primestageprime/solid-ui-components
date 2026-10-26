// Smoke test: each import bench runs its live board through every step, and
// the bench actions change what later steps show.
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import IncrementalImportBench from "../incremental-import";
import InitialImportBench from "../initial-import";

const next = () => fireEvent.keyDown(window, { key: "ArrowRight" });

// Each test runs a whole live board through every step. It takes about 1s
// alone, but more than 5s inside the full suite under coverage (the gate),
// so the default timeout is too short.
const SLOW = { timeout: 30_000 };

describe("Initial Import bench", SLOW, () => {
	it("walks from Auto group to Summary through the one-off confirm", () => {
		render(() => <InitialImportBench />);
		expect(screen.getAllByText("monthly fixed revenue double payment").length).toBeGreaterThan(0);
		next();
		expect(screen.getAllByText("one-off expense paid again").length).toBeGreaterThan(0);
		next();
		expect(screen.getAllByText("EXPENSES").length).toBeGreaterThan(0);
		next();
		// The Manual step: the open group, its chart and its configs.
		expect(
			screen.getAllByText("monthly fixed + variable revenue fee added in April")
				.length,
		).toBeGreaterThan(0);
		expect(screen.getByText("NEW CONFIG SUGGESTIONS")).toBeTruthy();
		expect(screen.getAllByText("Retainer").length).toBeGreaterThan(0);
		// The chart outlines the group's late and catch-up slots.
		expect(
			document.querySelectorAll(".sui-lane-chart__slot--late").length,
		).toBeGreaterThan(0);
		// Next on the Manual step asks about the one-off configs first.
		fireEvent.click(screen.getByText("Next: Summary"));
		expect(
			screen.getByText(
				"These items will be treated as one-off configs. Is that OK?",
			),
		).toBeTruthy();
		fireEvent.click(screen.getByText("Continue"));
		expect(screen.getByText("One-off configs")).toBeTruthy();
	});

	it("a Manual group choice reaches the Manual step's groups, and undo takes it back", () => {
		render(() => <InitialImportBench />);
		next();
		expect(screen.getAllByText("Payment 1 of 8").length).toBe(1);
		fireEvent.keyDown(window, { key: "i" });
		expect(screen.getAllByText("Payment 1 of 7").length).toBe(1);
		fireEvent.keyDown(window, { key: "u" });
		expect(screen.getAllByText("Payment 1 of 8").length).toBe(1);
		// Group the first payment (annual variable revenue) into a new group.
		const input = screen.getByPlaceholderText(
			"Group name — type to find or make one",
		);
		fireEvent.input(input, { target: { value: "Test hall" } });
		fireEvent.keyDown(input, { key: "Enter" });
		fireEvent.click(screen.getByRole("button", { name: /^Group/ }));
		expect(screen.getAllByText("Payment 1 of 7").length).toBe(1);
		expect(screen.getAllByText("Test hall").length).toBeGreaterThan(0);
		next();
		next();
		expect(screen.getAllByText("Test hall").length).toBeGreaterThan(0);
	});

	it("an Auto group uncheck moves the group's payments to UNGROUPED", () => {
		render(() => <InitialImportBench />);
		const before = screen.getAllByRole("row").length;
		const box = screen.getByLabelText("Check monthly fixed revenue double payment");
		fireEvent.click(box);
		expect(screen.getAllByRole("row").length).toBeGreaterThan(before);
		next();
		expect(screen.getAllByText("Payment 1 of 12").length).toBe(1);
	});
});

describe("Incremental Import bench", SLOW, () => {
	it("walks every step, and the advanced switch shows the score column", () => {
		render(() => <IncrementalImportBench />);
		expect(
			screen.getAllByText("monthly fixed expense new payee").length,
		).toBeGreaterThan(0);
		expect(screen.queryByText("Sure")).toBeNull();
		fireEvent.click(screen.getByLabelText("Advanced"));
		expect(screen.getAllByText("Sure").length).toBeGreaterThan(0);
		next();
		expect(screen.getAllByText("ACH RENT 4471").length).toBeGreaterThan(0);
		next();
		next();
		expect(
			screen.getAllByText("Started again at a new amount? Resume at $210")
				.length,
		).toBe(1);
		next();
		expect(screen.getAllByText("monthly fixed expense loan ends").length).toBeGreaterThan(0);
		next();
		expect(screen.getByText("CONFIGS")).toBeTruthy();
		fireEvent.click(screen.getByText("Next: Summary"));
		fireEvent.click(screen.getByText("Continue"));
		expect(screen.getByText("Added to existing groups")).toBeTruthy();
	});

	it("the quiet month has nothing to look at", () => {
		render(() => <IncrementalImportBench />);
		fireEvent.click(screen.getByText("Quiet month (every payment fits)"));
		expect(screen.queryByText("monthly fixed expense new payee")).toBeNull();
		expect(screen.getAllByText("Every payment is in a group.").length).toBe(1);
	});
});
