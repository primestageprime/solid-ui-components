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
// A free-text single-line field (a name, a title, a filter) spreads
// `noAutofillTextAttrs()` instead, which adds:
//   inputmode="search"            NordPass. It publishes no opt-out
//   enterkeyhint="done"           attribute and ignores every one above: it
//                                 offers "Contact Info" on any text input
//                                 whose label, placeholder, aria-label, name
//                                 or id reads "Name" (also "Email", "Phone",
//                                 "First name"). Tried in the browser on
//                                 2026-11-16 (thorcasting 4530): of the
//                                 honest attributes only inputmode="search"
//                                 stopped it, in every one of those cases.
//                                 It is a keyboard hint, not a role: a
//                                 desktop reads nothing from it, and a phone
//                                 keyboard keeps its normal layout with the
//                                 return key labelled by enterkeyhint.
//                                 This is OBSERVED behaviour, not a contract:
//                                 the vendor can change it. type="search",
//                                 role="combobox" and a held readonly also
//                                 stopped it and are not used (they change
//                                 what the field is); autocomplete values
//                                 "one-time-code" / "new-password" did not.
// A number field keeps its own inputmode="decimal", and a textarea, a search
// field and a combobox input were never offered the popup, so those spread
// the plain set.
//
// What it cannot do: any other manager that publishes no opt-out attribute
// decides from the field's label and name alone. That is the user's setting
// to change ("don't autofill this field / this site"), not something a page
// can state.
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

/** The set for a free-text single-line field: the plain set plus the keyboard
 *  hint that stops the one manager no opt-out attribute reaches (see the
 *  header). Frozen. */
export const NO_AUTOFILL_TEXT_ATTRS = Object.freeze({
  ...NO_AUTOFILL_ATTRS,
  inputmode: "search",
  enterkeyhint: "done",
} as const);

export type NoAutofillTextAttrs = Partial<typeof NO_AUTOFILL_TEXT_ATTRS>;

/** What `noAutofillTextAttrs` reads to decide. */
export interface AutofillTextChoice extends AutofillChoice {
  /** The input's `type`. Only a text input (no `type`, or "text") takes the
   *  keyboard hint; an email, number or password input keeps the keyboard its
   *  type asks for. */
  type?: string | undefined;
}

/** The attributes to spread on a free-text single-line input: the text set,
 *  the plain set for an input of another `type`, or nothing when the caller
 *  opted in. Spread it BEFORE the caller's own attributes so a stated
 *  `autocomplete`, `inputmode` or `enterkeyhint` wins. */
export const noAutofillTextAttrs = (
  choice?: AutofillTextChoice,
): NoAutofillTextAttrs => {
  if (wantsAutofill(choice)) return NONE;
  const type = choice?.type;
  return type == null || type === "" || type === "text"
    ? NO_AUTOFILL_TEXT_ATTRS
    : NO_AUTOFILL_ATTRS;
};
