// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Modal — Atomic (Depth 1)
// Tags: shows:dialog, does:dismiss, does:submit, data:scalar, role:overlay
// Owns CSS (Modal.css), no component imports.
// Portal-based modal with overlay, escape key, size variants.
// With `onSubmit`, body + footer are a <form>: Enter in a one-line field and
// a `type="submit"` footer button both run it (see hooks/submitOnEnter).
// On open, focus goes to the first field (or a `data-autofocus` one, or the
// submit button), and back to the opener on close (see hooks/initialFocus).
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createEffect,
  onCleanup,
  mergeProps,
} from "solid-js";
import { Portal } from "solid-js/web";
import type { ColorVariant, CornerStyle } from "../../types";
import { focusOnOpen } from "../../hooks/initialFocus";
import { submitHandler, submitOnEnter } from "../../hooks/submitOnEnter";
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
  size?: "sm" | "md" | "lg" | "xl" | "fullscreen";
  /**
   * Height behavior. "auto" (default) sizes to content, up to the usual
   * viewport cap. "fixed-60" locks the modal to a constant 60vh regardless
   * of which tab/content is showing, with the body scrolling internally —
   * use this when tabbed content in the header/body would otherwise cause
   * the modal to resize as the active tab changes.
   */
  height?: "auto" | "fixed-60";
  /** Show close button */
  showClose?: boolean;
  children?: JSX.Element;
  /** Custom header slot — overrides title/subtitle layout when provided. */
  header?: JSX.Element;
  /** Footer content */
  footer?: JSX.Element;
  /**
   * Makes the body and footer ONE FORM. Enter in a one-line field runs this,
   * and so does a click on a footer button with `type="submit"`. Give the
   * primary action `type="submit"` (and `disabled` when it cannot run) and
   * NO `onClick`, or a click runs the work twice. A SUI button is
   * `type="button"` by default, so Cancel never submits. A disabled submit button means Enter does
   * nothing. Enter keeps its own meaning in a textarea and in an open
   * Combobox or Select. Without this prop the modal has no form, as before.
   */
  onSubmit?: () => void;
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
    if (props.height) classList.push(`sui-modal--height-${props.height}`);
    return classList.join(" ");
  };

  const content = () => (
    <>
      <div class="sui-modal__body">{props.children}</div>
      <Show when={props.footer}>
        <div class="sui-modal__footer">{props.footer}</div>
      </Show>
    </>
  );

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  return (
    <Show when={props.open}>
      <Portal>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: overlay backdrop click-to-dismiss; Escape key handles keyboard dismissal (see createEffect above) */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop click-to-dismiss; Escape key handles keyboard dismissal (see createEffect above) */}
        <div class="sui-modal-overlay" onClick={handleOverlayClick}>
          <div
            class={modalClasses()}
            role="dialog"
            aria-modal="true"
            ref={focusOnOpen}
          >
            <Show
              when={props.header || props.title || props.showClose !== false}
            >
              <div class="sui-modal__header">
                <Show
                  when={props.header}
                  fallback={
                    <div class="sui-modal__title-group">
                      <Show when={props.title}>
                        <h2 class="sui-modal__title">{props.title}</h2>
                      </Show>
                      <Show when={props.subtitle}>
                        <p class="sui-modal__subtitle">{props.subtitle}</p>
                      </Show>
                    </div>
                  }
                >
                  <div class="sui-modal__header-slot">{props.header}</div>
                </Show>
                <Show when={props.showClose !== false}>
                  <button
                    type="button"
                    class="sui-modal__close"
                    onClick={props.onClose}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </Show>
              </div>
            </Show>

            <Show when={props.onSubmit} fallback={content()}>
              <form
                class="sui-modal__form"
                noValidate
                onKeyDown={submitOnEnter}
                onSubmit={submitHandler(() => props.onSubmit?.())}
              >
                {content()}
              </form>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

/** Visual overrides — locked at variant-definition time. */
export type ModalOverrides = Pick<ModalProps, "corners" | "variant" | "size">;

/** Props available to consumers of a curried Modal variant. */
export type ModalDataProps = Omit<ModalProps, keyof ModalOverrides>;

export function createModal(
  defaults: Partial<ModalProps>,
): Component<ModalDataProps> {
  return (props) => <Modal {...mergeProps(defaults, props)} />;
}
