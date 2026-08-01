// ============================================
// ManagedListSection — Composite (Depth 2)
// Zero CSS. User-confirmed Auth0 account linking ("add a way to sign in to
// this account") plus removal of linked methods. Lives in an app's Settings,
// which is only reachable signed in. Since merge-on-link, linking from
// either side preserves all data, so add is direction-safe; removal only
// offers SECONDARY identities (Auth0 can't unlink the primary — its sub IS
// the account), which makes self-lockout structurally impossible: the
// primary method always survives.
//
// The auth API arrives via the `auth` Data Prop (see ./types — DI, no
// package dependency). The app supplies `mergeBeforeLink`, its server-merge
// caller, threaded into linkAnotherMethod so the secondary's data is merged
// BEFORE the Auth0 link (the ordering is load-bearing; see the core package).
// ============================================
import { For, Show, createSignal, onMount, type JSX } from "solid-js";
import { BorderedSection } from "../Section/variants";
import { NarrowStack, ClusterRow } from "../Layout/variants";
import { DTable, DRow, DT, DD } from "../DataList";
import { TextSublabel, TextBody, NoteText } from "../Text/variants";
import { SmallGhostButton, SmallPrimaryButton } from "../Button/variants";
import type { AuthApi, AuthIdentity, ConnectionEntry } from "./types";
import { filter, some } from "../../fn";

export interface ManagedListSectionProps {
  auth: AuthApi;
  /** The app's server-side merge caller — runs BEFORE the Auth0 link. */
  mergeBeforeLink: (secondaryAccessToken: string) => Promise<void>;
  class?: string;
  style?: JSX.CSSProperties | string;
}

