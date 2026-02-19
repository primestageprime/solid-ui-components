import { Component } from "solid-js";
import { NavLink } from "../../src/components/Navigation";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const NavBarShowcase: Component<Depth2Props> = (props) => {
  return (
    <div class="component-section">
      <h2>NavBar — Depth 2 (zero CSS)</h2>
      <p class="text-meta">Composes NavLink (Atomic). Horizontal navigation bar with active state and badges.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <div style={{ display: "flex", gap: "4px", "border-bottom": "1px solid var(--jtf-border)", "padding-bottom": "2px" }}>
            <NavLink href="#" active>Dashboard</NavLink>
            <NavLink href="#">Reports</NavLink>
            <NavLink href="#" color="warning" badge={3}>Alerts</NavLink>
            <NavLink href="#">Settings</NavLink>
          </div>
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("nav-item")}
          >
            <div class="depth2-atom__label">NavItem</div>
            <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
              <NavLink href="#" active>Active</NavLink>
              <NavLink href="#">Inactive</NavLink>
              <NavLink href="#" color="warning" badge={3}>With Badge</NavLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
