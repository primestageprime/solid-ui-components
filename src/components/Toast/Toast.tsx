// ============================================
// Toast — Atomic (Depth 1)
// Owns CSS (Toast.css). No imports from other Atomic/Layout components
// (per STYLE_GUIDE.md). Kobalte-backed toast built on
// `@kobalte/core/toast`. Ships the base `Toast` component plus provider
// atomics (`ToastRegion`, `ToastList`) and a typed `showToast` wrapper over
// kobalte's `toaster`. Callers needing raw `Toast.Root` / `Toast.Title` /
// `Toast.Description` etc. should import directly from `@kobalte/core/toast`.
// ============================================
import {
  Toast as KobalteToast,
  toaster as kobalteToaster,
  type ToastRootProps as KobalteToastRootProps,
  type ToastRegionProps as KobalteToastRegionProps,
  type ToastListProps as KobalteToastListProps,
} from "@kobalte/core/toast";
import {
  type Component,
  type JSX,
  For,
  Show,
  splitProps,
} from "solid-js";
import "./Toast.css";

/** Action button rendered in the toast's action row. */
export interface ToastAction {
  label: string;
  onClick: () => void;
  /** Visual emphasis — `primary` fills with accent; `secondary` is neutral. */
  variant?: "primary" | "secondary";
}

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastProps extends Omit<KobalteToastRootProps, "toastId"> {
  /** The id issued by `toaster.show(...)`. Passed through to kobalte. */
  toastId: number;
  /** Primary heading. Required. */
  title: string;
  /** Optional secondary description; accepts strings or JSX. */
  description?: string | JSX.Element;
  /** Status variant — controls accent color. Defaults to `"info"`. */
  variant?: ToastVariant;
  /** Action buttons rendered below the description. */
  actions?: ToastAction[];
  /**
   * Time in ms before auto-dismiss. Falls back to the kobalte default
   * (typically 5000ms, configurable on the region). Ignored when `persistent`.
   */
  duration?: number;
  /** Suppress auto-dismiss and the progress bar. */
  persistent?: boolean;
}

// Inlined close-button glyph. Geometry mirrors the `close` outline path from
// the Icon atomic (`M4 4L12 12M12 4L4 12` on a 16×16 viewBox) so visual
// weight matches the rest of the library — but the SVG lives here so Toast
// stays free of cross-atomic imports (STYLE_GUIDE.md: Atomics must not
// import other Atomics). Uses `currentColor` so the variant color flows in
// naturally via the `.sui-toast__close-button` CSS rules.
const CloseGlyph = (): JSX.Element => (
  <svg
    class="sui-toast__close-icon"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M4 4L12 12M12 4L4 12"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      fill="none"
    />
  </svg>
);

export const Toast: Component<ToastProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "variant",
    "title",
    "description",
    "actions",
    "persistent",
  ]);

  const rootClass = () => `sui-toast sui-toast--${local.variant ?? "info"}`;

  return (
    <KobalteToast {...rest} persistent={local.persistent} class={rootClass()}>
      <div class="sui-toast__content">
        <div class="sui-toast__text">
          <KobalteToast.Title class="sui-toast__title">
            {local.title}
          </KobalteToast.Title>
          <Show when={local.description}>
            <KobalteToast.Description class="sui-toast__description">
              {local.description}
            </KobalteToast.Description>
          </Show>
          <Show when={local.actions && local.actions.length > 0}>
            <div class="sui-toast__actions">
              <For each={local.actions}>
                {(action) => (
                  <button
                    type="button"
                    class={`sui-toast__action sui-toast__action--${action.variant ?? "secondary"}`}
                    onClick={() => {
                      action.onClick();
                      if (!local.persistent) {
                        kobalteToaster.dismiss(rest.toastId);
                      }
                    }}
                  >
                    {action.label}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
        <KobalteToast.CloseButton class="sui-toast__close-button" aria-label="Close">
          <CloseGlyph />
        </KobalteToast.CloseButton>
      </div>
      <Show when={!local.persistent}>
        <KobalteToast.ProgressTrack class="sui-toast__progress-track">
          <KobalteToast.ProgressFill class="sui-toast__progress-fill" />
        </KobalteToast.ProgressTrack>
      </Show>
    </KobalteToast>
  );
};

// ============================================
// Provider host — curried atomics with baked-in styling
// ============================================

export interface ToastRegionCurriedProps
  extends Omit<KobalteToastRegionProps, "children"> {
  /** Slot for `<ToastList />` (and any siblings like a dismiss-all button). */
  children?: JSX.Element;
  /**
   * When true, renders a "Dismiss all" button below the toast list that
   * calls `toaster.clear()` on click. The button is shown only when the
   * list contains at least one toast (driven by CSS `:has(li)`), so an
   * empty region stays out of the way.
   */
  showDismissAll?: boolean;
}

export const ToastRegion: Component<ToastRegionCurriedProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "showDismissAll"]);
  return (
    <KobalteToast.Region {...rest}>
      {local.children}
      <Show when={local.showDismissAll}>
        <button
          type="button"
          class="sui-toast__dismiss-all"
          onClick={() => kobalteToaster.clear()}
        >
          Dismiss all
        </button>
      </Show>
    </KobalteToast.Region>
  );
};

/**
 * Curried `ToastList` props. Widens the kobalte base props with an explicit
 * `class` field (kobalte's type only lists event handlers + ref in
 * `ToastListCommonProps`, but the underlying element is an `<ol>` that
 * accepts `class` natively — we just need TS to see it so the user-supplied
 * class can merge with `"sui-toast__list"` without a cast).
 */
export type ToastListCurriedProps = KobalteToastListProps & { class?: string };

export const ToastList: Component<ToastListCurriedProps> = (props) => {
  const [local, rest] = splitProps(props, ["class"]);
  const listClass = () =>
    ["sui-toast__list", local.class].filter(Boolean).join(" ");
  return <KobalteToast.List {...rest} class={listClass()} />;
};

// ============================================
// Toaster wrapper — typed `showToast` over kobalte's imperative API
// ============================================

export type ShowToastInput = Omit<ToastProps, "toastId">;

/** Dismiss handle returned by `showToast`. */
export interface ToastHandle {
  id: number;
  dismiss: () => void;
}

/**
 * Imperatively show a themed toast. Returns an object with the toast id
 * plus a `dismiss()` helper. For advanced control (update/clear/promise)
 * import the raw `toaster` re-export below.
 */
export const showToast = (props: ShowToastInput): ToastHandle => {
  const id = kobalteToaster.show((toastProps) => (
    <Toast {...toastProps} {...props} />
  ));
  return {
    id,
    dismiss: () => kobalteToaster.dismiss(id),
  };
};

/** Re-export of kobalte's raw toaster for `update`, `clear`, `promise`, etc. */
export { kobalteToaster as toaster };
