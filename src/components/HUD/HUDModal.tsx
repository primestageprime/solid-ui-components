// ============================================
// HUDModal — Atomic (Depth 1)
// Owns CSS (HUD.css), no component imports.
// Portal-based modal with overlay, escape key, size variants.
// ============================================
import { Component, Show, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { HUDModalProps } from "./types";
import "./HUD.css";

export const HUDModal: Component<HUDModalProps> = (props) => {
  // Handle escape key to close modal
  createEffect(() => {
    if (props.open) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          props.onClose();
        }
      };
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";

      onCleanup(() => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      });
    }
  });

  const modalClasses = () => {
    const classList = ["hud-modal"];
    if (props.size) classList.push(`hud-modal--${props.size}`);
    if (props.corners) classList.push(`hud-modal--corners-${props.corners}`);
    if (props.variant) classList.push(`hud-modal--${props.variant}`);
    return classList.join(" ");
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  return (
    <Show when={props.open}>
      <Portal>
        <div class="hud-modal-overlay" onClick={handleOverlayClick}>
          <div class={modalClasses()} role="dialog" aria-modal="true">
            <Show when={props.title || props.showClose !== false}>
              <div class="hud-modal__header">
                <div class="hud-modal__title-group">
                  <Show when={props.title}>
                    <h2 class="hud-modal__title">{props.title}</h2>
                  </Show>
                  <Show when={props.subtitle}>
                    <p class="hud-modal__subtitle">{props.subtitle}</p>
                  </Show>
                </div>
                <Show when={props.showClose !== false}>
                  <button
                    class="hud-modal__close"
                    onClick={props.onClose}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </Show>
              </div>
            </Show>

            <div class="hud-modal__body">
              {props.children}
            </div>

            <Show when={props.footer}>
              <div class="hud-modal__footer">
                {props.footer}
              </div>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
};
