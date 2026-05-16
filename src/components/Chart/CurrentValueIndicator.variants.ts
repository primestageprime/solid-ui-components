import type { Component } from "solid-js";
import { createCurrentValueIndicator } from "./CurrentValueIndicator";
import type { CurrentValueIndicatorDataProps } from "./CurrentValueIndicator";

/** Accent current-value — primary signal styling. */
export const AccentCurrentValueIndicator: Component<CurrentValueIndicatorDataProps> =
  createCurrentValueIndicator({ color: "var(--sui-accent)", radius: 5 });

/** Warning current-value — for overflow / out-of-bounds emphasis. */
export const WarningCurrentValueIndicator: Component<CurrentValueIndicatorDataProps> =
  createCurrentValueIndicator({ color: "var(--sui-warning)", radius: 5 });
