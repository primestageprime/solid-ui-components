// The live board: the prototype board's own logic, with its state in a Solid
// signal. The board script extends a DCLogic base class, so this file gives it
// one (a class only because the board script needs one to extend). The state
// lives in the signal; `vals` recomputes renderVals() when the state changes.
import { type Accessor, createMemo, createSignal, untrack } from "solid-js";
import type {
	BoardState,
	BoardVals,
	DCLogicBase,
	MakeBoard,
} from "./board-types";

export interface LiveBoard {
	/** The board's computed view. It follows every setState. */
	readonly vals: Accessor<BoardVals>;
	/**
	 * A view computed now, outside the memo. A board handler closes over the
	 * state of its render, so two handlers in a row must come from two renders.
	 */
	readonly fresh: () => BoardVals;
	/** The state, tracked: a memo that reads it follows every setState. */
	readonly state: Accessor<BoardState>;
	readonly setState: (patch: Partial<BoardState>) => void;
}

const shim = (
	read: () => BoardState,
	write: (s: BoardState) => void,
): DCLogicBase =>
	class DCLogic {
		props: Record<string, unknown>;
		constructor(props: Record<string, unknown>) {
			this.props = props ?? {};
		}
		get state(): BoardState {
			return read();
		}
		set state(s: BoardState) {
			write(s);
		}
		setState(patch: Partial<BoardState>) {
			write({ ...untrack(read), ...patch });
		}
	};

/** Make one board. `setup` is merged into the board's first state (the data set). */
export const liveBoard = (
	make: MakeBoard,
	setup: Partial<BoardState> = {},
): LiveBoard => {
	const [state, setSignal] = createSignal<BoardState>({}, { equals: false });
	const write = (s: BoardState) => setSignal(() => s);
	const Board = make(shim(state, write));
	const board = new Board({});
	board.setState(setup);
	const vals = createMemo(() => board.renderVals());
	return {
		vals,
		fresh: () => untrack(() => board.renderVals()),
		state,
		setState: (patch) => board.setState(patch),
	};
};
