// ============================================
// ImportSummaryGrid — Composite (Depth 2). UNSTABLE: exported from `/unstable` only.
// Tags: shows:card, shows:grid, shows:number, does:view, data:list, role:section
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The last step of an import: one metric card per number, with a muted line
// under the value.
//
// No CSS. Composes MetricCard, LooseCardGrid and MutedBody.
// ============================================
import { type Component, For } from "solid-js";
import { MetricCard } from "../DataDisplay/MetricCard";
import { LooseCardGrid } from "../Layout";
import { MutedBody } from "../Text";

/** One summary number, as display text. */
export interface ImportSummaryStat {
	readonly label: string;
	readonly value: string;
	/** The muted line under the value. */
	readonly sub: string;
}

export const ImportSummaryGrid: Component<{
	stats: readonly ImportSummaryStat[];
}> = (props) => (
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
