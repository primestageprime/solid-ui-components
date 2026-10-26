// Manual Projection — the Manual step of the import boards on its own page, so a
// change to that step can be made and seen in one place. It uses the same code as
// the Manual step in the Initial Import and Incremental Import benches: the live
// prototype board (`boardBench`), opened on its Manual stage, drawn by
// `ManualStep`. The DATA picker chooses the board and its dataset.
import { type Component, createSignal, Show } from "solid-js";
import { ClusterRow } from "../../../src/components/Layout";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { MonoMeta, SectionTitle } from "../../../src/components/Text";
import { boardBench } from "./import-kit/board-bench";
import { makeBoard as makeIncremental } from "./import-kit/live/incremental-board.gen";
import { makeBoard as makeInitial } from "./import-kit/live/initial-board.gen";
import { ManualStep } from "./import-kit/manual-step";

export const meta = { label: "Manual Projection" };

type DataKey = "initial" | "full" | "quiet";
const DATASETS = [
	{ value: "initial", label: "Initial import" },
	{ value: "full", label: "Incremental" },
	{ value: "quiet", label: "Incremental, quiet month" },
];

// The stage lists of the two benches (initial-import.tsx, incremental-import.tsx).
const INITIAL_STAGES = ["auto", "manual", "prop", "main", "summary"];
const INCREMENTAL_STAGES = [
	"auto",
	"manual",
	"prop",
	"changed",
	"halted",
	"main",
	"summary",
];

/** One board over one dataset, opened on the Manual stage. A new dataset mounts a new board. */
const Board: Component<{ ds: DataKey }> = (props) => {
	const bench =
		props.ds === "initial"
			? boardBench(makeInitial, INITIAL_STAGES, { stage: "main" })
			: boardBench(makeIncremental, INCREMENTAL_STAGES, {
					ds: props.ds,
					stage: "main",
				});
	return <ManualStep view={bench.manual()} />;
};

const ManualProjectionBench: Component = () => {
	const [ds, setDs] = createSignal<DataKey>("initial");
	return (
		<div class="component-section component-section--full">
			<SectionTitle>Manual Projection</SectionTitle>
			<ClusterRow>
				<MonoMeta>DATA</MonoMeta>
				<SegmentedControl
					size="xs"
					options={DATASETS}
					value={ds()}
					onValueChange={(v) =>
						setDs(v === "full" || v === "quiet" ? v : "initial")
					}
				/>
			</ClusterRow>
			<Show when={ds()} keyed>
				{(key) => <Board ds={key} />}
			</Show>
		</div>
	);
};

export default ManualProjectionBench;
