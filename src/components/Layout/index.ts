// Bases (Stack, Row, Box) are intentionally NOT exported — use curried variants
// (TightStack, SpreadRow, ConstrainedBox, …) or the create* factories.
export { createStack } from "./Stack";
export type { StackDataProps } from "./Stack";
export { createRow } from "./Row";
export type { RowDataProps } from "./Row";
export { createBox } from "./Box";
export type { BoxDataProps } from "./Box";
// No-config structural shell components — re-exported as-is.
export { ProportionalStack, ProportionalItem } from "./ProportionalStack";
export type { ProportionalStackProps, ProportionalItemProps } from "./ProportionalStack";
// AppShell/AppMain have no design-config — re-exported as-is. AppHeader (size/inline) is curried.
export { AppShell, AppMain, createAppHeader } from "./AppShell";
export type { AppShellProps, AppMainProps, AppHeaderDataProps } from "./AppShell";
export { AppNavLink } from "./AppNavLink";
export type { AppNavLinkProps } from "./AppNavLink";
export { SidebarPanel } from "./SidebarPanel";
export type { SidebarPanelProps } from "./SidebarPanel";
// Re-export every curried variant so adding a new one in variants.ts is automatically public.
export * from "./variants";
