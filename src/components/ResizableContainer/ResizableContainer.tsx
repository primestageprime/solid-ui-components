// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ResizableContainer — Layout (Depth 0)
// Owns CSS (ResizableContainer.css), no component imports.
// Container with draggable edge handles for manual resize.
// ============================================
import {
  type Accessor,
  type Component,
  For,
  type JSX,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { clamp } from "../../internal/math/clamp";
import "./ResizableContainer.css";

export type ResizeDirection = "top" | "right" | "bottom" | "left";

export interface ResizeDimensions {
  width: number;
  height: number;
}

export interface ResizableContainerProps {
  children: JSX.Element;
  /** Which edges expose a drag handle. Defaults to `["right", "bottom"]`. */
  directions?: ResizeDirection[];
  minWidth?: number;
  maxWidth?: number;
  initialWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  initialHeight?: number;
  /** Called with the new dimensions during a drag. */
  onResize?: (dims: ResizeDimensions) => void;
  /** When true, don't set inline width/height (for CSS Grid cells where the parent controls sizing). */
  gridMode?: boolean;
  /** Sync internal width from an external source (e.g. grid-column variable overrides). */
  externalWidth?: Accessor<number | undefined>;
  class?: string;
  style?: JSX.CSSProperties;
}

const DEFAULTS = {
  directions: ["right", "bottom"] as ResizeDirection[],
  minWidth: 100,
  maxWidth: 2000,
  minHeight: 100,
  maxHeight: 2000,
  initialWidth: 300,
  initialHeight: 200,
};

export const ResizableContainer: Component<ResizableContainerProps> = (
  props,
) => {
  const directions = () => props.directions ?? DEFAULTS.directions;
  const minWidth = () => props.minWidth ?? DEFAULTS.minWidth;
  const maxWidth = () => props.maxWidth ?? DEFAULTS.maxWidth;
  const minHeight = () => props.minHeight ?? DEFAULTS.minHeight;
  const maxHeight = () => props.maxHeight ?? DEFAULTS.maxHeight;

  const [width, setWidth] = createSignal(
    props.initialWidth ?? DEFAULTS.initialWidth,
  );
  const [height, setHeight] = createSignal(
    props.initialHeight ?? DEFAULTS.initialHeight,
  );
  const [activeDirection, setActiveDirection] =
    createSignal<ResizeDirection | null>(null);
  const [isClient, setIsClient] = createSignal(false);

  createEffect(() => {
    const ext = props.externalWidth?.();
    if (ext !== undefined) setWidth(ext);
  });

  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  const applyDelta = (
    direction: ResizeDirection,
    deltaX: number,
    deltaY: number,
  ) => {
    const nextWidth = (() => {
      switch (direction) {
        case "right":
          return clamp(startWidth + deltaX, minWidth(), maxWidth());
        case "left":
          return clamp(startWidth - deltaX, minWidth(), maxWidth());
        default:
          return width();
      }
    })();
    const nextHeight = (() => {
      switch (direction) {
        case "bottom":
          return clamp(startHeight + deltaY, minHeight(), maxHeight());
        case "top":
          return clamp(startHeight - deltaY, minHeight(), maxHeight());
        default:
          return height();
      }
    })();
    setWidth(nextWidth);
    setHeight(nextHeight);
    props.onResize?.({ width: nextWidth, height: nextHeight });
  };

  const onMouseMove = (e: MouseEvent) => {
    const direction = activeDirection();
    if (direction === null) return;
    applyDelta(direction, e.clientX - startX, e.clientY - startY);
  };

  const stopResize = () => {
    setActiveDirection(null);
    if (typeof window !== "undefined") {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopResize);
    }
  };

  const startResize = (e: MouseEvent, direction: ResizeDirection) => {
    if (!isClient()) return;
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    startWidth = width();
    startHeight = height();
    setActiveDirection(direction);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopResize);
  };

  // Keyboard resize: arrow keys nudge the focused edge by STEP (Shift = ×5).
  // Left/right handles adjust width; top/bottom adjust height — matching each
  // handle's pointer-drag axis. Seeds start* from current size then reuses the
  // same clamped applyDelta path as the drag.
  const STEP = 16;
  const isHorizontal = (direction: ResizeDirection) =>
    direction === "left" || direction === "right";
  const onHandleKeyDown = (e: KeyboardEvent, direction: ResizeDirection) => {
    const horizontal = isHorizontal(direction);
    const decrease = horizontal ? "ArrowLeft" : "ArrowUp";
    const increase = horizontal ? "ArrowRight" : "ArrowDown";
    if (e.key !== decrease && e.key !== increase) return;
    e.preventDefault();
    const step = (e.shiftKey ? STEP * 5 : STEP) * (e.key === increase ? 1 : -1);
    startWidth = width();
    startHeight = height();
    applyDelta(direction, horizontal ? step : 0, horizontal ? 0 : step);
  };

  onMount(() => setIsClient(true));
  onCleanup(stopResize);

  const containerClass = () =>
    ["sui-resizable", props.class].filter(Boolean).join(" ");

  const hasHorizontalHandle = () =>
    directions().includes("left") || directions().includes("right");
  const hasVerticalHandle = () =>
    directions().includes("top") || directions().includes("bottom");

  const dimensionStyle = (): JSX.CSSProperties => {
    if (props.gridMode) return {};
    return {
      ...(hasHorizontalHandle() ? { width: `${width()}px` } : {}),
      ...(hasVerticalHandle() ? { height: `${height()}px` } : {}),
    };
  };

  const containerStyle = (): JSX.CSSProperties => ({
    // Consumer style first; internal width/height spread last so a consumer
    // passing `style={{ width: "100%" }}` cannot clobber the dimensions this
    // component owns. ResizableContainer is the source of truth for its size.
    ...props.style,
    ...dimensionStyle(),
  });

  return (
    <div class={containerClass()} style={containerStyle()}>
      {props.children}
      <Show when={isClient()}>
        <For each={directions()}>
          {(direction) => (
            // biome-ignore lint/a11y/useSemanticElements: interactive resize splitter (focusable, keyboard-adjustable) — <hr> is a non-interactive presentational separator and cannot carry the drag/resize affordance.
            <div
              class={`sui-resizable__handle sui-resizable__handle--${direction} ${
                activeDirection() === direction
                  ? "sui-resizable__handle--active"
                  : ""
              }`}
              role="separator"
              aria-orientation={
                isHorizontal(direction) ? "vertical" : "horizontal"
              }
              aria-label={`Resize ${direction} edge`}
              aria-valuenow={isHorizontal(direction) ? width() : height()}
              aria-valuemin={isHorizontal(direction) ? minWidth() : minHeight()}
              aria-valuemax={isHorizontal(direction) ? maxWidth() : maxHeight()}
              tabIndex={0}
              onMouseDown={(e) => startResize(e, direction)}
              onKeyDown={(e) => onHandleKeyDown(e, direction)}
            />
          )}
        </For>
      </Show>
    </div>
  );
};
