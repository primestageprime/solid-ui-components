// SummaryStep — the last step: one metric card per number. Also holds the
// placeholder for the Manual projection step, which this bench leaves out.
import { type Component, For } from "solid-js";
import { MetricCard } from "../../../../src/components/DataDisplay/MetricCard";
import { LooseCardGrid } from "../../../../src/components/Layout";
import { BlockPlaceholder } from "../../../../src/components/Placeholder";
import { MutedBody } from "../../../../src/components/Text";
import type { SummaryStat } from "./types";

export const SummaryStep: Component<{ stats: readonly SummaryStat[] }> = (
	props,
) => (
	<LooseCardGrid>
		<For each={props.stats}>
			{(s) => (
				<MetricCard label={s.label} value={s.value}>
					<MutedBody>{s.sub}</MutedBody>
				</MetricCard>
			)}
		</For>
	</LooseCardGrid>
);

export const ManualPlaceholder: Component = () => (
	<BlockPlaceholder label="Manual projection — placeholder (Peter's bench)" />
);
