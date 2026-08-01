// ============================================
// Layout Curried Variants — Depth 1 (zero CSS)
// Pre-configured Stack, Row, Box via factories.
//
// Exports carry explicit `Component<…DataProps>` annotations to keep
// `vite-plugin-dts` from inlining solid-js type paths through pnpm's
// github-dep build store (TS2742 "inferred type cannot be named without
// a reference to …"). Without the annotation the generated `.d.ts` can
// end up with references to pnpm's ephemeral temp paths, which then
// strip the declarations entirely and surface as TS2305 downstream.
// ============================================
import { createStack } from "./Stack";
import { createRow } from "./Row";
import { createBox } from "./Box";
import { createGrid } from "./Grid";
import { createAppHeader } from "./AppShell";
import type { AppHeaderDataProps } from "./AppShell";
import type { StackDataProps } from "./Stack";
import type { RowDataProps } from "./Row";
import type { BoxDataProps } from "./Box";
import type { GridDataProps } from "./Grid";
import type { Component } from "solid-js";

// Plain flex column, no baked gap — a bare vertical stack whose children space
// themselves (own margins) or sit flush. For a wrapper that just needs a flex
// column context (e.g. a caption above a scroll region) without imposing a gap.
export const Column: Component<StackDataProps> = createStack({});

// Stack variants — named by gap
export const TightStack: Component<StackDataProps> = createStack({ gap: "xs" });
export const NarrowStack: Component<StackDataProps> = createStack({
  gap: "sm",
});

// Conversation root — capped reading width and conversation-typography for a
// multi-participant chat tree. Width math: bubble max = 80ch, body width = 80%
// of container; for `self` bubbles to overlap `other` bubbles, container needs
// >= 80ch / 0.8 = 100ch. Cap at ~110ch — full-width bubbles + ~20% breathing
// room without sprawling on wide displays.
export const ConversationStack: Component<StackDataProps> = createStack({
  gap: "sm",
  style: {
    "font-size": "0.85rem",
    "line-height": "1.4",
    color: "var(--sui-text-primary, inherit)",
    width: "100%",
    "max-width": "110ch",
  },
});

// Small, tight, start-aligned column — for dense indicator rows (e.g.
// label-on-top / status-trace-beneath). Smaller font and tighter line-height
// than the default body text so it sits comfortably in a packed dashboard.
export const SmallTightStack: Component<StackDataProps> = createStack({
  gap: "xs",
  align: "start",
  style: { "font-size": "0.8rem", "line-height": "1.2" },
});

// Stack variants — named by role / page layout
export const PageStack = createStack({
  gap: "sm",
  style: { padding: "24px", "max-width": "1000px" },
});
export const ContentStack: Component<StackDataProps> = createStack({
  gap: "xs",
  style: { flex: "1", "min-width": "0" },
});
export const CenteredStack: Component<StackDataProps> = createStack({
  align: "center",
  justify: "center",
  gap: "sm",
});
// Horizontally-centered column (align:center, sm gap, NO vertical justify) — a
// content-sized column whose children center on the cross axis. For small
// centered cards/cells (label over a bar). Differs from CenteredStack, which
// also justifies center (vertical distribution) for fixed-height regions.
export const CenteredColumn: Component<StackDataProps> = createStack({
  align: "center",
  gap: "sm",
});
// TightCenteredColumn — a horizontally-centered column with an xs gap (the tight
// sibling of CenteredColumn). For a small centered stat cell (an icon over its
// count, a totals label over its number).
export const TightCenteredColumn: Component<StackDataProps> = createStack({
  align: "center",
  gap: "xs",
});

// Empty regions — centered stacks with size-specific padding and min-height
export const SmRegion: Component<StackDataProps> = createStack({
  align: "center",
  justify: "center",
  gap: "sm",
  style: { padding: "16px 12px", "min-height": "60px", "text-align": "center" },
});
export const MdRegion: Component<StackDataProps> = createStack({
  align: "center",
  justify: "center",
  gap: "sm",
  style: {
    padding: "32px 16px",
    "min-height": "120px",
    "text-align": "center",
  },
});
export const LgRegion: Component<StackDataProps> = createStack({
  align: "center",
  justify: "center",
  gap: "sm",
  style: {
    padding: "48px 24px",
    "min-height": "200px",
    "text-align": "center",
  },
});

