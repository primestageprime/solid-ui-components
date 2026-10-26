import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { IMPORT_TIERS } from "../ImportTierTable/fixtures";
import { type ImportAutoView, ImportAutoStep } from "./ImportAutoStep";

const VIEW: ImportAutoView = {
	summary: "3 groups found",
	scoreHead: "",
	tiers: IMPORT_TIERS,
	ungrouped: [
		{
			id: "u1",
			payee: "Corner Cafe",
			date: "Jan 4",
			amount: "$12",
			score: "",
			badges: [],
		},
	],
	tune: [{ key: "thr", label: "Group at", min: 0, max: 100, value: 60 }],
	ignored: [{ payee: "Gift shop", amount: "$9", badge: "once", tip: "One payment" }],
};

const mount = (advanced: boolean) =>
	render(() => (
		<ImportAutoStep
			view={VIEW}
			advanced={advanced}
			open={new Set()}
			onFold={() => {}}
			checked={new Set()}
			onCheck={() => {}}
			onTune={() => {}}
			onTuneReset={() => {}}
		/>
	));

describe("ImportAutoStep", () => {
	it("shows the tiers, the ungrouped payments and the ignored payments", () => {
		mount(false);
		expect(screen.getByText("3 groups found")).toBeTruthy();
		expect(screen.getByText("Harbor Rent")).toBeTruthy();
		expect(screen.getByText("Corner Cafe")).toBeTruthy();
		expect(screen.getByText("Gift shop")).toBeTruthy();
		expect(screen.queryByText("Tuning")).toBeNull();
	});

	it("shows the tuning sliders in the advanced view", () => {
		mount(true);
		expect(screen.getByText("Tuning")).toBeTruthy();
	});
});
