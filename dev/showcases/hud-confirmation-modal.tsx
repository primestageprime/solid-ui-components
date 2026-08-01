import { type Component, createSignal } from "solid-js";
import {
  ConfirmationModal,
  createConfirmationModal,
} from "../../src/components/Modal";
import { Button } from "../../src/components/Button/Button";
import { MutedBody } from "../../src/components/Text";

// Medium destructive confirm dialog — danger accent + danger confirm button at
// md size. Curried at module top so the tone/size config stays off the call site.
const MdDangerConfirmationModal = createConfirmationModal({
  variant: "danger",
  confirmVariant: "danger",
  size: "md",
});

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
      <h2>ConfirmationModal — Depth 1 (zero CSS)</h2>
      <p class="text-meta">
        Composes HUDModal (Atomic) + Button (Atomic). Confirmation dialog with
        Cancel/Confirm footer, loading state, and scrollable body.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Standard Confirm</h3>
          <button class="demo-btn" onClick={() => setOpen(true)}>
            Open Confirmation
          </button>
          <ConfirmationModal
            open={open()}
            onClose={() => {
              setOpen(false);
              setLoading(false);
            }}
            onConfirm={handleConfirm}
            title="Confirm Insert"
            subtitle="Review the records"
            description="The following records will be inserted into the database:"
            confirmLabel="Insert Records"
            loadingLabel="Inserting..."
            loading={loading()}
          >
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>001</td>
                  <td>Engine A</td>
                  <td>450.0</td>
                </tr>
                <tr>
                  <td>002</td>
                  <td>Engine B</td>
                  <td>380.0</td>
                </tr>
              </tbody>
            </table>
          </ConfirmationModal>

          <h3>Composed — Danger Variant</h3>
          <button class="demo-btn" onClick={() => setDangerOpen(true)}>
            Open Danger Confirm
          </button>
          <MdDangerConfirmationModal
            open={dangerOpen()}
            onClose={() => setDangerOpen(false)}
            onConfirm={() => setDangerOpen(false)}
            title="Delete Records"
            subtitle="This action cannot be undone"
            description="Are you sure you want to delete the selected records?"
            confirmLabel="Delete"
          >
            <MutedBody>3 records will be permanently removed.</MutedBody>
          </MdDangerConfirmationModal>
        </div>
        <div class="depth2-atoms">
          <h3>Sub-Components</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Atomic</div>
            <div
              class="depth2-atom depth2-atom--link"
              onClick={() => props.onNavigate?.("hud-modal")}
            >
              <div class="depth2-atom__label">HUDModal</div>
              <div class="text-meta">
                Portal overlay with header/body/footer
              </div>
            </div>
            <div
              class="depth2-atom depth2-atom--link"
              onClick={() => props.onNavigate?.("button")}
            >
              <div class="depth2-atom__label">Button</div>
              <div class="text-meta">Cancel + Confirm action buttons</div>
            </div>
          </div>
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">
              open / onClose / onConfirm
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                Signal-driven open state + callbacks
              </div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">
              confirmLabel / loadingLabel
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                "Insert Records" / "Inserting..."
              </div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">loading</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                Disables buttons, shows spinner on confirm
              </div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">confirmVariant</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">"primary" | "danger"</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">description</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                Text shown above body content
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