// Row variants — named by layout behavior
export const SpreadRow: Component<RowDataProps> = createRow({
  align: "center",
  justify: "between",
  gap: "sm",
});
/** Tight spread row — 4px gap, baseline-aligned key+count rows for compact
 *  data displays (pivot cells, legend rows, chip groupings). */
export const TightSpreadRow: Component<RowDataProps> = createRow({
  align: "baseline",
  justify: "between",
  gap: "xs",
});
export const ClusterRow: Component<RowDataProps> = createRow({
  align: "center",
  gap: "sm",
});
// IconClusterRow — a row of icon-only action buttons spaced so adjacent
// GLYPHS sit ~one icon-width apart (ruled 2026-07-17): the sm gap plus each
// IconOnlyButton's internal padding sums to ≈1em of visual separation.
export const IconClusterRow: Component<RowDataProps> = createRow({
  align: "center",
  justify: "center",
  gap: "sm",
});
// StretchRow — a plain gapped row whose children STRETCH to equal height (the
// flex default cross-axis). For a row of equal-height columns/cards where a
// taller cell makes its neighbours grow to match (e.g. a swimlane of cards).
export const StretchRow: Component<RowDataProps> = createRow({ gap: "sm" });
// TopSpreadRow — a spread row pinned to the TOP (align:start) rather than
// centered: a title on the left and a badge on the right that must sit at the
// first text line even when the title wraps to two lines. The align:start
// sibling of BaselineSpreadRow / SpreadRow.
export const TopSpreadRow: Component<RowDataProps> = createRow({
  align: "start",
  justify: "between",
  gap: "sm",
});
// CenteredWrapRow — a center-justified, wrapping, top-aligned cluster: for a
// group of small stat cells that center under their card and wrap to a new line
// on narrow widths, each cell hanging from the top of its row.
export const CenteredWrapRow: Component<RowDataProps> = createRow({
  align: "start",
  justify: "center",
  wrap: true,
  gap: "sm",
});
// Baseline-aligned spread row — a label on the left, a status/meta on the right,
// sharing a text baseline, pushed to opposite ends (justify:between). For a card
// header (name/claimed + status). gap:sm is a min-gap that only shows when the
// two ends approach each other; with justify:between they normally sit apart.
export const BaselineSpreadRow: Component<RowDataProps> = createRow({
  align: "baseline",
  justify: "between",
  gap: "sm",
});
export const TightClusterRow: Component<RowDataProps> = createRow({
  gap: "xs",
  align: "center",
});
// GrowClusterRow — a center-aligned cluster row that itself grows to fill its
// parent and may shrink past its content (`flex:1 1 auto; min-width:0`), gap:sm.
// The growing sibling of ClusterRow: for a control root that arranges a fixed
// leading slot (label) beside a growing region (a chip bar / trigger) AND takes
// its own share of a parent toolbar row.
export const GrowClusterRow: Component<RowDataProps> = createRow({
  align: "center",
  gap: "sm",
  style: { flex: "1 1 auto", "min-width": "0" },
});
export const TopClusterRow: Component<RowDataProps> = createRow({
  gap: "sm",
  align: "start",
});
// Baseline-aligned cluster row (align:baseline, gap:sm, no justify). A left-
// packed row whose items share a text baseline — e.g. a section header pairing a
// bold label with a lighter hint that sit on the same baseline. The non-spread
// sibling of BaselineSpreadRow (which pushes the pair to opposite ends).
export const BaselineClusterRow: Component<RowDataProps> = createRow({
  align: "baseline",
  gap: "sm",
});
// Center cluster that refuses to be compressed by a flex parent (baked
// `flex-shrink: 0`). For fixed leading/trailing slots (icons, badges) beside a
// growing body, where the slot must keep its intrinsic width.
export const NoShrinkClusterRow: Component<RowDataProps> = createRow({
  align: "center",
  gap: "sm",
  style: { "flex-shrink": 0 },
});
// Right-aligned wrapping row — items pack to the end and wrap. For a trailing
// action-button cluster that right-aligns and wraps on narrow widths.
export const EndWrapRow: Component<RowDataProps> = createRow({
  justify: "end",
  wrap: true,
  gap: "xs",
});
export const TagRow: Component<RowDataProps> = createRow({
  gap: "xs",
  wrap: true,
  align: "center",
});
export const WrapRow: Component<RowDataProps> = createRow({
  gap: "xs",
  wrap: true,
});
// ActionWrapRow — a wrapping cluster of inline actions whose LABELS share a
// line. Same geometry as WrapRow plus `align: center`, which is load-bearing
// rather than cosmetic: an inline action renders as a bare anchor when it
// navigates and as a padded text button when it doesn't, and those two have
// different box heights. Under the default stretch both boxes fill the line,
// but the anchor keeps its text at the top while the button centres its own —
// so the labels sit ~9px apart. Centring the cross-axis puts them on one line.
// (Distinct from TagRow, which happens to share the config but describes a run
// of uniform-height pills — the roles, and so the names, are different.)
export const ActionWrapRow: Component<RowDataProps> = createRow({
  gap: "xs",
  wrap: true,
  align: "center",
});
/** LooseWrapRow — `WrapRow` at the `sm` (8px) step instead of `xs` (4px), for
 *  tile-to-tile spacing on a dashboard of breakdown widgets where the tighter
 *  gap reads as crowding.
 *
 *  `align` is deliberately UNSET, exactly as in `WrapRow`. Items therefore take
 *  the flex default `stretch`, which is what makes tiles sharing a line render
 *  at equal height — the thing that separates this from the two `sm` wrap rows
 *  that already exist. `WrappedClusterRow` (`align:center`) floats a short tile
 *  in the middle of a tall neighbour's band, and `BaselineWrapRow`
 *  (`align:baseline`) lines tiles up by their first text line, which lands
 *  arbitrarily across tiles with different header heights. Do not add an align
 *  here: this variant differs from `WrapRow` in the gap and nothing else. */
