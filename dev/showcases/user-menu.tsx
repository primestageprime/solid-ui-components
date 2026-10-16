// UserMenu — the account slot at the end of an app header.
import { createSignal, type Component } from "solid-js";
import { UserMenu } from "../../src/components/UserMenu";
import { EndClusterRow } from "../../src/components/Layout";
import { CountChip } from "../../src/components/Badge";

const SETTINGS = [{ id: "settings", label: "Settings", icon: "gear" as const }];

export const UserMenuShowcase: Component = () => {
  const [signedIn, setSignedIn] = createSignal(true);
  const [last, setLast] = createSignal("nothing yet");
  const user = () =>
    signedIn() ? { name: "Ada Lovelace", email: "ada@example.com" } : undefined;

  return (
    <div class="component-section component-section--full">
      <h2>UserMenu — Composite (Depth 2)</h2>
      <p class="text-meta">
        An avatar that opens a right-aligned menu: the email (or "Not signed
        in") as its header, the caller's items, then exactly one of Sign in /
        Sign out, picked from whether <code>user</code> is present. Composes{" "}
        <code>RightPopoverMenu</code>, <code>SmAvatar</code>,{" "}
        <code>TightStack</code> and <code>TextSublabel</code>; owns no CSS.
      </p>

      <div class="example-group">
        <h3>Signed in / signed out — click the avatar</h3>
        <div class="user-menu-demo">
          <EndClusterRow>
            <UserMenu
              user={user()}
              items={SETTINGS}
              onSelect={(id) => setLast(id)}
              onSignIn={() => {
                setSignedIn(true);
                setLast("sign in");
              }}
              onSignOut={() => {
                setSignedIn(false);
                setLast("sign out");
              }}
            />
          </EndClusterRow>
        </div>
        <p class="text-meta">Last action: {last()}</p>
      </div>

      <div class="example-group">
        <h3>With a status line (AppBar folds its status here below 480px)</h3>
        <div class="user-menu-demo">
          <EndClusterRow>
            <UserMenu
              user={{ name: "Grace Hopper", email: "grace@example.com" }}
              items={SETTINGS}
              status={<CountChip count={3} label="open" />}
              onSignIn={() => {}}
              onSignOut={() => {}}
            />
          </EndClusterRow>
        </div>
      </div>
    </div>
  );
};
