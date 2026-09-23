// ============================================
// ChannelChart Curried Variants — Depth 2. The two shapes a consumer imports.
// ============================================
import type { Component } from "solid-js";
import {
	type ChannelChartDataProps,
	DEFAULT_CHANNEL_CHART_TONES,
	createChannelChart,
} from "./ChannelChart";

/** The channel plot alone: band, running value, markers, end labels. */
export const ChannelChart: Component<ChannelChartDataProps> =
	createChannelChart({
		showDivergence: false,
		divergenceShare: 0.45,
		labelBars: false,
		labelEnds: true,
		markerRadius: 4,
		tones: DEFAULT_CHANNEL_CHART_TONES,
	});

/**
 * The channel plot above a diverging-bar plot that shares its period axis and
 * its margin: each bar is the period's signed distance outside the band,
 * labelled; a zero bar draws as a flat tick.
 */
export const ChannelDivergenceChart: Component<ChannelChartDataProps> =
	createChannelChart({
		showDivergence: true,
		divergenceShare: 0.45,
		labelBars: true,
		labelEnds: true,
		markerRadius: 4,
		tones: DEFAULT_CHANNEL_CHART_TONES,
	});