export const LooseWrapRow: Component<RowDataProps> = createRow({
  gap: "sm",
  wrap: true,
});
export const FlexRow: Component<RowDataProps> = createRow({});

// Baseline-aligned wrapping row — a row whose items share a text baseline and
// wrap to a new line when they don't fit. For a before/arrow/after or
// value+unit pairing where the pieces must sit on the same baseline.
export const BaselineWrapRow: Component<RowDataProps> = createRow({
  gap: "sm",
  align: "baseline",
  wrap: true,
});

// ChipCluster — a wrapping cluster of chips/tags that must NOT be compressed by
// a flex parent (baked `flex-shrink: 0`). Like TagRow (4px gap, wrap, centered)
// but holds its intrinsic width so the chips wrap to a new line instead of
// being squeezed narrower. For inline pill/tag groups sitting beside flexible
// siblings (e.g. an assignee-chip group in a card meta row). The baked flex is
// the Layout family defining its own vocabulary — allowed here, not in a
// consuming component's CSS.
export const ChipCluster: Component<RowDataProps> = createRow({
  gap: "xs",
  wrap: true,
  align: "center",
  style: { "flex-shrink": 0 },
});

// Wrapping center-aligned cluster — for header rows where a name + timestamp
// pair must collapse onto a second line on narrow widths without forcing a
// large vertical row-gap.
export const WrappedClusterRow: Component<RowDataProps> = createRow({
  gap: "sm",
  align: "center",
  wrap: true,
});

// Box variants — named by flex-child behavior
export const ActionSlot: Component<BoxDataProps> = createBox({ shrink: false });
// GrowBox — the "growing column": fills remaining space (flex-grow:1, basis 0)
// AND may shrink past its content (min-width:0). The min-width:0 is the load-
// bearing part — without it a flex child refuses to shrink below its content
// width, so a wide table/center pane forces the layout to content-width instead
// of letting fixed siblings (sidebars, images) keep their size. The `box--grow`
// class supplies flex-grow:1; the baked style adds flex-basis:0% + min-width:0.
export const GrowBox: Component<BoxDataProps> = createBox({
  grow: true,
  style: { "flex-basis": "0%", "min-width": "0" },
});
export const FadedBox: Component<BoxDataProps> = createBox({
  style: { opacity: "0.5" },
});

