// ============================================
// Chart — Composed root (Depth 2).
// Provides scales + viewport context to slot children. Owns the single
// pointer listener on its <svg> and dispatches hoverX + dragRange via
// context signals per spec D3.
// ============================================
import {
  Component,
  JSX,
  createMemo,
  createSignal,
  splitProps,
} from "solid-js";
import { ChartContext, ChartContextValue, Margin } from "./context";
import { linearScale, scaleTime, Scale } from "./scales";
import "./Chart.css";

export interface ChartProps {
  width: number;
  height: number;
  /** Data domain on X. Accepts numbers (linear scale) or Dates (time scale). */
  xDomain: [number, number] | [Date, Date];
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

const isDateDomain = (d: ChartProps["xDomain"]): d is [Date, Date] => {
  const a = d[0] instanceof Date;
  const b = d[1] instanceof Date;
  if (a !== b) {
    throw new Error(
      `Chart.xDomain: mixed types not allowed (got ${typeof d[0]}, ${typeof d[1]})`,
    );
  }
  return a && b;
};

export const Chart: Component<ChartProps> = (props) => {
  // NB: `onPointer*` are listed so that any pass-through handlers from a consumer
  // are routed to `local` (and discarded) — never spread onto the <svg> via
  // `others`, where they would clobber Chart's own listeners (spec D3).
  // We widen via intersection so the keys are valid for `splitProps` even though
  // they are intentionally absent from the public `ChartProps` surface.
  type PointerPassthrough = Pick<
    JSX.SvgSVGAttributes<SVGSVGElement>,
    "onPointerMove" | "onPointerDown" | "onPointerUp" | "onPointerLeave"
  >;
  const [local, others] = splitProps(props as ChartProps & PointerPassthrough, [
    "width",
    "height",
    "xDomain",
    "yDomain",
    "margin",
    "title",
    "class",
    "style",
    "children",
    "onPointerMove",
    "onPointerDown",
    "onPointerUp",
    "onPointerLeave",
  ]);

  const margin = createMemo<Margin>(() => ({ ...DEFAULT_MARGIN, ...(local.margin ?? {}) }));
  const width = createMemo(() => local.width);
  const height = createMemo(() => local.height);
  const innerWidth = createMemo(() => Math.max(0, width() - margin().left - margin().right));
  const innerHeight = createMemo(() => Math.max(0, height() - margin().top - margin().bottom));

  const xScale = createMemo<Scale>(() => {
    const d = local.xDomain;
    return isDateDomain(d)
      ? scaleTime(d, [0, innerWidth()])
      : linearScale(d, [0, innerWidth()]);
  });
  const yScale = createMemo<Scale>(() => linearScale(local.yDomain, [innerHeight(), 0]));

  const [hoverX, setHoverX] = createSignal<number | null>(null);
  const [dragRange, setDragRange] = createSignal<{ start: number; end: number } | null>(null);

  let svgEl: SVGSVGElement | undefined;
  let dragAnchor: number | null = null;

  const pointerDataX = (clientX: number): number | null => {
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    const px = clientX - rect.left - margin().left;
    if (px < 0 || px > innerWidth()) return null;
    return xScale().invert(px);
  };

  const onPointerMove = (e: PointerEvent) => {
    const x = pointerDataX(e.clientX);
    setHoverX(x);
    if (dragAnchor != null && x != null) {
      setDragRange({
        start: Math.min(dragAnchor, x),
        end: Math.max(dragAnchor, x),
      });
    }
  };
  const onPointerDown = (e: PointerEvent) => {
    const x = pointerDataX(e.clientX);
    if (x == null) return;
    dragAnchor = x;
    setDragRange({ start: x, end: x });
  };
  const onPointerUp = () => {
    dragAnchor = null;
    // Leave the latest dragRange in place; consumers clear it via setDragRange(null).
  };
  const onPointerLeave = () => {
    setHoverX(null);
    dragAnchor = null;
  };

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
    dragRange,
    setDragRange,
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
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
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
