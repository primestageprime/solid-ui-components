import { Component } from "solid-js";
import { HUDList, HUDListItem } from "../../src/components/HUD";

export const HUDListShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>HUDList + HUDListItem — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (HUD.css), no component imports. Status/menu list with dividers.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Status List</h3>
          <HUDList variant="status" dividers>
            <HUDListItem status="active" secondary="Nominal">Primary Systems</HUDListItem>
            <HUDListItem status="success" secondary="100%">Shield Generator</HUDListItem>
            <HUDListItem status="warning" secondary="72%">Fuel Reserves</HUDListItem>
            <HUDListItem status="error" secondary="Offline">Communications</HUDListItem>
          </HUDList>

          <h3 style={{ "margin-top": "24px" }}>Composed — Menu List</h3>
          <HUDList variant="menu">
            <HUDListItem interactive>Dashboard</HUDListItem>
            <HUDListItem interactive selected>System Diagnostics</HUDListItem>
            <HUDListItem interactive>Navigation</HUDListItem>
            <HUDListItem interactive>Settings</HUDListItem>
          </HUDList>

          <h3 style={{ "margin-top": "24px" }}>Composed — Compact</h3>
          <HUDList compact dividers>
            <HUDListItem>Item one</HUDListItem>
            <HUDListItem>Item two</HUDListItem>
            <HUDListItem>Item three</HUDListItem>
          </HUDList>
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
