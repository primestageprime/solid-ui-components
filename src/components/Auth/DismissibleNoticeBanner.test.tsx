import { describe, it, expect, beforeEach } from "vitest";
import { render, waitFor } from "@solidjs/testing-library";
import { DismissibleNoticeBanner } from "./DismissibleNoticeBanner";
import type { AuthApi } from "./types";

const USER = { sub: "auth0|primary", name: "A", email: "a@b.c" };

/** Fake auth: only the members the banner touches are meaningful. */
function fakeAuth(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    getAuth0User: async () => USER,
    logout: async () => {},
    getMyIdentities: async () => null,
    linkAnotherMethod: async () => [],
    unlinkMethod: async () => [],
    getUnlinkedSiblingHint: async () => "google-oauth2",
    connections: () => [
      { connection: "google-oauth2", label: "Google" },
      { connection: "email", label: "Email (one-time code)" },
    ],
    connectionLabel: (c) => (c === "google-oauth2" ? "Google" : c),
    ...overrides,
  };
}

beforeEach(() => localStorage.clear());

describe("DismissibleNoticeBanner", () => {
  it("renders nothing when there is no hint", async () => {
    const auth = fakeAuth({ getUnlinkedSiblingHint: async () => null });
    const { container } = render(() => (
      <DismissibleNoticeBanner auth={auth} settingsHref="/settings" />
    ));
    await Promise.resolve();
    expect(container.textContent).toBe("");
  });

  it("shows the sibling's provider label and the settings link", async () => {
    const { container, getByText } = render(() => (
      <DismissibleNoticeBanner auth={fakeAuth()} settingsHref="/settings" />
    ));
    await waitFor(() => expect(container.textContent).toContain("Google"));
    expect(container.textContent).toContain("its data is combined into this account");
    const link = getByText("Open Settings") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/settings");
  });

  it("dismiss hides the banner and persists per-sub", async () => {
    const { container, getByLabelText } = render(() => (
      <DismissibleNoticeBanner auth={fakeAuth()} settingsHref="/settings" />
    ));
    await waitFor(() => expect(container.textContent).toContain("Google"));
    (getByLabelText("Dismiss") as HTMLButtonElement).click();
    expect(container.textContent).toBe("");
    expect(localStorage.getItem("sui_sibling_banner_dismissed:auth0|primary")).toBe("1");
  });

  it("stays hidden for a previously dismissed sub", async () => {
    localStorage.setItem("sui_sibling_banner_dismissed:auth0|primary", "1");
    const { container } = render(() => (
      <DismissibleNoticeBanner auth={fakeAuth()} settingsHref="/settings" />
    ));
    await Promise.resolve();
    await Promise.resolve();
    expect(container.textContent).toBe("");
  });

  it("renders nothing when signed out even if a stale hint resolves", async () => {
    const auth = fakeAuth({ getAuth0User: async () => null });
    const { container } = render(() => (
      <DismissibleNoticeBanner auth={auth} settingsHref="/settings" />
    ));
    await Promise.resolve();
    await Promise.resolve();
    expect(container.textContent).toBe("");
  });
});
