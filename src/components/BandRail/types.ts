// ============================================
// BandRail types — Depth 0 (pure types; type-only imports).
// Kept apart from the component so the pure layout helpers can import the
// shapes without pulling SolidJS in.
// ============================================
import type { LabelAnchor } from "../../internal/geometry/labelLayout";
import type { Tone } from "../../types";

/** Which way a threshold's tick points off the rail. */
export type ThresholdSide = "above" | "below";

/**
 * Text anchor chosen by `fitAnchor` so a label stays inside the rail's box.
 * One definition, shared with every other label layer.
 */
export type { LabelAnchor };

/**
 * One named point on the rail where the answer changes.
 *
 * The consumer computes these. The rail does no arithmetic: it places what it
 * is given. Every threshold carries a `label`, because the rail never leaves
 * meaning in colour alone.
 */
export interface Threshold {
  /** Position along the rail, in the same units as `domain`. */
  value: number;
  /** What changes here, in words — e.g. "safe in 12 mo". */
  label: string;
  /** Semantic treatment. The theme owns the colour. Defaults to "default". */
  tone?: Tone;
  /** Which side of the rail the tick and its label take. Defaults to "above". */
  side?: ThresholdSide;
}

/** A threshold after the rail has placed it: pixel x, lane, anchor, text. */
export interface PlacedThreshold {
  /** The threshold this placement came from. */
  threshold: Threshold;
  /** Position along the rail, in viewBox units. */
  x: number;
  /** Which side of the rail this label took. */
  side: ThresholdSide;
  /** 1-based distance from the rail. Lane 1 sits closest. */
  lane: number;
  /** Anchor that keeps both text lines inside the box. */
  anchor: LabelAnchor;
  /** Second text line — `format(threshold.value)`. */
  valueLabel: string;
}

/** Vertical positions for one lane, in viewBox units. */
export interface LaneGeometry {
  /** Where the tick stroke ends, away from the rail. */
  tickEnd: number;
  /** Baseline of the name line. */
  nameY: number;
  /** Baseline of the value line, always farther from the rail than the name. */
  valueY: number;
}
