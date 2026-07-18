// Base (ThreadGroup) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createThreadGroup } from "./ThreadGroup";
export type { ThreadGroupDataProps } from "./ThreadGroup";
export * from "./variants";
