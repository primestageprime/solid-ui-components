// ProgressionQueue — public props.
import type { JSX } from "solid-js";
import type { Tone } from "../../types";

/** One section of the progression bar. */
export interface ProgressionSection {
  /** Stable key; `bucketOf` returns one of these. */
  key: string;
  /** Header label — and, on its own, the summary line when the section is empty. */
  label: string;
  /** Dot color beside the label — the ONLY role color (chrome stays neutral). */
  tone: Tone;
  /** Relative share of the height when the populated sections overflow their
   *  content. Default 1. */
  weight?: number;
}

export interface ProgressionQueueProps<T> {
  /** Sections top → bottom. Every section is always shown, with its count. */
  sections: ProgressionSection[];
  /** All items; each is bucketed into a section by `bucketOf`. */
  items: T[];
  /** Item → the `key` of the section it belongs in. */
  bucketOf: (item: T) => string;
  /** Stable identity for an item (selection + list keys). */
  keyOf: (item: T) => string;
  /** Render an item's row content. */
  renderItem: (item: T) => JSX.Element;
  /** Selected item key (controlled) — its row gets the selected treatment. */
  selectedKey?: string;
  /** Fires with an item's key when its row is clicked. */
  onSelect?: (key: string) => void;
  /** Total height in px. Omit to fill the parent (the root is `height:100%`,
   *  so it stretches to a definite-height flex / `height:100%` ancestor). */
  height?: number;
  class?: string;
}
