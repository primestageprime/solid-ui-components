import { fireEvent, render } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it } from "vitest";
import { LocalizationSettings, SharingSettings } from "./SettingsTabs";
import { localizationState, setLocalization, setSharing, sharingState } from "./settingsState";

beforeEach(() => {
  localStorage.clear();
  setLocalization({ locale: "en-US", hour12: false });
  setSharing({ visibility: "private", allowEdit: false });
});

describe("generic settings tabs", () => {
  it("driven by value and onChange, the stub model is left alone", () => {
    const seen: unknown[] = [];
    const { getByText } = render(() => (
      <LocalizationSettings value={{ locale: "fr-FR", hour12: true }} onChange={(p) => seen.push(p)} />
    ));
    fireEvent.click(getByText("en-GB"));
    expect(seen).toEqual([{ locale: "en-GB" }]);
    expect(localizationState().locale).toBe("en-US");
  });

  it("localization stores the chosen locale and persists it", () => {
    const { getByText } = render(() => <LocalizationSettings />);
    fireEvent.click(getByText("de-DE"));
    expect(localizationState().locale).toBe("de-DE");
    expect(JSON.parse(localStorage.getItem("sui.settings.localization.v1") ?? "{}").locale).toBe("de-DE");
  });

  it("sharing stores the visibility", () => {
    const { getByText } = render(() => <SharingSettings />);
    fireEvent.click(getByText("team"));
    expect(sharingState().visibility).toBe("team");
  });
});
