// SummaryStep — the last step: one metric card per number.
import { type Component, For } from "solid-js";
import { MetricCard } from "../../../../src/components/DataDisplay/MetricCard";
import { LooseCardGrid } from "../../../../src/components/Layout";
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
