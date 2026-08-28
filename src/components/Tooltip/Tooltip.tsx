// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Tooltip — Atomic (Depth 1)
// Owns CSS (Tooltip.css), no component imports.
// Kobalte-backed hover/focus tooltip with arrow + fade animation.
// ============================================
import {
  Tooltip as KobalteTooltip,
  type TooltipRootProps,
} from "@kobalte/core/tooltip";
import {
  type Accessor,
  type Component,
  type JSX,
  type ValidComponent,
  mergeProps,
  splitProps,
} from "solid-js";
import "./Tooltip.css";
import { pipe, filter, join } from "../../fn";

/** Content accepted by `Tooltip.content` — a primitive, JSX, or an accessor of either. */
export type TooltipContent = string | JSX.Element;

export interface TooltipProps extends Omit<TooltipRootProps, "children"> {
  /** Rendered inside the floating tooltip body. May be a value or an accessor. */
  content: TooltipContent | Accessor<TooltipContent>;
  /** Element(s) that hover/focus activates the tooltip. */
  children: JSX.Element;
  /** Additional class applied to the trigger element. */
  class?: string;
  /**
   * What the trigger renders as. Default: a `<button>`.
   *
   * Pass `"span"` when the children are ALREADY interactive — a link, a
   * button. A button nested in a button, or a link nested in a button, is
   * invalid HTML, and the inner control stops answering clicks and stops
   * being one tab stop. A span trigger still opens on hover.
   *
   * A span trigger is NOT focusable, so the tooltip is unreachable by
   * keyboard through the trigger itself. Give such content its own
   * `aria-label` — the inner control is the thing a keyboard reaches, and it
   * has to carry the sentence.
   *
   * A dense table is the other reason to reach for `"span"`: a button trigger
   * per row turns a hundred readouts into a hundred tab stops.
   */
  triggerAs?: ValidComponent;
}

const DEFAULT_OPEN_DELAY = 100;
const DEFAULT_CLOSE_DELAY = 100;

const resolveContent = (
  content: TooltipContent | Accessor<TooltipContent>,
): TooltipContent =>
  typeof content === "function"
    ? (content as Accessor<TooltipContent>)()
    : content;

export const Tooltip: Component<TooltipProps> = (props) => {
  const withDefaults = mergeProps(
    { openDelay: DEFAULT_OPEN_DELAY, closeDelay: DEFAULT_CLOSE_DELAY },
    props,
  );
  const [local, rest] = splitProps(withDefaults, [
    "content",
    "children",
    "class",
    "triggerAs",
  ]);

  const triggerClass = () =>
    pipe(["sui-tooltip__trigger", local.class], filter(Boolean), join(" "));

  return (
    <KobalteTooltip {...rest}>
      <KobalteTooltip.Trigger as={local.triggerAs ?? "button"} class={triggerClass()}>
        {local.children}
      </KobalteTooltip.Trigger>
      <KobalteTooltip.Portal>
        <KobalteTooltip.Content class="sui-tooltip__content">
          <KobalteTooltip.Arrow class="sui-tooltip__arrow" />
          {resolveContent(local.content)}
        </KobalteTooltip.Content>
      </KobalteTooltip.Portal>
    </KobalteTooltip>
  );
};
