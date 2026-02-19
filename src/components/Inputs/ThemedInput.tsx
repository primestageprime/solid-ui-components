// ============================================
// ThemedInput — Atomic (Depth 1)
// Owns CSS (ThemedInputs.css), no component imports.
// Styled text input with optional label.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import "./ThemedInputs.css";

export interface ThemedInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const ThemedInput: Component<ThemedInputProps> = (props) => {
  const [local, others] = splitProps(props, ["label", "class"]);

  const classes = () => {
    const classList = ["themed-input"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class="themed-input-group">
      {local.label && <label class="themed-input-label">{local.label}</label>}
      <input class={classes()} {...others} />
    </div>
  );
};
