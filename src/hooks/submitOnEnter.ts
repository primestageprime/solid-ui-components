// ============================================
// submitOnEnter / submitHandler — Enter in a field submits its form.
//
// The owner rule (thorcasting, 2026-10-21): Enter in every form submits that
// form, and SUI does it, so no app writes its own Enter handler. `Modal`'s
// `onSubmit` prop uses both functions; a plain `<form>` can use them too:
//
//   <form onKeyDown={submitOnEnter} onSubmit={submitHandler(save)}>
//     <ThemedInput … />
//     <PrimaryButton type="submit" disabled={!canSave()}>Save</PrimaryButton>
//   </form>
//
// WHY NOT THE BROWSER'S OWN IMPLICIT SUBMIT. The browser clicks the form's
// FIRST submit button. A SUI `Button` has no `type`, and a typeless button is
// a submit button, so in a Cancel-then-Save footer the browser clicks Cancel.
// `submitOnEnter` takes the key itself and submits with the first button that
// says `type="submit"` out loud. `submitHandler` ignores a submit that a
// typeless button sent, so a Cancel click never runs the save.
//
// ENTER KEEPS ITS OWN MEANING where it has one. The key passes through when:
// - a handler before this one called `preventDefault` (a Combobox picking an
//   option or creating one, a component that owns the key);
// - the field is not a one-line text field (a textarea adds a newline, a
//   button or a select trigger activates itself, a checkbox toggles);
// - the field has an open popup (`aria-expanded="true"`);
// - an IME composition is in progress, or a modifier key is held.
//
// THE VALUE IS COMMITTED FIRST. A number field (kobalte) clamps and formats
// its value on `change`, which the browser fires on blur. Before it submits,
// `submitOnEnter` fires `change` on the field, so the submit reads the value
// the user would see after a blur (95 in a max-80 field submits 80).
//
// A DISABLED SUBMIT BUTTON means Enter does nothing, as in the browser.
// ============================================

/** Input types that hold one line of typed text. Enter submits from these. */
const ONE_LINE_TYPES: ReadonlySet<string> = new Set([
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "number",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
]);

/** True when an Enter keydown on this target should submit its form. */
export function isSubmitEnter(event: KeyboardEvent): boolean {
  if (event.key !== "Enter" || event.defaultPrevented || event.isComposing)
    return false;
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey)
    return false;
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return false;
  if (!ONE_LINE_TYPES.has(target.type)) return false;
  return target.getAttribute("aria-expanded") !== "true";
}

/**
 * The button Enter submits with: the first button in the form that says
 * `type="submit"` out loud. Undefined when the form has none.
 */
export function explicitSubmitterOf(
  form: HTMLFormElement,
): HTMLButtonElement | HTMLInputElement | undefined {
  const found = form.querySelector<HTMLButtonElement | HTMLInputElement>(
    'button[type="submit"], input[type="submit"]',
  );
  return found ?? undefined;
}

/**
 * A `keydown` handler for a `<form>`: Enter in a one-line field commits the
 * field's value and submits the form. Put it on the form, not the field, so
 * every field handler runs first and can claim the key.
 */
export function submitOnEnter(event: KeyboardEvent): void {
  if (!isSubmitEnter(event)) return;
  const input = event.target as HTMLInputElement;
  const form = input.form;
  if (!form) return;
  // Stop the browser's own implicit submit, which would click the first
  // typeless button (a Cancel).
  event.preventDefault();
  input.dispatchEvent(new Event("change", { bubbles: true }));
  const submitter = explicitSubmitterOf(form);
  if (submitter?.disabled) return;
  form.requestSubmit(submitter);
}

/**
 * A `submit` handler for a `<form>`: stops the page load and runs `onSubmit`.
 * A submit sent by a button with no `type` (a Cancel or a stepper in the
 * form) is ignored, because only `type="submit"` means "submit".
 */
export function submitHandler(
  onSubmit: () => void,
): (event: SubmitEvent) => void {
  return (event) => {
    event.preventDefault();
    const submitter = event.submitter;
    if (submitter && submitter.getAttribute("type") !== "submit") return;
    onSubmit();
  };
}
