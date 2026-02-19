// ============================================
// HUDTabs — Atomic (Depth 1)
// Owns CSS (HUD.css), no component imports.
// Tab bar with underline/boxed/pill variants.
// ============================================
import { Component, For, Show } from "solid-js";
import { HUDTabsProps } from "./types";
import "./HUD.css";

export const HUDTabs: Component<HUDTabsProps> = (props) => {
  const classes = () => {
    const classList = ["hud-tabs"];
    classList.push(`hud-tabs--${props.variant || "default"}`);
    if (props.color) classList.push(`hud-tabs--${props.color}`);
    return classList.join(" ");
  };

  return (
    <div class={classes()} role="tablist">
      <For each={props.tabs}>
        {(tab) => (
          <button
            class={`hud-tab ${props.activeTab === tab.id ? "hud-tab--active" : ""} ${tab.status ? `hud-tab--${tab.status}` : ""}`}
            role="tab"
            aria-selected={props.activeTab === tab.id}
            onClick={() => props.onTabChange(tab.id)}
          >
            <Show when={tab.icon}>
              <span class="hud-tab__icon">{tab.icon}</span>
            </Show>
            {tab.label}
            <Show when={tab.status}>
              <span class={`hud-tab__status hud-tab__status--${tab.status}`} title={tab.status === "error" ? "Missing data" : "Partial data"}>
                !
              </span>
            </Show>
          </button>
        )}
      </For>
    </div>
  );
};
