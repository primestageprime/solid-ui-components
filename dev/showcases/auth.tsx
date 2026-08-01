// dev/showcases/auth.tsx — Auth showcase (ManagedListSection + DismissibleNoticeBanner)
// Both components take the auth API via the `auth` Data Prop (DI — see
// src/components/Auth/types.ts). This showcase drives them with an in-file
// fake; no network, no real Auth0 calls. Feedback mirrors the on-page
// "Last action" idiom used elsewhere (census-view.tsx) rather than alert().
import { type Component, createSignal } from "solid-js";
import {
  ManagedListSection,
  DismissibleNoticeBanner,
  type AuthApi,
  type AuthIdentity,
} from "../../src/components/Auth";
import { SmallGhostButton } from "../../src/components/Button";
import { NarrowStack } from "../../src/components/Layout";

const IDS: AuthIdentity[] = [
  { provider: "google-oauth2", user_id: "123", connection: "google-oauth2", isSocial: true },
  { provider: "email", user_id: "456", connection: "email", isSocial: false },
];

// Builds a fake AuthApi. `note` logs each call to the on-page "Last action"
// line so the demo stays honest about which calls a real app would receive,
// without popping alert() dialogs.
function fakeAuth(
  opts: { linked: boolean; sibling: string | null },
  note: (msg: string) => void,
): AuthApi {
  return {
    getAuth0User: async () => ({
      sub: "google-oauth2|123",
      name: "Demo",
      email: "demo@primestage.dev",
    }),
    logout: async () => note("logout() — app would sign back in"),
    getMyIdentities: async () => (opts.linked ? IDS : [IDS[0]]),
    linkAnotherMethod: async (conn) => {
      note(`linkAnotherMethod(${conn}) — popup flow runs in a real app`);
      return opts.linked ? IDS : [IDS[0]];
    },
    unlinkMethod: async (_p, _id) => {
      note("unlinkMethod() — removes the secondary, primary always survives");
      return [IDS[0]];
    },
    getUnlinkedSiblingHint: async () => opts.sibling,
    connections: () => [
      { connection: "google-oauth2", label: "Google" },
      { connection: "email", label: "Email (one-time code)" },
    ],
    connectionLabel: (c) =>
      c === "google-oauth2" ? "Google" : c === "email" ? "Email (one-time code)" : c,
  };
}

export const AuthShowcase: Component = () => {
  const [lastAction, setLastAction] = createSignal<string | null>(null);
  const [dismissNonce, setDismissNonce] = createSignal(0);

  const resetDismiss = () => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("sui_sibling_banner_dismissed:")) localStorage.removeItem(k);
    setDismissNonce((n) => n + 1);
  };
  const merge = async (_secondaryAccessToken: string) => {
    setLastAction("mergeBeforeLink() — app's server-merge caller, runs before the Auth0 link");
  };

  return (
    <div class="component-section">
      <h2>Auth — ManagedListSection + DismissibleNoticeBanner (Composite, Depth 2)</h2>
      <p class="text-meta">
        User-confirmed Auth0 account linking (add/remove login methods,
        two-click confirms, first-use popup-retry) and the unlinked-sibling
        notice banner. Both take the auth API via the <code>auth</code> Data
        Prop (structural <code>AuthApi</code> in <code>Auth/types.ts</code>) —
        dependency injection; SUI has no dependency on Auth0. Apps pass{" "}
        <code>authApi</code> from <code>@primestageprime/auth0-stdb-client</code>{" "}
        (or any structural match). This showcase drives both with an in-file
        fake — no network calls.
      </p>

      {lastAction() && (
        <p class="text-meta">
          Last action: <code>{lastAction()}</code>
        </p>
      )}

      <div class="example-group">
        <h3>DismissibleNoticeBanner — sibling detected</h3>
        <p class="text-meta">
          Shown when the tenant's post-login Action detects another account
          with the same verified email that isn't linked. Dismissal is
          per-account and persistent (localStorage), so "reset dismissal"
          below clears it to re-show the banner.
        </p>
        <NarrowStack>
          {(() => {
            dismissNonce();
            return (
              <DismissibleNoticeBanner
                auth={fakeAuth({ linked: false, sibling: "email" }, setLastAction)}
                settingsHref="#settings"
              />
            );
          })()}
          <div>
            <SmallGhostButton onClick={resetDismiss}>
              Reset dismissal
            </SmallGhostButton>
          </div>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>ManagedListSection — both methods linked</h3>
        <p class="text-meta">
          Both Google and Email are linked; only the non-primary offers
          Remove (two-click confirm) — the primary can never be removed, so
          self-lockout is structurally impossible.
        </p>
        <ManagedListSection
          auth={fakeAuth({ linked: true, sibling: null }, setLastAction)}
          mergeBeforeLink={merge}
        />
      </div>

      <div class="example-group">
        <h3>ManagedListSection — one method, Add offered</h3>
        <p class="text-meta">
          Only Google is linked; "Add Email login" is offered.
          <code>mergeBeforeLink</code> runs before the Auth0 link so the
          secondary's data merges in regardless of link direction.
        </p>
        <ManagedListSection
          auth={fakeAuth({ linked: false, sibling: null }, setLastAction)}
          mergeBeforeLink={merge}
        />
      </div>

      <div class="example-group">
        <h3>Composed from</h3>
        <ul>
          <li>
            <strong>DismissibleNoticeBanner</strong> — NoticeBar (Surface),
            GrowBox, TextBody, NavLink, SmallGhostButton
          </li>
          <li>
            <strong>ManagedListSection</strong> — BorderedSection, NarrowStack,
            DataList (DTable/DRow/DT/DD), ClusterRow, TextSublabel, TextBody,
            NoteText, SmallGhostButton, SmallPrimaryButton
          </li>
        </ul>
      </div>
    </div>
  );
};
