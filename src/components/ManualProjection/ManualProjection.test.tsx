import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import {
	ManualChartLegend,
	ManualConfigCards,
	ManualEditConfigModal,
	ManualOneOffConfirm,
	ManualPaymentsPane,
	ManualProjectionCardRail,
	ManualProjectionHeader,
	ManualProjectionRail,
	ManualSuggestionCards,
} from ".";

describe("ManualProjectionRail", () => {
	it("picks a pickable group and ignores an inform-only row", () => {
		const seen: string[] = [];
		render(() => (
			<ManualProjectionRail
				sections={[
					{ key: "review", title: "TO REVIEW", tone: "warning", emptyText: "None" },
					{ key: "other", title: "OTHER", tone: "muted", emptyText: "None" },
				]}
				items={[
					{ key: "a", section: "review", name: "Harbor Rent", note: "2", pickable: true },
					{ key: "b", section: "other", name: "Gift shop", note: "1", pickable: false },
				]}
				onPick={(k) => seen.push(k)}
			/>
		));
		fireEvent.click(screen.getByText("Harbor Rent"));
		fireEvent.click(screen.getByText("Gift shop"));
		expect(seen).toEqual(["a"]);
	});
});

describe("ManualProjectionCardRail", () => {
	it("shows the name, the count and the total, the unmatched amount on a review card, and picks", () => {
		const seen: string[] = [];
		render(() => (
			<ManualProjectionCardRail
				sections={[
					{ key: "review", title: "TO REVIEW", tone: "warning", emptyText: "None" },
					{ key: "matched", title: "MATCHED", tone: "default", emptyText: "None" },
				]}
				items={[
					{ key: "a", section: "review", name: "Hartley Dental - Office Cleaning", note: "", pickable: true, count: "52 payments", total: "$45,760", unmatched: "$880 unmatched" },
					{ key: "b", section: "matched", name: "Tom's Paycheck - BiWeekly", note: "", pickable: true, count: "26 payments", total: "-$146,900" },
				]}
				currentKey="b"
				onPick={(k) => seen.push(k)}
			/>
		));
		for (const t of ["Hartley Dental - Office Cleaning", "52 payments", "$45,760", "$880 unmatched", "26 payments", "-$146,900"])
			expect(screen.getByText(t)).toBeTruthy();
		// One line: the name is an EllipsisText, never a wrapping body.
		expect(screen.getByText("Hartley Dental - Office Cleaning").closest(".sui-ellipsis-text")).not.toBeNull();
		expect(screen.getByText("$880 unmatched").getAttribute("style") ?? "").toMatch(/--sui-warning/);
		fireEvent.click(screen.getByText("Hartley Dental - Office Cleaning"));
		expect(seen).toEqual(["a"]);
	});
});

describe("ManualPaymentsPane", () => {
	it("lists the payments under their config group", () => {
		render(() => (
			<ManualPaymentsPane
				groups={[
					{ key: "g", name: "Retainer", desc: "", count: "1", total: "$7,000", expanded: true, warn: false },
				]}
				rows={[{ key: "r1", group: "g", date: "2026-01-03", slot: "due 2026-01-01", amount: "$6,000", of: " of $7,000" }]}
				onHover={() => {}}
			/>
		));
		expect(screen.getByText("Retainer · 1 · $7,000")).toBeTruthy();
		// The date and the amount only: never the due date.
		expect(screen.getByText("2026-01-03").className).toBe("sui-value-date");
		expect(screen.getByText((_, el) => el?.textContent === "$6,000\u00a0of\u00a0$7,000" && el.children.length === 0)).toBeTruthy();
		expect(screen.queryByText(/due/)).toBeNull();
	});

	it("inks each amount by its tone, and keeps the default ink without one", () => {
		render(() => (
			<ManualPaymentsPane
				groups={[
					{ key: "g", name: "Retainer", desc: "", count: "2", total: "$9,000", expanded: true, warn: false },
				]}
				rows={[
					{ key: "r1", group: "g", date: "2026-01-03", amount: "$6,000", of: "", tone: "success" },
					{ key: "r2", group: "g", date: "2026-02-09", amount: "$3,000", of: "", tone: "warning" },
					{ key: "r3", group: "g", date: "2026-03-03", amount: "$1,000", of: "" },
				]}
				onHover={() => {}}
			/>
		));
		const cls = (t: string) => screen.getByText(t).getAttribute("class") ?? "";
		expect(cls("$6,000")).toContain("sui-text-tone--success");
		expect(cls("$3,000")).toContain("sui-text-tone--warning");
		expect(cls("$1,000")).not.toContain("sui-text-tone--");
	});
});

