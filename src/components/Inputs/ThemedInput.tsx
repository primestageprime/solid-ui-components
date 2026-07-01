// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ThemedInput — Atomic (Depth 1)
// Owns CSS (ThemedInputs.css), no component imports.
// Styled text input with optional label.
// ============================================
import {
  type Component,
  type JSX,
  createUniqueId,
  splitProps,
} from "solid-js";
import "./ThemedInputs.css";

export interface ThemedInputProps
  extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const ThemedInput: Component<ThemedInputProps> = (props) => {
  const [local, others] = splitProps(props, ["label", "class", "id"]);

  const generatedId = createUniqueId();
  const inputId = () => local.id ?? generatedId;

  const classes = () => {
    const classList = ["themed-input"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class="themed-input-group">
      {local.label && (
        <label class="themed-input-label" for={inputId()}>
          {local.label}
        </label>
      )}
      <input id={inputId()} class={classes()} {...others} />
    </div>
  );
};
