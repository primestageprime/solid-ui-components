// ============================================
// ThemedTextarea — Atomic (Depth 1)
// Owns CSS (ThemedInputs.css), no component imports.
// Styled textarea with optional label.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import "./ThemedInputs.css";

export interface ThemedTextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const ThemedTextarea: Component<ThemedTextareaProps> = (props) => {
  const [local, others] = splitProps(props, ["label", "class"]);

  const classes = () => {
    const classList = ["themed-textarea"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class="themed-input-group">
      {local.label && <label class="themed-input-label">{local.label}</label>}
      <textarea class={classes()} {...others} />
    </div>
  );
};