describe("Manual center pieces", () => {
	it("shows the header, the done alert and the card lists, and calls back with keys", () => {
		const seen: string[] = [];
		render(() => (
			<>
				<ManualProjectionHeader
					title="Bayside Property"
					why="2 unmatched"
					whyWarn
					sub="12 payments"
					desc=""
					done={{ title: "Done", text: "All groups match.", next: "Next: Summary" }}
					onDone={() => seen.push("done")}
				/>
				<ManualChartLegend />
				<ManualSuggestionCards
					items={[{ key: "s0", title: "Retainer", amount: "$7,000", sub: "monthly" }]}
					onAdd={(k) => seen.push(`add ${k}`)}
				/>
				<ManualConfigCards
					items={[
						{ key: "c0", name: "Rent", amount: "$2,000", sub: "1st", editLabel: "Edit Rent", deleteLabel: "Delete Rent" },
					]}
					onEdit={(k) => seen.push(`edit ${k}`)}
					onDelete={(k) => seen.push(`delete ${k}`)}
				/>
			</>
		));
		fireEvent.click(screen.getByText("Next: Summary"));
		fireEvent.click(screen.getByText("Add"));
		fireEvent.click(screen.getByLabelText("Edit Rent"));
		fireEvent.click(screen.getByLabelText("Delete Rent"));
		expect(seen).toEqual(["done", "add s0", "edit c0", "delete c0"]);
		expect(screen.getByText("On time")).toBeTruthy();
	});

	it("shows the empty states", () => {
		render(() => (
			<>
				<ManualSuggestionCards items={[]} onAdd={() => {}} />
				<ManualConfigCards items={[]} onEdit={() => {}} onDelete={() => {}} />
			</>
		));
		expect(
			screen.getByText("Every payment in this group is matched. Nothing to suggest."),
		).toBeTruthy();
		expect(screen.getByText("No configs yet. Add one from the suggestions.")).toBeTruthy();
	});
});

describe("Manual dialogs", () => {
	it("the one-off confirm lists the items and confirms", () => {
		const seen: string[] = [];
		render(() => (
			<ManualOneOffConfirm
				open
				sub="1 payment"
				items={[{ id: "1", payee: "Gift shop", where: "Other", date: "Jan 4", amount: "$9" }]}
				onClose={() => {}}
				onConfirm={() => seen.push("go")}
			/>
		));
		expect(screen.getByText("Gift shop")).toBeTruthy();
		fireEvent.click(screen.getByText("Continue"));
		expect(seen).toEqual(["go"]);
	});

	it("the edit modal shows the amount of a fixed config and saves", () => {
		const seen: string[] = [];
		render(() => (
			<ManualEditConfigModal
				open
				title="Edit Rent"
				day={1}
				amount={2000}
				grace={3}
				fixed
				variable={false}
				range=""
				onPickDay={() => {}}
				onPickLast={() => {}}
				onAmount={() => {}}
				onGrace={() => {}}
				onSave={() => seen.push("save")}
				onClose={() => {}}
			/>
		));
		expect(screen.getByText("Amount")).toBeTruthy();
		fireEvent.click(screen.getByText("Save"));
		expect(seen).toEqual(["save"]);
	});
});
