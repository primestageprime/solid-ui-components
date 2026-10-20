// ============================================
// UserMenu — Composite (Depth 2)
// Owns zero CSS files and zero inline style={}. Composes RightPopoverMenu
// (Atomic Primitive), SmAvatar (ParticipantAvatar variant), TightStack and
// TextSublabel.
//
// The account slot at the end of an app header: an avatar that opens a
// right-aligned menu. The menu's header line is the signed-in email, or "Not
// signed in"; the caller's own items (Settings, …) come next; the LAST item
// is always Sign in or Sign out, chosen from whether `user` is present, so a
// caller never assembles that pair itself and can never show both.
//
// `status` is an optional second header line. An app bar folds its status
// chip into this menu at phone width (AppBar does) rather than letting it
// crowd the avatar; the slot is here so that fold needs no change to this
// component's shape.
//
// Initials come from the name's first two words ("Ada Lovelace" → "AL"), or
// the email's first letter when the name is empty; signed out shows "?".
// ============================================
import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";
import {
  RightPopoverMenu,
  type PopoverMenuItem,
} from "../PopoverMenu/PopoverMenu";
import { SmAvatar } from "../ParticipantAvatar/variants";
import { TightClusterRow, TightStack } from "../Layout/variants";
import { TextBody, TextSublabel } from "../Text/variants";

export interface UserMenuUser {
  /** Display name — the avatar's initials come from it. */
  name: string;
  /** Shown as the menu's header line. */
  email: string;
  /** Avatar image; initials are drawn when omitted. */
  imageSrc?: string;
}

export interface UserMenuProps {
  /** The signed-in user. Omitted => signed out: "?" avatar, "Not signed in", Sign in. */
  user?: UserMenuUser;
  /** The caller's own items, listed above Sign in / Sign out. */
  items?: readonly PopoverMenuItem[];
  /** Fires with the id of one of `items`. Never fires for Sign in / Sign out. */
  onSelect?: (id: string) => void;
  /** Fires when the signed-out menu's Sign in is chosen. */
  onSignIn: () => void;
  /** Fires when the signed-in menu's Sign out is chosen. */
  onSignOut: () => void;
  /** An extra header line under the email (AppBar folds its status here at phone width). */
  status?: JSX.Element;
  /** Draw the user's name beside the avatar in the trigger (the sketch's "avatar + Peter"). Default false. */
  showName?: boolean;
}

/** Reserved ids for the built-in pair; namespaced so a caller's ids cannot collide. */
export const USER_MENU_SIGN_IN = "sui-user-menu:sign-in";
export const USER_MENU_SIGN_OUT = "sui-user-menu:sign-out";

/** The first letter of the first two words: "Ada Lovelace" → "AL". */
const FIRST_TWO_INITIALS = /^\s*(\S)\S*(?:\s+(\S))?/;

/** "Ada Lovelace" → "AL"; "" + "ada@x.io" → "A"; nothing → "?". */
export const userInitials = (user: UserMenuUser | undefined): string => {
  if (user === undefined) return "?";
  const match = FIRST_TWO_INITIALS.exec(user.name);
  const letters =
    match === null ? user.email.charAt(0) : `${match[1]}${match[2] ?? ""}`;
  return letters === "" ? "?" : letters.toUpperCase();
};

/** The trigger's accessible name: "Account menu for Ada Lovelace", or "Account menu" when signed out. */
export const userMenuLabel = (user: UserMenuUser | undefined): string => {
  if (user === undefined) return "Account menu";
  const who = user.name.trim() === "" ? user.email : user.name.trim();
  return who === "" ? "Account menu" : `Account menu for ${who}`;
};

/** The menu's items: the caller's, then exactly one of Sign in / Sign out. */
export const userMenuItems = (
  items: readonly PopoverMenuItem[],
  signedIn: boolean,
): [PopoverMenuItem, ...PopoverMenuItem[]] => {
  const signItem: PopoverMenuItem = signedIn
    ? { id: USER_MENU_SIGN_OUT, label: "Sign out", icon: "log-out" }
    : { id: USER_MENU_SIGN_IN, label: "Sign in", icon: "log-in" };
  // Leading the tuple with the caller's first item (when there is one) is what
  // proves "at least one" to the type without a cast.
  return items.length === 0 ? [signItem] : [items[0], ...items.slice(1), signItem];
};

export const UserMenu: Component<UserMenuProps> = (props) => {
  const select = (id: string): void => {
    if (id === USER_MENU_SIGN_IN) props.onSignIn();
    else if (id === USER_MENU_SIGN_OUT) props.onSignOut();
    else props.onSelect?.(id);
  };
  return (
    <RightPopoverMenu
      triggerLabel={userMenuLabel(props.user)}
      trigger={
        <TightClusterRow>
          <SmAvatar
            initials={userInitials(props.user)}
            imageSrc={props.user?.imageSrc}
            alt="User menu"
          />
          <Show when={props.showName && props.user?.name}>
            <TextBody>{props.user?.name}</TextBody>
          </Show>
        </TightClusterRow>
      }
      header={
        <TightStack>
          <TextSublabel>{props.user?.email ?? "Not signed in"}</TextSublabel>
          <Show when={props.status}>{props.status}</Show>
        </TightStack>
      }
      items={userMenuItems(props.items ?? [], props.user !== undefined)}
      onSelect={select}
    />
  );
};
