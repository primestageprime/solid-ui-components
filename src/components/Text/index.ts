export { Text, createText } from "./Text";
export type { TextProps, TextVariant, TextOverrides, TextDataProps } from "./Text";
// Re-export every variant so adding a new one in variants.ts is automatically
// public — explicit lists drift and quietly hide additions.
export * from "./variants";
