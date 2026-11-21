// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Tabs — Atomic (Depth 1)
// Tags: shows:tabs, shows:menu, does:navigate, does:select, data:enum, role:header
// Owns CSS (Tabs.css). Composes PopoverMenu for the overflow kebab.
// Tab bar with horizontal or vertical orientation,
// and underline/boxed/pill variants.
//
// RESPONSIVE (horizontal only): the strip fills the room it is given, and the
// tabs that don't fit fold into a trailing kebab menu. The active tab is never
// folded, and nothing is reordered — the rules live in the pure `tabsFold`
// (./fold.ts); this file only measures and renders.
//
//   • Every decision is made with every tab on the page, then folded again in
//     the same frame, before paint: on mount, when the tabs or the active tab
//     change, once web fonts settle, and when the strip, one of the three
//     boxes around it, or the window resizes (a folded strip in a
//     content-sized parent doesn't grow with the room by itself).
//   • A strip measured while hidden (every width 0) keeps every tab and folds
//     the first time it is shown with some width.
//
// DOM: the root carries the variant classes; the tabs sit in an inner
// `role="tablist"` and the kebab beside it, so the tablist holds only tabs.
// Vertical strips keep their old single-element shape (the root IS the
// tablist) and never fold.
// ============================================
import {
  type Component,
  For,
  type JSX,
  Show,
  createEffect,
  createSignal,
  mergeProps,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import { isServer } from "solid-js/web";
import type { ColorVariant } from "../../types";
import { findIndex, map } from "../../fn";
import { observeSize } from "../../internal/dom/observeSize";
import { PopoverMenu, type PopoverMenuItem } from "../PopoverMenu/PopoverMenu";
import { type TabsFold, tabsFold } from "./fold";
import "./Tabs.css";

export type TabStatus = "warning" | "error";

export interface Tab {
  id: string;
  label: string;
  icon?: JSX.Element;
  /** Keyboard shortcut or auxiliary hint text displayed after the label */
  hint?: string;
  /** Status indicator for data issues */
  status?: TabStatus;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Tab style variant */
  variant?: "default" | "underline" | "boxed" | "pill";
  /** Orientation of the tab strip. Defaults to "horizontal". */
  orientation?: "horizontal" | "vertical";
  /** Accent color */
  color?: ColorVariant;
}

/**
 * Width held back for the kebab trigger. A little over its natural width so
 * the strip doesn't flap between "fits with kebab" and "fits without" at the
 * boundary.
 */
const KEBAB_RESERVE_PX = 48;

/** How many boxes around the strip are watched for a change of room. */
const ANCESTORS_WATCHED = 3;

/** A computed length in px, or 0 where there is no layout (jsdom, SSR). */
const px = (value: string | undefined): number => {
  const n = Number.parseFloat(value ?? "");
  return Number.isFinite(n) ? n : 0;
};

/** The room inside the strip: its client width less its own padding. */
const innerWidth = (el: HTMLElement): number => {
  const style = getComputedStyle(el);
  return el.clientWidth - px(style.paddingLeft) - px(style.paddingRight);
};

/**
 * A tab's natural width, unrounded where there is layout. `offsetWidth` rounds,
 * and eight rounded-down tabs can add up to a strip a few px short of the real
 * one — enough to wrap the last tab instead of folding it. Rounded up here so
 * the fold errs toward the kebab.
 */
const naturalWidth = (el: HTMLElement | undefined): number => {
  if (!el) return 0;
  const exact = el.getBoundingClientRect().width;
  return exact > 0 ? Math.ceil(exact) : el.offsetWidth;
};

const TabButton = (props: {
  tab: Tab;
  active: boolean;
  onSelect: (id: string) => void;
  ref?: (el: HTMLButtonElement) => void;
}) => (
  <button
    ref={props.ref}
    type="button"
    class={`sui-tab ${props.active ? "sui-tab--active" : ""} ${props.tab.status ? `sui-tab--${props.tab.status}` : ""}`}
    role="tab"
    aria-selected={props.active}
    onClick={() => props.onSelect(props.tab.id)}
  >
    <Show when={props.tab.icon}>
      <span class="sui-tab__icon">{props.tab.icon}</span>
    </Show>
    {props.tab.label}
    <Show when={props.tab.hint}>
      <span class="sui-tab__hint">{props.tab.hint}</span>
    </Show>
    <Show when={props.tab.status}>
      <span
        class={`sui-tab__status sui-tab__status--${props.tab.status}`}
        title={props.tab.status === "error" ? "Missing data" : "Partial data"}
      >
        !
      </span>
    </Show>
  </button>
);

/** The horizontal strip: measures itself and folds what doesn't fit. */
const FoldingStrip = (props: TabsProps & { class: string }) => {
  let strip: HTMLDivElement | undefined;
  let list: HTMLDivElement | undefined;
  const tabEls = new Map<string, HTMLButtonElement>();
  // null = every tab inline (before the first measure, or no layout).
  const [fold, setFold] = createSignal<TabsFold | null>(null);

  const activeIndex = () =>
    findIndex((t: Tab) => t.id === props.activeTab, props.tabs);

  // Put every tab back, measure, fold — synchronously, so the browser never
  // paints the unfolded strip. Every decision starts from the unfolded strip:
  // inside a parent that sizes itself from its content (a plain Row), the
  // folded strip is narrower than the room it could have, so a decision made
  // from it would never unfold. Call it only outside a reactive scope (a
  // frame, an observer, an event), where the writes reach the DOM at once.
  const measure = () => {
    if (!strip) return;
    setFold(null);
    setFold(
      tabsFold({
        containerWidth: innerWidth(strip),
        tabWidths: map((t: Tab) => naturalWidth(tabEls.get(t.id)), props.tabs),
        gapPx: list ? px(getComputedStyle(list).columnGap) : 0,
        kebabReservePx: KEBAB_RESERVE_PX,
        activeIndex: activeIndex(),
      }),
    );
  };

  // From a reactive scope, measure on the next frame (still before paint).
  let frame: number | undefined;
  const schedule = () => {
    if (isServer) return;
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = undefined;
      measure();
    });
  };
  onCleanup(() => {
    if (frame !== undefined) cancelAnimationFrame(frame);
  });

  // Anything that changes a tab's width, or which tab must stay in view.
  createEffect(
    on(
      () => [
        props.activeTab,
        map((t: Tab) => [t.id, t.label, t.hint, t.status, t.icon], props.tabs),
      ],
      schedule,
    ),
  );

  onMount(() => {
    if (isServer) return;
    // Web fonts change every label's width once they load.
    document.fonts?.ready.then(schedule);
    // A folded strip in a content-sized parent doesn't grow with the window
    // on its own, so its own size never changes; the window's does.
    window.addEventListener("resize", schedule);
    onCleanup(() => window.removeEventListener("resize", schedule));
  });

  // The strip, and the few boxes around it: in a parent that sizes itself
  // from its content (a plain Row in a dialog header), a folded strip never
  // grows when the room does — only an ancestor further out changes size.
  createEffect(() => {
    if (isServer || !strip) return;
    let el: Element | null = strip;
    for (let depth = 0; el && depth <= ANCESTORS_WATCHED; depth++) {
      onCleanup(observeSize(el, measure));
      el = el.parentElement;
    }
  });

  const shown = (): Tab[] => {
    const f = fold();
    return f ? map((i: number) => props.tabs[i], f.inline) : props.tabs;
  };

  const menu = (): [PopoverMenuItem, ...PopoverMenuItem[]] | null => {
    const spill = fold()?.overflow ?? [];
    if (spill.length === 0) return null;
    return map(
      (i: number) => ({ id: props.tabs[i].id, label: props.tabs[i].label }),
      spill,
    ) as [PopoverMenuItem, ...PopoverMenuItem[]];
  };

  return (
    <div class={`${props.class} sui-tabs--folding`} ref={strip}>
      <div class="sui-tabs__list" role="tablist" ref={list}>
        <For each={shown()}>
          {(tab) => (
            <TabButton
              ref={(el) => tabEls.set(tab.id, el)}
              tab={tab}
              active={props.activeTab === tab.id}
              onSelect={props.onTabChange}
            />
          )}
        </For>
      </div>
      <Show when={menu()}>
        {(items) => (
          <span class="sui-tabs__more">
            <PopoverMenu
              trigger={null}
              caretIcon="more-vertical"
              triggerLabel="More tabs"
              items={items()}
              onSelect={props.onTabChange}
              align="right"
              size="sm"
            />
          </span>
        )}
      </Show>
    </div>
  );
};

