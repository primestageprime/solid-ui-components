// Barrel — the PUBLIC surface, re-exported from src/index.ts. The base
// (ChannelChart.tsx's `ChannelChart`) is intentionally NOT exported — consumers
// import the curried variants, and `createChannelChart` for a screen that needs
// its own tones. Every type is qualified with the component's name, because an
// ambiguous `export *` resolves to nothing.
export {
	CHANNEL_CHART_FALLBACK_SIZE,
	DEFAULT_CHANNEL_CHART_TONES,
	createChannelChart,
} from "./ChannelChart";
export type {
	ChannelChartDataProps,
	ChannelChartLegend,
	ChannelChartOverrides,
	ChannelChartProps,
	ChannelChartTones,
} from "./ChannelChart";
export { channelModel, formatChannelTable } from "./channelGeometry";
export type {
	ChannelBar,
	ChannelBarTone,
	ChannelEndLabel,
	ChannelMarker,
	ChannelMarkerTone,
	ChannelModel,
	ChannelModelOptions,
	ChannelPeriod,
	ChannelRow,
} from "./channelGeometry";
export * from "./variants";
