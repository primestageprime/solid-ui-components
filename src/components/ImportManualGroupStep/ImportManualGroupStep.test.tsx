import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import {
	ImportManualGroupStep,
	type ManualGroupView,
} from "./ImportManualGroupStep";

const VIEW: ManualGroupView = {
	sub: "2 payments wait",
	rows: [
		{
			id: "p1",
			pos: "Payment 1 of 2",
			current: true,
			payee: "Evergreen Hall",
			date: "Jan 5",
			amount: "$400",
			badge: "",
			tip: "",
			quick: ["Hall rent"],
			suggestions: ["Venues"],
		},
	],
	groups: [{ name: "Hall rent", count: 3 }],
	ignored: [
		{
			id: "x1",
			payee: "Gift shop",
			amount: "$9",
			badge: "",
			tip: "",
			canUnignore: true,
		},
	],
	undoLabel: "",
	canUndo: false,
};

describe("ImportManualGroupStep", () => {
	it("places the current payment with a quick pick key and ignores it with i", () => {
		const seen: string[] = [];
		render(() => (
			<ImportManualGroupStep
				view={VIEW}
				onPick={() => {}}
				onPlace={(id, g) => seen.push(`place ${id} ${g}`)}
				onIgnore={(id) => seen.push(`ignore ${id}`)}
				onUnignore={(id) => seen.push(`unignore ${id}`)}
				onUndo={() => {}}
			/>
		));
		expect(screen.getByText("Payment 1 of 2")).toBeTruthy();
		fireEvent.keyDown(window, { key: "1" });
		fireEvent.keyDown(window, { key: "i" });
		fireEvent.click(screen.getByText("Put in Venues"));
		fireEvent.click(screen.getByText("Un-ignore"));
		expect(seen).toEqual([
			"place p1 Hall rent",
			"ignore p1",
			"place p1 Venues",
			"unignore x1",
		]);
	});

	it("shows the empty state when no payment waits", () => {
		render(() => (
			<ImportManualGroupStep
				view={{ ...VIEW, rows: [] }}
				onPick={() => {}}
				onPlace={() => {}}
				onIgnore={() => {}}
				onUnignore={() => {}}
				onUndo={() => {}}
			/>
		));
		expect(
			screen.getByText(
				"Every payment is in a group or ignored. Press Enter to go on.",
			),
		).toBeTruthy();
	});
});
