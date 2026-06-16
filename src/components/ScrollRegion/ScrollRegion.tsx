import {
  Component,
  JSX,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
  splitProps,
} from "solid-js";
import "./ScrollRegion.css";

/**
 * ScrollRegion — Atomic Primitive (Depth 1). Owns `ScrollRegion.css`.
 *
 * A self-contained, DYNAMIC scroll affordance. Renders a `position: relative`
 * frame wrapping a scroll container (`overflow-y: auto`) that holds
 * `props.children`. The frame paints a TOP fade overlay when content is hidden
 * ABOVE the viewport and a BOTTOM fade overlay when content is hidden BELOW it.
 * When the content fits (no overflow), NEITHER fade shows — so a fade always
 * means "there is more in that direction you can't see," never "this is the
 * edge."
 *
 * Scroll state is recomputed on three triggers: the container's `onScroll`, a
 * `ResizeObserver` (viewport + content box sizes can change as data loads or the
 * caller toggles rows in), a `MutationObserver` (children added/removed change
 * `scrollHeight` without firing scroll/resize), and once on mount. Observers are
 * torn down in `onCleanup`. This dynamic recompute is the whole point of the
 * component — it is NOT a static CSS-only `::before`/`::after` fade.
 *
 * The component is HEIGHT-AGNOSTIC: it fills its flex parent rather than baking
 * in a fixed height, so a `height: 100%` / flex child resolves against the
 * viewport while still allowing real overflow.
 */
export interface ScrollRegionProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "style"> {
  /** Scrollable content. */
  children?: JSX.Element;
  /** Extra class on the inner scroll container (e.g. flex sizing at the call site). */
  class?: string;
  /** Style on the inner scroll container (e.g. `height: 100%`). */
  style?: JSX.CSSProperties;
  /** Style on the outer relative frame (e.g. flex sizing). */
  frameStyle?: JSX.CSSProperties;
  /** Rounding tolerance for the at-top / at-bottom / overflow checks (px). Default 1. */
  threshold?: number;
}

export const ScrollRegion: Component<ScrollRegionProps> = (props) => {
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "style",
    "frameStyle",
    "threshold",
  ]);

  const [topVisible, setTopVisible] = createSignal(false);
  const [bottomVisible, setBottomVisible] = createSignal(false);

  let scroller: HTMLDivElement | undefined;
  let content: HTMLDivElement | undefined;

  const recompute = () => {
    const el = scroller;
    if (!el) return;
    const threshold = local.threshold ?? 1;
    const { scrollTop, clientHeight, scrollHeight } = el;
    const overflowing = scrollHeight > clientHeight + threshold;
    const atTop = scrollTop <= threshold;
    const atBottom = scrollTop + clientHeight >= scrollHeight - threshold;
    setTopVisible(overflowing && !atTop);
    setBottomVisible(overflowing && !atBottom);
  };

  onMount(() => {
    if (!scroller) return;
    const observer = new ResizeObserver(recompute);
    // Observe the viewport (its clientHeight can change) AND the content wrapper
    // (its height tracks total scrollHeight — rows added/removed, data loaded —
    // which neither onScroll nor a viewport resize would otherwise catch).
    observer.observe(scroller);
    if (content) observer.observe(content);
    // A child add/remove can change scrollHeight without firing scroll or — in
    // some flex configs — resize; the mutation observer guarantees a recompute
    // so a fade is never left stuck on when the content no longer overflows.
    const mutations = content ? new MutationObserver(recompute) : null;
    mutations?.observe(content!, { childList: true, subtree: true });
    recompute();
    onCleanup(() => {
      observer.disconnect();
      mutations?.disconnect();
    });
  });

  const viewportClass = () =>
    local.class
      ? `sui-scroll-region__viewport ${local.class}`
      : "sui-scroll-region__viewport";

  return (
    <div class="sui-scroll-region" style={local.frameStyle} {...others}>
      <div
        ref={scroller}
        class={viewportClass()}
        style={local.style}
        onScroll={recompute}
      >
        <div ref={content} class="sui-scroll-region__content">
          {local.children}
        </div>
      </div>
      <div
        class="sui-scroll-region__fade sui-scroll-region__fade--top"
        classList={{ "is-visible": topVisible() }}
      />
      <div
        class="sui-scroll-region__fade sui-scroll-region__fade--bottom"
        classList={{ "is-visible": bottomVisible() }}
      />
    </div>
  );
};

/** Props frozen as static convenience presets at variant-definition time. */
export type ScrollRegionOverrides = Pick<
  ScrollRegionProps,
  "threshold" | "frameStyle" | "style"
>;

/**
 * Factory: freeze defaults (e.g. a `threshold` or a preset `frameStyle`) to
 * produce a curried ScrollRegion. Mirrors `createChartCanvas`. The base is
 * height-agnostic; any preset you bake in is an optional convenience, not a
 * behaviour change — keep frame/viewport styles flex-friendly.
 */
export function createScrollRegion(
  defaults: ScrollRegionOverrides,
): Component<ScrollRegionProps> {
  return (props) => <ScrollRegion {...mergeProps(defaults, props)} />;
}

export default ScrollRegion;
