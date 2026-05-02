// ============================================
// Chart — Composed root (Depth 2).
// Provides scales + viewport context to slot children. Composable: drop
// in <Grid>, <XAxis>, <YAxis>, <LineSeries>, <AreaSeries>, <ReferenceLine>,
// <Crosshair>, <Tooltip>. Reactive: domains/dims as signals re-derive scales.
// ============================================
import {
  Component,
  JSX,
  createMemo,
  createSignal,
  splitProps,
} from "solid-js";
import { ChartContext, ChartContextValue, Margin } from "./context";
import { linearScale, Scale } from "./scales";
import "./Chart.css";

export interface ChartProps {
  width: number;
  height: number;
  /** Data domain on X. */
  xDomain: [number, number];
  /** Data domain on Y. */
  yDomain: [number, number];
  /** Plot-area inset. Default: { top: 8, right: 8, bottom: 28, left: 36 }. */
  margin?: Partial<Margin>;
  /** Optional accessible title. */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties | string;
  children?: JSX.Element;
}

const DEFAULT_MARGIN: Margin = { top: 8, right: 8, bottom: 28, left: 36 };

export const Chart: Component<ChartProps> = (props) => {
  const [local, others] = splitProps(props, [
    "width",
    "height",
    "xDomain",
    "yDomain",
    "margin",
    "title",
    "class",
    "style",
    "children",
  ]);

  const margin = createMemo<Margin>(() => ({ ...DEFAULT_MARGIN, ...(local.margin ?? {}) }));
  const width = createMemo(() => local.width);
  const height = createMemo(() => local.height);
  const innerWidth = createMemo(() => Math.max(0, width() - margin().left - margin().right));
  const innerHeight = createMemo(() => Math.max(0, height() - margin().top - margin().bottom));

  const xScale = createMemo<Scale>(() => linearScale(local.xDomain, [0, innerWidth()]));
  const yScale = createMemo<Scale>(() => linearScale(local.yDomain, [innerHeight(), 0]));

  const [hoverX, setHoverX] = createSignal<number | null>(null);

  let svgEl: SVGSVGElement | undefined;

  const onMove = (e: MouseEvent) => {
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const px = e.clientX - rect.left - margin().left;
    if (px < 0 || px > innerWidth()) {
      setHoverX(null);
      return;
    }
    setHoverX(xScale().invert(px));
  };
  const onLeave = () => setHoverX(null);

  const ctx: ChartContextValue = {
    width,
    height,
    margin,
    innerWidth,
    innerHeight,
    xScale,
    yScale,
    hoverX,
    setHoverX,
  };

  return (
    <ChartContext.Provider value={ctx}>
      <div class={`sui-chart${local.class ? " " + local.class : ""}`} style={local.style as JSX.CSSProperties}>
        <svg
          ref={svgEl}
          class="sui-chart__svg"
          width={width()}
          height={height()}
          viewBox={`0 0 ${width()} ${height()}`}
          role="img"
          aria-label={local.title}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          {...(others as JSX.SvgSVGAttributes<SVGSVGElement>)}
        >
          <g transform={`translate(${margin().left}, ${margin().top})`}>
            {local.children}
          </g>
        </svg>
      </div>
    </ChartContext.Provider>
  );
};
