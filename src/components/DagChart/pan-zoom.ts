import { createSignal } from "solid-js";

export type Transform = { x: number; y: number; scale: number };

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_IN_FACTOR = 1.1;
const ZOOM_OUT_FACTOR = 0.9;
const FIT_PADDING = 40;

export function createPanZoom() {
  const [transform, setTransform] = createSignal<Transform>({ x: 0, y: 0, scale: 1 });

  let dragging = false;
  let lastPointer = { x: 0, y: 0 };

  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    const el = e.currentTarget as SVGElement | null;
    if (el && typeof el.setPointerCapture === "function") {
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "InvalidStateError")) {
          console.warn("[DagChart] setPointerCapture threw:", err);
        }
      }
    }
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

  // Exposed as a raw handler for imperative addEventListener({ passive: false })
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const el = e.currentTarget as SVGElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const factor = e.deltaY > 0 ? ZOOM_OUT_FACTOR : ZOOM_IN_FACTOR;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setTransform((t) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
      const ds = newScale / t.scale;
      return { x: cx - ds * (cx - t.x), y: cy - ds * (cy - t.y), scale: newScale };
    });
  };

  const fitToView = (
    graphWidth: number,
    graphHeight: number,
    containerWidth: number,
    containerHeight: number,
  ) => {
    if (graphWidth === 0 || graphHeight === 0) return;
    if (containerWidth === 0 || containerHeight === 0) {
      console.warn("[DagChart] fitToView skipped — container has zero dimensions.");
      return;
    }

    const availableWidth = containerWidth - FIT_PADDING * 2;
    const availableHeight = containerHeight - FIT_PADDING * 2;
    const scaleX = availableWidth / graphWidth;
    const scaleY = availableHeight / graphHeight;
    const scale = Math.max(MIN_SCALE, Math.min(scaleX, scaleY, 1));
    const x = (containerWidth - graphWidth * scale) / 2;
    const y = (containerHeight - graphHeight * scale) / 2;

    setTransform({ x, y, scale });
  };

  const transformString = (): string => {
    const t = transform();
    return `translate(${t.x}, ${t.y}) scale(${t.scale})`;
  };

  return {
    transformString,
    fitToView,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp },
    onWheel,
  };
}
