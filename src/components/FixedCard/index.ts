// Base (FixedCardBase) is intentionally NOT exported — use curried variants ONLY
// (no create* factories at call sites — add one via
// `npm run new:variant -- FixedCard <VariantName> --<override>=<value>`).
export { createFixedCard } from "./FixedCard";
export type { FixedCardDataProps } from "./FixedCard";
export * from "./variants";
