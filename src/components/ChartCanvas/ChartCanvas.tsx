import { type Component, type JSX, splitProps, mergeProps } from "solid-js";
import "./ChartCanvas.css";

/**
 * ChartCanvas — Atomic Primitive (Depth 1). Owns `ChartCanvas.css`.
 *
 * A positioned container wrapping a Chart.js `<canvas>`. The container owns
 * `position: relative` + `width: 100%`; the chart-area height is baked per
 * curried variant via `createChartCanvas({ height })` and applied as an inline
 * style by the primitive (a static variant decision, not a call-site override).
 *
 * The relative positioning establishes the containing block for an optional
 * overlay slot passed as `children` — typically an `InlineChartErrorOverlay`
 * gated behind a `<Show>` to cover the canvas when data is unavailable.
 *
 * Wire your Chart.js instance to the canvas via the forwarded `ref`.
 */
export interface ChartCanvasProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "ref" | "style"> {
  /**
   * Chart-area height. Number → px; string → used verbatim (e.g. "240px").
   * Static variant decision baked at definition time; not a call-site prop.
   */
  height?: number | string;
  /** Canvas element ref — attach your Chart.js instance to this element. */
  ref?: (el: HTMLCanvasElement) => void;
  /** Optional overlay slot rendered above the canvas (e.g. InlineChartErrorOverlay). */
  children?: JSX.Element;
}

export const ChartCanvas: Component<ChartCanvasProps> = (props) => {
  const [local, others] = splitProps(props, [
    "height",
    "ref",
    "children",
    "class",
  ]);

  const classes = () =>
    local.class ? `sui-chart-canvas ${local.class}` : "sui-chart-canvas";

  const height = () =>
    typeof local.height === "number" ? `${local.height}px` : local.height;

  return (
    <div class={classes()} style={{ height: height() }} {...others}>
      <canvas class="sui-chart-canvas__canvas" ref={local.ref} />
      {local.children}
    </div>
  );
};

/** Props that are visual/static overrides — locked at variant-definition time. */
export type ChartCanvasOverrides = Pick<ChartCanvasProps, "height">;

/** Props that remain available to consumers of a curried ChartCanvas variant. */
export type ChartCanvasDataProps = Omit<ChartCanvasProps, keyof ChartCanvasOverrides>;

/**
 * Factory: freeze the chart-area `height` to produce a data-only curried
 * ChartCanvas. Call sites then pass only `ref` (+ optional overlay `children`).
 */
export function createChartCanvas(
  defaults: ChartCanvasOverrides,
): Component<ChartCanvasDataProps> {
  return (props) => <ChartCanvas {...mergeProps(defaults, props)} />;
}
