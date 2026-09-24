// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// OverflowNav — Pure Composite (Depth 2)
// Composes Row (Layout Primitive) + NavLink (Atomic Primitive)
// + PopoverMenu (Atomic Primitive) + Button (Atomic Primitive, the
// close affordance on closable items).
//
// Owns zero CSS files and zero inline `style={}` other than
// `style={props.style}` passthrough. All visual treatment lives in
// the composed Primitives' own CSS files.
//
// Horizontal list of nav items that automatically collapses items
// that don't fit into a trailing kebab overflow menu, re-evaluated
// on container resize.
//
// Two optional extras:
// - Closable items (`closable: true` + the nav's `onClose(id)`) render
//   a trailing close button beside the NavLink. Closing is the app's
//   call — OverflowNav only reports the id.
// - `overflowItems`: items the app puts in the kebab regardless of
//   width (e.g. hidden tabs the reader can re-open). They list after
//   any width-spilled items; the kebab is shown whenever either list
//   is non-empty. Kebab rows keep `active`.
// ============================================
import {
  type Component,
  For,
  Show,
  createSignal,
  createEffect,
  onCleanup,
  onMount,
  mergeProps,
  type JSX,
} from "solid-js";
import { isServer } from "solid-js/web";
import { Row } from "../Layout/Row";
import { NavLink, type NavLinkColor } from "../Navigation/NavLink";
import { TightNoShrinkClusterRow } from "../Layout/variants";
import { Button } from "../Button/Button";
import { PopoverMenu, type PopoverMenuItem } from "../PopoverMenu/PopoverMenu";
import { observeSize } from "../../internal/dom/observeSize";
import { map, find } from "../../fn";

export interface OverflowNavItem {
  /** Stable id — used as the PopoverMenu select id when this item overflows. */
  id: string;
  /** Visible label rendered in both the inline NavLink and the overflow menu row. */
  label: string;
  /** Anchor href (mirrors NavLink). */
  href?: string;
  /** Active state (mirrors NavLink). */
  active?: boolean;
  /** Color variant (mirrors NavLink). */
  color?: NavLinkColor;
  /** Optional badge (mirrors NavLink). */
  badge?: string | number;
  /** Optional click handler. Forwarded to the underlying anchor; also fires when the item is selected from the overflow menu. */
  onClick?: (event?: MouseEvent) => void;
  /**
   * Shows a trailing close button beside the inline link. Clicking it calls
   * the nav's `onClose(id)` (not `onClick`). Ignored inside the kebab — a
   * kebab row selects, it never closes. No effect without `onClose`.
   */
  closable?: boolean;
}

export interface OverflowNavProps {
  /** Items to render inline; any that don't fit spill into the kebab. */
  items: OverflowNavItem[];
  /**
   * Items that always live in the kebab, whatever the width — listed after
   * width-spilled items. Selecting one fires its `onClick` (or follows its
   * `href`), same as a spilled item. Default: none.
   */
  overflowItems?: OverflowNavItem[];
  /** Called with an item's id when its close button is clicked (see `closable`). */
  onClose?: (id: string) => void;
  /** Gap between inline NavLink items (forwarded to Row). Default `"sm"`. */
  gap?: "xs" | "sm";
  /** Vertical alignment of inline items (forwarded to Row). Default `"center"`. */
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  /** Class appended to the outer Row. */
  class?: string;
  /** Passthrough inline style on the outer Row. */
  style?: JSX.CSSProperties | string;
}

/**
 * Width budget reserved for the kebab trigger when computing overflow.
 * Slightly larger than the trigger's natural width so we don't oscillate
 * between "fits with kebab" and "fits without kebab" at the boundary.
 */
const KEBAB_RESERVE_PX = 48;

