// ============================================
// BigNumberInput — Atomic (Depth 1)
// Owns CSS (BigNumberInput.css), no component imports.
// An editable numeric input rendered at a LARGE font (the
// size of a `Text variant="value"` headline). Used to edit
// a money amount in place. Optional `prefix` (e.g. "$") and
// optional leading `sign` ("+"/"-") render as static chrome.
//   <BigNumberInput value={1200} prefix="$" sign="+"
//                   onChange={(n) => ...} />
// Controlled + loop-free: a local string buffer mirrors the
// input text and only re-syncs from `value` when the parsed
// number actually differs, so typing never fights the prop.
// Factory: createBigNumberInput() for curried variants.
// ============================================
import {
  Component,
  JSX,
  Show,
  createSignal,
  createEffect,
  mergeProps,
  splitProps,
} from "solid-js";
import "./BigNumberInput.css";

export interface BigNumberInputProps
  extends Omit<
    JSX.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "type" | "prefix"
  > {
  /** Current numeric value (controlled). */
  value: number;
  /** Called with the parsed number whenever the input changes. */
  onChange: (n: number) => void;
  /** Optional static prefix rendered before the number, e.g. "$". */
  prefix?: string;
  /** Optional leading sign glyph. "none" (default) renders nothing. */
  sign?: "+" | "-" | "none";
  /** Text alignment of the number. Default "left". */
  align?: "left" | "right";
}

/** Parse the editable buffer to a number; empty / partial → 0. */
function parse(raw: string): number {
  if (raw.trim() === "" || raw === "-" || raw === ".") return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

export const BigNumberInput: Component<BigNumberInputProps> = (props) => {
  const [local, others] = splitProps(props, [
    "value",
    "onChange",
    "prefix",
    "sign",
    "align",
    "class",
  ]);

  // Local editable buffer. Initialised from the incoming value.
  const [text, setText] = createSignal(String(local.value));

  // Re-sync the buffer from `value` ONLY when the prop's numeric value
  // diverges from what the buffer currently represents. This keeps the
  // component controlled without clobbering in-progress edits (e.g. a
  // trailing "." or "-0") and avoids a typing<->prop feedback loop.
  createEffect(() => {
    const incoming = local.value;
    if (parse(text()) !== incoming) {
      setText(String(incoming));
    }
  });

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    const raw = e.currentTarget.value;
    setText(raw);
    local.onChange(parse(raw));
  };

  const rootClass = () =>
    local.class ? `sui-big-number ${local.class}` : "sui-big-number";

  const signGlyph = () =>
    local.sign && local.sign !== "none" ? local.sign : null;

  return (
    <div class={rootClass()}>
      <Show when={signGlyph()}>
        <span class="sui-big-number__sign" aria-hidden="true">
          {signGlyph()}
        </span>
      </Show>
      <Show when={local.prefix}>
        <span class="sui-big-number__prefix" aria-hidden="true">
          {local.prefix}
        </span>
      </Show>
      <input
        type="text"
        inputmode="decimal"
        class="sui-big-number__input"
        style={{ "text-align": local.align ?? "left" }}
        value={text()}
        onInput={handleInput}
        {...others}
      />
    </div>
  );
};

export function createBigNumberInput(
  defaults: Partial<BigNumberInputProps>,
): Component<BigNumberInputProps> {
  return (props) => <BigNumberInput {...mergeProps(defaults, props)} />;
}