// ScrollXBox — a Box that scrolls its own horizontal overflow
// (`overflow-x: auto`). For a wide child (a table, a code line, a timeline) that
// must scroll sideways inside a bounded width without pushing the page. The
// horizontal sibling of ScrollColumn/ScrollFillColumn (which scroll vertically).
export const ScrollXBox: Component<BoxDataProps> = createBox({
  style: { "overflow-x": "auto" },
});

// ScrollYBox — a Box that scrolls its own VERTICAL overflow (`overflow-y: auto`),
// with no baked flex. For a height-CAPPED scroll region: pair it with an inline
// `max-height` (a size, not banned) so a long list/table scrolls within the cap
// without pushing the page. The non-growing sibling of ScrollFillColumn (which
// flex-fills its parent's leftover height); use this when the height is an
// explicit cap rather than a fill. Consumed by BaseTable's `maxHeight` scroll mode.
export const ScrollYBox: Component<BoxDataProps> = createBox({
  style: { "overflow-y": "auto" },
});

// ScrollBox — a Box that scrolls its own overflow on BOTH axes (`overflow: auto`),
// with no baked flex. For a height-CAPPED region that may also overflow sideways
// (a wide data table inside a bounded box): pair it with an inline `max-height`
// (a size, not banned). The both-axis sibling of ScrollXBox/ScrollYBox.
export const ScrollBox: Component<BoxDataProps> = createBox({
  style: { overflow: "auto" },
});

// ScrollFillBox — a (non-flex) block that grows to fill its flex parent's leftover
// space AND scrolls its own overflow on both axes: `flex-grow:1; min-height:0;
// overflow:auto`. The scroll sibling of `ClipFillBox` (which clips) and the
// block-flow sibling of `ScrollFillColumn` (a flex column) — use this when the
// scrolled child (a table) must keep its own block/table sizing rather than
// becoming a stretched flex item. For a fill-mode table scroll container.
export const ScrollFillBox: Component<BoxDataProps> = createBox({
  grow: true,
  style: { "min-height": "0", overflow: "auto" },
});

// ClipBox — a Box that clips overflowing content (`overflow: hidden`). For
// masking/clipping visuals: a max-height collapse animation, a progress-bar
// fill mask, a rounded avatar. NOT for scroll regions (use ScrollColumn/
// ScrollPanel). Routing clip-overflow through Layout keeps `overflow` out of
// component CSS per the layout-purity rule.
export const ClipBox: Component<BoxDataProps> = createBox({
  style: { overflow: "hidden" },
});

// LabelValueGrid — a 2-column label/value grid: a first column sized to the
// label (min 80px, growing to its content) and a second flexible value column,
// items aligned on the baseline. For labeled key/value pairs (e.g. DiffPair's
// "Label: before → after").
export const LabelValueGrid: Component<GridDataProps> = createGrid({
  columns: "minmax(80px, max-content) 1fr",
  gap: "md",
  align: "baseline",
});
export const ConstrainedBox: Component<BoxDataProps> = createBox({
  style: { "max-width": "400px" },
});

// ScrollPanel — curried Box for a height-bounded, bordered, scrolling region.
// Use to drop a long table/list/log into a detail area without letting it push
// the page. Override `max-height` per-instance via style if needed.
export const ScrollPanel = createBox({
  style: {
    "max-height": "320px",
    overflow: "auto",
    border: "1px solid var(--sui-border)",
    "border-radius": "4px",
  },
});

// PageCanvas — curried Box that fills its parent and paints the mocked-app
// thematic background. No margin, no padding. Drop it between the sandbox
// frame (the gray border) and the mock's top-level layout to give the mock a
// distinct surface that reads as "this is the app".
export const PageCanvas = createBox({
  style: {
    background: "var(--sui-bg-primary)",
    width: "100%",
    height: "100%",
    margin: "0",
    padding: "0",
  },
});

// "shrink-wrapped delineated sidebar with chosen cards" — see DESIGN_LANGUAGE.md.
// 200px wide column — the floor doubles as a practical cap so cards fit a
// predictable slot and long titles ellipsize inside them rather than blowing
// the column out. A right-edge line denotes the column delimiter even when
// empty.
export const DelineatedSidebar = createStack({
  gap: "sm",
  style: {
    width: "400px",
    "min-width": "400px",
    "max-width": "400px",
    "align-self": "stretch",
    "border-right": "1px solid var(--sui-border)",
    padding: "12px",
    "box-sizing": "border-box",
    "overflow-y": "auto",
  },
});

