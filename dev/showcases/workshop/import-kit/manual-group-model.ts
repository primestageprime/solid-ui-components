// Manual group model — pure state for step 2. Each queue payment either waits,
// goes into a group, or is ignored. Undo takes back the last decision.
import type { GroupRef, IgnoredPayment, QueuePayment } from "./types";

export type Fate =
	| { readonly kind: "group"; readonly group: string }
	| { readonly kind: "ignored" };

export interface MgState {
	readonly fates: Readonly<Record<string, Fate>>;
	/** Payment ids in decision order. Undo pops the last one. */
	readonly history: readonly string[];
	/** Payments ignored in the last import that the user put back in the queue. */
	readonly unignored: readonly string[];
	/** Group names that the user typed and that did not exist before. */
	readonly created: readonly string[];
}

export const emptyState: MgState = {
	fates: {},
	history: [],
	unignored: [],
	created: [],
};

const asQueued = (i: IgnoredPayment): QueuePayment => ({
	id: i.id,
	payee: i.payee,
	date: "",
	amt: i.amt,
	badge: "un-ignored",
	tip: i.tip,
	sugs: [],
});

/** Every payment the user must decide on: the queue plus the un-ignored ones. */
export const allQueued = (
	queue: readonly QueuePayment[],
	ignored: readonly IgnoredPayment[],
	s: MgState,
): QueuePayment[] => [
	...queue,
	...ignored.filter((i) => s.unignored.includes(i.id)).map(asQueued),
];

export const pending = (
	all: readonly QueuePayment[],
	s: MgState,
): QueuePayment[] => all.filter((p) => !s.fates[p.id]);

/** Ignored payments: the ones ignored last time (and not put back) plus the ones ignored now. */
export const ignoredNow = (
	all: readonly QueuePayment[],
	ignored: readonly IgnoredPayment[],
	s: MgState,
): IgnoredPayment[] => [
	...ignored.filter(
		(i) => !s.unignored.includes(i.id) || s.fates[i.id]?.kind === "ignored",
	),
	...all
		.filter(
			(p) =>
				s.fates[p.id]?.kind === "ignored" &&
				!ignored.some((i) => i.id === p.id),
		)
		.map((p) => ({ id: p.id, payee: p.payee, amt: p.amt, badge: "", tip: "" })),
];

const decide = (s: MgState, id: string, fate: Fate): MgState =>
	s.fates[id]
		? s
		: { ...s, fates: { ...s.fates, [id]: fate }, history: [...s.history, id] };

export const assign = (
	s: MgState,
	id: string,
	group: string,
	known: readonly GroupRef[],
): MgState => {
	const next = decide(s, id, { kind: "group", group });
	const isNew =
		!known.some((g) => g.name === group) && !next.created.includes(group);
	return isNew ? { ...next, created: [...next.created, group] } : next;
};

export const ignore = (s: MgState, id: string): MgState =>
	decide(s, id, { kind: "ignored" });

export const undo = (s: MgState): MgState => {
	const last = s.history.at(-1);
	if (last === undefined) return s;
	const { [last]: _gone, ...fates } = s.fates;
	return { ...s, fates, history: s.history.slice(0, -1) };
};

export const unignore = (s: MgState, id: string): MgState => {
	const { [id]: _gone, ...fates } = s.fates;
	return {
		...s,
		fates,
		unignored: s.unignored.includes(id) ? s.unignored : [...s.unignored, id],
	};
};

/** The groups with the payments added in this step counted in. New groups come last. */
export const groupsWithCounts = (
	groups: readonly GroupRef[],
	s: MgState,
): GroupRef[] => {
	const added = (name: string): number =>
		Object.values(s.fates).filter((f) => f.kind === "group" && f.group === name)
			.length;
	return [...groups, ...s.created.map((name) => ({ name, count: 0 }))].map(
		(g) => ({
			name: g.name,
			count: g.count + added(g.name),
		}),
	);
};

/** The quick picks for keys 1–9: the payment's suggestions, else the first groups. */
export const quickPicks = (
	p: QueuePayment | undefined,
	groups: readonly GroupRef[],
): string[] =>
	(p && p.sugs.length > 0
		? [...p.sugs]
		: groups.slice(0, 5).map((g) => g.name)
	).slice(0, 9);

/** The label of the decision that Undo takes back. */
export const undoLabel = (all: readonly QueuePayment[], s: MgState): string => {
	const last = s.history.at(-1);
	const p = all.find((q) => q.id === last);
	const f = last === undefined ? undefined : s.fates[last];
	if (!p || !f) return "";
	return f.kind === "group" ? `${p.payee} → ${f.group}` : `${p.payee} ignored`;
};
