import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@solidjs/testing-library";
import { ManagedListSection } from "./ManagedListSection";
import type { AuthApi, AuthIdentity } from "./types";

const USER = { sub: "google-oauth2|123", name: "A", email: "a@b.c" };
const IDS: AuthIdentity[] = [
  { provider: "google-oauth2", user_id: "123", connection: "google-oauth2", isSocial: true },
  { provider: "email", user_id: "456", connection: "email", isSocial: false },
];

function fakeAuth(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    getAuth0User: async () => USER,
    logout: vi.fn(async () => {}),
    getMyIdentities: async () => IDS,
    linkAnotherMethod: vi.fn(async () => []),
    unlinkMethod: vi.fn(async () => [IDS[0]]),
    getUnlinkedSiblingHint: async () => null,
    connections: () => [
      { connection: "google-oauth2", label: "Google" },
      { connection: "email", label: "Email (one-time code)" },
    ],
    connectionLabel: (c) =>
      c === "google-oauth2" ? "Google" : c === "email" ? "Email (one-time code)" : c,
    ...overrides,
  };
}
const noopMerge = async (_t: string) => {};

describe("ManagedListSection", () => {
  it("loads identities silently on mount and marks the primary", async () => {
    const { container } = render(() => (
      <ManagedListSection auth={fakeAuth()} mergeBeforeLink={noopMerge} />
    ));
    await waitFor(() => expect(container.textContent).toContain("Google (primary)"));
    expect(container.textContent).toContain("Email (one-time code)");
  });

  it("silent-null → offers 'Show linked methods' instead of a surprise popup", async () => {
    const auth = fakeAuth({ getMyIdentities: async (allowPopup) => (allowPopup ? IDS : null) });
    const { getByText, container } = render(() => (
      <ManagedListSection auth={auth} mergeBeforeLink={noopMerge} />
    ));
    await waitFor(() => expect(container.textContent).toContain("You sign in with Google"));
    getByText("Show linked methods").click();
    await waitFor(() => expect(container.textContent).toContain("Google (primary)"));
  });

  it("primary row has no Remove; secondary row requires two-click confirm", async () => {
    const auth = fakeAuth();
    const { container, getByText } = render(() => (
      <ManagedListSection auth={auth} mergeBeforeLink={noopMerge} />
    ));
    await waitFor(() => expect(container.textContent).toContain("Google (primary)"));
    const removeButtons = [...container.querySelectorAll("button")].filter(
      (b) => b.textContent === "Remove",
    );
    expect(removeButtons.length).toBe(1); // secondary only
    removeButtons[0].click();
    expect(auth.unlinkMethod).not.toHaveBeenCalled(); // first click arms
    getByText("Confirm remove?").click();
    await waitFor(() =>
      expect(auth.unlinkMethod).toHaveBeenCalledWith("email", "456"),
    );
    await waitFor(() => expect(container.textContent).toContain("removed"));
  });

  it("add-method links via the catalog, threads mergeBeforeLink, forces logout", async () => {
    vi.useFakeTimers();
    try {
      // both methods configured, only the primary linked → Email is addable
      const auth = fakeAuth({ getMyIdentities: async () => [IDS[0]] });
      const merge = vi.fn(async (_t: string) => {});
      const { container } = render(() => (
        <ManagedListSection auth={auth} mergeBeforeLink={merge} />
      ));
      await vi.waitFor(() =>
        expect(container.textContent).toContain("Add Email (one-time code) login"),
      );
      [...container.querySelectorAll("button")]
        .find((b) => b.textContent?.startsWith("Add Email"))!
        .click();
      await vi.waitFor(() =>
        expect(auth.linkAnotherMethod).toHaveBeenCalledWith("email", merge),
      );
      await vi.waitFor(() =>
        expect(container.textContent).toContain("Linked — signing you back in…"),
      );
      vi.advanceTimersByTime(1500);
      await vi.waitFor(() => expect(auth.logout).toHaveBeenCalled());
    } finally {
      vi.useRealTimers();
    }
  });

  it("popup-blocked link arms the two-click retry instead of failing", async () => {
    const auth = fakeAuth({
      getMyIdentities: async () => [IDS[0]],
      linkAnotherMethod: vi.fn(async () => {
        throw new Error("Unable to open a popup for loginWithPopup");
      }),
    });
    const { container } = render(() => (
      <ManagedListSection auth={auth} mergeBeforeLink={noopMerge} />
    ));
    await waitFor(() => expect(container.textContent).toContain("Add Email"));
    [...container.querySelectorAll("button")]
      .find((b) => b.textContent?.startsWith("Add Email"))!
      .click();
    await waitFor(() =>
      expect(container.textContent).toContain("Continue — sign in with Email (one-time code)"),
    );
    expect(container.textContent).toContain("Permission granted. Click again");
  });

  it("already-linked error shows the friendly message", async () => {
    const auth = fakeAuth({
      getMyIdentities: async () => [IDS[0]],
      linkAnotherMethod: vi.fn(async () => {
        throw new Error("The primary and secondary accounts are the same");
      }),
    });
    const { container } = render(() => (
      <ManagedListSection auth={auth} mergeBeforeLink={noopMerge} />
    ));
    await waitFor(() => expect(container.textContent).toContain("Add Email"));
    [...container.querySelectorAll("button")]
      .find((b) => b.textContent?.startsWith("Add Email"))!
      .click();
    await waitFor(() =>
      expect(container.textContent).toContain("already linked to this account"),
    );
  });

  it("fully-linked catalog offers no Add button", async () => {
    const { container } = render(() => (
      <ManagedListSection auth={fakeAuth()} mergeBeforeLink={noopMerge} />
    ));
    await waitFor(() => expect(container.textContent).toContain("Google (primary)"));
    const addButtons = [...container.querySelectorAll("button")].filter((b) =>
      b.textContent?.startsWith("Add "),
    );
    expect(addButtons.length).toBe(0);
  });
});
