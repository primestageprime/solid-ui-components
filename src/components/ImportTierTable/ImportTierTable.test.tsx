import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { IMPORT_TIERS } from "./fixtures";
import { ImportTierTable } from "./ImportTierTable";

describe("ImportTierTable", () => {
	it("shows an open tier's rows and hides a folded tier's rows", () => {
		const [open, setOpen] = createSignal<ReadonlySet<string>>(new Set());
		render(() => (
			<ImportTierTable
				tiers={IMPORT_TIERS}
				open={open()}
				onFold={(key) => setOpen(new Set([key]))}
				checked={new Set(["g1"])}
				onCheck={() => {}}
				scoreHead=""
			/>
		));
		expect(screen.getByText("Harbor Rent")).toBeTruthy();
		expect(screen.queryByText("Lumen Power")).toBeNull();
		fireEvent.click(screen.getByLabelText("Expand GROUPED"));
		expect(screen.getByText("Lumen Power")).toBeTruthy();
	});

	it("reports a check with the row id", () => {
		const seen: string[] = [];
		render(() => (
			<ImportTierTable
				tiers={IMPORT_TIERS}
				open={new Set()}
				onFold={() => {}}
				checked={new Set()}
				onCheck={(id, on) => seen.push(`${id}:${on}`)}
				scoreHead="Sure"
			/>
		));
		fireEvent.click(screen.getByLabelText("Check Harbor Rent"));
		expect(seen).toEqual(["g1:true"]);
		expect(screen.getByText("92%")).toBeTruthy();
	});
});
