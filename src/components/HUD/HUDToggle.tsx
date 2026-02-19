// ============================================
// HUDToggle — Atomic (Depth 1)
// Owns CSS (HUD.css), no component imports.
// Sci-fi toggle with power/circuit/minimal variants.
// ============================================
import { Component, Show } from "solid-js";
import { HUDToggleProps } from "./types";
import "./HUD.css";

export const HUDToggle: Component<HUDToggleProps> = (props) => {
  const handleClick = () => {
    if (!props.disabled && props.onChange) {
      props.onChange(!props.checked);
    }
  };

  const classes = () => {
    const classList = ["hud-toggle"];
    if (props.checked) classList.push("hud-toggle--checked");
    if (props.disabled) classList.push("hud-toggle--disabled");
    if (props.variant) classList.push(`hud-toggle--${props.variant}`);
    if (props.color) classList.push(`hud-toggle--${props.color}`);
    return classList.join(" ");
  };

  const trackClasses = () => {
    const classList = ["hud-toggle__track"];
    if (props.size) classList.push(`hud-toggle__track--${props.size}`);
    return classList.join(" ");
  };

  return (
    <label
      class={classes()}
      style={{
        "flex-direction": props.labelPosition === "left" ? "row-reverse" : "row",
      }}
    >
      <Show when={props.label}>
        <span class="hud-toggle__label">{props.label}</span>
      </Show>
      <span class={trackClasses()} onClick={handleClick}>
        <span class="hud-toggle__thumb" />
      </span>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange?.(e.currentTarget.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
    </label>
  );
};
