import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ImportSummaryGrid } from "./ImportSummaryGrid";

describe("ImportSummaryGrid", () => {
	it("shows one card per number", () => {
		render(() => (
			<ImportSummaryGrid
				stats={[
					{ label: "Groups", value: "12", sub: "3 new" },
					{ label: "Ignored", value: "2", sub: "one-off" },
				]}
			/>
		));
		expect(screen.getByText("Groups")).toBeTruthy();
		expect(screen.getByText("3 new")).toBeTruthy();
		expect(screen.getByText("Ignored")).toBeTruthy();
	});
});
