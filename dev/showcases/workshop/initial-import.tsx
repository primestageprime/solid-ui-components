// Initial Import — thorcasting's first import of a company. The bench runs the
// prototype board's own logic live (canvas-row/project/InitialImport.dc.html,
// written to import-kit/live by sui-fixtures/build-live.js). Steps: Auto group,
// Manual group, Proposals, Manual, Summary.
import type { Component } from "solid-js";
import { SectionTitle } from "../../../src/components/Text";
import { boardBench } from "./import-kit/board-bench";
import { BoardView } from "./import-kit/board-view";
import { makeBoard } from "./import-kit/live/initial-board.gen";

export const meta = { label: "Initial Import" };

const STAGES = ["auto", "manual", "prop", "main", "summary"];

const InitialImportBench: Component = () => {
	const bench = boardBench(makeBoard, STAGES);
	return (
		<div class="component-section component-section--full">
			<SectionTitle>Initial Import</SectionTitle>
			<BoardView bench={bench} stages={STAGES} />
		</div>
	);
};

export default InitialImportBench;
