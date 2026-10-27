// BoardBench — the bench's link to one live board. It gives the step views
// (from adapt.ts) and the actions. Each action calls the board's own handler,
// or sets one of the board's own keys. A board handler closes over the state
// of its render, so an action that needs two handlers takes a fresh render
// between them.
import { type Accessor, createEffect, createMemo, on } from "solid-js";
import {
	autoView,
	changedView,
	haltedView,
	mgView,
	proposalsView,
	proposalToggles,
	rowToggles,
	tierRows,
} from "./adapt";
import { mpView } from "./adapt-manual";
import { liveBoard } from "./live/board";
import type { BoardState, BoardVals, MakeBoard } from "./live/board-types";
import type { MgActions, MpEditState } from "./types";

const sameList = <T>(a: readonly T[], b: readonly T[]): boolean =>
	a.length === b.length && a.every((v, i) => v === b[i]);

const CLOSED_INPUT = { open: false, text: "", hl: 0, focus: false };

/** The checked state of every row with a check box, by id. */
const checkedOf = (x: BoardVals): Map<string, boolean> =>
	new Map([
		...tierRows(x).map((r): [string, boolean] => [r.cid, !!r.checked]),
		...(x.pHalted ?? []).map((r): [string, boolean] => [r.cid, !!r.checked]),
		...(x.chRows ?? []).map((r): [string, boolean] => [r.cid, !!r.checked]),
		...(x.haRows ?? []).map((r): [string, boolean] => [r.cid, !!r.checked]),
		...(x.miRows ?? []).map((r): [string, boolean] => [r.cid, !!r.checked]),
		...x.pRows.flatMap((r): [string, boolean][] =>
			r.toggle && r.cid ? [[r.cid, !!r.checked]] : [],
		),
	]);

const editOf = (s: BoardState): MpEditState | null =>
	s.edit ? { day: s.edit.day, amt: s.edit.amt, grace: s.edit.grace } : null;

export const boardBench = (
	make: MakeBoard,
	stages: readonly string[],
	setup: Partial<BoardState> = {},
) => {
	const b = liveBoard(make, setup);
	const step: Accessor<number> = createMemo(() =>
		Math.max(
			0,
			b.vals().steps.findIndex((s) => s.current === "step"),
		),
	);
	const checked = createMemo(() => checkedOf(b.vals()));

	/** Flip one row when its check is not `on` yet. */
	const setChecked = (id: string, on: boolean) => {
		const x = b.fresh();
		if (checkedOf(x).get(id) !== on) rowToggles(x).get(id)?.();
	};

	/** Set every proposal leaf to its state in `next`, one toggle per render. */
	const setProposals = (next: ReadonlySet<string>) => {
		const ids = [...proposalToggles(b.fresh()).keys()];
		for (const id of ids) {
			const x = b.fresh();
			if (checkedOf(x).get(id) !== next.has(id)) proposalToggles(x).get(id)?.();
		}
	};

	const goStep = (i: number) => {
		const x = b.fresh();
		const now = step();
		if (i === now + 1) x.next();
		else if (i === now - 1) x.back();
		else if (i !== now)
			b.setState({
				stage: stages[i],
				hover: null,
				hotPay: null,
				finOpen: false,
				edit: null,
				confirmDel: null,
			});
	};

	const mg: MgActions = {
		pick: (id) => b.setState({ cur: id }),
		// The board places a payment through its group input: type the name, take
		// the option that names it (an existing group, or "Make group …").
		place: (id, group) => {
			b.setState({
				cur: id,
				input: { ...CLOSED_INPUT, open: true, text: group },
			});
			const want = [group, `Make group “${group}”`].map((t) => t.toLowerCase());
			const opt = b
				.fresh()
				.suggestions.find((s) => want.includes(s.label.toLowerCase()));
			if (opt) opt.pick();
			else b.setState({ input: CLOSED_INPUT });
		},
		ignore: (id) =>
			b
				.fresh()
				.rows.find((r) => r.tipId.endsWith(`-${id}`))
				?.ignore(),
		unignore: (id) =>
			b
				.fresh()
				.ignoredList.find((r) => r.tipId?.endsWith(`-${id}`))
				?.unignore?.(),
		undo: () => b.fresh().undo(),
	};

	// The payments pane shows the rows of an open pane group only. The bench
	// folds the groups itself (BucketQueue), so it opens each one on the board.
	createEffect(
		on(
			() =>
				b
					.vals()
					.mPane.map((g) => g.expanded)
					.join(),
			() => {
				const shut = b.fresh().mPane.find((g) => g.expanded !== "true");
				if (shut) shut.toggle();
			},
		),
	);

	return {
		vals: b.vals,
		step,
		goStep,
		// Steady arrays: a new array only when a value changes, so the step tabs
		// are not drawn again under a click.
		done: createMemo(() => b.vals().steps.map((s) => s.done), undefined, {
			equals: sameList,
		}),
		labels: createMemo(() => b.vals().steps.map((s) => s.label), undefined, {
			equals: sameList,
		}),
		adv: () => b.vals().adv,
		toggleAdv: () => b.fresh().toggleAdv(),
		auto: createMemo(() => autoView(b.vals())),
		checked,
		setChecked,
		flip: (id: string) => setChecked(id, !checked().get(id)),
		setTune: (key: string, v: number) =>
			b
				.fresh()
				.tune.find((t) => t.key === key)
				?.set(v),
		resetTune: () => b.fresh().resetTune(),
		mg: createMemo(() => mgView(b.vals())),
		mgAct: mg,
		proposals: createMemo(() => proposalsView(b.vals())),
		setProposals,
		changed: createMemo(() => changedView(b.vals())),
		halted: createMemo(() => haltedView(b.vals())),
		manual: createMemo(() => mpView(b.vals(), editOf(b.state()))),
		dialogOpen: () => b.vals().edOpen || b.vals().finOpen,
		summary: () => b.vals().sumStats,
	};
};

export type BoardBench = ReturnType<typeof boardBench>;
