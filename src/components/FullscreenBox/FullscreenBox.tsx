// lastReviewedAt: 2026-09-23
// lastReviewedBy: claude
// ============================================
// FullscreenBox — Atomic (Depth 1)
// Owns FullscreenBox.css; composes Icon + IconOnlyButton for the default
// corner control.
//
// A box that takes the whole viewport and gives it back WITHOUT REMOUNTING
// its children. The SAME element toggles between in-flow and
// `position: fixed; inset: 0` — one class, no portal. That is the whole
// point: `Modal`'s fullscreen mode portals its content to `document.body`,
// which unmounts and remounts it, and a chart that remounts loses its held
// axis marks, its fit mode, its scroll and its tweens. Here nothing leaves
// the tree, so a child with `chartHeight="fill"` simply measures a bigger
// box.
//
//   in flow                       fullscreen
//   ┌──────────────── [⤢] ┐       ┌──────────────────────────── [⤡] ┐
//   │ children            │  ⇄    │ children, height:100% resolves  │
//   └─────────────────────┘       │ against the viewport            │
//                                 └─────────────────────────────────┘
//
// Escape closes it (a document listener that exists only while it is open,
// and that ignores an Escape something inside already handled — the chart's
// inline range editor, a combobox). The top-right CORNER holds the toggle:
// a default fullscreen / fullscreen-exit button, or the caller's own through `renderCorner`.
//
// Controlled or owned, the split every SUI toggle takes: pass `fullscreen`
// and the caller owns the state; omit it and the box does, starting in flow.
// `onFullscreenChange` reports every change either way.
//
// CAVEAT: `position: fixed` is relative to the VIEWPORT only while no
// ancestor sets `transform`, `filter`, `perspective` or `contain: paint`; an
// ancestor with one of those becomes the containing block and the box fills
// that ancestor instead. Keep the box out from under such an ancestor.
//
// Layering: z-index 900 — above page content, BELOW `Modal` (1000) and the
// portaled popovers (`Tooltip`, `Combobox`: 1100), so a tooltip or a dialog
// opened from inside a fullscreen chart still paints on top.
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createEffect,
  createSignal,
  mergeProps,
  onCleanup,
  splitProps,
} from "solid-js";
import { IconOnlyButton } from "../Button";
import { Icon } from "../Icon";
import "./FullscreenBox.css";

/** What the corner slot is handed. */
export interface FullscreenBoxCornerContext {
  /** Whether the box is fullscreen now. */
  fullscreen: boolean;
  /** Flip the box. */
  toggle: () => void;
}

export interface FullscreenBoxProps
  extends Omit<
    JSX.HTMLAttributes<HTMLDivElement>,
    "children" | "onFullscreenChange"
  > {
  children?: JSX.Element;
  /** Controlled state. Omit it and the box owns the state, starting in flow. */
  fullscreen?: boolean;
  /** Fires on every change — the corner button, Escape, or a slot's toggle. */
  onFullscreenChange?: (next: boolean) => void;
  /**
   * The top-right corner's content. Omit it for the default fullscreen / fullscreen-exit
   * button; return `null` for no corner control at all (a caller that
   * toggles from elsewhere).
   */
  renderCorner?: (ctx: FullscreenBoxCornerContext) => JSX.Element;
  /** Whether Escape closes the box. Default `true`. A presentational
   *  override: lock it with `createFullscreenBox`. */
  escapeCloses?: boolean;
  /** In flow, FILL a parent of definite height (and a flex column's free
   *  space) instead of sizing to content, and hand that height to the first
   *  child — the link a `height: 100%` child needs (FillChartFrame, G11: a
   *  content-sized box resolved its 100% to ~30px and the chart body to 0).
   *  Default false: unchanged. */
  fill?: boolean;
}

const DefaultCorner = (ctx: FullscreenBoxCornerContext): JSX.Element => (
  <IconOnlyButton
    aria-label={ctx.fullscreen ? "Exit full screen" : "Full screen"}
    onClick={ctx.toggle}
  >
    <Icon name={ctx.fullscreen ? "fullscreen-exit" : "fullscreen"} size="sm" />
  </IconOnlyButton>
);

const FullscreenBoxBase: Component<FullscreenBoxProps> = (rawProps) => {
  const props = mergeProps({ escapeCloses: true }, rawProps);
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "fullscreen",
    "onFullscreenChange",
    "renderCorner",
    "escapeCloses",
    "fill",
  ]);
  const [owned, setOwned] = createSignal(false);
  const on = () => local.fullscreen ?? owned();
  const set = (next: boolean) => {
    if (local.fullscreen === undefined) setOwned(next);
    local.onFullscreenChange?.(next);
  };
  const toggle = () => set(!on());

  // Escape — listened for only while fullscreen. An Escape that something
  // inside already handled (`defaultPrevented`) belongs to that thing.
  createEffect(() => {
    if (!on() || !local.escapeCloses) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) set(false);
    };
    document.addEventListener("keydown", onKey);
    onCleanup(() => document.removeEventListener("keydown", onKey));
  });

  const corner = () =>
    (local.renderCorner ?? DefaultCorner)({ fullscreen: on(), toggle });

  return (
    <div
      class={`sui-fullscreen-box${local.fill ? " sui-fullscreen-box--fill" : ""}${
        on() ? " sui-fullscreen-box--on" : ""
      }${local.class ? ` ${local.class}` : ""}`}
      data-fullscreen={on() ? "true" : "false"}
      {...others}
    >
      {local.children}
      <Show when={corner()}>
        {(c) => <div class="sui-fullscreen-box__corner">{c()}</div>}
      </Show>
    </div>
  );
};

/** Props that are presentational overrides — locked at variant-definition time. */
export type FullscreenBoxOverrides = Pick<
  FullscreenBoxProps,
  "escapeCloses" | "fill"
>;

/** Props that remain available to consumers of a curried FullscreenBox variant. */
export type FullscreenBoxDataProps = Omit<
  FullscreenBoxProps,
  keyof FullscreenBoxOverrides
>;

export function createFullscreenBox(
  defaults: Partial<FullscreenBoxOverrides>,
): Component<FullscreenBoxDataProps> {
  return (props) => <FullscreenBoxBase {...mergeProps(defaults, props)} />;
}

/** FullscreenBox — the default variant: Escape closes, default corner button. */
export const FullscreenBox: Component<FullscreenBoxDataProps> =
  createFullscreenBox({});

/** FillFullscreenBox — in flow, fills a parent of definite height and hands
 *  it to its first child. FillChartFrame's box. */
export const FillFullscreenBox: Component<FullscreenBoxDataProps> =
  createFullscreenBox({ fill: true });
