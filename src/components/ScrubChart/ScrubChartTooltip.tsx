// lastReviewedAt: 2026-09-11
// lastReviewedBy: adlai.arnold
// ScrubChartTooltip — Structural (Depth 1). HTML overlay chart mark;
// composes no library components.
// ============================================
// The `ScrubChart` ADAPTER for the hover-tooltip mark, per
// docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md.
//
// `placeTooltipX` (`../Chart/tooltipPlacement.ts`) is the CORE: it takes
// explicit pixel geometry (a MEASURED width, not a guess) and returns the
// tooltip's `left` — data, never JSX. This adapter measures its own
// rendered width (a ref + `observeSize`, the same technique
// `../Chart/Tooltip.tsx` uses) and calls the core with `ctx`'s
// FRAME-ABSOLUTE pixels. `Chart`'s `ChartTooltip` is the other adapter; it
// supplies PLOT-LOCAL pixels from `useChart()` instead.
//
// `ScrubChart` has no Solid context (mounting one is rejected by the ADR);
// a caller reaches this component by passing its own
// `ctx: ScrubChartContext<C>`, the same convention `ScrubChartReferenceLine`
// and `ScrubChartCrosshair` use.
//
// Unlike `ChartTooltip`, this component needs no `<Portal>`: a `ScrubChart`
// render callback returns plain HTML (its `renderHoverOverlay` slot is
// already an absolutely-positioned HTML `<div>`, not an `<svg>`), so this
// component can sit directly inside it.
//
// This component sets NO position/layout CSS of its own beyond `left` and
// `top` — same convention `ChartTooltip` follows. A caller's `class` is
// what makes it `position: absolute` (and everything else it looks like);
// `CashflowScrubChart`'s hover card already carries that class.
// ============================================
import { type JSX, createSignal, onCleanup, onMount } from "solid-js";
import type { Cell } from "../DateAxis";
import { observeSize } from "../../internal/dom/observeSize";
import { placeTooltipX } from "../Chart/tooltipPlacement";
import type { ScrubChartContext } from "./types";

/** Props for `ScrubChartTooltip` — the `ScrubChart` adapter for the
 *  `placeTooltipX` core. */
export interface ScrubChartTooltipProps<C extends Cell> {
  /** The current frame's geometry, passed by the caller — there is no
   *  Solid context for `ScrubChart` (see the ADR). Only `ctx.width` is
   *  read, to keep the card inside the frame. */
  ctx: ScrubChartContext<C>;
  /** Anchor's pixel x, frame-absolute — typically `ctx.cellToX(index)`. */
  anchorX: number;
  /** Anchor's pixel y, frame-absolute — typically `ctx.plotTop`, or a
   *  hovered point's own y. */
  anchorY: number;
  /** Pixel offset from the anchor when placed to its right; mirrored to the
   *  left when the card flips. Default `{ x: 12, y: 0 }`. */
  offset?: { x: number; y: number };
  /** Class on the card's `<div>` — carries its look (background, border,
   *  shadow, `position: absolute`) entirely; this component adds none. */
  class?: string;
  /** The tooltip's content — already-resolved rows, not a render prop:
   *  `ScrubChart`'s hover state is index-addressed, so a caller already has
   *  the hovered cell in hand before it renders this component. */
  children: JSX.Element;
}

/**
 * Draws a hover tooltip card inside a `ScrubChart` render callback, flipped
 * off a MEASURED width so it never clips at the frame's edge — unlike a
 * midpoint guess, which can still clip a wide card hovered near center.
 *
 * Measures its own rendered width via `ResizeObserver` (border-box, so a
 * padding change re-measures too) and re-places on every change.
 */
export function ScrubChartTooltip<C extends Cell>(
  props: ScrubChartTooltipProps<C>,
) {
  const [tipWidth, setTipWidth] = createSignal(0);
  let el: HTMLDivElement | undefined;

  onMount(() => {
    const measure = () => setTipWidth(el?.offsetWidth ?? 0);
    measure();
    // Content can change without the anchor changing (a caller's own hover
    // signals), so a one-shot measurement goes stale. Border-box, because
    // `offsetWidth` is one — a content-box observer never fires on a
    // padding change.
    if (el) onCleanup(observeSize(el, measure, { box: "border-box" }));
  });

  const offset = () => props.offset ?? { x: 12, y: 0 };

  const left = () =>
    placeTooltipX({
      anchorX: props.anchorX,
      tipWidth: tipWidth(),
      offsetX: offset().x,
      boundsLeft: 0,
      boundsRight: props.ctx.width,
    });

  return (
    <div
      ref={el}
      class={props.class}
      style={{
        left: `${left()}px`,
        top: `${props.anchorY + offset().y}px`,
      }}
    >
      {props.children}
    </div>
  );
}
