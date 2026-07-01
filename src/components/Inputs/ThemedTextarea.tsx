// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ThemedTextarea — Atomic (Depth 1)
// Owns CSS (ThemedInputs.css), no component imports.
// Styled textarea with optional label.
// ============================================
import { type Component, type JSX, createUniqueId, splitProps } from "solid-js";
import "./ThemedInputs.css";

export interface ThemedTextareaProps
  extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const ThemedTextarea: Component<ThemedTextareaProps> = (props) => {
  const [local, others] = splitProps(props, ["label", "class", "id"]);

  const generatedId = createUniqueId();
  const textareaId = () => local.id ?? generatedId;

  const classes = () => {
    const classList = ["themed-textarea"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class="themed-input-group">
      {local.label && (
        <label class="themed-input-label" for={textareaId()}>
          {local.label}
        </label>
      )}
      <textarea id={textareaId()} class={classes()} {...others} />
    </div>
  );
};
