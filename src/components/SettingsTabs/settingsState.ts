// settingsState (Depth 0, headless). The stub models behind the generic Localization
// and Sharing settings tabs: small persisted signals the app can read in its dump(). They live in
// SUI so no app has to invent a locale or a share model; replace them with a real backend model by
// ignoring the setters and passing your own values to the tab components.
import { createSignal } from "solid-js";

export type LocalizationState = { locale: string; hour12: boolean };
export type SharingState = { visibility: "private" | "team" | "link"; allowEdit: boolean };

export const LOCALES = ["en-US", "en-GB", "de-DE", "fr-FR"] as const;
export const VISIBILITIES = ["private", "team", "link"] as const;

const read = <S extends object>(key: string, fallback: S): S => {
  try {
    if (typeof localStorage === "undefined") return fallback;
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<S>) } : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: object): void => {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: the signal still holds the value for this session
  }
};

const LOCALIZATION_KEY = "sui.settings.localization.v1";
const SHARING_KEY = "sui.settings.sharing.v1";
const [localization, setLocalizationSignal] = createSignal<LocalizationState>(
  read(LOCALIZATION_KEY, { locale: "en-US", hour12: false }),
);
const [sharing, setSharingSignal] = createSignal<SharingState>(
  read(SHARING_KEY, { visibility: "private", allowEdit: false }),
);

/** The current localization choice (observable: put it in your dump()). */
export const localizationState = (): LocalizationState => localization();
/** Merge a change into the localization choice and persist it. */
export function setLocalization(patch: Partial<LocalizationState>): void {
  const next = { ...localization(), ...patch };
  setLocalizationSignal(next);
  write(LOCALIZATION_KEY, next);
}
/** The current sharing choice (observable: put it in your dump()). */
export const sharingState = (): SharingState => sharing();
/** Merge a change into the sharing choice and persist it. */
export function setSharing(patch: Partial<SharingState>): void {
  const next = { ...sharing(), ...patch };
  setSharingSignal(next);
  write(SHARING_KEY, next);
}
