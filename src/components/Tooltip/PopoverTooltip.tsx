// lastReviewedAt: 2026-09-23
// lastReviewedBy: claude (SUI gap: Tooltip tap-to-open, thorcasting import proto)
// ============================================
// PopoverTooltip — Atomic (Depth 1)
// Owns CSS (PopoverTooltip.css), no component imports.
//
// Kobalte's Tooltip (see Tooltip.tsx) can only be opened by hover or keyboard
// focus: TooltipTrigger's onClick unconditionally calls `handleHide(true)`
// (click can only CLOSE an open tooltip, never open one), and its
// onPointerEnter explicitly ignores `pointerType === "touch"`. There is no
// prop that changes either of those — they are unconditional in Kobalte's own
// trigger implementation. So a tap/click-to-open popover cannot be built as a
// variant of Tooltip; it needs a different primitive underneath.
//
// PopoverTooltip is built on `@kobalte/core/popover` instead. Popover's own
// trigger already toggles open/closed on click (tap-open and tap-close for
// free) and its content already dismisses on outside click and Escape via
// Popover's DismissableLayer (also for free) — neither has to be
// reimplemented here. What Popover does NOT have is hover/focus-open, so
// this component adds that layer itself, combining three independent
// "reasons to be open" (tap-toggled, hovering, keyboard-focused) into one
// boolean that drives Popover's controlled `open` prop. A short close-delay
// bridges the trigger→content pointer gap so hovering into the open
// popover's content (e.g. to scroll a long list) does not immediately close
// it.
//
// This is a separate component from Tooltip, not a prop on it: existing
// Tooltip usages and behaviour are completely unaffected.
// ============================================
import {
  Popover as KobaltePopover,
  type PopoverRootProps,
} from "@kobalte/core/popover";
import {
  type Accessor,
  type Component,
  type JSX,
  type ValidComponent,
  createSignal,
  createMemo,
  mergeProps,
  splitProps,
  onCleanup,
} from "solid-js";
import "./PopoverTooltip.css";
import { pipe, filter, join } from "../../fn";

/** Content accepted by `PopoverTooltip.content` — a primitive, JSX, or an accessor of either. */
export type PopoverTooltipContent = string | JSX.Element;

export interface PopoverTooltipProps
  extends Omit<PopoverRootProps, "children" | "open" | "onOpenChange"> {
  /** Rendered inside the floating popover body. May be a value or an accessor. */
  content: PopoverTooltipContent | Accessor<PopoverTooltipContent>;
  /** Element(s) that hover/focus/tap activates the popover. */
  children: JSX.Element;
  /** Additional class applied to the trigger element. */
  class?: string;
  /**
   * What the trigger renders as. Default: a `<button>`.
   *
   * Same rationale as `Tooltip.triggerAs`: pass `"span"` when the children
   * are already interactive (a link, a button), since nesting one control
   * inside another is invalid HTML and breaks the inner control's clicks and
   * tab stop. A span trigger still opens on hover and tap, but is not itself
   * focusable — give such content its own `aria-label`.
   */
  triggerAs?: ValidComponent;
  /** Milliseconds of pointer-leave grace before a hover-open closes. Default 100 — long enough to move the pointer from trigger to content. */
  closeDelay?: number;
}

const DEFAULT_CLOSE_DELAY = 100;

const resolveContent = (
  content: PopoverTooltipContent | Accessor<PopoverTooltipContent>,
): PopoverTooltipContent =>
  typeof content === "function"
    ? (content as Accessor<PopoverTooltipContent>)()
    : content;

export const PopoverTooltip: Component<PopoverTooltipProps> = (props) => {
  const withDefaults = mergeProps({ closeDelay: DEFAULT_CLOSE_DELAY }, props);
  const [local, rest] = splitProps(withDefaults, [
    "content",
    "children",
    "class",
    "triggerAs",
    "closeDelay",
  ]);

  const triggerClass = () =>
    pipe(
      ["sui-popover-tooltip__trigger", local.class],
      filter(Boolean),
      join(" "),
    );

  // Three independent reasons the popover should be open. A tap toggles
  // `sticky`; hovering the trigger or content sets `hovering`; keyboard
  // focus on the trigger sets `focused`. The popover is open while any is
  // true, so the three layers add rather than fight.
  const [sticky, setSticky] = createSignal(false);
  const [hovering, setHovering] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const open = createMemo(() => sticky() || hovering() || focused());

  let hideTimeout: ReturnType<typeof setTimeout> | undefined;
  const cancelHide = () => {
    if (hideTimeout !== undefined) {
      clearTimeout(hideTimeout);
      hideTimeout = undefined;
    }
  };
  const scheduleHide = () => {
    cancelHide();
    hideTimeout = setTimeout(() => setHovering(false), local.closeDelay);
  };
  onCleanup(cancelHide);

  // Popover's own onOpenChange fires from two places: the trigger's click
  // (via context.toggle()) and the content's dismissal (outside click /
  // Escape, via DismissableLayer's onDismiss -> context.close()). We can't
  // tell those apart from the boolean alone, but we don't need to: a toggle
  // to true is always a tap-open (mark it sticky); a change to false is
  // always "this should now be fully closed" (close, click-off, or
  // Escape) — so it clears every layer, even if the pointer is still
  // physically hovering. That matches "click always toggles" and "Escape
  // always closes" without tracking event provenance.
  const onOpenChange = (next: boolean) => {
    if (next) {
      setSticky(true);
    } else {
      cancelHide();
      setSticky(false);
      setHovering(false);
      setFocused(false);
    }
  };

  const onTriggerPointerEnter: JSX.EventHandlerUnion<
    HTMLElement,
    PointerEvent
  > = (e) => {
    if (e.pointerType === "touch") return;
    cancelHide();
    setHovering(true);
  };
  const onTriggerPointerLeave: JSX.EventHandlerUnion<
    HTMLElement,
    PointerEvent
  > = (e) => {
    if (e.pointerType === "touch") return;
    scheduleHide();
  };
  const onTriggerFocus: JSX.EventHandlerUnion<HTMLElement, FocusEvent> = () => {
    setFocused(true);
  };
  const onTriggerBlur: JSX.EventHandlerUnion<HTMLElement, FocusEvent> = () => {
    setFocused(false);
  };
  const onContentPointerEnter = () => {
    cancelHide();
    setHovering(true);
  };
  const onContentPointerLeave = () => {
    scheduleHide();
  };

  return (
    <KobaltePopover open={open()} onOpenChange={onOpenChange} {...rest}>
      <KobaltePopover.Trigger
        as={local.triggerAs ?? "button"}
        class={triggerClass()}
        onPointerEnter={onTriggerPointerEnter}
        onPointerLeave={onTriggerPointerLeave}
        onFocus={onTriggerFocus}
        onBlur={onTriggerBlur}
      >
        {local.children}
      </KobaltePopover.Trigger>
      <KobaltePopover.Portal>
        <KobaltePopover.Content
          class="sui-popover-tooltip__content"
          onPointerEnter={onContentPointerEnter}
          onPointerLeave={onContentPointerLeave}
        >
          <KobaltePopover.Arrow class="sui-popover-tooltip__arrow" />
          {resolveContent(local.content)}
        </KobaltePopover.Content>
      </KobaltePopover.Portal>
    </KobaltePopover>
  );
};
