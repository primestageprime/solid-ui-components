// ============================================
// CropRectOverlay — Structural (Depth 1)
// Owns CSS (CropRectOverlay.css), no component imports.
//
// Draw-to-create, drag-to-move, corner-handles-to-resize freeform rectangle
// selection over an image. Meant to be passed into FramedImage's `overlay`
// slot, which sizes it to fill the frame.
//
// Coordinate contract: `rect` and `onRectChange` operate in the IMAGE's OWN
// pixel space (0..naturalWidth, 0..naturalHeight) — never the frame's screen
// pixels. `object-fit: contain` letterboxes a non-matching aspect ratio, so
// the component reconstructs that letterboxed content box itself (from
// `naturalWidth`/`naturalHeight` vs its own measured bounding box) and
// clamps every drag into it. A caller that instead normalized against the
// frame's own box would silently map drawn rects onto the letterbox bars —
// this is the fix, not a convenience.
// ============================================
import { type Component, type JSX, For, Show, createSignal, onCleanup } from "solid-js";
import { clamp } from "../../internal/math/clamp";
import { pipe, filter, join } from "../../fn";
import "./CropRectOverlay.css";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropRectOverlayProps {
  /** The underlying image's real pixel dimensions — required to convert
   *  between screen coordinates and the letterboxed content box. */
  naturalWidth: number;
  naturalHeight: number;
  /** Current rect in image pixel space, or null (nothing drawn yet). */
  rect: CropRect | null;
  onRectChange: (rect: CropRect | null) => void;
  class?: string;
}

type Point = { x: number; y: number };
type ContentBox = { offsetX: number; offsetY: number; width: number; height: number; scale: number };
type Corner = "nw" | "ne" | "sw" | "se";
type DragMode =
  | { kind: "draw" }
  | { kind: "move"; startRect: CropRect }
  | { kind: "resize"; corner: Corner; startRect: CropRect };

const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];
/** Below this (in image px), a "draw" drag reads as a stray click, not an
 *  intentional rect — discarded on release rather than left as a sliver. */
const MIN_DRAW_SIZE = 8;

export const CropRectOverlay: Component<CropRectOverlayProps> = (props) => {
  let rootRef: HTMLDivElement | undefined;
  const [dragMode, setDragMode] = createSignal<DragMode | null>(null);
  const [dragOrigin, setDragOrigin] = createSignal<Point | null>(null);

  const contentBox = (): ContentBox | null => {
    if (!rootRef) return null;
    const frame = rootRef.getBoundingClientRect();
    if (frame.width === 0 || frame.height === 0) return null;
    const scale = Math.min(frame.width / props.naturalWidth, frame.height / props.naturalHeight);
    const width = props.naturalWidth * scale;
    const height = props.naturalHeight * scale;
    return { offsetX: (frame.width - width) / 2, offsetY: (frame.height - height) / 2, width, height, scale };
  };

  const toImagePoint = (clientX: number, clientY: number, box: ContentBox): Point => {
    const frame = rootRef!.getBoundingClientRect();
    const px = clamp(clientX - frame.left - box.offsetX, 0, box.width);
    const py = clamp(clientY - frame.top - box.offsetY, 0, box.height);
    return { x: px / box.scale, y: py / box.scale };
  };

  const normalizeRect = (a: Point, b: Point): CropRect => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  });

  const onPointerMove = (e: PointerEvent) => {
    const mode = dragMode();
    const origin = dragOrigin();
    const box = contentBox();
    if (!mode || !origin || !box) return;
    const point = toImagePoint(e.clientX, e.clientY, box);

    if (mode.kind === "draw") {
      props.onRectChange(normalizeRect(origin, point));
      return;
    }
    if (mode.kind === "move") {
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const maxX = Math.max(0, props.naturalWidth - mode.startRect.width);
      const maxY = Math.max(0, props.naturalHeight - mode.startRect.height);
      props.onRectChange({
        ...mode.startRect,
        x: clamp(mode.startRect.x + dx, 0, maxX),
        y: clamp(mode.startRect.y + dy, 0, maxY),
      });
      return;
    }
    // resize: the dragged corner follows the pointer, the opposite corner
    // stays put — normalizeRect handles the sign flip if it's dragged past.
    const { startRect, corner } = mode;
    const fixed: Point = {
      x: corner.includes("e") ? startRect.x : startRect.x + startRect.width,
      y: corner.includes("s") ? startRect.y : startRect.y + startRect.height,
    };
    props.onRectChange(normalizeRect(fixed, point));
  };

  const endDrag = () => {
    const mode = dragMode();
    if (mode?.kind === "draw" && props.rect) {
      if (props.rect.width < MIN_DRAW_SIZE || props.rect.height < MIN_DRAW_SIZE) {
        props.onRectChange(null);
      }
    }
    setDragMode(null);
    setDragOrigin(null);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  };

  const startDrag = (mode: DragMode, e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const box = contentBox();
    if (!box) return;
    setDragMode(mode);
    setDragOrigin(toImagePoint(e.clientX, e.clientY, box));
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  };

  onCleanup(endDrag);

  // Anywhere the overlay isn't already showing the rect body or a handle —
  // draws a new rect, replacing whatever was there.
  const onBackgroundPointerDown = (e: PointerEvent) => startDrag({ kind: "draw" }, e);

  const screenRect = () => {
    const r = props.rect;
    const box = contentBox();
    if (!r || !box) return null;
    return {
      left: box.offsetX + r.x * box.scale,
      top: box.offsetY + r.y * box.scale,
      width: r.width * box.scale,
      height: r.height * box.scale,
    };
  };

  const rootClass = () => pipe(["sui-crop-overlay", props.class], filter(Boolean), join(" "));

  return (
    <div ref={rootRef} class={rootClass()} onPointerDown={onBackgroundPointerDown}>
      <Show when={screenRect()}>
        {(box) => (
          <div
            class="sui-crop-overlay__rect"
            style={{
              left: `${box().left}px`,
              top: `${box().top}px`,
              width: `${box().width}px`,
              height: `${box().height}px`,
            } as JSX.CSSProperties}
            onPointerDown={(e) => props.rect && startDrag({ kind: "move", startRect: props.rect }, e)}
          >
            <For each={CORNERS}>
              {(corner) => (
                <div
                  class={`sui-crop-overlay__handle sui-crop-overlay__handle--${corner}`}
                  onPointerDown={(e) => props.rect && startDrag({ kind: "resize", corner, startRect: props.rect }, e)}
                />
              )}
            </For>
          </div>
        )}
      </Show>
    </div>
  );
};
