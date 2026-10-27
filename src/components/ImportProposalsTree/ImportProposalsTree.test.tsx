import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { PROPOSALS } from "./fixtures";
import {
	ImportProposalsTree,
	proposalLeafIds,
	proposalParentIds,
	proposalStartChecked,
} from "./ImportProposalsTree";

describe("proposal tree helpers", () => {
	it("finds the leaves, the start checks and the parents", () => {
		expect(proposalLeafIds(PROPOSALS.tree)).toEqual(["rent", "power"]);
		expect([...proposalStartChecked(PROPOSALS.tree)]).toEqual(["rent", "power"]);
		expect([...proposalParentIds(PROPOSALS.tree)]).toEqual(["exp"]);
	});
});

describe("ImportProposalsTree", () => {
	it("counts the checks and unchecks all", () => {
		const [checked, setChecked] = createSignal<ReadonlySet<string>>(
			proposalStartChecked(PROPOSALS.tree),
		);
		render(() => (
			<ImportProposalsTree
				data={PROPOSALS}
				checked={checked()}
				onChecked={setChecked}
				expanded={proposalParentIds(PROPOSALS.tree)}
				onExpanded={() => {}}
				haltChecked={new Set()}
				onHaltCheck={() => {}}
			/>
		));
		expect(screen.getByText("2 of 2 checked · 2 new projections")).toBeTruthy();
		expect(screen.getByText("Harbor Rent")).toBeTruthy();
		fireEvent.click(screen.getByText("Uncheck all"));
		expect(screen.getByText("0 of 2 checked · 2 new projections")).toBeTruthy();
		expect(screen.getByText("HALTED · 1")).toBeTruthy();
	});
});