export function ManagedListSection(props: ManagedListSectionProps) {
  const [sub, setSub] = createSignal<string | null>(null);
  const [email, setEmail] = createSignal("");
  const [msg, setMsg] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  // Connection name whose Add flow hit the first-use popup block (two-click
  // retry: the Mgmt permission popup consumed the click's popup allowance,
  // but the grant stuck — a second click goes straight to the re-auth popup).
  const [retryArmed, setRetryArmed] = createSignal<string | null>(null);
  // null = not loaded (silent token unavailable and user hasn't asked yet).
  const [identities, setIdentities] = createSignal<AuthIdentity[] | null>(null);
  // provider|user_id of the row whose Remove is armed (two-click confirm).
  const [removeArmed, setRemoveArmed] = createSignal<string | null>(null);

  const label = (p: string) => props.auth.connectionLabel(p);

  onMount(async () => {
    const u = await props.auth.getAuth0User();
    setSub(u?.sub ?? null);
    setEmail(u?.email ?? "");
    // Silent-only on mount: render must never surprise the user with a
    // consent popup. If no cached grant exists, the "Show linked methods"
    // button (user-initiated → popup allowed) is the load path.
    try {
      setIdentities(await props.auth.getMyIdentities(false));
    } catch (e) {
      console.warn("login methods: identities read failed", e);
    }
  });

  const provider = () => sub()?.split("|")[0] ?? "";
  // A row is the primary iff it composes to the session's sub. Auth0 also
  // orders the array primary-first, but matching the sub is self-evident.
  const isPrimary = (i: AuthIdentity) => `${i.provider}|${i.user_id}` === sub();
  const rowKey = (i: AuthIdentity) => `${i.provider}|${i.user_id}`;
  // Addable = configured connections that are neither the session's own
  // provider nor already linked (unloaded list → still offer; a stale click
  // just gets the friendly "already linked" message from the API). With a
  // two-method catalog this reduces to the original "the other one" flip.
  // Identities match on `connection` (not `provider`) — the reliable
  // comparand for catalog-driven offers, since e.g. an Auth0 database
  // connection has provider "auth0" but connection
  // "Username-Password-Authentication". The `c.connection !== provider()`
  // check below is session-side (compares against the sub's provider, not
  // connection) and stays load-bearing only while identities are unloaded;
  // once loaded, the primary appears in the identities list and the
  // connection match above covers it too.
  const addable = (): ConnectionEntry[] =>
    filter(
      (c) =>
        c.connection !== provider() &&
        !some((i) => i.connection === c.connection, identities() ?? []),
      props.auth.connections(),
    );

  const loadIdentities = async () => {
    setBusy(true);
    setMsg("");
    try {
      setIdentities(await props.auth.getMyIdentities(true));
    } catch (e) {
      setMsg(`Couldn't load methods: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const addMethod = async (target: string) => {
    setBusy(true);
    setMsg("");
    try {
      await props.auth.linkAnotherMethod(target, props.mergeBeforeLink);
      setRetryArmed(null);
      // The popup left the SDK on the secondary's pre-link session (stranded
      // identity) — a forced logout → login lands on the merged account.
      setMsg("Linked — signing you back in…");
      setTimeout(() => props.auth.logout(), 1500);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      if (m.includes("Unable to open a popup")) {
        // First use: the Management-API permission popup consumed this click's
        // popup allowance, so the re-auth popup was blocked. The permission
        // grant DID stick (the token is cached now), so a second click goes
        // straight to the re-auth popup.
        setRetryArmed(target);
        setMsg("");
      } else if (m.includes("are the same")) {
        setMsg("That login method is already linked to this account.");
      } else {
        setMsg(`Linking failed: ${m}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const removeMethod = async (i: AuthIdentity) => {
    if (removeArmed() !== rowKey(i)) {
      setRemoveArmed(rowKey(i));
      return;
    }
    setBusy(true);
    setMsg("");
    setRemoveArmed(null);
    try {
      const remaining = await props.auth.unlinkMethod(i.provider, i.user_id);
      setIdentities(remaining);
      setMsg(
        `${label(i.provider)} removed. It can no longer open this account — ` +
          `signing in with it again starts a separate, empty account.`,
      );
    } catch (e) {
      setMsg(`Remove failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BorderedSection title="Login methods" class={props.class} style={props.style}>
      <NarrowStack>
        <Show
          when={identities()}
          fallback={
            <>
              <ClusterRow>
                <TextSublabel>You sign in with {label(provider())}</TextSublabel>
                <Show when={email()}>
                  <TextBody>{email()}</TextBody>
                </Show>
              </ClusterRow>
              <Show when={sub()}>
                <ClusterRow>
                  <SmallGhostButton onClick={loadIdentities} disabled={busy()}>
                    {busy() ? "Loading…" : "Show linked methods"}
                  </SmallGhostButton>
                </ClusterRow>
              </Show>
            </>
          }
        >
          {/* DataList table: method / account / action each align in a column
              across rows — table semantics without header chrome, proportionate
              to a catalog-bounded 2–3 sparse rows (via /design-options,
              2026-07-23; see docs/agents/design-decision-tree.md). */}
          <DTable>
            <For each={identities()}>
              {(i) => (
                <DRow border>
                  <DT>
                    {label(i.provider)}
                    {isPrimary(i) ? " (primary)" : ""}
                  </DT>
                  <DD>{isPrimary(i) ? email() : ""}</DD>
                  <DD>
                    <Show when={!isPrimary(i)}>
                      <SmallGhostButton
                        onClick={() => removeMethod(i)}
                        disabled={busy()}
                      >
                        {removeArmed() === rowKey(i) ? "Confirm remove?" : "Remove"}
                      </SmallGhostButton>
                    </Show>
                  </DD>
                </DRow>
              )}
            </For>
          </DTable>
        </Show>
        <Show when={sub()}>
          <For each={addable()}>
            {(c) => (
              <ClusterRow>
                <SmallPrimaryButton
                  onClick={() => addMethod(c.connection)}
                  disabled={busy()}
                >
                  {busy()
                    ? "Working…"
                    : retryArmed() === c.connection
                      ? `Continue — sign in with ${c.label}`
                      : `Add ${c.label} login`}
                </SmallPrimaryButton>
              </ClusterRow>
            )}
          </For>
        </Show>
        <Show when={retryArmed()}>
          <NoteText>
            Permission granted. Click again to sign in with {label(retryArmed()!)}{" "}
            and finish linking.
          </NoteText>
        </Show>
        <TextSublabel>
          Add another way to sign in to this account. You'll sign in with the
          new method once to confirm it's yours; its data (if any) is combined
          into this account, and afterwards either method opens it. Removing a
          method only revokes its access — your data stays with this account.
        </TextSublabel>
        <Show when={msg()}>
          <NoteText>{msg()}</NoteText>
        </Show>
      </NarrowStack>
    </BorderedSection>
  );
}
