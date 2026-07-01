// ============================================
// Tabs Curried Variants — Depth 1 (zero CSS)
// Visual config (variant / orientation / color) is baked; the tab data
// (tabs / activeTab / onTabChange) stays runtime.
// ============================================
import { createTabs } from "./Tabs";
import type { TabsDataProps } from "./Tabs";
import type { Component } from "solid-js";

/** Default tab bar. */
export const Tabs: Component<TabsDataProps> = createTabs({});

/** Underline-style tab bar. */
export const UnderlineTabs: Component<TabsDataProps> = createTabs({
  variant: "underline",
});

/** Boxed tab bar. */
export const BoxedTabs: Component<TabsDataProps> = createTabs({
  variant: "boxed",
});

/** Pill-style tab bar. */
export const PillTabs: Component<TabsDataProps> = createTabs({
  variant: "pill",
});
