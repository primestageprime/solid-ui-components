// ============================================
// noAutofill — the one statement of "this field holds app data, not the
// user's personal details".
//
// Every text-like <input> / <textarea> the library renders spreads
// `noAutofillAttrs()` by default, so a browser or a password manager does not
// offer to fill a contact card, an address or a login into a scenario name, an
// amount or a filter box. A field that really does hold the user's own details
// (a login email, a profile name) opts back in with `autofill`, or by stating
// an `autocomplete` value such as "email": either drops the whole set.
//
// What each attribute is for:
//   autocomplete="off"            the standard. Honoured for history
//                                 dropdowns; Chrome may still offer address
//                                 autofill on a field it reads as one.
//   data-1p-ignore, data-op-ignore  1Password (the vendor documents both).
//   data-lpignore="true"          LastPass (needs the explicit "true").
//   data-bwignore="true"          Bitwarden.
//   data-form-type="other"        Dashlane.
//   data-protonpass-ignore="true" Proton Pass.
//
// What it cannot do: a manager that publishes no opt-out attribute decides
// from the field's label and name alone, and these attributes do not reach
// it. That is the user's setting to change ("don't autofill this field / this
// site"), not something a page can state.
//
// A guard test (noAutofill.guard.test.ts) fails when a component renders a
// text-like <input> or <textarea> without this helper.
// ============================================

/** The attributes that tell browsers and password managers to leave a field
 *  alone. Frozen: read it, do not extend it per component. */
export const NO_AUTOFILL_ATTRS = Object.freeze({
  autocomplete: "off",
  "data-1p-ignore": "true",
  "data-op-ignore": "true",
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
  "data-protonpass-ignore": "true",
} as const);

export type NoAutofillAttrs = Partial<typeof NO_AUTOFILL_ATTRS>;

/** The opt-in a field component takes. */
export interface AutofillProps {
  /** True for a field that holds the user's own details (a login email, a
   *  profile name): the browser and password managers may offer to fill it.
   *  Default false: the field carries the no-autofill attributes. */
  autofill?: boolean;
}

/** What `noAutofillAttrs` reads to decide. */
export interface AutofillChoice extends AutofillProps {
  /** A stated `autocomplete` other than "off" is itself the opt-in. */
  autocomplete?: string | undefined;
}

/** Whether the caller asked for autofill: `autofill`, or an `autocomplete`
 *  value that names what the field holds. */
export const wantsAutofill = (choice?: AutofillChoice): boolean =>
  choice?.autofill === true ||
  (choice?.autocomplete != null &&
    choice.autocomplete !== "" &&
    choice.autocomplete !== "off");

const NONE: NoAutofillAttrs = Object.freeze({});

/** The attributes to spread on a text-like input: the whole no-autofill set,
 *  or nothing when the caller opted in. Spread it BEFORE the caller's own
 *  attributes so a stated `autocomplete` wins. */
export const noAutofillAttrs = (choice?: AutofillChoice): NoAutofillAttrs =>
  wantsAutofill(choice) ? NONE : NO_AUTOFILL_ATTRS;
