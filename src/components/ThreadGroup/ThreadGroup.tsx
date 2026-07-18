// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ThreadGroup — Atomic Primitive (Depth 1)
// Owns CSS (ThreadGroup.css). Renders the
// structural block for one author-grouped
// message thread inside a conversation —
// border-left + depth padding + avatar/body
// row + header + bubble container, with
// self/other axis reversal.
//
// JSX sub-slots: `avatar`, `header`, `bubbles`.
// All flex/spacing rules live in the CSS file.
// Per-instance dynamic values (depth pixels,
// accent color) are applied via inline style
// inside the Primitive — the allowed location
// for data-driven inline style.
//
// Factory: createThreadGroup().
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import {
  ContentStack,
  TightStack,
  TopClusterRow,
  WrappedClusterRow,
} from "../Layout/variants";
import "./ThreadGroup.css";
import { pipe, filter, join } from "../../fn";

export type ThreadGroupVariant = "self" | "other";

export interface ThreadGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Reply nesting depth — `0` = top-level. Controls left padding when threaded. */
  depth: number;
  /** Accent color for the left border (and any consumer-driven tint). */
  color: string;
  /** Visual side — `self` reverses the avatar/body axis and right-aligns. */
  variant: ThreadGroupVariant;
  /** Apply depth-based indent. Default `true`. */
  threaded?: boolean;
  /** Avatar element (rendered on the leading edge — trailing if `variant="self"`). */
  avatar?: JSX.Element;
  /** Header row content — typically name + timestamp. */
  header?: JSX.Element;
  /** Bubble stack content. */
  bubbles?: JSX.Element;
}

const clsx = (...parts: (string | false | undefined)[]): string =>
  pipe(
    parts,
    filter((p): p is string => Boolean(p)),
    join(" "),
  );

export const ThreadGroup: Component<ThreadGroupProps> = (props) => {
  const [local, others] = splitProps(props, [
    "depth",
    "color",
    "variant",
    "threaded",
    "avatar",
    "header",
    "bubbles",
    "class",
    "style",
  ]);

  const threaded = (): boolean => local.threaded ?? true;

  const rootClass = (): string =>
    clsx("sui-thread-group", `sui-thread-group--${local.variant}`, local.class);

  const rootStyle = (): JSX.CSSProperties => {
    const base =
      typeof local.style === "object" && local.style
        ? (local.style as JSX.CSSProperties)
        : {};
    const indent = threaded() ? local.depth * 24 : 0;
    const borderColor = local.depth > 0 ? local.color : "transparent";
    return {
      ...base,
      "border-left-color": borderColor,
      "padding-left": `${indent}px`,
    };
  };

  return (
    <div class={rootClass()} style={rootStyle()} {...others}>
      {/* Base arrangements compose Layout variants (avatar/body row, body
          column, header, bubble stack). The `self` variant's axis reversal
          (row-reverse) + trailing-edge alignment (align-items:flex-end) stay
          as INTRINSIC CSS overrides on these wrappers — Row/Stack have no
          `reverse` capability and adding one for a single consumer fails
          start-minimal. Crucially, row-reverse flips only the VISUAL order
          while preserving avatar→body DOM/reading order (an a11y property);
          a DOM reorder is NOT equivalent. See ThreadGroup.css. */}
      <TopClusterRow class="sui-thread-group__row">
        {local.avatar}
        <ContentStack class="sui-thread-group__body">
          <WrappedClusterRow class="sui-thread-group__header">
            {local.header}
          </WrappedClusterRow>
          <TightStack class="sui-thread-group__bubbles">
            {local.bubbles}
          </TightStack>
        </ContentStack>
      </TopClusterRow>
    </div>
  );
};

/** Props that are visual overrides — locked at variant-definition time. */
export type ThreadGroupOverrides = Pick<ThreadGroupProps, "threaded">;

/** Props that remain available to consumers of a curried ThreadGroup variant. */
export type ThreadGroupDataProps = Omit<
  ThreadGroupProps,
  keyof ThreadGroupOverrides
>;

export function createThreadGroup(
  defaults: Partial<Omit<ThreadGroupProps, "avatar" | "header" | "bubbles">>,
): Component<ThreadGroupDataProps> {
  return (props) => <ThreadGroup {...mergeProps(defaults, props)} />;
}
