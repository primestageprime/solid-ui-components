import type { Component } from "solid-js";
import { createGhostArc } from "./GhostArc";
import type { GhostArcDataProps } from "./GhostArc";

/** Warning ghost arc — amber preview. */
export const WarningGhostArc: Component<GhostArcDataProps> =
  createGhostArc({ color: "var(--sui-warning)", opacity: 0.55 });

/** Subtle ghost arc — low opacity, no dashes. */
export const SubtleGhostArc: Component<GhostArcDataProps> =
  createGhostArc({ opacity: 0.25, strokeDasharray: "0" });
