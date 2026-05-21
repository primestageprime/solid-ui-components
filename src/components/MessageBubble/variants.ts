// ============================================
// MessageBubble Curried Variants — Depth 1 (zero CSS)
// Pre-configured MessageBubble via createMessageBubble().
// ============================================
import type { Component } from "solid-js";
import { createMessageBubble } from "./MessageBubble";
import type { MessageBubbleDataProps } from "./MessageBubble";

/** Right-aligned, accented bubble for the current viewer's messages. */
export const SelfBubble: Component<MessageBubbleDataProps> =
  createMessageBubble({ variant: "self" });

/** Left-aligned, recessed bubble for messages from other participants. */
export const OtherBubble: Component<MessageBubbleDataProps> =
  createMessageBubble({ variant: "other" });
