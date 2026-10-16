// ============================================
// FillTextArea — Atomic (Depth 1)
// Owns CSS (ThemedInputs.css, shared with ThemedTextarea), imports only the
// FillColumnFlush Layout variant.
// A themed textarea that takes all the height its flex-column parent has left:
// the label (if any) keeps its line, the textarea fills the rest and scrolls
// its own text, and the browser's drag-to-resize handle is off because the
// parent decides the size. The sibling of ThemedTextarea, which keeps a
// content-driven height.
//   <FillColumn> …header… <FillTextArea label="Notes" value={…} onInput={…} /> </FillColumn>
// Data-only (label + every native <textarea> attribute): nothing presentational
// to freeze, so it is exported directly, like ThemedTextarea.
// ============================================
import { type Component, type JSX, createUniqueId, splitProps } from "solid-js";
import { FillColumnFlush } from "../Layout/variants";
import "./ThemedInputs.css";

export interface FillTextAreaProps
  extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const FillTextArea: Component<FillTextAreaProps> = (props) => {
  const [local, others] = splitProps(props, ["label", "class", "id"]);

  const generatedId = createUniqueId();
  const textareaId = () => local.id ?? generatedId;
  const classes = () =>
    local.class
      ? `themed-textarea themed-textarea--fill ${local.class}`
      : "themed-textarea themed-textarea--fill";

  return (
    <FillColumnFlush class="themed-input-group themed-input-group--fill">
      {local.label && (
        <label class="themed-input-label" for={textareaId()}>
          {local.label}
        </label>
      )}
      <textarea id={textareaId()} class={classes()} {...others} />
    </FillColumnFlush>
  );
};
