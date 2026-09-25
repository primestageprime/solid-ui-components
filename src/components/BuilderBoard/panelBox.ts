// ============================================
// Panel D's box — shared by BuilderBoard and BuilderBoardBelowChart.
//
// An instrument that picks between two layouts at one breakpoint (RateGauge's
// leaders vs corners, `calloutModeFor`) needs the box it will be drawn in —
// and inside a curried board the app can't reach D's card to measure it. So
// `panelD` may also be a render function taking an ACCESSOR of D's content
// box (the card, less its padding). An accessor, not a value, so a resize
// re-runs only what reads it and never remounts the instrument. Until the
// card is measured (first paint, jsdom) the box is the board's STATED size
// for D. A plain element renders exactly as before and nothing is measured.
// ============================================
import {
  type Accessor,
  type JSX,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";

/** A panel's content box in px. */
export interface PanelBox {
  readonly width: number;
  readonly height: number;
}

/** What `panelD` takes: an element, or a render function given D's box. */
export type PanelDSlot = JSX.Element | ((box: Accessor<PanelBox>) => JSX.Element);

/**
 * The box panel D's render function sees: the measured content box once the
 * card has one, else the board's stated size for D. A zero measurement is
 * "not laid out yet", never the answer.
 */
export const panelBoxOf = (
  measured: PanelBox | undefined,
  stated: PanelBox,
): PanelBox =>
  measured !== undefined && measured.width > 0 && measured.height > 0
    ? { width: measured.width, height: measured.height }
    : { width: stated.width, height: stated.height };

/** An element's content box: client size less its padding. */
const contentBoxOf = (el: HTMLElement): PanelBox => {
  const cs = getComputedStyle(el);
  const px = (v: string): number => Number.parseFloat(v) || 0;
  return {
    width: el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight),
    height: el.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom),
  };
};

/**
 * D's slot, wired: `ref` goes on D's card, `content()` is what the card
 * holds. `slot` and `stated` are read reactively.
 */
export function createPanelDBox(
  slot: () => PanelDSlot,
  stated: () => PanelBox,
): { ref: (el: HTMLElement) => void; content: () => JSX.Element } {
  const [measured, setMeasured] = createSignal<PanelBox | undefined>();
  const box = (): PanelBox => panelBoxOf(measured(), stated());
  // observeSize is the TRIGGER only: it reports the border box where the
  // browser has one, and D wants the content box, so re-measure on each fire.
  const ref = (el: HTMLElement): void => {
    if (typeof slot() !== "function") return;
    const measure = (): void => {
      setMeasured(contentBoxOf(el));
    };
    onMount(() => {
      measure();
      onCleanup(observeSize(el, measure));
    });
  };
  const content = (): JSX.Element => {
    const d = slot();
    return typeof d === "function"
      ? (d as (b: Accessor<PanelBox>) => JSX.Element)(box)
      : d;
  };
  return { ref, content };
}
