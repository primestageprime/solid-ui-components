// ============================================
// StatusLight Curried Variants — Depth 1 (zero CSS)
// Pre-configured StatusLight via createStatusLight() factory.
// ============================================
import { createStatusLight } from "./StatusLight";
import type { StatusLightDataProps } from "./StatusLight";
import type { Component } from "solid-js";

/** Small status dot — for dense rows / inline indicators. */
export const SmallStatusLight: Component<StatusLightDataProps> = createStatusLight({ size: "sm" });

/** Medium status dot. */
export const MdStatusLight: Component<StatusLightDataProps> = createStatusLight({ size: "md" });
