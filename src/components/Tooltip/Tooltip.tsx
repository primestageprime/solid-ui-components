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
import { type Accessor, type Component, type JSX, mergeProps, splitProps } from "solid-js";
import "./Tooltip.css";

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
   * Extra props forwarded onto the trigger `<button>` (e.g. `aria-disabled`,
   * `onClick`, `disabled`). Lets callers make the trigger non-interactive
   * while keeping it hover/focus-able so the tooltip still fires.
   */
  triggerProps?: JSX.ButtonHTMLAttributes<HTMLButtonElement>;
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
    "triggerProps",
  ]);

  const triggerClass = () =>
    ["sui-tooltip__trigger", local.class].filter(Boolean).join(" ");

  return (
    <KobalteTooltip {...rest}>
      <KobalteTooltip.Trigger {...local.triggerProps} class={triggerClass()}>
        {local.children}
      </KobalteTooltip.Trigger>
      <KobalteTooltip.Portal>
        <KobalteTooltip.Content class="sui-tooltip__content">
          <KobalteTooltip.Arrow style={{ "stroke-width": "2px" }} />
          {resolveContent(local.content)}
        </KobalteTooltip.Content>
      </KobalteTooltip.Portal>
    </KobalteTooltip>
  );
};