// PaddedStack — vertical column with sm gap and inset padding. The default
// goto for any content region that lives inside a Surface or card. Gives
// content the breathing room that bare Stack withholds.
export const PaddedStack: Component<StackDataProps> = createStack({
  gap: "sm",
  style: { padding: "16px" },
});

// --- Page-structure columns / rows (full-height layout skeleton) ---
// These bake the fill/flex/overflow plumbing so route code never hand-rolls
// `createStack({ fill, style:{flex,min-height,overflow} })` at the call site.

/** Flex column that fills its parent — `flex:1; min-height:0`. The full-height
 *  body region of a page (wraps a PaneRow / Sidebar layout). Sibling of
 *  ScrollColumn; bakes fill plumbing so routes never hand-roll it. */
export const FillColumn: Component<StackDataProps> = createStack({
  gap: "sm",
  style: { flex: "1", "min-height": "0" },
});

/** FillColumnFlush — the no-gap sibling of `FillColumn`: fills its parent's
 *  height (`flex:1; min-height:0`) and stacks its children FLUSH (no baked gap,
 *  they space themselves via their own margins). For a full-height container
 *  whose regions (a label with its own margin above a growing layout row) must
 *  not get an extra flex gap. */
export const FillColumnFlush: Component<StackDataProps> = createStack({
  style: { flex: "1", "min-height": "0" },
});

/** NoShrinkScrollBox — a fixed-size box that refuses to shrink in a flex parent
 *  and scrolls its own vertical overflow (`flex-shrink:0; overflow-y:auto;
 *  min-height:0`). For a fixed-width sidebar/rail beside a growing pane: it keeps
 *  its width (set per-instance) and scrolls its list within the row's height. */
export const NoShrinkScrollBox: Component<BoxDataProps> = createBox({
  shrink: false,
  style: { "overflow-y": "auto", "min-height": "0" },
});

/** Flex row that fills its parent — `fill; flex:1; min-height:0`. Holds a
 *  Sidebar beside a ScrollColumn pane. */
export const PaneRow: Component<RowDataProps> = createRow({
  gap: "sm",
  fill: true,
  style: { flex: "1", "min-height": "0" },
});

/** GrowColumn — a column that grows to fill its share of a parent ROW and may
 *  shrink past its content (`flex:1; min-width:0`), while stacking its own
 *  children. The column-stacking analogue of `GrowBox` (a plain grow box) and
 *  the row-context sibling of `FillColumn` (which fills column-context HEIGHT
 *  via min-height:0). No baked gap — children space themselves (e.g. a form
 *  field: a label with its own margin above a full-width input). For a
 *  form-field column that takes its share of a horizontal field row. */
export const GrowColumn: Component<StackDataProps> = createStack({
  style: { flex: "1", "min-width": "0" },
});

/** NoShrinkColumn — a column that keeps its intrinsic width in a flex ROW
 *  (`flex-shrink:0`), while stacking its own children. The column sibling of
 *  `NoShrinkClusterRow`, and the counterpart to `GrowColumn`: pair them when a
 *  fixed data column (timestamps, IDs — content that must not be squeezed into
 *  wrapping or overflow) sits beside a prose column that absorbs the slack. */
export const NoShrinkColumn: Component<StackDataProps> = createStack({
  style: { "flex-shrink": 0 },
});

/** GrowStack — a column that grows to fill its share of its parent
 *  (`flex:1; min-width:0`) and spaces its children with an `sm` gap.
 *
 *  The `sm`-gap sibling of `ContentStack` (identical but for its `xs` gap) and
 *  the gapped sibling of `GrowColumn` (which bakes no gap). Use for ANY
 *  grow-and-space column — a main content column taking its share of a
 *  two-column row, or a full-width page content column. The "share of a row"
 *  phrasing this carried previously described its first call site rather than
 *  the variant, and read as excluding the full-width case, which it has always
 *  supported: with no competing flex sibling, `flex:1` simply fills the
 *  parent. */
export const GrowStack: Component<StackDataProps> = createStack({
  gap: "sm",
  style: { flex: "1", "min-width": "0" },
});

