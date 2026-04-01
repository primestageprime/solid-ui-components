import { createSignal } from "solid-js";

export type Transform = { x: number; y: number; scale: number };

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_IN_FACTOR = 1.1;
const ZOOM_OUT_FACTOR = 0.9;
const FIT_PADDING = 40;

/**
 * Creates a reactive pan/zoom manager for an SVG canvas.
 *
 * Returns a transform signal, event handlers to attach to the SVG element,
 * a `fitToView` helper for centering the graph, and a `transformString`
 * accessor that produces the SVG `transform` attribute value.
 *
 * All state transitions are pure: the `setTransform` updater functions
 * never mutate their input and always derive a fresh `Transform`.
 *
 * @example
 * ```tsx
 * const { transformString, fitToView, handlers } = createPanZoom();
 * <svg {...handlers}>
 *   <g transform={transformString()}>...</g>
 * </svg>
 * ```
 */
export function createPanZoom() {
  const [transform, setTransform] = createSignal<Transform>({ x: 0, y: 0, scale: 1 });

  // Mutable interaction state — kept outside signals because these are
  // transient mid-gesture values, not reactive UI state.
  let dragging = false;
  let lastPointer = { x: 0, y: 0 };

  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    lastPointer = { x: e.clientX, y: e.clientY };
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  };

  const onPointerUp = () => {
    dragging = false;
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? ZOOM_OUT_FACTOR : ZOOM_IN_FACTOR;
    setTransform((t) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
      const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const ds = newScale / t.scale;
      return { x: cx - ds * (cx - t.x), y: cy - ds * (cy - t.y), scale: newScale };
    });
  };

  /**
   * Centers and scales the graph to fill the container, capped at scale 1
   * so the graph is never enlarged beyond its natural size.
   */
  const fitToView = (
    graphWidth: number,
    graphHeight: number,
    containerWidth: number,
    containerHeight: number,
  ) => {
    if (graphWidth === 0 || graphHeight === 0 || containerWidth === 0 || containerHeight === 0) {
      return;
    }

    const availableWidth = containerWidth - FIT_PADDING * 2;
    const availableHeight = containerHeight - FIT_PADDING * 2;
    const scaleX = availableWidth / graphWidth;
    const scaleY = availableHeight / graphHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    const x = (containerWidth - graphWidth * scale) / 2;
    const y = (containerHeight - graphHeight * scale) / 2;

    setTransform({ x, y, scale });
  };

  /** Returns the SVG `transform` attribute string for the current state. */
  const transformString = (): string => {
    const t = transform();
    return `translate(${t.x}, ${t.y}) scale(${t.scale})`;
  };

  return {
    transform,
    transformString,
    fitToView,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onWheel },
  };
}
