// ChannelChart — a band (the channel) with a running value inside it, and the
// divergence variant that stacks per-period bars under it on one period axis.
//
// The showcase plays the CONSUMER: it owns the periods (built by the same
// `cumulativePeriods` adapter channelGeometry.test.ts prints, so the printed
// table IS the picture here), the money formatter, the legend text and the
// selection. Click a period to select it.
import { type Component, createSignal } from "solid-js";
import {
	ChannelChart,
	ChannelDivergenceChart,
} from "../../src/components/ChannelChart";
import {
	formatKiloCents,
	RENT_PERIODS,
	STAX_PERIODS,
} from "../../src/components/ChannelChart/fixtures";
import { MutedBody, SectionTitle } from "../../src/components/Text";

const LEGEND = {
	band: "cumulative projected (Σ min – Σ max)",
	line: "cumulative received",
	over: "above the band",
	under: "below the band",
};

export const ChannelChartShowcase: Component = () => {
	const [selected, setSelected] = createSignal<string | undefined>("2026-07");
	return (
		<div class="component-section component-section--full">
			<div class="example-group">
				<SectionTitle>ChannelDivergenceChart — STAX revenue</SectionTitle>
				<MutedBody>
					Paid in batches, so the monthly bars swing over and under the band
					while the cumulative line settles inside the channel: $329.3k
					against $163.8k – $337.0k. A zero bar draws as a flat tick. Both
					plots share one period axis and one margin. Selected:{" "}
					{selected() ?? "none"}.
				</MutedBody>
				<div class="channel-chart-demo">
					<ChannelDivergenceChart
						periods={STAX_PERIODS}
						formatValue={formatKiloCents}
						ariaLabel="STAX cumulative channel, 2026-01 to 2026-09"
						selectedKey={selected()}
						onPickPeriod={setSelected}
						legend={LEGEND}
					/>
				</div>
			</div>
			<div class="example-group">
				<SectionTitle>ChannelDivergenceChart — rent, one late month</SectionTitle>
				<MutedBody>
					A fixed expense: the band is a line, April is missed (under) and
					May is paid twice (over), and the running total rejoins it.
				</MutedBody>
				<div class="channel-chart-demo">
					<ChannelDivergenceChart
						periods={RENT_PERIODS}
						formatValue={formatKiloCents}
						ariaLabel="Rent cumulative channel"
					/>
				</div>
			</div>
			<div class="example-group">
				<SectionTitle>ChannelChart — the channel alone</SectionTitle>
				<div class="channel-chart-demo channel-chart-demo--short">
					<ChannelChart
						periods={STAX_PERIODS}
						formatValue={formatKiloCents}
						ariaLabel="STAX cumulative channel"
					/>
				</div>
			</div>
			<div class="example-group">
				<SectionTitle>Empty</SectionTitle>
				<div class="channel-chart-demo channel-chart-demo--short">
					<ChannelDivergenceChart
						periods={[]}
						formatValue={formatKiloCents}
						ariaLabel="No periods"
						emptyMessage="No projection periods yet."
					/>
				</div>
			</div>
		</div>
	);
};
