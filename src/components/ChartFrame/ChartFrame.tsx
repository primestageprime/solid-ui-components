// ============================================
// ChartFrame — Composite (Depth 2)
// Owns zero CSS. Composes FullscreenBox + Layout (Stack/Row/Box variants) +
// Text (TextTitle, VerticalAxisTitle) + ButtonGroup + IconOnlyButton + Icon +
// ModeSplitButton (the y-axis strategy split).
//
// Peter's chart visual language (2026-09-24) — EVERY chart has:
//
//   ┌──────────────────────────────────────────── [⤢][⊿][≡] ┐
//   │ Title                                                  │
//   │ S │                                                    │
//   │ a │  children (the chart; fills the body)              │
//   │ l │                                                    │
//   └───┴────────────────────────────────────────────────────┘
//
//   * a TITLE, top left;
//   * a Y-AXIS TITLE naming the axis and its units, written bottom-to-top
//     along the left edge (`VerticalAxisTitle`);
//   * a BUTTON SET, top right: fullscreen, then the Y-axis STRATEGY split
//     button — the main face shows the current mode's icon and performs its
//     action, the ≡ (a hamburger, `menuIcon="menu"`) picks the mode (see
//     `yAxisModes.ts`).
//
// COLLAPSE (owner, 2026-10-14) is opt-in: `collapsible` adds a chevron after
// fullscreen and before the y-axis control, so the hamburger stays the
// rightmost button (owner, 2026-10-14). The chevron points down when the frame is collapsed
// ("Expand chart") and up when it is open ("Collapse chart"). The menu
// trigger is a hamburger, not a ▾, so the chevron means only this. A
// collapsed frame keeps its header and does not render its body. Its column
// drops the stated height, and so does a FILL frame's box, so the frame is
// as tall as its header. The parent must still give back the space: a
// BuilderBoard does that with `panelACollapsed`.
// The collapse ANIMATES (owner, 2026-10-14): the body sits in a HeightReveal,
// which shuts its row and unmounts the body when the close ends, and the
// column is a `sizeMotion` Stack, so a stated height eases to the header's.
// `collapsed` is controlled or owned, like `fullscreen`. Fullscreen and
// collapse never show together: entering fullscreen EXPANDS the frame (a
// fullscreen header with no chart shows nothing), and the chevron on a
// fullscreen frame leaves fullscreen and collapses.
//
// The frame owns no axis state. The mode is controlled (`yAxisMode` +
// `onYAxisModeChange`), the main face reports `onYAxisPress`, and the caller
// does the work — reset its water marks, or open its lock dialog. Full auto's
// face is DISABLED, not a silent no-op.
//
// HEIGHT is stated, never left to the chart (bar `"content"`, below): a chart that sizes itself (an
// aspect ratio) would otherwise make the frame ~800px tall at full width. The
// stated height sits on the FullscreenBox's first child, which fullscreen
// turns into `flex: 1 1 0` — so the same frame fills the viewport there and
// comes back to its stated height, with no remount (held marks survive).
// `"content"` is the one exception, for a chart whose height IS its data (a
// lane chart packed into as many rows as it needs): no stated height, and the
// body row grows only when fullscreen gives the column a height to grow into.
//
// The ≡'s accessible name ("Y-axis mode") is ModeSplitButton's `menuLabel`.
//
// `yAxisStrategy: "auto-grow-only"` (an Override, Peter 2026-10-08) swaps the
// split for ONE plain button: the axis only ever auto-grows, so there is no
// mode to pick, and the face is `auto`'s — "shrink to fit" — reporting
// `onYAxisPress`. The caller still owns the marks (`createAxisWaterMarks`).
// ============================================
import { type Component, type JSX, Show, createSignal, mergeProps } from "solid-js";
import { IconOnlyButton } from "../Button";
import { ButtonGroup } from "../ButtonGroup";
import { FillFullscreenBox, FullscreenBox } from "../FullscreenBox";
import { HeightReveal } from "../HeightReveal";
import { createIcon } from "../Icon";
import {
  ClusterRow,
  GrowFillBox,
  SpreadRow,
  createRow,
  createStack,
} from "../Layout";
import { ModeSplitButton } from "../ModeSplitButton";
import { TextTitle, VerticalAxisTitle } from "../Text";
import {
  CHART_Y_AXIS_MODES,
  type ChartYAxisMode,
  chartYAxisModeInfo,
} from "./yAxisModes";

