// Smoke test: each import bench runs its live board through every step, and
// the bench actions change what later steps show.
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import IncrementalImportBench from "../incremental-import";
import InitialImportBench from "../initial-import";
import ManualProjectionBench from "../manual-projection";

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
		expect(screen.getAllByText("monthly fixed expense unknown payee matches three groups").length).toBeGreaterThan(0);
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
		// Every group is reviewed: the rail's TO REVIEW head shows the tick in
		// success ink.
		expect(screen.getAllByText("TO REVIEW ✓").length).toBeGreaterThan(0);
		expect(
			document.querySelectorAll(".bucket-queue__count--success"),
		).toHaveLength(1);
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

const ONE_OFF = "These items will be treated as one-off configs. Is that OK?";
const key = (k: string) => fireEvent.keyDown(window, { key: k });

describe("Manual step keys", SLOW, () => {
	it("on its own page: → opens the one-off dialog, Enter continues, ← goes back", () => {
		render(() => <ManualProjectionBench />);
		key("ArrowRight");
		expect(screen.getByText(ONE_OFF)).toBeTruthy();
		key("Enter");
		expect(screen.queryByText(ONE_OFF)).toBeNull();
		expect(screen.getByText("The board moved to Summary.")).toBeTruthy();
		fireEvent.click(screen.getByText("Back to Manual"));
		key("ArrowLeft");
		expect(screen.getByText("The board moved to Proposals.")).toBeTruthy();
	});

	it("on its own page: Esc closes the dialog, and Enter there opens it", () => {
		render(() => <ManualProjectionBench />);
		key("Enter");
		expect(screen.getByText(ONE_OFF)).toBeTruthy();
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByText(ONE_OFF)).toBeNull();
		expect(screen.queryByText(/The board moved/)).toBeNull();
	});

	it("a field keeps its own keys", () => {
		render(() => <ManualProjectionBench />);
		const field = document.createElement("input");
		document.body.append(field);
		fireEvent.keyDown(field, { key: "ArrowRight" });
		fireEvent.keyDown(field, { key: "Enter" });
		expect(screen.queryByText(ONE_OFF)).toBeNull();
		field.remove();
	});

	it("in the bench a key fires once: ← goes back one step, Enter continues the dialog", () => {
		render(() => <InitialImportBench />);
		next();
		next();
		next();
		key("ArrowLeft");
		expect(screen.getAllByText("Proposals").length).toBeGreaterThan(0);
		expect(screen.queryByText("NEW CONFIG SUGGESTIONS")).toBeNull();
		expect(
			screen.queryByPlaceholderText("Group name — type to find or make one"),
		).toBeNull();
		next();
		// Enter opens the dialog through the shell; the same press must not
		// also confirm it.
		key("Enter");
		expect(screen.getByText(ONE_OFF)).toBeTruthy();
		key("Enter");
		expect(screen.getByText("One-off configs")).toBeTruthy();
	});
});
