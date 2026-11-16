// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ThemedTextarea — Atomic (Depth 1)
// Tags: shows:field, shows:text, does:type, does:edit, data:text, role:control
// Owns CSS (ThemedInputs.css), no component imports.
// Styled textarea with optional label.
// ============================================
import { type Component, type JSX, createUniqueId, splitProps } from "solid-js";
import { GrowColumn } from "../Layout/variants";
import "./ThemedInputs.css";
import { type AutofillProps, noAutofillAttrs } from "./noAutofill";

export interface ThemedTextareaProps
  extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
    AutofillProps {
  label?: string;
}

export const ThemedTextarea: Component<ThemedTextareaProps> = (props) => {
  const [local, others] = splitProps(props, [
    "label",
    "class",
    "id",
    "autofill",
  ]);

  const generatedId = createUniqueId();
  const textareaId = () => local.id ?? generatedId;

  const classes = () => {
    const classList = ["themed-textarea"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  // Field column composed from the GrowColumn Layout variant (label above the
  // textarea, growing in a form row); the label keeps its own margin-bottom.
  return (
    <GrowColumn class="themed-input-group">
      {local.label && (
        <label class="themed-input-label" for={textareaId()}>
          {local.label}
        </label>
      )}
      <textarea
        {...noAutofillAttrs({
          autofill: local.autofill,
          autocomplete: others.autocomplete,
        })}
        id={textareaId()}
        class={classes()}
        {...others}
      />
    </GrowColumn>
  );
};