export interface ChartFrameProps {
  /** The chart's name, top left. */
  title: JSX.Element;
  /** The y-axis name and units ("Salary ($)"), bottom-to-top on the left. */
  yTitle?: string;
  /**
   * The y-axis strategy. Omit it and the frame draws no strategy button (a
   * chart with no y-axis to manage).
   */
  yAxisMode?: ChartYAxisMode;
  /** The ▾ menu picked a mode. */
  onYAxisModeChange?: (mode: ChartYAxisMode) => void;
  /** The main face was pressed: shrink to fit (auto) or edit the lock (fixed). */
  onYAxisPress?: () => void;
  /**
   * The chart's own controls — a Cap field, a span picker — drawn in the
   * header's right-hand cluster BEFORE fullscreen and the y-axis split. Keep
   * them toolbar-sized (a `size="sm"` field is 29px, the buttons' height) so
   * the header does not grow. Omit it and the header is unchanged.
   */
  actions?: JSX.Element;
  /** Controlled fullscreen. Omit it and the frame owns the state. */
  fullscreen?: boolean;
  onFullscreenChange?: (next: boolean) => void;
  /**
   * Draw the collapse chevron at the end of the button set. Default false:
   * no chevron, and `collapsed` is ignored.
   */
  collapsible?: boolean;
  /**
   * Controlled collapse: true shows only the header. Omit it and the frame
   * owns the state, starting open. Entering fullscreen expands the frame.
   */
  collapsed?: boolean;
  /** The chevron (or entering fullscreen) asked for a new collapse state. */
  onCollapsedChange?: (next: boolean) => void;
  /** The chart. It fills the body. */
  children: JSX.Element;
  /**
   * The in-flow height: px, `"fill"` to take a parent of definite height, or
   * `"content"` to be as tall as the chart draws itself.
   * Presentational — curried, never passed at a call site.
   */
  height: number | "fill" | "content";
  /**
   * The y-axis control. `"split"` (the default) is the mode split button,
   * drawn when `yAxisMode` is given. `"auto-grow-only"` is ONE fit button,
   * always drawn: the axis grows with the data and never shrinks on its own,
   * and the button (`onYAxisPress`) asks the caller to shrink it to fit.
   * Presentational — curried, never passed at a call site.
   */
  yAxisStrategy?: "split" | "auto-grow-only";
}

/** The one face an auto-grow-only frame draws: `auto`'s fit action. */
const AUTO_GROW = chartYAxisModeInfo("auto");

const ButtonIcon = createIcon({ variant: "outline", size: "sm" });

/** The column's stated height: px, the parent's, or none (its content's). */
const columnHeight = (height: ChartFrameProps["height"]): JSX.CSSProperties =>
  height === "content"
    ? {}
    : { height: height === "fill" ? "100%" : `${height}px`, "min-height": "0" };

/** The header row and the body row, in one column. */
const frameColumn = (height: ChartFrameProps["height"]) =>
  createStack({ gap: "xs", sizeMotion: true, style: columnHeight(height) });

/** A collapsed frame is as tall as its header. Set on the box AND the
 *  column: a fill box's CSS gives both `flex: 1 1 0`, and a zero basis in a
 *  content-sized parent shrinks the frame below its header. */
const HEADER_ONLY: JSX.CSSProperties = { height: "auto", flex: "0 0 auto" };

/** Rail + chart; takes what the header leaves. */
const BodyRow = createRow({
  gap: "xs",
  align: "stretch",
  style: { flex: "1 1 0", "min-height": "0" },
});

/** Rail + chart at the chart's own height; grows only into a fullscreen column. */
const ContentBodyRow = createRow({
  gap: "xs",
  align: "stretch",
  style: { flex: "1 0 auto" },
});

/** The y-title, centred down the rail. CLIPPED to the body (G13): the
 *  rotated title is as tall as its text, and a short body let it overflow up
 *  into the header. `min-height: 0` lets the rail shrink with the body row;
 *  `overflow: hidden` clips what no longer fits instead of spilling. */
const YTitleRail = createStack({
  justify: "center",
  style: { "min-height": "0", overflow: "hidden" },
});

