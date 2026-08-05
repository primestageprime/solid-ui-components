// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ThemedInput — Atomic (Depth 1)
// Owns CSS (ThemedInputs.css), no component imports.
// Styled text input with optional label.
// ============================================
import { type Component, type JSX, createUniqueId, splitProps } from "solid-js";
import { GrowColumn } from "../Layout/variants";
import "./ThemedInputs.css";

export interface ThemedInputProps
  extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /**
   * Fires with the input's current value when Enter is pressed — baked in so
   * a call site never has to hand-wire its own `onKeyDown` just to submit on
   * Enter (the same "commit on Enter" idiom `EditableTitle` already bakes in
   * internally). Composes with a caller-supplied `onKeyDown`, which still
   * fires first if given — this doesn't replace it, only adds the Enter case.
   */
  onSubmit?: (value: string) => void;
}

export const ThemedInput: Component<ThemedInputProps> = (props) => {
  const [local, others] = splitProps(props, [
    "label",
    "class",
    "id",
    "onSubmit",
    "onKeyDown",
  ]);

  const generatedId = createUniqueId();
  const inputId = () => local.id ?? generatedId;

  const classes = () => {
    const classList = ["themed-input"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  // Forwards to any caller-supplied `onKeyDown` (preserving the existing
  // InputHTMLAttributes contract — function OR Solid's `[handler, data]`
  // tuple form, same composition Toggle's onChange/onCheckedChange uses)
  // before checking Enter for `onSubmit`.
  const handleKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (e) => {
    const native = local.onKeyDown;
    if (typeof native === "function") {
      native(e);
    } else if (Array.isArray(native)) {
      const [handler, data] = native;
      (handler as (data: unknown, event: typeof e) => void)(data, e);
    }
    if (e.key === "Enter") local.onSubmit?.(e.currentTarget.value);
  };

  // The field column (label above input, growing in a form row) is composed
  // from the GrowColumn Layout variant; the label keeps its own margin-bottom.
  return (
    <GrowColumn class="themed-input-group">
      {local.label && (
        <label class="themed-input-label" for={inputId()}>
          {local.label}
        </label>
      )}
      <input
        id={inputId()}
        class={classes()}
        onKeyDown={handleKeyDown}
        {...others}
      />
    </GrowColumn>
  );
};