/** GrowTightStack — the `xs`-gap sibling of `GrowStack`: grows to fill its share
 *  of a parent ROW, may shrink past its content (`flex:1; min-width:0`), and
 *  stacks its children TIGHTLY. For the text column of a media-object row — a
 *  leading glyph/avatar beside a title/detail/action stack whose lines belong to
 *  one another (NotificationCenter's inbox rows). `GrowStack`'s `sm` gap reads
 *  as separate sections there; `TightStack` alone can't take its share of the
 *  row or shrink to let long titles wrap instead of overflowing. */
export const GrowTightStack: Component<StackDataProps> = createStack({
  gap: "xs",
  style: { flex: "1", "min-width": "0" },
});

/** WrapItemStack — ONE item inside a `WrapRow`, held at its content's NATURAL
 *  width (`min-width:0; max-width:100%`, gap:xs).
 *
 *  Deliberately NOT `flex:1`, which is what separates it from `GrowTightStack`
 *  and every other `min-width:0` column here: in a WRAP row `flex:1` equalises
 *  the items, so wide content gets crammed and narrow content stretched — it
 *  destroys the natural-width packing the wrap row exists to do. Here the item
 *  sizes to its content and simply wraps when the row fills.
 *
 *  The two guards do different jobs. `min-width:0` lets the item shrink past
 *  its content so an inner element that owns its own scroll (a `fit` table)
 *  scrolls internally instead of overflowing the page. `max-width:100%` caps it
 *  at the row, so content wider than the entire row can't blow out the page
 *  width. For a grid of naturally-sized table tiles. */
export const WrapItemStack: Component<StackDataProps> = createStack({
  gap: "xs",
  style: { "min-width": "0", "max-width": "100%" },
});

/** Flex column that scrolls its own overflow — `flex:1; min-width:0;
 *  overflow:auto`. The main/detail pane beside a Sidebar. */
export const ScrollColumn: Component<StackDataProps> = createStack({
  gap: "sm",
  style: { flex: "1", "min-width": "0", overflow: "auto" },
});

// --- Column-context growth / clip / scroll (vertical siblings of the
// row-context GrowBox/ScrollColumn) ---

/** ScrollFillColumn — a column that grows to fill its flex parent's leftover
 *  height AND scrolls its own vertical overflow: `flex:1 1 auto; min-height:0;
 *  overflow:auto`. The `min-height:0` is load-bearing — without it the column
 *  refuses to shrink below its content and never produces a scrollbar. This is
 *  the column-context scroll region (vertical analogue of ScrollColumn, which
 *  is row-context min-width:0). No baked gap — children keep their own spacing.
 *  For a bounded panel's inner content region that scrolls inside the frame. */
export const ScrollFillColumn: Component<StackDataProps> = createStack({
  style: { flex: "1 1 auto", "min-height": "0", overflow: "auto" },
});

/** ClipFillColumn — a column that grows to fill its flex parent's leftover
 *  height AND clips its overflow: `flex:1 1 auto; min-height:0; overflow:hidden`,
 *  `gap:sm`. The clip sibling of `ScrollFillColumn` (which scrolls) and the
 *  column-context sibling of `ClipBox`. For a card's detail region that fills
 *  the space between a header and a bottom-pinned meta row and clips overflowing
 *  content behind a "more" affordance. */
export const ClipFillColumn: Component<StackDataProps> = createStack({
  gap: "sm",
  style: { flex: "1 1 auto", "min-height": "0", overflow: "hidden" },
});

/** ClipFillColumnFlush — the no-gap sibling of `ClipFillColumn` that ALSO
 *  shrinks horizontally: `flex:1; min-width:0; min-height:0; overflow:hidden`,
 *  no baked gap. A growing, clipping content column whose children (a page's
 *  own headings/tables with their own margins) manage their own spacing and
 *  whose inner content owns its scroll. For a selection/detail pane beside a
 *  fixed sidebar that fills the row and clips (content scrolls internally). */
export const ClipFillColumnFlush: Component<StackDataProps> = createStack({
  style: {
    flex: "1",
    "min-width": "0",
    "min-height": "0",
    overflow: "hidden",
  },
});

