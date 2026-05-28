// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// FocusLabelBand — Primitive (Depth 1). Atomic.
// Owns CSS (FocusLabelBand.css), imports no other components.
//
// The focus-label cell rendered between the above/below cell stacks of an
// AreaFocusGrid sub-column. Renders an optional above-progress bar, the
// label content (`children`), and an optional below-progress bar. The
// `selected` state is exposed as a `data-selected` attribute so CSS owns
// the visual treatment.
//
// Factory: createFocusLabelBand().
// ============================================
import { Component, JSX, mergeProps, Show, splitProps } from "solid-js";
import "./FocusLabelBand.css";

export interface FocusLabelBandProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Highlights the band with the accent palette. */
  selected?: boolean;
  /** Click handler for the whole band. */
  onClick?: JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>;
  /** Optional progress-bar slot rendered above the label. Sized by CSS —
   *  consumers don't need inline width/height. */
  aboveBar?: JSX.Element;
  /** Native tooltip text for the above-bar slot only. */
  aboveBarTitle?: string;
  /** Optional progress-bar slot rendered below the label. Sized by CSS —
   *  consumers don't need inline width/height. */
  belowBar?: JSX.Element;
  /** Native tooltip text for the below-bar slot only. */
  belowBarTitle?: string;
  /** Label content (typically the focus name). */
  children?: JSX.Element;
}

export const FocusLabelBand: Component<FocusLabelBandProps> = (props) => {
  const [local, others] = splitProps(props, [
    "selected",
    "onClick",
    "aboveBar",
    "aboveBarTitle",
    "belowBar",
    "belowBarTitle",
    "children",
    "class",
  ]);

  const rootClass = () =>
    local.class ? `sui-focus-label-band ${local.class}` : "sui-focus-label-band";

  return (
    <div
      class={rootClass()}
      onClick={local.onClick}
      data-selected={local.selected ? "" : undefined}
      {...others}
    >
      <div class="sui-focus-label-band__bar" title={local.aboveBarTitle}>
        <Show when={local.aboveBar}>{local.aboveBar}</Show>
      </div>
      <div class="sui-focus-label-band__label">{local.children}</div>
      <div class="sui-focus-label-band__bar" title={local.belowBarTitle}>
        <Show when={local.belowBar}>{local.belowBar}</Show>
      </div>
    </div>
  );
};

/** Override props — visual knobs locked in at Factory-call time. */
export type FocusLabelBandOverrides = Pick<FocusLabelBandProps, "class">;

/** Data props — what a Curried Variant publicly exposes. */
export type FocusLabelBandDataProps = Omit<FocusLabelBandProps, keyof FocusLabelBandOverrides>;

/**
 * Factory: returns a FocusLabelBand pre-configured with override defaults.
 * The returned Component exposes only Data props (selected/onClick/aboveBar/
 * belowBar/children + native div HTML attributes).
 */
export function createFocusLabelBand(
  defaults: Partial<Omit<FocusLabelBandProps, "children" | "aboveBar" | "belowBar">>,
): Component<FocusLabelBandDataProps> {
  return (props) => <FocusLabelBand {...mergeProps(defaults, props)} />;
}
