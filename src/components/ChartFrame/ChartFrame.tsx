// ============================================
// ChartFrame — Composite (Depth 2)
// Owns zero CSS. Composes FullscreenBox + Layout (Stack/Row/Box variants) +
// Text (TextTitle, VerticalAxisTitle) + ButtonGroup + IconOnlyButton + Icon +
// RightPopoverMenu.
//
// Peter's chart visual language (2026-09-24) — EVERY chart has:
//
//   ┌──────────────────────────────────────────── [⤢][⊿][▾] ┐
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
//     action, the ▾ picks the mode (see `yAxisModes.ts`).
//
// The frame owns no axis state. The mode is controlled (`yAxisMode` +
// `onYAxisModeChange`), the main face reports `onYAxisPress`, and the caller
// does the work — reset its water marks, or open its lock dialog. Full auto's
// face is DISABLED, not a silent no-op.
//
// HEIGHT is stated, never left to the chart: a chart that sizes itself (an
// aspect ratio) would otherwise make the frame ~800px tall at full width. The
// stated height sits on the FullscreenBox's first child, which fullscreen
// turns into `flex: 1 1 0` — so the same frame fills the viewport there and
// comes back to its stated height, with no remount (held marks survive).
//
// The ▾ gets its accessible name from the frame: PopoverMenu has no label
// prop, so the trigger's content is a screen-reader-only span ("Y-axis
// mode") beside PopoverMenu's own aria-hidden caret.
// ============================================
import { type Component, type JSX, Show, createSignal, mergeProps } from "solid-js";
import { map } from "../../fn";
import { IconOnlyButton } from "../Button";
import { ButtonGroup } from "../ButtonGroup";
import { FullscreenBox } from "../FullscreenBox";
import { createIcon } from "../Icon";
import { GrowFillBox, SpreadRow, createRow, createStack } from "../Layout";
import { type PopoverMenuItem, RightPopoverMenu } from "../PopoverMenu";
import { TextTitle, VerticalAxisTitle, createText } from "../Text";
import {
  CHART_Y_AXIS_MODES,
  type ChartYAxisMode,
  type ChartYAxisModeInfo,
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
  /** Controlled fullscreen. Omit it and the frame owns the state. */
  fullscreen?: boolean;
  onFullscreenChange?: (next: boolean) => void;
  /** The chart. It fills the body. */
  children: JSX.Element;
  /**
   * The in-flow height: px, or `"fill"` to take a parent of definite height.
   * Presentational — curried, never passed at a call site.
   */
  height: number | "fill";
}

const ButtonIcon = createIcon({ variant: "outline", size: "sm" });

/** Visually hidden, still announced: the ▾ trigger's accessible name. */
const ScreenReaderLabel = createText({ as: "span", class: "sui-sr-only" });

/** The header row and the body row, in one column. */
const frameColumn = (height: number | "fill") =>
  createStack({
    gap: "xs",
    style: {
      height: height === "fill" ? "100%" : `${height}px`,
      "min-height": "0",
    },
  });

/** Rail + chart; takes what the header leaves. */
const BodyRow = createRow({
  gap: "xs",
  align: "stretch",
  style: { flex: "1 1 0", "min-height": "0" },
});

/** The y-title, centred down the rail. */
const YTitleRail = createStack({ justify: "center" });

const menuItems = (
  current: ChartYAxisMode,
): [PopoverMenuItem<ChartYAxisMode>, ...PopoverMenuItem<ChartYAxisMode>[]] =>
  map(
    (info: ChartYAxisModeInfo): PopoverMenuItem<ChartYAxisMode> => ({
      id: info.mode,
      label: info.label,
      icon: info.icon,
      active: info.mode === current,
    }),
    [...CHART_Y_AXIS_MODES],
  ) as [PopoverMenuItem<ChartYAxisMode>, ...PopoverMenuItem<ChartYAxisMode>[]];

const ChartFrameBase: Component<ChartFrameProps> = (props) => {
  const FrameColumn = frameColumn(props.height);
  const [owned, setOwned] = createSignal(false);
  const fullscreen = () => props.fullscreen ?? owned();
  const setFullscreen = (next: boolean): void => {
    if (props.fullscreen === undefined) setOwned(next);
    props.onFullscreenChange?.(next);
  };
  const fullscreenName = () => (fullscreen() ? "Exit full screen" : "Full screen");
  const info = () => chartYAxisModeInfo(props.yAxisMode ?? "auto");

  return (
    <FullscreenBox
      fullscreen={fullscreen()}
      onFullscreenChange={setFullscreen}
      renderCorner={() => null}
    >
      <FrameColumn>
        <SpreadRow>
          <TextTitle>{props.title}</TextTitle>
          <ButtonGroup>
            <IconOnlyButton
              onClick={() => setFullscreen(!fullscreen())}
              aria-label={fullscreenName()}
              title={fullscreenName()}
            >
              <ButtonIcon name={fullscreen() ? "fullscreen-exit" : "fullscreen"} />
            </IconOnlyButton>
            <Show when={props.yAxisMode}>
              {(mode) => (
                <>
                  <IconOnlyButton
                    onClick={() => props.onYAxisPress?.()}
                    disabled={info().disabled}
                    aria-label={info().action}
                    title={info().action}
                  >
                    <ButtonIcon name={info().icon} />
                  </IconOnlyButton>
                  <RightPopoverMenu
                    trigger={<ScreenReaderLabel>Y-axis mode</ScreenReaderLabel>}
                    items={menuItems(mode())}
                    onSelect={(next) => props.onYAxisModeChange?.(next)}
                  />
                </>
              )}
            </Show>
          </ButtonGroup>
        </SpreadRow>
        <BodyRow>
          <Show when={props.yTitle}>
            {(yTitle) => (
              <YTitleRail>
                <VerticalAxisTitle>{yTitle()}</VerticalAxisTitle>
              </YTitleRail>
            )}
          </Show>
          <GrowFillBox>{props.children}</GrowFillBox>
        </BodyRow>
      </FrameColumn>
    </FullscreenBox>
  );
};

/** Props that are presentational overrides — locked at variant-definition time. */
export type ChartFrameOverrides = Pick<ChartFrameProps, "height">;

/** Props that remain available to consumers of a curried ChartFrame variant. */
export type ChartFrameDataProps = Omit<ChartFrameProps, keyof ChartFrameOverrides>;

export function createChartFrame(
  defaults: ChartFrameOverrides,
): Component<ChartFrameDataProps> {
  return (props) => <ChartFrameBase {...mergeProps(defaults, props)} />;
}