const ChartFrameBase: Component<ChartFrameProps> = (props) => {
  const FrameColumn = frameColumn(props.height);
  const Body = props.height === "content" ? ContentBodyRow : BodyRow;
  // A filling frame's box must fill too, or the column's 100% resolves
  // against a content-sized box and the body gets 0px (G11).
  const Box = props.height === "fill" ? FillFullscreenBox : FullscreenBox;
  const [owned, setOwned] = createSignal(false);
  const fullscreen = () => props.fullscreen ?? owned();
  const [ownedCollapsed, setOwnedCollapsed] = createSignal(false);
  // Fullscreen wins: a fullscreen frame always shows its chart.
  const collapsed = () =>
    props.collapsible === true &&
    !fullscreen() &&
    (props.collapsed ?? ownedCollapsed());
  const setCollapsed = (next: boolean): void => {
    if (props.collapsed === undefined) setOwnedCollapsed(next);
    props.onCollapsedChange?.(next);
  };
  /** The chevron. Collapsing a fullscreen frame also leaves fullscreen. */
  const toggleCollapsed = (): void => {
    const next = !collapsed();
    if (next && fullscreen()) setFullscreen(false);
    setCollapsed(next);
  };
  const setFullscreen = (next: boolean): void => {
    const wasCollapsed =
      props.collapsible === true && (props.collapsed ?? ownedCollapsed());
    if (next && wasCollapsed) setCollapsed(false);
    if (props.fullscreen === undefined) setOwned(next);
    props.onFullscreenChange?.(next);
  };
  const fullscreenName = () => (fullscreen() ? "Exit full screen" : "Full screen");
  const collapseName = () => (collapsed() ? "Expand chart" : "Collapse chart");

  const buttons = (): JSX.Element => (
    <ButtonGroup>
      <IconOnlyButton
        onClick={() => setFullscreen(!fullscreen())}
        aria-label={fullscreenName()}
        title={fullscreenName()}
      >
        <ButtonIcon name={fullscreen() ? "fullscreen-exit" : "fullscreen"} />
      </IconOnlyButton>
      <Show when={props.collapsible}>
        <IconOnlyButton
          onClick={toggleCollapsed}
          aria-expanded={!collapsed()}
          aria-label={collapseName()}
          title={collapseName()}
        >
          <ButtonIcon name={collapsed() ? "chevron-down" : "chevron-up"} />
        </IconOnlyButton>
      </Show>
      <Show when={props.yAxisStrategy === "auto-grow-only"}>
        <IconOnlyButton
          onClick={() => props.onYAxisPress?.()}
          aria-label={AUTO_GROW.action}
          title={AUTO_GROW.action}
        >
          <ButtonIcon name={AUTO_GROW.icon} />
        </IconOnlyButton>
      </Show>
      <Show when={props.yAxisStrategy !== "auto-grow-only" && props.yAxisMode}>
        {(mode) => (
          <ModeSplitButton<ChartYAxisMode>
            modes={CHART_Y_AXIS_MODES}
            mode={mode()}
            onPress={() => props.onYAxisPress?.()}
            onModeChange={(next) => props.onYAxisModeChange?.(next)}
            menuLabel="Y-axis mode"
            menuIcon="menu"
          />
        )}
      </Show>
    </ButtonGroup>
  );

  return (
    <Box
      fullscreen={fullscreen()}
      onFullscreenChange={setFullscreen}
      style={collapsed() ? HEADER_ONLY : undefined}
      renderCorner={() => null}
    >
      <FrameColumn style={collapsed() ? HEADER_ONLY : undefined}>
        <SpreadRow>
          <TextTitle>{props.title}</TextTitle>
          <Show when={props.actions} fallback={buttons()}>
            <ClusterRow>
              {props.actions}
              {buttons()}
            </ClusterRow>
          </Show>
        </SpreadRow>
        <HeightReveal when={!collapsed()}>
          <Body>
            <Show when={props.yTitle}>
              {(yTitle) => (
                <YTitleRail>
                  <VerticalAxisTitle>{yTitle()}</VerticalAxisTitle>
                </YTitleRail>
              )}
            </Show>
            <GrowFillBox>{props.children}</GrowFillBox>
          </Body>
        </HeightReveal>
      </FrameColumn>
    </Box>
  );
};

/** Props that are presentational overrides — locked at variant-definition time. */
export type ChartFrameOverrides = Pick<
  ChartFrameProps,
  "height" | "yAxisStrategy"
>;

/** Props that remain available to consumers of a curried ChartFrame variant. */
export type ChartFrameDataProps = Omit<ChartFrameProps, keyof ChartFrameOverrides>;

export function createChartFrame(
  defaults: ChartFrameOverrides,
): Component<ChartFrameDataProps> {
  return (props) => <ChartFrameBase {...mergeProps(defaults, props)} />;
}
