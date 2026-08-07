// ============================================
// CropRectOverlay — Structural (Depth 1)
// Owns CSS (CropRectOverlay.css), no component imports.
//
// Draw-to-create, drag-to-move, corner-handles-to-resize freeform rectangle
// selection over an image — MULTIPLE simultaneous rects (multi-crop: each
// becomes its own output sub-image). Meant to be passed into FramedImage's
// `overlay` slot, which sizes it to fill the frame.
//
// One rect is SELECTED at a time (numbered badge highlights, only it shows
// resize handles): click a rect's body to select + start moving it; drag
// empty space to draw a NEW rect (added, not replacing); Delete/Backspace
// (wired by the caller, not here — see bestie's useCropEditing) removes
// whichever is selected.
//
// Coordinate contract: rects (and everything in onRectsChange) live in the
// IMAGE's OWN pixel space (0..naturalWidth, 0..naturalHeight) — never the
// frame's screen pixels. `object-fit: contain` letterboxes a non-matching
// aspect ratio, so the component reconstructs that letterboxed content box
// itself (from `naturalWidth`/`naturalHeight` vs its own measured bounding
// box) and clamps every drag into it. A caller that instead normalized
// against the frame's own box would silently map drawn rects onto the
// letterbox bars — this is the fix, not a convenience.
// ============================================
import { type Component, type JSX, For, Show, createSignal, onCleanup } from "solid-js";
import { clamp } from "../../internal/math/clamp";
import { pipe, filter, join, map } from "../../fn";
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
  /** All current rects, in image pixel space. */
  rects: CropRect[];
  onRectsChange: (rects: CropRect[]) => void;
  /** Which rect is active for move/resize (shows handles). null = none. */
  selectedIndex: number | null;
  onSelectedIndexChange: (index: number | null) => void;
  class?: string;
}

type Point = { x: number; y: number };
type ContentBox = { offsetX: number; offsetY: number; width: number; height: number; scale: number };
type Corner = "nw" | "ne" | "sw" | "se";
type DragMode =
  | { kind: "draw" }
  | { kind: "move"; index: number; startRect: CropRect }
  | { kind: "resize"; index: number; corner: Corner; startRect: CropRect };

const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];
/** Below this (in image px), a "draw" drag reads as a stray click, not an
 *  intentional rect — discarded on release rather than left as a sliver. */
const MIN_DRAW_SIZE = 8;

