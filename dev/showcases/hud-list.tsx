import { Component } from "solid-js";
import { List, ListItem } from "../../src/components/List";

export const ListShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>List + ListItem — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (HUD.css), no component imports. Status/menu list with dividers.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Status List</h3>
          <List variant="status" dividers>
            <ListItem status="active" secondary="Nominal">Primary Systems</ListItem>
            <ListItem status="success" secondary="100%">Shield Generator</ListItem>
            <ListItem status="warning" secondary="72%">Fuel Reserves</ListItem>
            <ListItem status="error" secondary="Offline">Communications</ListItem>
          </List>

          <h3 style={{ "margin-top": "24px" }}>Composed — Menu List</h3>
          <List variant="menu">
            <ListItem interactive>Dashboard</ListItem>
            <ListItem interactive selected>System Diagnostics</ListItem>
            <ListItem interactive>Navigation</ListItem>
            <ListItem interactive>Settings</ListItem>
          </List>

          <h3 style={{ "margin-top": "24px" }}>Composed — Compact</h3>
          <List compact dividers>
            <ListItem>Item one</ListItem>
            <ListItem>Item two</ListItem>
            <ListItem>Item three</ListItem>
          </List>
        </div>
        <div class="depth2-atoms">
          <h3>Props — List</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Variant</div>
            <div class="depth2-atom"><div class="depth2-atom__label">default / numbered / status / menu</div></div>
          </div>
          <h3>Props — Item</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Status</div>
            <div class="depth2-atom"><div class="depth2-atom__label">active / inactive / warning / error / success</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
