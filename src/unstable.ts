// ============================================
// UNSTABLE — outside this package's semver guarantee.
//
// Anything exported here may change shape or disappear in ANY release,
// including a patch. It exists so a consumer that genuinely needs the
// geometry core (not the chart) doesn't have to reimplement it, without
// promising the pure-core internals hold still the way the root barrel does.
//
// A consumer that imports from here MUST pin an exact SUI version. See
// COMPONENTS.md § "Unstable exports" and CLAUDE.md / AGENT_GUIDE.md for the
// policy. `src/index.ts` (the root barrel) must NEVER re-export from this
// file — promoting something out of `/unstable` is an ADD (re-export it from
// the root too), never a move, until the old subpath name is deprecated and
// deleted on its own additive/deprecate/delete cycle.
//
// First contents: ChannelChart's geometry core, kept out of the root barrel
// by PR #194 (`fd577778 refactor(chart): keep channelModel /
// formatChannelTable internal`) because a consumer composes the CHART, not
// the geometry. `/unstable` is for the rare consumer that needs the geometry
// itself and accepts the churn.
// ============================================
export {
	channelModel,
	formatChannelTable,
} from "./components/ChannelChart/channelGeometry";
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
} from "./components/ChannelChart/channelGeometry";

// ============================================
// list-detail kit — a config-driven, headless list-and-detail library (store, view state, undo,
// layered Escape, verb rows). Ported from the singularity scaffold; see src/listDetail/README.md.
// ============================================
export * from "./listDetail";
// The icon vocabulary a view config names (`defineCard`/`defineDetail` action `icon`), so a config file
// imports its types from this one path. Also on the root via `./components/Icon`.
export type { IconName } from "./components/Icon/Icon";

// ============================================
// import kit — the display pieces of thorcasting's import screens, promoted
// 2026-10-26 from the import benches (dev/showcases/workshop/import-kit) on
// the owner's word, pending Peter's review. Plain props only: the consumer
// maps its own board values into them. See COMPONENTS.md § "Unstable exports".
// ============================================
export * from "./components/ScoreBadge";
export * from "./components/PaymentsPopover";
export * from "./components/ImportStepShell";
export * from "./components/ImportTierTable";
export * from "./components/ImportAutoStep";
export * from "./components/ImportSummaryGrid";
export * from "./components/ImportManualGroupStep";
export * from "./components/ImportProposalsTree";
export * from "./components/ImportChangedTable";
export * from "./components/ImportHaltedTables";
export * from "./components/LaneChart";
