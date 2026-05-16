import type { Component } from "solid-js";
import { createPinMarkers } from "./PinMarkers";
import type { Pin, PinMarkersDataProps } from "./PinMarkers";

/** Warning pin styling — bumps default size for prominence. */
export const WarningPinMarkers: Component<PinMarkersDataProps<Pin>> =
  createPinMarkers<Pin>({ size: 16, class: "sui-chart__pin-markers--warning" });

/** Compact pin styling — smaller glyphs for dense charts. */
export const CompactPinMarkers: Component<PinMarkersDataProps<Pin>> =
  createPinMarkers<Pin>({ size: 8 });