export const CropRectOverlay: Component<CropRectOverlayProps> = (props) => {
  let rootRef: HTMLDivElement | undefined;
  const [dragMode, setDragMode] = createSignal<DragMode | null>(null);
  const [dragOrigin, setDragOrigin] = createSignal<Point | null>(null);
  // The rect being drawn, live, before it's committed to props.rects on
  // release — kept separate so drawing doesn't churn array indices for the
  // OTHER already-placed rects mid-drag.
  const [drawingRect, setDrawingRect] = createSignal<CropRect | null>(null);

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

  const updateRectAt = (index: number, rect: CropRect) => {
    props.onRectsChange(map((r, i) => (i === index ? rect : r), props.rects));
  };

  const onPointerMove = (e: PointerEvent) => {
    const mode = dragMode();
    const origin = dragOrigin();
    const box = contentBox();
    if (!mode || !origin || !box) return;
    const point = toImagePoint(e.clientX, e.clientY, box);

    if (mode.kind === "draw") {
      setDrawingRect(normalizeRect(origin, point));
      return;
    }
    if (mode.kind === "move") {
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const maxX = Math.max(0, props.naturalWidth - mode.startRect.width);
      const maxY = Math.max(0, props.naturalHeight - mode.startRect.height);
      updateRectAt(mode.index, {
        ...mode.startRect,
        x: clamp(mode.startRect.x + dx, 0, maxX),
        y: clamp(mode.startRect.y + dy, 0, maxY),
      });
      return;
    }
    // resize: the dragged corner follows the pointer, the opposite corner
    // stays put — normalizeRect handles the sign flip if it's dragged past.
    const { startRect, corner, index } = mode;
    const fixed: Point = {
      x: corner.includes("e") ? startRect.x : startRect.x + startRect.width,
      y: corner.includes("s") ? startRect.y : startRect.y + startRect.height,
    };
    updateRectAt(index, normalizeRect(fixed, point));
  };

  const endDrag = () => {
    const mode = dragMode();
    if (mode?.kind === "draw") {
      const rect = drawingRect();
      if (rect && rect.width >= MIN_DRAW_SIZE && rect.height >= MIN_DRAW_SIZE) {
        const newIndex = props.rects.length; // BEFORE appending — the new rect's index
        props.onRectsChange([...props.rects, rect]);
        props.onSelectedIndexChange(newIndex);
      }
      setDrawingRect(null);
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

  // Anywhere the overlay isn't already showing a rect's body or a handle —
  // draws a NEW rect, added alongside whatever's already there.
  const onBackgroundPointerDown = (e: PointerEvent) => startDrag({ kind: "draw" }, e);

  const toScreen = (r: CropRect, box: ContentBox) => ({
    left: box.offsetX + r.x * box.scale,
    top: box.offsetY + r.y * box.scale,
    width: r.width * box.scale,
    height: r.height * box.scale,
  });

  const rootClass = () => pipe(["sui-crop-overlay", props.class], filter(Boolean), join(" "));

  return (
    <div ref={rootRef} class={rootClass()} onPointerDown={onBackgroundPointerDown}>
      <For each={props.rects}>
        {(rect, index) => {
          const box = () => contentBox();
          const selected = () => props.selectedIndex === index();
          return (
            <Show when={box()}>
              {(b) => (
                <div
                  class={`sui-crop-overlay__rect${selected() ? " sui-crop-overlay__rect--selected" : ""}`}
                  style={
                    {
                      left: `${toScreen(rect, b()).left}px`,
                      top: `${toScreen(rect, b()).top}px`,
                      width: `${toScreen(rect, b()).width}px`,
                      height: `${toScreen(rect, b()).height}px`,
                    } as JSX.CSSProperties
                  }
                  onPointerDown={(e) => {
                    props.onSelectedIndexChange(index());
                    startDrag({ kind: "move", index: index(), startRect: rect }, e);
                  }}
                >
                  <span class="sui-crop-overlay__badge">{index() + 1}</span>
                  <Show when={selected()}>
                    <For each={CORNERS}>
                      {(corner) => (
                        <div
                          class={`sui-crop-overlay__handle sui-crop-overlay__handle--${corner}`}
                          onPointerDown={(e) => startDrag({ kind: "resize", index: index(), corner, startRect: rect }, e)}
                        />
                      )}
                    </For>
                  </Show>
                </div>
              )}
            </Show>
          );
        }}
      </For>
      <Show when={drawingRect()}>
        {/* `rect()` calls stay INLINE in the style expression, not hoisted
            into a `const` in this callback's body. Show's children-as-
            function runs ONCE per falsy<->truthy transition, not on every
            value change — a `const screen = toScreen(rect(), ...)` computed
            here would freeze at the drag's first pointermove and never
            update again (confirmed live: the box didn't appear to move at
            all until release, when the committed <For> item took over).
            Reading rect() directly inside the JSX attribute expression is
            what lets Solid's compiler re-run just that binding on each
            drawingRect() change. */}
        {(rect) => (
          <div
            class="sui-crop-overlay__rect sui-crop-overlay__rect--drawing"
            style={
              {
                left: `${toScreen(rect(), contentBox()!).left}px`,
                top: `${toScreen(rect(), contentBox()!).top}px`,
                width: `${toScreen(rect(), contentBox()!).width}px`,
                height: `${toScreen(rect(), contentBox()!).height}px`,
              } as JSX.CSSProperties
            }
          />
        )}
      </Show>
    </div>
  );
};