export const OverflowNav: Component<OverflowNavProps> = (rawProps) => {
  const props = mergeProps(
    { gap: "sm" as const, align: "center" as const },
    rawProps,
  );

  let containerRef: HTMLDivElement | undefined;
  // Per-item refs (the NavLink, or its closable wrapper), indexed in
  // lock-step with props.items.
  const itemRefs: HTMLElement[] = [];
  // Cached natural widths (offsetWidth at measurement time), indexed alongside items.
  const [naturalWidths, setNaturalWidths] = createSignal<number[]>([]);
  // How many leading items are rendered inline (the rest are in the overflow menu).
  const [visibleCount, setVisibleCount] = createSignal<number>(
    rawProps.items.length,
  );

  // Approximate gap-in-pixels for the Row gap token — used in the budget math.
  const gapPx = () => {
    switch (props.gap) {
      case "xs":
        return 4;
      case "sm":
        return 8;
      default:
        return 8;
    }
  };

  const explicitOverflow = (): OverflowNavItem[] => props.overflowItems ?? [];

  const recompute = () => {
    if (!containerRef) return;
    const widths = naturalWidths();
    const total = props.items.length;
    if (widths.length !== total) return; // Wait for measurement pass.

    const containerWidth = containerRef.clientWidth;
    if (containerWidth <= 0) return;

    // An explicit overflow list means the kebab is always there, so its
    // reserve always applies.
    const kebabForced = explicitOverflow().length > 0;

    // First, check if everything fits without any kebab.
    let runningWidth = 0;
    const g = gapPx();
    for (let i = 0; i < total; i++) {
      runningWidth += widths[i];
      if (i > 0) runningWidth += g;
    }
    if (runningWidth <= containerWidth - (kebabForced ? KEBAB_RESERVE_PX : 0)) {
      setVisibleCount(total);
      return;
    }

    // Otherwise, fit as many leading items as we can while reserving the kebab.
    const budget = containerWidth - KEBAB_RESERVE_PX;
    let count = 0;
    let acc = 0;
    for (let i = 0; i < total; i++) {
      const next = acc + widths[i] + (i > 0 ? g : 0);
      if (next > budget) break;
      acc = next;
      count = i + 1;
    }
    setVisibleCount(count);
  };

  // Measure each rendered NavLink's offsetWidth. Called after items mount and
  // whenever the items array changes (label/badge edits change widths).
  const measure = () => {
    const widths: number[] = [];
    for (let i = 0; i < props.items.length; i++) {
      const el = itemRefs[i];
      widths.push(el ? el.offsetWidth : 0);
    }
    setNaturalWidths(widths);
    recompute();
  };

  onMount(() => {
    if (isServer) return;
    // Items are rendered inline (visibleCount starts at items.length) → measure all.
    // Use rAF so layout has settled before reading offsetWidth.
    requestAnimationFrame(measure);
  });

  // Re-measure when items change. We bump visibleCount to items.length so all
  // items render inline for the next measurement frame, then trim again.
  createEffect(() => {
    const len = props.items.length;
    // Closability changes an item's width; the kebab's presence changes the budget.
    // Reading every flag (and the explicit list's length) subscribes to them.
    map((item) => item.closable, props.items);
    explicitOverflow().length;
    setVisibleCount(len);
    if (isServer) return;
    requestAnimationFrame(measure);
  });

  // ResizeObserver on the container → recompute (uses cached widths).
  createEffect(() => {
    if (isServer) return;
    const el = containerRef;
    if (!el) return;
    // observeSize subsumes the hand-rolled rAF coalescing, and adds the
    // change-guard this observer lacked.
    onCleanup(observeSize(el, () => recompute()));
  });

  // Items that fit inline.
  const visibleItems = () => props.items.slice(0, visibleCount());
  // Items in the overflow menu: width-spilled first, then the explicit list.
  const overflowItems = () => [
    ...props.items.slice(visibleCount()),
    ...explicitOverflow(),
  ];

  // Convert overflow items to PopoverMenu items. The PopoverMenu's `items` type
  // requires at least one item, so we only render the menu when there's spill.
  const menuItems = (): [PopoverMenuItem, ...PopoverMenuItem[]] | null => {
    const spill = overflowItems();
    if (spill.length === 0) return null;
    // Carry `active` so a collapsed tab keeps its selected mark in the menu.
    return map(
      (item) => ({ id: item.id, label: item.label, active: item.active }),
      spill,
    ) as [PopoverMenuItem, ...PopoverMenuItem[]];
  };

  const handleMenuSelect = (id: string) => {
    const item =
      find((x) => x.id === id, props.items) ??
      find((x) => x.id === id, explicitOverflow());
    if (!item) return;
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      // Replicate anchor activation for keyboard / programmatic selection from the menu.
      window.location.href = item.href;
    }
  };

  return (
    <Row
      ref={containerRef}
      gap={props.gap}
      align={props.align}
      class={props.class}
      style={props.style}
    >
      <For each={visibleItems()}>
        {(item, i) => {
          const setRef = (el: HTMLElement) => {
            itemRefs[i()] = el;
          };
          const link = (ref?: (el: HTMLAnchorElement) => void) => (
            <NavLink
              ref={ref}
              href={item.href}
              active={item.active}
              color={item.color}
              badge={item.badge}
              onClick={
                item.onClick ? (e: MouseEvent) => item.onClick!(e) : undefined
              }
            >
              {item.label}
            </NavLink>
          );
          return (
            <Show
              when={item.closable && props.onClose}
              fallback={link(setRef)}
            >
              <TightNoShrinkClusterRow ref={setRef} data-closable-item={item.id}>
                {link()}
                <Button
                  variant="icon-only"
                  size="sm"
                  aria-label={`Close ${item.label}`}
                  title={`Close ${item.label}`}
                  onClick={(e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onClose?.(item.id);
                  }}
                >
                  &times;
                </Button>
              </TightNoShrinkClusterRow>
            </Show>
          );
        }}
      </For>
      <Show when={menuItems()}>
        {(menu) => (
          <PopoverMenu
            trigger={<KebabGlyph />}
            items={menu()}
            onSelect={handleMenuSelect}
            align="right"
            size="sm"
          />
        )}
      </Show>
    </Row>
  );
};

/**
 * Inline kebab (three-vertical-dots) glyph for the overflow trigger.
 * Inlined here because the shared Icon set doesn't ship a kebab/more-vertical
 * glyph yet — keeps OverflowNav self-contained without bloating the Icon enum.
 */
const KebabGlyph: Component = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="8" cy="3" r="1.4" fill="currentColor" />
    <circle cx="8" cy="8" r="1.4" fill="currentColor" />
    <circle cx="8" cy="13" r="1.4" fill="currentColor" />
  </svg>
);

/** Layout overrides (gap/align) — locked at variant-definition time. */
export type OverflowNavOverrides = Pick<OverflowNavProps, "gap" | "align">;

/** Props available to consumers of a curried OverflowNav variant (`items` is runtime data). */
export type OverflowNavDataProps = Omit<
  OverflowNavProps,
  keyof OverflowNavOverrides
>;

export function createOverflowNav(
  defaults: Partial<OverflowNavProps>,
): Component<OverflowNavDataProps> {
  return (props) => <OverflowNav {...mergeProps(defaults, props)} />;
}