/** ClipFillBox — a (non-flex) block that grows to fill its flex parent's
 *  leftover column height and clips its overflow: `flex:1 1 auto (grow);
 *  min-height:0; overflow:hidden`. Unlike ClipFillColumn it lays its children
 *  out in normal block flow (it is a Box, not a Stack), so a single clamped
 *  text block + an absolutely-positioned affordance resolve exactly as before.
 *  For a description wrap that grows, clips, and anchors a "more" button. */
export const ClipFillBox: Component<BoxDataProps> = createBox({
  grow: true,
  style: { "min-height": "0", overflow: "hidden" },
});

/** GrowWrapRow — a growing, wrapping, center-aligned cluster: `flex:1;
 *  min-width:0; flex-wrap:wrap; align:center; gap:xs`. A row-3 meta cell that
 *  takes its share of the strip width and wraps its chips/glyphs. */
export const GrowWrapRow: Component<RowDataProps> = createRow({
  align: "center",
  wrap: true,
  gap: "xs",
  style: { flex: "1", "min-width": "0" },
});

/** GrowCenterRow — a growing, center-justified cluster: `flex:1; min-width:0;
 *  align:center; justify:center; gap:xs`. A row-3 meta cell that centers its
 *  content in its share of the strip. */
export const GrowCenterRow: Component<RowDataProps> = createRow({
  align: "center",
  justify: "center",
  gap: "xs",
  style: { flex: "1", "min-width": "0" },
});

/** TightNoShrinkClusterRow — a center cluster that refuses to shrink, xs gap:
 *  `flex-shrink:0; align:center; gap:xs`. The tight sibling of
 *  NoShrinkClusterRow (which is sm gap). A fixed right-hand meta cell. */
export const TightNoShrinkClusterRow: Component<RowDataProps> = createRow({
  align: "center",
  gap: "xs",
  style: { "flex-shrink": 0 },
});

/** ClipColumn — a flex column that clips its overflow (`overflow: clip`). The
 *  column-context clip frame: children stack while the box clips decorative
 *  bleed (e.g. corner-bracket -1px overhang, a clip-path corner notch). `clip`
 *  (not `hidden`) means the box is not itself a scroll container — scrolling is
 *  delegated to an inner ScrollFillColumn. Vertical sibling of ClipBox.
 *  (Height for a `fill` panel comes from the consumer's own class, not here —
 *  `height:100%;min-height:0` are non-geometry and stay on the frame.) */
export const ClipColumn: Component<StackDataProps> = createStack({
  style: { overflow: "clip" },
});

// --- AppHeader variants (size/inline baked) ---

/** Default page-top header (md padding). */
export const AppHeader: Component<AppHeaderDataProps> = createAppHeader({});

/** Compact page-top header (sm padding). */
export const CompactAppHeader: Component<AppHeaderDataProps> = createAppHeader({
  size: "sm",
});

/** Inline header rendered inside AppMain rather than as the page-top bar. */
export const InlineAppHeader: Component<AppHeaderDataProps> = createAppHeader({
  inline: true,
});

// CardGrid — a responsive dashboard/tile grid: cells wrap into as many equal
// columns as fit (each ≥ 280px), collapsing to a single column on a phone and
// filling a wide monitor with every tile visible at once (CSS `auto-fit` +
// `minmax`, no media queries). For KPI strips and breakdown-widget dashboards.
export const CardGrid: Component<GridDataProps> = createGrid({
  columns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "xs",
});

// LooseCardGrid — CardGrid at the `sm` (8px) step instead of `xs` (4px). Same
// auto-fit track sizing (≥ 280px); only the gutter differs. For a KPI strip
// whose cards need more air between them than the tight default gives.
export const LooseCardGrid: Component<GridDataProps> = createGrid({
  columns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "sm",
});

// WideCardGrid — same responsive auto-fit behavior as CardGrid but with a wider
// minimum tile (≥ 420px), for tiles that host a chart or table and need room
// before they wrap.
export const WideCardGrid: Component<GridDataProps> = createGrid({
  columns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: "xs",
});

// ChipGrid — a tight responsive grid of small equal cells (≥ 150px), for rows
// of chips / compact controls (filter bars, header meta) that pack many-across
// on a wide screen and collapse toward one-per-row on a phone.
export const ChipGrid: Component<GridDataProps> = createGrid({
  columns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "xs",
});
