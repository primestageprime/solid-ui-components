// Base (MessageBubble) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createMessageBubble } from "./MessageBubble";
export type { MessageBubbleDataProps } from "./MessageBubble";
export * from "./variants";
