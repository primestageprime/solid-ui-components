// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ThreePanelLayout — Atomic (Depth 1)
// Owns CSS (ThreePanelLayout.css), no component imports.
// Top-bar + three-column (left / center / right) layout scaffold
// for alarm-lab / analysis-style pages.
// ============================================
import { type Component, type JSX, Show, mergeProps } from "solid-js";
import "./ThreePanelLayout.css";

export interface ThreePanelLayoutProps {
  /** Optional top bar rendered above the three-column content region. */
  topBar?: JSX.Element;
  /** Optional left panel (narrow). Hidden when omitted — center expands. */
  leftPanel?: JSX.Element;
  /** Required center panel — the primary work area. */
  centerPanel: JSX.Element;
  /** Optional right panel (narrow). Hidden when omitted — center expands. */
  rightPanel?: JSX.Element;
  /**
   * Explicit CSS height for the outer container. Defaults to `"100%"`.
   * Pass any valid CSS length (e.g. `"100vh"`, `"calc(100vh - 64px)"`,
   * `"calc(100vh - var(--app-header-height, 64px))"`) to fit a particular
   * viewport / app-chrome arrangement. Upstream cannot know the app's
   * header height, so it stays fully decoupled.
   */
  height?: string;
  /**
   * Backwards-compatible convenience alias for `height="100%"`. Kept so
   * existing downstream call sites (`<ThreePanelLayout fullHeight>`) migrate
   * without an API rewrite. If both `height` and `fullHeight` are supplied,
   * `height` wins.
   */
  fullHeight?: boolean;
  /**
   * Width of the left panel column. Ignored when `leftPanel` is absent.
   * Defaults to `"220px"`.
   */
  leftPanelWidth?: string;
  /**
   * Width of the right panel column. Ignored when `rightPanel` is absent.
   * Defaults to `"240px"`.
   */
  rightPanelWidth?: string;
  /**
   * Max-height applied to the left/right asides when the layout collapses to
   * a single stacked column (≤900px). Defaults to `"200px"`, which caps each
   * aside and lets it scroll internally — preserving the original behavior.
   * Pass `"none"` (or any CSS length) to opt out of the cap so a stacked aside
   * sizes to its full content height (no clip, no internal scroll). Wired into
   * the stacked media query via the `--sui-three-panel-aside-max` custom
   * property on the root element.
   */
  asideMaxHeight?: string;
  /** Optional class appended to the root `.sui-three-panel` element. */
  class?: string;
}

const DEFAULT_LEFT_WIDTH = "220px";
const DEFAULT_RIGHT_WIDTH = "240px";
const DEFAULT_ASIDE_MAX_HEIGHT = "200px";

const resolveHeight = (
  height: string | undefined,
  fullHeight: boolean | undefined,
): string => {
  if (height) return height;
  if (fullHeight) return "100%";
  return "100%";
};

const resolveGridColumns = (
  leftPanel: JSX.Element | undefined,
  rightPanel: JSX.Element | undefined,
  leftWidth: string,
  rightWidth: string,
): string => {
  const left = leftPanel ? leftWidth : "0";
  const right = rightPanel ? rightWidth : "0";
  return `${left} 1fr ${right}`;
};

export const ThreePanelLayout: Component<ThreePanelLayoutProps> = (props) => {
  const rootStyle = (): JSX.CSSProperties => ({
    height: resolveHeight(props.height, props.fullHeight),
    "--sui-three-panel-grid-columns": resolveGridColumns(
      props.leftPanel,
      props.rightPanel,
      props.leftPanelWidth ?? DEFAULT_LEFT_WIDTH,
      props.rightPanelWidth ?? DEFAULT_RIGHT_WIDTH,
    ),
    "--sui-three-panel-aside-max":
      props.asideMaxHeight ?? DEFAULT_ASIDE_MAX_HEIGHT,
  });

  const rootClass = (): string => {
    const classes = ["sui-three-panel"];
    if (props.class) classes.push(props.class);
    return classes.join(" ");
  };

  return (
    <div class={rootClass()} style={rootStyle()}>
      <Show when={props.topBar}>
        <div class="sui-three-panel__top-bar">{props.topBar}</div>
      </Show>
      <div class="sui-three-panel__content">
        <Show when={props.leftPanel}>
          <div class="sui-three-panel__left">{props.leftPanel}</div>
        </Show>
        <div class="sui-three-panel__center">{props.centerPanel}</div>
        <Show when={props.rightPanel}>
          <div class="sui-three-panel__right">{props.rightPanel}</div>
        </Show>
      </div>
    </div>
  );
};

/** Presentational knobs — locked at variant-definition time (the currying
 *  rule: panel widths/heights are DESIGN decisions, remembered in a curried
 *  variant, never repeated at call sites). */
export type ThreePanelLayoutOverrides = Pick<
  ThreePanelLayoutProps,
  "height" | "fullHeight" | "leftPanelWidth" | "rightPanelWidth" | "asideMaxHeight"
>;

/** Props that remain for consumers of a curried variant: the panels. */
export type ThreePanelLayoutDataProps = Omit<
  ThreePanelLayoutProps,
  keyof ThreePanelLayoutOverrides
>;

/** Curry a ThreePanelLayout with its geometry baked (e.g. an app's
 *  `TriageLayout = createThreePanelLayout({ leftPanelWidth: "380px" })`). */
export function createThreePanelLayout(
  defaults: Partial<Omit<ThreePanelLayoutProps, "children">>,
): Component<ThreePanelLayoutDataProps> {
  return (props) => <ThreePanelLayout {...mergeProps(defaults, props)} />;
}
