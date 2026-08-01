// Base (Tabs) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createTabs } from "./Tabs";
export type { TabsDataProps, Tab, TabStatus } from "./Tabs";
export * from "./variants";
