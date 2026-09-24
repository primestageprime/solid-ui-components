import { type Component, createSignal } from "solid-js";
import { Modal } from "../../src/components/Modal";
import { Button } from "../../src/components/Button/Button";
import { TextBody } from "../../src/components/Text";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const ModalShowcase: Component<Depth2Props> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [fixedOpen, setFixedOpen] = createSignal(false);
  const [fixedTall, setFixedTall] = createSignal(false);

  return (
    <div class="component-section">
      <h2>Modal — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Owns CSS (HUD.css), no component imports. Portal-based modal with
        overlay and escape key.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <button class="demo-btn" onClick={() => setOpen(true)}>
            Open Modal
          </button>
          <Modal
            open={open()}
            onClose={() => setOpen(false)}
            title="Confirm Action"
            subtitle="Review before proceeding"
            footer={
              <div class="hud-modal-demo__footer">
                <Button size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Confirm
                </Button>
              </div>
            }
          >
            <TextBody>
              Are you sure you want to proceed with this action?
            </TextBody>
          </Modal>
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Title</div>
            <h2 class="demo-atom-title">Confirm Action</h2>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Body</div>
            <TextBody>
              Are you sure you want to proceed with this action?
            </TextBody>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("button")}
          >
            <div class="depth2-atom__label">Button</div>
            <div class="hud-modal-demo__btn-col">
              <Button size="sm">Cancel</Button>
              <Button variant="primary" size="sm">
                Confirm
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>height="fixed-60"</h3>
          <p class="text-meta">
            Locks the modal to a constant 60vh regardless of content —
            toggle the checkbox below to grow the body and confirm the
            modal itself doesn't resize.
          </p>
          <button class="demo-btn" onClick={() => setFixedOpen(true)}>
            Open Fixed-Height Modal
          </button>
          <Modal
            open={fixedOpen()}
            onClose={() => setFixedOpen(false)}
            title="Settings"
            subtitle="Fixed at 60% of viewport height"
            height="fixed-60"
          >
            <label>
              <input
                type="checkbox"
                checked={fixedTall()}
                onChange={(e) => setFixedTall(e.currentTarget.checked)}
              />{" "}
              Grow body content
            </label>
            <TextBody>
              This body's content height varies, but the modal's own height
              stays fixed — the body scrolls instead.
            </TextBody>
            <div style={fixedTall() ? { height: "150vh" } : undefined}>
              <TextBody>
                {fixedTall()
                  ? "Tall content — the modal frame should not grow."
                  : "Short content."}
              </TextBody>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
};
