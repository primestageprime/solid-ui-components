import { Component } from "solid-js";
import { NavLink } from "../../src/components/Navigation";

export const NavItemShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>NavLink — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (NavLink.css), no component imports. Anchor link with active state, color variants, badge.</p>

      <div class="example-group">
        <h3>Inactive</h3>
        <NavLink href="#">Reports</NavLink>
      </div>

      <div class="example-group">
        <h3>Active</h3>
        <NavLink href="#" active>Dashboard</NavLink>
      </div>

      <div class="example-group">
        <h3>With Badge</h3>
        <NavLink href="#" color="warning" badge={3}>Alerts</NavLink>
      </div>
    </div>
  );
};
