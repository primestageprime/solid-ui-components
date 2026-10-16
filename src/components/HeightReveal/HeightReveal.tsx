// ============================================
// HeightReveal — Atomic (Depth 1)
// Owns CSS (HeightReveal.css), no component imports.
// Slides its children open and shut VERTICALLY: its box grows from zero to
// the children's height (a 0fr ↔ 1fr grid row, nothing measured in JS) while
// they fade, in 180ms; instant under `prefers-reduced-motion`. In a parent of
// definite height it takes the free space instead. ChartFrame's collapsible
// body is the first user (owner, 2026-10-14).
//
// Unlike SlideReveal, the children UNMOUNT when the box is shut: a hidden
// chart costs layout and paint for nothing. The unmount waits for the close
// to finish (HEIGHT_REVEAL_MS), so the children shrink out of view instead of
// vanishing first. Under reduced motion they unmount at once. While the box
// closes, it is `inert` and `aria-hidden`.
//
// While the box moves, the children keep the height they had open (owner,
// 2026-10-15): the box clips them like a curtain. Without the hold, a child
// that fills its box (a chart) redraws shorter on every frame and squashes.
// A ResizeObserver records that height while the box is open and at rest;
// the close holds it and the next open reuses it. A first open has no height
// to reuse, so it does not hold. The record is taken BEFORE the close, not
// at it: a parent that shrinks in the same update (a fill ChartFrame drops
// to its header's height) leaves a filling child no height to measure.
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import "./HeightReveal.css";

/** The open and close time; HeightReveal.css holds the same value. */
export const HEIGHT_REVEAL_MS = 180;

export interface HeightRevealProps {
  /** Open to full height when true; shut to nothing when false. */
  when: boolean;
  children: JSX.Element;
}

export const HeightReveal: Component<HeightRevealProps> = (props) => {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [mounted, setMounted] = createSignal(props.when);
  const [held, setHeld] = createSignal<number | null>(null);
  let content: HTMLDivElement | undefined;
  let openHeight = 0;
  const recordOpenHeight = () => {
    if (props.when && held() === null && content && content.offsetHeight > 0) {
      openHeight = content.offsetHeight;
    }
  };
  onMount(() => {
    recordOpenHeight();
    if (typeof ResizeObserver === "undefined" || !content) return;
    const observer = new ResizeObserver(recordOpenHeight);
    observer.observe(content);
    onCleanup(() => observer.disconnect());
  });
  createEffect(
    on(
      () => props.when,
      (open) => {
        if (reducedMotion()) {
          setHeld(null);
          setMounted(open);
          return;
        }
        if (open) {
          setMounted(true);
          if (openHeight > 0) setHeld(openHeight);
          const timer = setTimeout(() => setHeld(null), HEIGHT_REVEAL_MS);
          onCleanup(() => clearTimeout(timer));
          return;
        }
        // A close that interrupts an open keeps the held height. Otherwise
        // the recorded open height wins over a read now, which may already
        // see the closed layout.
        const measured = held() ?? (openHeight || content?.offsetHeight || 0);
        if (measured > 0) {
          openHeight = measured;
          setHeld(measured);
        }
        const timer = setTimeout(() => setMounted(false), HEIGHT_REVEAL_MS);
        onCleanup(() => clearTimeout(timer));
      },
      { defer: true },
    ),
  );
  return (
    <div
      class={
        props.when
          ? "sui-height-reveal sui-height-reveal--open"
          : "sui-height-reveal"
      }
      // Solid sets `inert` as the DOM PROPERTY, so `false` genuinely un-inerts.
      inert={!props.when}
      aria-hidden={props.when ? undefined : "true"}
    >
      <div class="sui-height-reveal__inner">
        <div
          class="sui-height-reveal__content"
          ref={content}
          style={held() === null ? undefined : { height: `${held()}px`, flex: "none" }}
        >
          <Show when={mounted()}>{props.children}</Show>
        </div>
      </div>
    </div>
  );
};
