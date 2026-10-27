import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ImportHaltedTables } from "./ImportHaltedTables";

describe("ImportHaltedTables", () => {
	it("shows a halt with its result when checked, and the missed empty state", () => {
		render(() => (
			<ImportHaltedTables
				summary="1 halt"
				halts={[
					{
						id: "h1",
						name: "Old gym",
						projection: "Gym",
						last: "Mar 2",
						gap: "30 days",
						threshold: "45 days",
						silence: "107 days",
						overdue: true,
						result: "ends",
					},
				]}
				missed={[]}
				checked={new Set(["h1"])}
				onCheck={() => {}}
			/>
		));
		expect(screen.getByText("107 days")).toBeTruthy();
		expect(screen.getByText("ends")).toBeTruthy();
		expect(screen.getByText("No payment was missed.")).toBeTruthy();
	});
});
