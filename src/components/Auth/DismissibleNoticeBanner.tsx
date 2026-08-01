// ============================================
// DismissibleNoticeBanner — Composite (Depth 2)
// Zero CSS. Non-blocking banner shown when the tenant's post-login Action
// detected another account with the same verified email that is NOT linked
// to this one (custom id_token claim read via auth.getUnlinkedSiblingHint).
// Detection only — this component must NEVER call the link API; it points
// the user at the app's settings page (settingsHref).
//
// Dismissal is per-account (keyed by sub) and persistent — the claim rides
// every login's id_token, and nagging a user who has seen and understood
// the hint helps nobody. Linking clears the claim at the next login anyway.
// ============================================
import { Show, createSignal, onMount, type JSX } from "solid-js";
import { NoticeBar } from "../Surface/variants";
import { GrowBox } from "../Layout/variants";
import { TextBody } from "../Text/variants";
import { SmallGhostButton } from "../Button/variants";
import { NavLink } from "../Navigation/NavLink";
import type { AuthApi } from "./types";

const dismissKey = (sub: string) => `sui_sibling_banner_dismissed:${sub}`;

export interface DismissibleNoticeBannerProps {
  auth: AuthApi;
  /** Where the app's login-methods settings live (rendered as a link). */
  settingsHref: string;
  class?: string;
  style?: JSX.CSSProperties | string;
}

export function DismissibleNoticeBanner(props: DismissibleNoticeBannerProps) {
  const [sibling, setSibling] = createSignal<string | null>(null);
  const [sub, setSub] = createSignal<string>("");

  onMount(async () => {
    const hint = await props.auth.getUnlinkedSiblingHint();
    if (!hint) return;
    const u = await props.auth.getAuth0User();
    if (!u) return;
    if (localStorage.getItem(dismissKey(u.sub))) return;
    setSub(u.sub);
    setSibling(hint);
  });

  const dismiss = () => {
    localStorage.setItem(dismissKey(sub()), "1");
    setSibling(null);
  };

  return (
    <Show when={sibling()}>
      <NoticeBar class={props.class} style={props.style}>
        <GrowBox>
          <TextBody>
            You also have a sign-in via{" "}
            <strong>{props.auth.connectionLabel(sibling()!)}</strong> for this
            email that isn't linked to this account. Link them in Settings →
            Login methods — its data is combined into this account, and
            afterwards either sign-in opens the same account.
          </TextBody>
        </GrowBox>
        <NavLink href={props.settingsHref}>Open Settings</NavLink>
        <SmallGhostButton onClick={dismiss} aria-label="Dismiss">
          ×
        </SmallGhostButton>
      </NoticeBar>
    </Show>
  );
}
