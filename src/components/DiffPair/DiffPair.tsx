// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// DiffPair — Atomic Primitive (Depth 1)
// Owns CSS (DiffPair.css). No component imports.
//
// Labeled before/after layout with a directional arrow between the two
// sides. Pure structural Primitive — the consumer supplies whatever JSX
// represents each side (typically a ValueRenderer, but anything goes).
// The visual roles (label, before, arrow, after) are fixed, so each role
// is a named prop rather than positional children.
//
// Factory: createDiffPair() — locks in label/arrow defaults for Curried
// Variants (e.g. LabeledDiffPair, BulletDiffPair).
// ============================================
import { type Component, type JSX, Show, mergeProps, splitProps } from "solid-js";
import "./DiffPair.css";

export interface DiffPairProps {
  /** Optional label; when supplied, renders `{label}: {before} {arrow} {after}` in a two-column grid. */
  label?: string;
  /** JSX rendered on the "before" side of the pair. */
  before: JSX.Element;
  /** JSX rendered on the "after" side of the pair. */
  after: JSX.Element;
  /** Glyph (or JSX) rendered between the two sides (default `→`). */
  arrow?: JSX.Element;
  /** Extra class on the outer container. */
  class?: string;
}

const DEFAULT_ARROW = "→"; // →

/**
 * `DiffPair` — labeled before/after layout Primitive.
 *
 * The two sides are positional roles (`before`, `after`), so the consumer
 * always knows which JSX lands where. The component owns the grid + flex
 * coordination required to keep the label, the pair, and the arrow aligned.
 *
 * @example
 *   <DiffPair
 *     label="Status"
 *     before={<span>NOMINAL</span>}
 *     after={<span>ALARM</span>}
 *   />
 *
 *   // Custom arrow
 *   <DiffPair
 *     label="Transition"
 *     before={<span>draft</span>}
 *     after={<span>published</span>}
 *     arrow={"⇒"}
 *   />
 *
 *   // No label — just the pair (useful when an outer layout supplies its own label).
 *   <DiffPair before={<span>alpha</span>} after={<span>beta</span>} />
 */
export const DiffPair: Component<DiffPairProps> = (props) => {
  const containerClass = () =>
    ["sui-diff-pair", props.class].filter(Boolean).join(" ");

  const arrow = () => props.arrow ?? DEFAULT_ARROW;

  const pair = (
    <div class="sui-diff-pair__pair">
      <div class="sui-diff-pair__side sui-diff-pair__side--before">
        {props.before}
      </div>
      <span class="sui-diff-pair__arrow" aria-hidden="true">
        {arrow()}
      </span>
      <div class="sui-diff-pair__side sui-diff-pair__side--after">
        {props.after}
      </div>
    </div>
  );

  return (
    <Show
      when={props.label}
      fallback={<div class={containerClass()}>{pair}</div>}
    >
      <div class={`${containerClass()} sui-diff-pair--with-label`}>
        <span class="sui-diff-pair__label">{props.label}:</span>
        {pair}
      </div>
    </Show>
  );
};

/** Props that are visual/structural overrides — locked at Curried Variant definition time. */
export type DiffPairOverrides = Pick<DiffPairProps, "arrow">;

/** Props that remain available to consumers of a curried DiffPair variant. */
export type DiffPairDataProps = Omit<DiffPairProps, keyof DiffPairOverrides>;

/**
 * `createDiffPair` — Factory for Curried Variants. Locks in override props
 * (currently just `arrow`) at definition time so consumers only supply
 * `label`, `before`, `after`, and `class`.
 */
export function createDiffPair(
  defaults: Partial<DiffPairOverrides>,
): Component<DiffPairDataProps> {
  return (rawProps) => {
    const [, dataProps] = splitProps(rawProps, []);
    const merged = mergeProps(defaults, dataProps) as DiffPairProps;
    return <DiffPair {...merged} />;
  };
}
