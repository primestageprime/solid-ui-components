// ============================================
// Modal — Atomic (Depth 1)
// Owns CSS (Modal.css), no component imports.
// Portal-based modal with overlay, escape key, size variants.
// ============================================
import { Component, JSX, Show, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import type { ColorVariant, CornerStyle } from "../../types";
import "./Modal.css";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Corner decoration style */
  corners?: CornerStyle;
  /** Accent color variant */
  variant?: ColorVariant;
  /** Modal size */
  size?: "sm" | "md" | "lg" | "xl";
  /** Show close button */
  showClose?: boolean;
  children?: JSX.Element;
  /** Footer content */
  footer?: JSX.Element;
}

export const Modal: Component<ModalProps> = (props) => {
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
    const classList = ["sui-modal"];
    if (props.size) classList.push(`sui-modal--${props.size}`);
    if (props.corners) classList.push(`sui-modal--corners-${props.corners}`);
    if (props.variant) classList.push(`sui-modal--${props.variant}`);
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
        <div class="sui-modal-overlay" onClick={handleOverlayClick}>
          <div class={modalClasses()} role="dialog" aria-modal="true">
            <Show when={props.title || props.showClose !== false}>
              <div class="sui-modal__header">
                <div class="sui-modal__title-group">
                  <Show when={props.title}>
                    <h2 class="sui-modal__title">{props.title}</h2>
                  </Show>
                  <Show when={props.subtitle}>
                    <p class="sui-modal__subtitle">{props.subtitle}</p>
                  </Show>
                </div>
                <Show when={props.showClose !== false}>
                  <button
                    class="sui-modal__close"
                    onClick={props.onClose}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </Show>
              </div>
            </Show>

            <div class="sui-modal__body">
              {props.children}
            </div>

            <Show when={props.footer}>
              <div class="sui-modal__footer">
                {props.footer}
              </div>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
};
