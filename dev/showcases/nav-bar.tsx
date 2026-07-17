import type { Component } from "solid-js";
import { NavLink } from "../../src/components/Navigation";
import { TightClusterRow, NarrowStack } from "../../src/components/Layout";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const NavBarShowcase: Component<Depth2Props> = (props) => {
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
    </div>
  );
};
