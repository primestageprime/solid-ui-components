// ============================================
// BottomTabBar Curried Variants — Depth 1 (zero CSS)
// ============================================
import type { Component } from "solid-js";
import { createBottomTabBar, type BottomTabBarDataProps } from "./BottomTabBar";

/** The phone's primary nav: icon-over-label tabs pinned under the page. */
export const BottomTabBar: Component<BottomTabBarDataProps> =
  createBottomTabBar();
