// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// MessageBubble — Atomic Primitive (Depth 1)
// Owns CSS (MessageBubble.css). Renders a single
// chat bubble with optional line clamping + a
// (more…) toggle when the text overflows.
// Factory: createMessageBubble().
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createSignal,
  mergeProps,
  onMount,
  splitProps,
} from "solid-js";
import "./MessageBubble.css";

export type MessageBubbleVariant = "self" | "other";

export interface MessageBubbleProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Visual role of the bubble — `self` is right-aligned downstream and gets
   *  the heavier, accented styling. */
  variant?: MessageBubbleVariant;
  /** Override the bubble background — typically a per-participant tint. */
  bg?: string;
  /** Override text color (used when `variant="self"` to pop on dark bg). */
  textColor?: string;
  /** Tooltip text (full timestamp, etc.). */
  title?: string;
  /** Lines before the (more…) toggle appears. Default 5. */
  clampLines?: number;
  /** When expanded, lines beyond this scroll internally. Default 20. */
  maxLines?: number;
  children?: JSX.Element;
}

const clsx = (...parts: (string | false | undefined)[]): string =>
  parts.filter((p): p is string => Boolean(p)).join(" ");

export const MessageBubble: Component<MessageBubbleProps> = (props) => {
  const [local, others] = splitProps(props, [
    "variant",
    "bg",
    "textColor",
    "title",
    "clampLines",
    "maxLines",
    "class",
    "style",
    "onClick",
    "children",
  ]);

  const [expanded, setExpanded] = createSignal(false);
  const [overflowing, setOverflowing] = createSignal(false);
  let textRef: HTMLDivElement | undefined;

  const measure = () => {
    if (!textRef) return;
    if (expanded()) return; // don't overwrite while user is reading
    const next = textRef.scrollHeight - textRef.clientHeight > 1;
    if (next !== overflowing()) setOverflowing(next);
  };

  onMount(() => {
    // Measure across two frames + a settle pass — fonts/layout can be late.
    requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    setTimeout(measure, 50);
    if (typeof ResizeObserver !== "undefined" && textRef) {
      const ro = new ResizeObserver(measure);
      ro.observe(textRef);
    }
  });

  const variantClass = () =>
    local.variant === "self" ? "sui-message-bubble--self" : undefined;

  const rootClass = () =>
    clsx("sui-message-bubble", variantClass(), local.class);

  const mergedStyle = (): JSX.CSSProperties => {
    const base =
      typeof local.style === "object" && local.style
        ? (local.style as JSX.CSSProperties)
        : {};
    const out: JSX.CSSProperties = { ...base };
    if (local.bg) out["background-color"] = local.bg;
    if (local.textColor) out.color = local.textColor;
    if (local.onClick) out.cursor = "pointer";
    return out;
  };

  const textStyle = (): JSX.CSSProperties =>
    ({
      "--sui-message-bubble-clamp": String(local.clampLines ?? 5),
      "--sui-message-bubble-max": String(local.maxLines ?? 20),
    }) as JSX.CSSProperties;

  const textClass = () =>
    clsx(
      "sui-message-bubble__text",
      expanded() && "sui-message-bubble__text--expanded",
    );

  // When the bubble is clickable, Enter/Space must activate it exactly like a
  // pointer click. Delegating to the element's own `.click()` replays the same
  // onClick binding SolidJS attached, so the keyboard path can't drift from it.
  const isClickable = () => Boolean(local.onClick);

  const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: onClick is optional; when present the bubble gains role="button", tabindex, and Enter/Space keyboard activation (below) — biome can't see through the runtime isClickable() guard.
    <div
      class={rootClass()}
      style={mergedStyle()}
      title={local.title}
      role={isClickable() ? "button" : undefined}
      tabindex={isClickable() ? 0 : undefined}
      onClick={
        local.onClick as
          | JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>
          | undefined
      }
      onKeyDown={isClickable() ? onKeyDown : undefined}
      {...others}
    >
      <div ref={textRef} class={textClass()} style={textStyle()}>
        {local.children}
      </div>
      <Show when={overflowing()}>
        <button
          type="button"
          class="sui-message-bubble__more"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded() ? "(less)" : "(more…)"}
        </button>
      </Show>
    </div>
  );
};

/** Props that are visual overrides — locked at variant-definition time. */
export type MessageBubbleOverrides = Pick<
  MessageBubbleProps,
  "variant" | "clampLines" | "maxLines"
>;

/** Props that remain available to consumers of a curried MessageBubble variant. */
export type MessageBubbleDataProps = Omit<
  MessageBubbleProps,
  keyof MessageBubbleOverrides
>;

export function createMessageBubble(
  defaults: Partial<Omit<MessageBubbleProps, "children">>,
): Component<MessageBubbleDataProps> {
  return (props) => <MessageBubble {...mergeProps(defaults, props)} />;
}
