import { Component, createSignal } from "solid-js";
import { ConfirmationModal } from "../../src/components/Modal";
import { Button } from "../../src/components/Button";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const ConfirmationModalShowcase: Component<Depth2Props> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [dangerOpen, setDangerOpen] = createSignal(false);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOpen(false);
    }, 1500);
  };

  return (
    <div class="component-section">
      <h2>ConfirmationModal — Depth 2 (zero CSS)</h2>
      <p class="text-meta">
        Composes HUDModal (Atomic) + Button (Atomic). Confirmation dialog with
        Cancel/Confirm footer, loading state, and scrollable body.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Standard Confirm</h3>
          <button class="demo-btn" onClick={() => setOpen(true)}>Open Confirmation</button>
          <ConfirmationModal
            open={open()}
            onClose={() => { setOpen(false); setLoading(false); }}
            onConfirm={handleConfirm}
            title="Confirm Insert"
            subtitle="Review the records"
            description="The following records will be inserted into the database:"
            confirmLabel="Insert Records"
            loadingLabel="Inserting..."
            loading={loading()}
          >
            <table style={{
              width: "100%",
              "border-collapse": "collapse",
              "font-size": "0.8rem",
              "font-family": "monospace",
            }}>
              <thead>
                <tr style={{ "border-bottom": "2px solid rgba(0, 212, 255, 0.3)" }}>
                  <th style={{ padding: "8px", "text-align": "left", color: "var(--hud-accent, #00d4ff)" }}>ID</th>
                  <th style={{ padding: "8px", "text-align": "left", color: "var(--hud-accent, #00d4ff)" }}>Name</th>
                  <th style={{ padding: "8px", "text-align": "right", color: "var(--hud-accent, #00d4ff)" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ "border-bottom": "1px solid rgba(0, 212, 255, 0.1)" }}>
                  <td style={{ padding: "8px", color: "var(--text-primary)" }}>001</td>
                  <td style={{ padding: "8px", color: "var(--text-primary)" }}>Engine A</td>
                  <td style={{ padding: "8px", "text-align": "right", color: "#00ff88", "font-weight": "700" }}>450.0</td>
                </tr>
                <tr style={{ "border-bottom": "1px solid rgba(0, 212, 255, 0.1)" }}>
                  <td style={{ padding: "8px", color: "var(--text-primary)" }}>002</td>
                  <td style={{ padding: "8px", color: "var(--text-primary)" }}>Engine B</td>
                  <td style={{ padding: "8px", "text-align": "right", color: "#00ff88", "font-weight": "700" }}>380.0</td>
                </tr>
              </tbody>
            </table>
          </ConfirmationModal>

          <h3 style={{ "margin-top": "24px" }}>Composed — Danger Variant</h3>
          <button class="demo-btn" onClick={() => setDangerOpen(true)}>Open Danger Confirm</button>
          <ConfirmationModal
            open={dangerOpen()}
            onClose={() => setDangerOpen(false)}
            onConfirm={() => setDangerOpen(false)}
            title="Delete Records"
            subtitle="This action cannot be undone"
            description="Are you sure you want to delete the selected records?"
            confirmLabel="Delete"
            confirmVariant="danger"
            variant="danger"
            size="md"
          >
            <p style={{ margin: "0", color: "var(--text-muted)", "font-size": "0.875rem" }}>
              3 records will be permanently removed.
            </p>
          </ConfirmationModal>
        </div>
        <div class="depth2-atoms">
          <h3>Sub-Components</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Atomic</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("hud-modal")}>
              <div class="depth2-atom__label">HUDModal</div>
              <div class="text-meta">Portal overlay with header/body/footer</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("button")}>
              <div class="depth2-atom__label">Button</div>
              <div class="text-meta">Cancel + Confirm action buttons</div>
            </div>
          </div>
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">open / onClose / onConfirm</div>
            <div class="depth2-atom"><div class="depth2-atom__label">Signal-driven open state + callbacks</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">confirmLabel / loadingLabel</div>
            <div class="depth2-atom"><div class="depth2-atom__label">"Insert Records" / "Inserting..."</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">loading</div>
            <div class="depth2-atom"><div class="depth2-atom__label">Disables buttons, shows spinner on confirm</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">confirmVariant</div>
            <div class="depth2-atom"><div class="depth2-atom__label">"primary" | "danger"</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">description</div>
            <div class="depth2-atom"><div class="depth2-atom__label">Text shown above body content</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
