// AppBar — the page-top bar in the Taskmaster canon's header layout A.
import { createSignal, type Component } from "solid-js";
import { AppBar } from "../../src/components/AppBar";
import { PageTitle } from "../../src/components/Text";
import { CountChip } from "../../src/components/Badge";

const NAV_ITEMS = [
  { id: "tasks", label: "Tasks" },
  { id: "retro", label: "Retrospective" },
];
const SETTINGS = [{ id: "settings", label: "Settings", icon: "gear" as const }];

export const AppBarShowcase: Component = () => {
  const [active, setActive] = createSignal("tasks");
  const [signedIn, setSignedIn] = createSignal(true);
  const user = () => ({
    user: signedIn() ? { name: "Ada Lovelace", email: "ada@example.com" } : undefined,
    items: SETTINGS,
    onSignIn: () => setSignedIn(true),
    onSignOut: () => setSignedIn(false),
  });

  return (
    <div class="component-section component-section--full">
      <h2>AppBar — Composite (Depth 3)</h2>
      <p class="text-meta">
        <code>AppHeader</code> around a <code>ThreeSlotRow</code> curried at a
        160px start: logo | <code>CenteredOverflowNav</code> centred in the
        remaining space | status + <code>UserMenu</code>. The nav folds into a
        kebab when its space runs out; below 480px the status moves into the
        user menu's header. Navigation is controlled (<code>activeId</code> +{" "}
        <code>onSelect</code>). Owns no CSS.
      </p>

      <div class="example-group">
        <h3>Full width</h3>
        <div class="app-bar-demo">
          <AppBar
            logo={<PageTitle>Taskmaster</PageTitle>}
            nav={{ items: NAV_ITEMS, activeId: active(), onSelect: setActive }}
            status={<CountChip count={3} label="open" />}
            user={user()}
          />
        </div>
        <p class="text-meta">Active view: {active()}</p>
      </div>

      <div class="example-group">
        <h3>In a 390px box — the nav folds to a kebab</h3>
        <p class="text-meta">
          The status fold follows the viewport (a media query), so it shows
          only on a phone-width window.
        </p>
        <div class="app-bar-demo app-bar-demo--phone">
          <AppBar
            logo={<PageTitle>Taskmaster</PageTitle>}
            nav={{ items: NAV_ITEMS, activeId: active(), onSelect: setActive }}
            status={<CountChip count={3} label="open" />}
            user={user()}
          />
        </div>
      </div>
    </div>
  );
};
