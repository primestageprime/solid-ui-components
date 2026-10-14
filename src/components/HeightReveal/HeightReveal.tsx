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
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup,
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
  createEffect(
    on(
      () => props.when,
      (open) => {
        if (open) {
          setMounted(true);
          return;
        }
        if (reducedMotion()) {
          setMounted(false);
          return;
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
        <Show when={mounted()}>{props.children}</Show>
      </div>
    </div>
  );
};
