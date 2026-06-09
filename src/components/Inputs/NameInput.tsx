// ============================================
// NameInput — Atomic (Depth 1)
// A text input for ENTITY names (scenario name, option name, a label you're
// authoring) that suppresses BOTH browser autofill (the "Contact Info" popup)
// AND password-manager suggestions. Use it for names that are NOT the user's
// own PII — i.e. not a person's name / email / address / phone. For real user
// info, use ThemedInput so autofill still helps.
//
// The anti-autofill pattern, layered because no single attribute is reliable:
//   • autocomplete="off" + a RANDOMIZED name — breaks the browser's heuristic
//     field-correlation (it keys off name/label).
//   • data-1p-ignore / data-lpignore / data-form-type="other" — 1Password,
//     LastPass, Dashlane bow out.
//   • readonly-until-focus — the reliable defeat for Chrome's contact autofill:
//     Chrome won't autofill a readonly field; we drop readonly the instant the
//     field is focused (including via autofocus), so typing is unaffected.
// Owns no CSS of its own — reuses ThemedInputs.css for visual parity.
// ============================================
import { Component, JSX, splitProps, createSignal, createUniqueId } from "solid-js";
import "./ThemedInputs.css";

export interface NameInputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "autocomplete" | "name"> {
  label?: string;
}

export const NameInput: Component<NameInputProps> = (props) => {
  const [local, others] = splitProps(props, ["label", "class"]);
  const [readOnly, setReadOnly] = createSignal(true);
  const fieldName = `nm-${createUniqueId()}`;

  const classes = () =>
    ["themed-input", local.class].filter(Boolean).join(" ");

  return (
    <div class="themed-input-group">
      {local.label && <label class="themed-input-label">{local.label}</label>}
      <input
        {...others}
        class={classes()}
        name={fieldName}
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck={false}
        data-1p-ignore="true"
        data-lpignore="true"
        data-form-type="other"
        readonly={readOnly()}
        onFocus={() => setReadOnly(false)}
      />
    </div>
  );
};
