// LocalizationSettings and SharingSettings (Depth 2). The bodies of the two generic
// settings tabs every app shows beside Theme. Uncontrolled they run on the stub model in
// settingsState.ts; give `value` and `onChange` to drive them from the app's own model (the
// scaffold passes its ~/lib/preferences, so the tab's branch calls an app mutator).
// The app keeps its tab branch (`=== "localization"`) and renders the component inside it.
import type { Component } from "solid-js";
import { map } from "../../fn";
import { TightStack } from "../Layout";
import { SegmentedControl } from "../SegmentedControl";
import { TextLabel } from "../Text";
import { Toggle } from "../Toggle";
import {
  LOCALES,
  VISIBILITIES,
  localizationState,
  setLocalization,
  setSharing,
  sharingState,
  type LocalizationState,
  type SharingState,
} from "./settingsState";

const LOCALE_OPTIONS = map((value) => ({ value }), LOCALES);
const VISIBILITY_OPTIONS = map((value) => ({ value }), VISIBILITIES);

export interface LocalizationSettingsProps {
  /** The current choice (default: the stub model). */
  value?: LocalizationState;
  /** Called with the changed field (default: stores it in the stub model). */
  onChange?: (patch: Partial<LocalizationState>) => void;
}

/** The Localization settings tab body: a locale choice and a 12-hour toggle, on the persisted stub model or the caller's `value` + `onChange`. */
export const LocalizationSettings: Component<LocalizationSettingsProps> = (props) => {
  const value = (): LocalizationState => props.value ?? localizationState();
  const change = (patch: Partial<LocalizationState>): void =>
    (props.onChange ?? setLocalization)(patch);
  return (
    <TightStack>
      <TextLabel>Language and region</TextLabel>
      <SegmentedControl
        options={LOCALE_OPTIONS}
        value={value().locale}
        onValueChange={(locale) => change({ locale })}
      />
      <Toggle
        label="12-hour clock"
        checked={value().hour12}
        onCheckedChange={(hour12) => change({ hour12 })}
      />
    </TightStack>
  );
};

export interface SharingSettingsProps {
  /** The current choice (default: the stub model). */
  value?: SharingState;
  /** Called with the changed field (default: stores it in the stub model). */
  onChange?: (patch: Partial<SharingState>) => void;
}

/** The Sharing settings tab body: who can open it and an allow-edit toggle, on the persisted stub model or the caller's `value` + `onChange`. */
export const SharingSettings: Component<SharingSettingsProps> = (props) => {
  const value = (): SharingState => props.value ?? sharingState();
  const change = (patch: Partial<SharingState>): void =>
    (props.onChange ?? setSharing)(patch);
  return (
    <TightStack>
      <TextLabel>Who can open this</TextLabel>
      <SegmentedControl
        options={VISIBILITY_OPTIONS}
        value={value().visibility}
        onValueChange={(visibility) =>
          change({ visibility: visibility as SharingState["visibility"] })
        }
      />
      <Toggle
        label="Allow others to edit"
        checked={value().allowEdit}
        onCheckedChange={(allowEdit) => change({ allowEdit })}
      />
    </TightStack>
  );
};
