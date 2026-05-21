export { StatusLight, createStatusLight } from "./StatusLight";
export type {
  StatusLightProps,
  StatusLightVariant,
  StatusLightSize,
  StatusLightOverrides,
  StatusLightDataProps,
} from "./StatusLight";
// Re-export every variant so adding a new one in variants.ts is automatically
// public — explicit lists drift and quietly hide additions.
export * from "./variants";
