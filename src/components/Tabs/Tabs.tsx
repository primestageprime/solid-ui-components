// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Tabs — Atomic (Depth 1)
// Owns CSS (Tabs.css), no component imports.
// Tab bar with horizontal or vertical orientation,
// and underline/boxed/pill variants.
// ============================================
import { type Component, For, type JSX, Show, mergeProps } from "solid-js";
import type { ColorVariant } from "../../types";
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

export const Tabs: Component<TabsProps> = (props) => {
  const classes = () => {
    const classList = ["sui-tabs"];
    classList.push(`sui-tabs--${props.variant || "default"}`);
    if (props.orientation === "vertical") classList.push("sui-tabs--vertical");
    if (props.color) classList.push(`sui-tabs--${props.color}`);
    return classList.join(" ");
  };

  return (
    <div class={classes()} role="tablist">
      <For each={props.tabs}>
        {(tab) => (
          <button
            class={`sui-tab ${props.activeTab === tab.id ? "sui-tab--active" : ""} ${tab.status ? `sui-tab--${tab.status}` : ""}`}
            role="tab"
            aria-selected={props.activeTab === tab.id}
            onClick={() => props.onTabChange(tab.id)}
          >
            <Show when={tab.icon}>
              <span class="sui-tab__icon">{tab.icon}</span>
            </Show>
            {tab.label}
            <Show when={tab.hint}>
              <span class="sui-tab__hint">{tab.hint}</span>
            </Show>
            <Show when={tab.status}>
              <span class={`sui-tab__status sui-tab__status--${tab.status}`} title={tab.status === "error" ? "Missing data" : "Partial data"}>
                !
              </span>
            </Show>
          </button>
        )}
      </For>
    </div>
  );
};

/** Visual overrides — locked at variant-definition time. */
export type TabsOverrides = Pick<TabsProps, "variant" | "orientation" | "color">;

/** Props available to consumers of a curried Tabs variant (tabs/activeTab/onTabChange are runtime). */
export type TabsDataProps = Omit<TabsProps, keyof TabsOverrides>;

export function createTabs(defaults: Partial<TabsProps>): Component<TabsDataProps> {
  return (props) => <Tabs {...mergeProps(defaults, props)} />;
}
