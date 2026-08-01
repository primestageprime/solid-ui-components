import { type Component, createSignal } from "solid-js";
import { NavLink } from "../../src/components/Navigation";
import { TightClusterRow, NarrowStack } from "../../src/components/Layout";
import { OverflowNav, type OverflowNavItem } from "../../src/components/OverflowNav";
import { ResizableContainer } from "../../src/components/ResizableContainer";
import { MutedBody } from "../../src/components/Text";

// One realistic nav — a workspace's section list, long enough that no
// reasonable header width fits all of it.
const SECTIONS: OverflowNavItem[] = [
  { id: "overview", label: "Overview", href: "#", active: true },
  { id: "berths", label: "Berths", href: "#" },
  { id: "calls", label: "Port calls", href: "#" },
  { id: "alerts", label: "Alerts", href: "#", color: "warning", badge: 3 },
  { id: "schedules", label: "Schedules", href: "#" },
  { id: "invoicing", label: "Invoicing", href: "#" },
  { id: "audit", label: "Audit log", href: "#" },
  { id: "settings", label: "Settings", href: "#" },
];

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const NavBarShowcase: Component<Depth2Props> = (props) => {
  const [picked, setPicked] = createSignal("");
  return (
    <div class="component-section">
      <h2>NavBar — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Composes NavLink (Atomic). Horizontal navigation bar with active state
        and badges.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <TightClusterRow class="nav-bar-demo__composed">
            <NavLink href="#" active>
              Dashboard
            </NavLink>
            <NavLink href="#">Reports</NavLink>
            <NavLink href="#" color="warning" badge={3}>
              Alerts
            </NavLink>
            <NavLink href="#">Settings</NavLink>
          </TightClusterRow>
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("nav-item")}
          >
            <div class="depth2-atom__label">NavItem</div>
            <NarrowStack>
              <NavLink href="#" active>
                Active
              </NavLink>
              <NavLink href="#">Inactive</NavLink>
              <NavLink href="#" color="warning" badge={3}>
                With Badge
              </NavLink>
            </NarrowStack>
          </div>
        </div>
      </div>

      <h3>OverflowNav — the same nav that measures itself</h3>
      <p class="text-meta">
        Composes the same NavLink atoms plus a PopoverMenu. It measures its
        container and moves whatever no longer fits into a trailing kebab, so
        the nav never wraps or clips. Drag the right edge of the frame below:
        items fall into the kebab as it narrows and climb back out as it widens.
        Selecting from the kebab fires the item's own <code>onClick</code>, so a
        collapsed item behaves exactly like an inline one.
      </p>
      <div class="example-group">
        <NarrowStack>
          <ResizableContainer
            directions={["right"]}
            initialWidth={620}
            initialHeight={44}
            minWidth={140}
            maxWidth={900}
          >
            <OverflowNav
              items={SECTIONS.map((item) => ({
                ...item,
                onClick: () => setPicked(item.label),
              }))}
            />
          </ResizableContainer>
          <MutedBody>last activated: {picked() || "—"}</MutedBody>
        </NarrowStack>
      </div>
    </div>
  );
};
