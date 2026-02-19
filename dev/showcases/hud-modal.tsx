import { Component, createSignal } from "solid-js";
import { HUDModal } from "../../src/components/HUD";
import { Button } from "../../src/components/Button";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const HUDModalShowcase: Component<Depth2Props> = (props) => {
  const [open, setOpen] = createSignal(false);

  return (
    <div class="component-section">
      <h2>HUDModal — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (HUD.css), no component imports. Portal-based modal with overlay and escape key.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <button class="demo-btn" onClick={() => setOpen(true)}>Open Modal</button>
          <HUDModal
            open={open()}
            onClose={() => setOpen(false)}
            title="Confirm Action"
            subtitle="Review before proceeding"
            footer={
              <div style={{ display: "flex", gap: "8px", "justify-content": "flex-end" }}>
                <Button size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={() => setOpen(false)}>Confirm</Button>
              </div>
            }
          >
            <p style={{ margin: "0", color: "var(--hud-text-dim, var(--jtf-text-secondary))" }}>
              Are you sure you want to proceed with this action?
            </p>
          </HUDModal>
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Title</div>
            <h2 style={{ margin: "0", "font-size": "1.125rem", "font-weight": "600" }}>Confirm Action</h2>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Body</div>
            <p style={{ margin: "0", "font-size": "0.875rem", color: "var(--jtf-text-secondary)" }}>
              Are you sure you want to proceed with this action?
            </p>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("button")}
          >
            <div class="depth2-atom__label">Button</div>
            <div style={{ display: "flex", "flex-direction": "column", gap: "8px", "align-items": "flex-start" }}>
              <Button size="sm">Cancel</Button>
              <Button variant="primary" size="sm">Confirm</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
