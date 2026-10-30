// ============================================
// BottomTabBar — Primitive (Depth 1)
// Tags: shows:tabs, shows:icon, shows:link, does:navigate, data:list, role:rail
// Owns BottomTabBar.css; no component imports.
//
// THE PHONE'S PRIMARY NAV: three to five sections pinned under the page, an
// icon over a short label in each, the current one in the accent. Every tab
// is a plain `<a href>` (no router import), so a SolidStart / solid-router
// app gets SPA navigation from the router's own link delegation and anything
// else gets a normal page load. The caller says which tab is current with
// `active` (the matching href) and owns the routing rule behind it.
//
// Not `OverflowNav`: that is a horizontal text nav that folds into a kebab.
// Not `Tabs`: those switch panels in place. This is page-level navigation,
// sized for a thumb (48px targets) and laid out in equal columns.
//
// Icons are DATA, a path in a 24×24 viewBox drawn as a 1.8px stroke, so a
// module-scope items array carries no JSX (JSX built outside a reactive root
// stops tracking).
// ============================================
import { type Component, For, mergeProps } from "solid-js";
import "./BottomTabBar.css";

export interface BottomTab {
  readonly href: string;
  readonly label: string;
  /** SVG path data in a 24×24 viewBox, drawn as a stroke. Omit for a text-only tab. */
  readonly icon?: string;
}

export interface BottomTabBarProps {
  readonly items: readonly BottomTab[];
  /** href of the current tab. */
  readonly active?: string;
  /** Accessible name of the nav landmark. Default "Sections". */
  readonly label?: string;
}

export const BottomTabBar: Component<BottomTabBarProps> = (props) => (
  <nav class="sui-bottom-tab-bar" aria-label={props.label ?? "Sections"}>
    <For each={props.items}>
      {(tab) => (
        <a
          class="sui-bottom-tab-bar__tab"
          href={tab.href}
          aria-current={tab.href === props.active ? "page" : undefined}
        >
          {tab.icon ? (
            <svg
              class="sui-bottom-tab-bar__icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d={tab.icon} />
            </svg>
          ) : null}
          <span class="sui-bottom-tab-bar__label">{tab.label}</span>
        </a>
      )}
    </For>
  </nav>
);

/** Props that are visual/static overrides — none today; one look. */
export type BottomTabBarOverrides = Pick<BottomTabBarProps, "label">;

/** Props that remain available to consumers of a curried BottomTabBar variant. */
export type BottomTabBarDataProps = Omit<
  BottomTabBarProps,
  keyof BottomTabBarOverrides
>;

export function createBottomTabBar(
  defaults: BottomTabBarOverrides = {},
): Component<BottomTabBarDataProps> {
  return (props) => <BottomTabBar {...mergeProps(defaults, props)} />;
}
