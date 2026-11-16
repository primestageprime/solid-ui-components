// noAutofill — the attributes every text-like input carries by default, and
// the `autofill` opt-in for a field that holds the user's own details.
export { NO_AUTOFILL_ATTRS, noAutofillAttrs, wantsAutofill } from "./noAutofill";
export type {
  AutofillChoice,
  AutofillProps,
  NoAutofillAttrs,
} from "./noAutofill";
export { ThemedInput } from "./ThemedInput";
export type { ThemedInputProps } from "./ThemedInput";
export { NameInput } from "./NameInput";
export type { NameInputProps } from "./NameInput";
export { ThemedTextarea } from "./ThemedTextarea";
export type { ThemedTextareaProps } from "./ThemedTextarea";
// FillTextArea — the fill-the-parent sibling of ThemedTextarea; data-only, re-exported as-is.
export { FillTextArea } from "./FillTextArea";
export type { FillTextAreaProps } from "./FillTextArea";