export const Tabs: Component<TabsProps> = (props) => {
  const vertical = () => props.orientation === "vertical";
  const classes = () => {
    const classList = ["sui-tabs"];
    classList.push(`sui-tabs--${props.variant || "default"}`);
    if (vertical()) classList.push("sui-tabs--vertical");
    if (props.color) classList.push(`sui-tabs--${props.color}`);
    return classList.join(" ");
  };

  return (
    <Show
      when={!vertical()}
      fallback={
        <div class={classes()} role="tablist">
          <For each={props.tabs}>
            {(tab) => (
              <TabButton
                tab={tab}
                active={props.activeTab === tab.id}
                onSelect={props.onTabChange}
              />
            )}
          </For>
        </div>
      }
    >
      <FoldingStrip {...props} class={classes()} />
    </Show>
  );
};

/** Visual overrides — locked at variant-definition time. */
export type TabsOverrides = Pick<
  TabsProps,
  "variant" | "orientation" | "color"
>;

/** Props available to consumers of a curried Tabs variant (tabs/activeTab/onTabChange are runtime). */
export type TabsDataProps = Omit<TabsProps, keyof TabsOverrides>;

export function createTabs(
  defaults: Partial<TabsProps>,
): Component<TabsDataProps> {
  return (props) => <Tabs {...mergeProps(defaults, props)} />;
}
