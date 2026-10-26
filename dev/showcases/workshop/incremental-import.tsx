// Incremental Import — thorcasting's later import of a company. The bench runs
// the prototype board's own logic live (built from canvas-row/parts-incr,
// written to import-kit/live by sui-fixtures/build-live.js). Steps: Auto group,
// Manual group, Proposals, Changed, Halted, Manual, Summary. The DATA picker
// swaps the full month for the quiet month, where every payment fits.
import { type Component, createSignal, type JSX, Show } from "solid-js";
import { ClusterRow } from "../../../src/components/Layout";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { MonoMeta, SectionTitle } from "../../../src/components/Text";
import { boardBench } from "./import-kit/board-bench";
import { BoardView } from "./import-kit/board-view";
import { makeBoard } from "./import-kit/live/incremental-board.gen";

export const meta = { label: "Incremental Import" };

type DataKey = "full" | "quiet";
const DATASETS = [
	{ value: "full", label: "Full" },
	{ value: "quiet", label: "Quiet month (every payment fits)" },
];

const STAGES = ["auto", "manual", "prop", "changed", "halted", "main", "summary"];

/** One board over one dataset. A new dataset mounts a new board, so every check starts fresh. */
const Board: Component<{ ds: DataKey; picker: () => JSX.Element }> = (
	props,
) => {
	const bench = boardBench(makeBoard, STAGES, { ds: props.ds });
	return <BoardView bench={bench} stages={STAGES} tools={props.picker()} />;
};

const IncrementalImportBench: Component = () => {
	const [ds, setDs] = createSignal<DataKey>("full");
	const picker = () => (
		<ClusterRow>
			<MonoMeta>DATA</MonoMeta>
			<SegmentedControl
				size="xs"
				options={DATASETS}
				value={ds()}
				onValueChange={(v) => setDs(v === "quiet" ? "quiet" : "full")}
			/>
		</ClusterRow>
	);
	return (
		<div class="component-section component-section--full">
			<SectionTitle>Incremental Import</SectionTitle>
			<Show when={ds()} keyed>
				{(key) => <Board ds={key} picker={picker} />}
			</Show>
		</div>
	);
};

export default IncrementalImportBench;
