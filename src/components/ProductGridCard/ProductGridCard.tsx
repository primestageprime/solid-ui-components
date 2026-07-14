// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ProductGridCard — Primitive (Depth 1). Atomic.
// Owns CSS (ProductGridCard.css), imports no other components.
//
// A small selectable card used inside ProductGrid's cell stacks. Renders a
// label area (`children`) and an optional progress-bar slot (`bar`). The
// `selected` / `met` state is exposed as `data-selected` / `data-met`
// attributes so CSS owns the visual treatment; `selected` wins over `met`
// when both apply (per CSS rule order).
//
// Factory: createProductGridCard().
// ============================================
import {
  type Component,
  type JSX,
  mergeProps,
  Show,
  splitProps,
} from "solid-js";
import { CenteredColumn } from "../Layout/variants";
import "./ProductGridCard.css";

export interface ProductGridCardProps
  extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Highlights the card with the accent palette. Wins over `met`. */
  selected?: boolean;
  /** Marks the card as satisfied (e.g. a need whose solutions are all done). */
  met?: boolean;
  /** Native tooltip text. */
  title?: string;
  /** Click handler for the whole card. */
  onClick?: JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>;
  /** Optional progress-bar slot rendered below the label. Sized to the
   *  bar wrapper by CSS — consumers don't need inline width/height. */
  bar?: JSX.Element;
  /** Optional tooltip text for the bar slot only. */
  barTitle?: string;
  /** Card label content (typically the item's short name). */
  children?: JSX.Element;
}

export const ProductGridCard: Component<ProductGridCardProps> = (props) => {
  const [local, others] = splitProps(props, [
    "selected",
    "met",
    "title",
    "onClick",
    "bar",
    "barTitle",
    "children",
    "class",
  ]);

  const rootClass = () =>
    local.class
      ? `sui-product-grid-card ${local.class}`
      : "sui-product-grid-card";

  // Keyboard activation replicates the click exactly by dispatching the
  // element's native click, which invokes whatever `onClick` handler form
  // (function or bound tuple) was supplied. Only wired up when the card is
  // actually clickable so non-interactive cards stay out of the tab order.
  const onKeyDown = (e: KeyboardEvent & { currentTarget: HTMLDivElement }) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
    }
  };

  return (
    // The centered column arrangement (was display:flex;flex-direction:column;
    // align-items:center;gap:6px) is composed from the CenteredColumn Layout
    // variant; gap snapped 6px→8px (sm) per the layout-purity gap-scale ruling.
    <CenteredColumn
      class={rootClass()}
      title={local.title}
      onClick={local.onClick}
      role={local.onClick ? "button" : undefined}
      tabIndex={local.onClick ? 0 : undefined}
      onKeyDown={local.onClick ? onKeyDown : undefined}
      data-selected={local.selected ? "" : undefined}
      data-met={local.met ? "" : undefined}
      {...others}
    >
      <div>{local.children}</div>
      <Show when={local.bar}>
        <div class="sui-product-grid-card__bar" title={local.barTitle}>
          {local.bar}
        </div>
      </Show>
    </CenteredColumn>
  );
};

/** Override props — visual knobs locked in at Factory-call time. */
export type ProductGridCardOverrides = Pick<ProductGridCardProps, "class">;

/** Data props — what a Curried Variant publicly exposes. */
export type ProductGridCardDataProps = Omit<
  ProductGridCardProps,
  keyof ProductGridCardOverrides
>;

/**
 * Factory: returns a ProductGridCard pre-configured with override defaults.
 * The returned Component exposes only Data props (selected/met/title/onClick/
 * bar/barTitle/children + native div HTML attributes).
 */
export function createProductGridCard(
  defaults: Partial<Omit<ProductGridCardProps, "children" | "bar">>,
): Component<ProductGridCardDataProps> {
  return (props) => <ProductGridCard {...mergeProps(defaults, props)} />;
}
