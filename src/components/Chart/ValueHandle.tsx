// ValueHandle — Structural (Depth 1). SVG chart slot; composes no library components.
//
// A GRIP on the top edge of a column — one per datum — that the reader drags
// up or down to SET that datum's value, plus a double-click on the column to
// type one in. The value stays the caller's: the handle reports where the
// pointer is in DATA units (`onDrag` on every move, `onDragEnd` on release)
// and draws wherever `value` says, so snapping (to whole jobs, to a step) and
// any floor are the caller's rule, applied before the value comes back.
//
// WHY ITS OWN POINTER CAPTURE. `Chart` owns one pointer listener on its
// <svg>, and it maps X only (hover, `onPick`, the x-range drag). A y drag is
// not something that pipeline carries, so the grip captures its own pointer
// and stops the event there — the chart's x-range drag never starts under
// a grip. The pointer's y is mapped through the svg's on-screen box, so a
// `responsive` chart (viewBox scaled to its container) reads the same data
// value as a fixed-size one.
//
// The double-click target is a transparent column from the baseline to the
// value: a column with nothing drawn in it yet (an empty outline) can still
// be opened. It paints `transparent`, which SVG hit-tests; "none" would not.
//
// `<Index>`, not `<For>`: a caller recomputes its data on every drag move,
// and `<For>` keys by identity, so it would remount the grip mid-drag and
// drop the pointer capture.
//
// Keyboard: the grip is a `slider`; ArrowUp/ArrowDown report `value ± step`
// through `onDragEnd`, the same exit a drag takes.
import { Index, type JSX } from "solid-js";
import { useChart } from "./context";

/** Grip thickness in px — thick enough to grab, thin enough to read as an edge. */
const GRIP_PX = 6;

export interface ValueHandleMeta {
  readonly clientX: number;
  readonly clientY: number;
}

export interface ValueHandleProps<T> {
  data: readonly T[];
  /** Column centre on the x scale, in data units. */
  x: (d: T, i: number) => number;
  /** Column width in data units (the bar it sits on, usually). */
  width: number;
  /** The current value: where the grip draws. */
  value: (d: T, i: number) => number;
  /** Grip colour — any SVG paint. */
  color: (d: T, i: number) => string;
  /** Accessible name for one grip, e.g. "Exterior, March: hoped jobs". */
  label: (d: T, i: number) => string;
  /** Keyboard step in data units. */
  step: (d: T, i: number) => number;
  /** The drag began; `value` is the value it began from. */
  onDragStart?: (d: T, i: number) => void;
  /** Every move while dragging: the pointer's y in data units, unclamped. */
  onDrag?: (d: T, i: number, y: number) => void;
  /** The drag (or an arrow key) ended at `y`, in data units. */
  onDragEnd?: (d: T, i: number, y: number) => void;
  /** A double-click on the column or its grip. */
  onDoubleClick?: (d: T, i: number, meta: ValueHandleMeta) => void;
}

export function ValueHandle<T>(props: ValueHandleProps<T>): JSX.Element {
  const ctx = useChart();

  /** Client y → data y, through the svg's on-screen box (viewBox-safe). */
  const dataY = (el: Element, clientY: number): number => {
    const svg = el instanceof SVGSVGElement ? el : (el as SVGElement).ownerSVGElement;
    const box = svg?.getBoundingClientRect();
    const scale = box && box.height > 0 ? ctx.height() / box.height : 1;
    const py = (clientY - (box?.top ?? 0)) * scale - ctx.margin().top;
    return ctx.yScale().invert(py);
  };

  const geometry = (d: T, i: number) => {
    const xs = ctx.xScale();
    const ys = ctx.yScale();
    const left = xs(props.x(d, i) - props.width / 2);
    const right = xs(props.x(d, i) + props.width / 2);
    const top = ys(props.value(d, i));
    const base = ys(Math.max(ys.domain[0], 0));
    return { left, w: Math.max(1, right - left), top, base };
  };

  return (
    <g class="sui-chart__value-handles">
      <Index each={props.data}>
        {(item, i) => {
          let dragging = false;
          const d = () => item();
          const g = () => geometry(d(), i);
          const down = (e: PointerEvent) => {
            e.stopPropagation();
            e.preventDefault();
            dragging = true;
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
            props.onDragStart?.(d(), i);
          };
          const move = (e: PointerEvent) => {
            if (!dragging) return;
            props.onDrag?.(d(), i, dataY(e.currentTarget as Element, e.clientY));
          };
          const up = (e: PointerEvent) => {
            if (!dragging) return;
            dragging = false;
            const el = e.currentTarget as Element;
            if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
            props.onDragEnd?.(d(), i, dataY(el, e.clientY));
          };
          const key = (e: KeyboardEvent) => {
            const dir = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
            if (dir === 0) return;
            e.preventDefault();
            props.onDragEnd?.(d(), i, props.value(d(), i) + dir * props.step(d(), i));
          };
          const dbl = (e: MouseEvent) => {
            e.stopPropagation();
            props.onDoubleClick?.(d(), i, { clientX: e.clientX, clientY: e.clientY });
          };
          return (
            <g class="sui-chart__value-handle">
              {/* biome-ignore lint/a11y/noStaticElementInteractions: the column is a pointer-only double-click target; the grip below is the keyboard-operable slider */}
              <rect
                class="sui-chart__value-handle-column"
                x={g().left}
                y={Math.min(g().top, g().base)}
                width={g().w}
                height={Math.abs(g().base - g().top)}
                fill="transparent"
                onDblClick={dbl}
              />
              <rect
                class="sui-chart__value-handle-grip"
                role="slider"
                tabIndex={0}
                aria-label={props.label(d(), i)}
                aria-valuenow={props.value(d(), i)}
                aria-orientation="vertical"
                x={g().left}
                y={g().top - GRIP_PX / 2}
                width={g().w}
                height={GRIP_PX}
                rx={2}
                fill={props.color(d(), i)}
                cursor="ns-resize"
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onKeyDown={key}
                onDblClick={dbl}
              />
            </g>
          );
        }}
      </Index>
    </g>
  );
}
