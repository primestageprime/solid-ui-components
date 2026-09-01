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

/**
 * One named span of the domain where a given answer holds.
 *
 * A `Threshold` is a point, and its label describes a REGION — which is the
 * bug this type exists to fix. A reader who sees "insolvent in 6 mo" at a tick
 * cannot tell which side of the tick is the insolvent side. A band carries the
 * span, so the label lives inside the thing it describes.
 *
 * Both ends are optional and default to the ends of `domain`, so a band may be
 * bounded ("safe between $200 and $3.8k") or half-open ("insolvent above
 * $9.3k"). The rail does no arithmetic on the values: it places what it is
 * handed, and an omitted end is a DEFAULT, not a derivation.
 */
export interface Band {
  /** Left end, in the same units as `domain`. Defaults to `domain[0]`. */
  start?: number;
  /** Right end, in the same units as `domain`. Defaults to `domain[1]`. */
  end?: number;
  /** What holds across this span, in words — e.g. "safe in 12 mo". */
  label: string;
  /** Semantic treatment. The theme owns the colour. Defaults to "default". */
  tone?: Tone;
  /** Which side of the rail the bar takes. Defaults to "below". */
  side?: ThresholdSide;
}

/** A band after the rail has placed it: pixel span, caps, lane, anchor. */
export interface PlacedBand {
  /** The band this placement came from. */
  band: Band;
  /** Visible span in viewBox units, clamped to the rail's inset ends. */
  x1: number;
  x2: number;
  /**
   * Whether each end is the band's OWN value rather than the domain end.
   *
   * A capped end draws a cap stroke and a tick down to the rail; an open end
   * runs to the inset with neither. "Stops here" and "runs off past here" are
   * different facts and have to look different.
   */
  capStart: boolean;
  capEnd: boolean;
  /** Which side of the rail this bar took. */
  side: ThresholdSide;
  /** 1-based distance from the rail. Lane 1 sits closest. Never shared. */
  lane: number;
  /** Anchor that keeps the label inside the box. */
  anchor: LabelAnchor;
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
