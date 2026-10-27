import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ImportChangedTable } from "./ImportChangedTable";

const ROW = {
	id: "c1",
	name: "Harbor Rent",
	projection: "Rent",
	from: "$2,000 monthly",
	to: "$2,100 monthly",
	badges: [],
	count: "2",
	payments: [],
};

describe("ImportChangedTable", () => {
	it("shows the change and reports a check", () => {
		const seen: string[] = [];
		render(() => (
			<ImportChangedTable
				summary="1 change"
				rows={[ROW]}
				checked={new Set(["c1"])}
				onCheck={(id) => seen.push(id)}
			/>
		));
		expect(screen.getByText("$2,100 monthly")).toBeTruthy();
		expect(screen.getByText("apply")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Apply Harbor Rent"));
		expect(seen).toEqual(["c1"]);
	});

	it("shows the empty state with no rows", () => {
		render(() => (
			<ImportChangedTable summary="" rows={[]} checked={new Set()} onCheck={() => {}} />
		));
		expect(screen.getByText("No existing projection needs a change.")).toBeTruthy();
	});
});
