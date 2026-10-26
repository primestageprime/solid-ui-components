import { describe, expect, it } from "vitest";
import {
	allQueued,
	assign,
	emptyState,
	groupsWithCounts,
	ignore,
	ignoredNow,
	pending,
	quickPicks,
	undo,
	undoLabel,
	unignore,
} from "./manual-group-model";
import type { GroupRef, IgnoredPayment, QueuePayment } from "./types";

const pay = (id: string, sugs: string[] = []): QueuePayment => ({
	id,
	payee: `P${id}`,
	date: "May 1",
	amt: "−$1",
	badge: "",
	tip: "",
	sugs,
});
const QUEUE = [pay("a"), pay("b", ["Rent"])];
const GROUPS: GroupRef[] = [
	{ name: "Rent", count: 3 },
	{ name: "Gym", count: 2 },
];
const IGNORED: IgnoredPayment[] = [
	{
		id: "z",
		payee: "Zelle",
		amt: "−$300",
		badge: "ignored last import",
		tip: "",
	},
];

describe("manual group model", () => {
	it("assigns a payment and takes it out of the queue", () => {
		const s = assign(emptyState, "a", "Rent", GROUPS);
		expect(pending(QUEUE, s).map((p) => p.id)).toEqual(["b"]);
		expect(groupsWithCounts(GROUPS, s)[0]).toEqual({ name: "Rent", count: 4 });
	});

	it("records a typed group name as a new group", () => {
		const s = assign(emptyState, "a", "Florist", GROUPS);
		expect(s.created).toEqual(["Florist"]);
		expect(groupsWithCounts(GROUPS, s).at(-1)).toEqual({
			name: "Florist",
			count: 1,
		});
	});

	it("does not decide a payment twice", () => {
		const s = ignore(assign(emptyState, "a", "Rent", GROUPS), "a");
		expect(s.fates.a).toEqual({ kind: "group", group: "Rent" });
		expect(s.history).toEqual(["a"]);
	});

	it("undo takes back only the last decision", () => {
		const s = undo(ignore(assign(emptyState, "a", "Rent", GROUPS), "b"));
		expect(pending(QUEUE, s).map((p) => p.id)).toEqual(["b"]);
		expect(undoLabel(QUEUE, s)).toBe("Pa → Rent");
		expect(undo(emptyState)).toBe(emptyState);
	});

	it("un-ignore puts a payment from the last import back in the queue", () => {
		expect(ignoredNow(QUEUE, IGNORED, emptyState).map((i) => i.id)).toEqual([
			"z",
		]);
		const s = unignore(emptyState, "z");
		const all = allQueued(QUEUE, IGNORED, s);
		expect(pending(all, s).map((p) => p.id)).toEqual(["a", "b", "z"]);
		expect(ignoredNow(all, IGNORED, s)).toEqual([]);
	});

	it("quick picks use the payment's suggestions first", () => {
		expect(quickPicks(QUEUE[1], GROUPS)).toEqual(["Rent"]);
		expect(quickPicks(QUEUE[0], GROUPS)).toEqual(["Rent", "Gym"]);
	});
});
