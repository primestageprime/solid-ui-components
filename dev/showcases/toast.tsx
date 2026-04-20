import { Component, Show, createSignal, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import {
  Toast,
  ToastList,
  ToastRegion,
  showToast,
  toaster,
  type ToastHandle,
} from "../../src/components/Toast";
import {
  GhostButton,
  OutlinedButton,
  PrimaryButton,
  SecondaryButton,
} from "../../src/components/Button";
import { Row } from "../../src/components/Layout/Row";
import { Stack } from "../../src/components/Layout/Stack";
import { Text } from "../../src/components/Text/Text";

export const ToastShowcase: Component = () => {
  const [lastHandle, setLastHandle] = createSignal<ToastHandle | null>(null);
  const [mounted, setMounted] = createSignal(false);

  onMount(() => setMounted(true));

  const remember = (handle: ToastHandle) => {
    setLastHandle(handle);
    return handle;
  };

  const showInfo = () =>
    remember(
      showToast({
        title: "Info toast",
        description: "Something happened worth noting.",
        variant: "info",
      }),
    );

  const showSuccess = () =>
    remember(
      showToast({
        title: "Saved",
        description: "Changes committed successfully.",
        variant: "success",
      }),
    );

  const showWarning = () =>
    remember(
      showToast({
        title: "Warning",
        description: "Your session expires in 5 minutes.",
        variant: "warning",
      }),
    );

  const showError = () =>
    remember(
      showToast({
        title: "Network error",
        description: "Could not reach the server. Please try again.",
        variant: "error",
      }),
    );

  const showTitleOnly = () =>
    remember(
      showToast({
        title: "Copied to clipboard",
        variant: "success",
      }),
    );

  const showWithActions = () =>
    remember(
      showToast({
        title: "Unsaved changes",
        description: "Your work will be lost if you leave this page.",
        variant: "warning",
        actions: [
          {
            label: "Save",
            variant: "primary",
            onClick: () => console.log("save clicked"),
          },
          {
            label: "Discard",
            variant: "secondary",
            onClick: () => console.log("discard clicked"),
          },
        ],
      }),
    );

  const showPersistent = () =>
    remember(
      showToast({
        title: "Persistent notice",
        description: "Stays until you dismiss it.",
        variant: "info",
        persistent: true,
      }),
    );

  const showLongDuration = () =>
    remember(
      showToast({
        title: "Long-lived toast",
        description: "Auto-dismisses after 20 seconds.",
        variant: "info",
        duration: 20_000,
      }),
    );

  const dismissLast = () => {
    const handle = lastHandle();
    if (handle) handle.dismiss();
  };

  const clearAll = () => toaster.clear();

  return (
    <div class="component-section">
      <h2>Toast — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Owns CSS (Toast.css). Kobalte-backed toast with four variants
        (info/success/warning/error), optional description, actions, and
        persistent mode. Ships as a base `Toast` plus `ToastRegion` +
        `ToastList` curried atomics for mounting, a `ToastPrimitive` namespace
        re-export for escape-hatch callers, and a typed `showToast` wrapper
        over kobalte's imperative `toaster`.
      </p>

      <div class="example-group">
        <h3>Variants (show programmatically)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Each button calls `showToast({ variant, title, description })`.
        </div>
        <Row gap="sm" wrap="wrap">
          <PrimaryButton onClick={showInfo}>Info</PrimaryButton>
          <PrimaryButton onClick={showSuccess}>Success</PrimaryButton>
          <PrimaryButton onClick={showWarning}>Warning</PrimaryButton>
          <PrimaryButton onClick={showError}>Error</PrimaryButton>
        </Row>
      </div>

      <div class="example-group">
        <h3>Title-only (no description)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Lightweight confirmation — description is optional.
        </div>
        <OutlinedButton onClick={showTitleOnly}>Show title-only</OutlinedButton>
      </div>

      <div class="example-group">
        <h3>With actions</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Actions auto-dismiss the toast on click (unless `persistent`).
        </div>
        <OutlinedButton onClick={showWithActions}>Show with actions</OutlinedButton>
      </div>

      <div class="example-group">
        <h3>Persistent</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          No auto-dismiss and no progress bar — user must close manually.
        </div>
        <Row gap="sm">
          <OutlinedButton onClick={showPersistent}>Show persistent</OutlinedButton>
          <GhostButton onClick={dismissLast}>Dismiss last</GhostButton>
        </Row>
      </div>

      <div class="example-group">
        <h3>Long duration</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `duration: 20_000` overrides the region default.
        </div>
        <OutlinedButton onClick={showLongDuration}>Show 20s toast</OutlinedButton>
      </div>

      <div class="example-group">
        <h3>Stack of toasts</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Show several in a row to see them stack in the region.
        </div>
        <Row gap="sm">
          <SecondaryButton
            onClick={() => {
              showInfo();
              showWarning();
              showError();
            }}
          >
            Fire 3 toasts
          </SecondaryButton>
          <GhostButton onClick={clearAll}>Clear all</GhostButton>
        </Row>
      </div>

      <div class="example-group">
        <h3>Declarative mount — `ToastRegion` + `ToastList`</h3>
        <Stack gap="xs">
          <Text variant="body">
            These curried atomics ship with styling baked in. Mount once near
            the app root (inside a `Portal` so they escape clipped parents) and
            call `showToast(...)` anywhere. For low-level control over
            `Root` / `Title` / `Description`, use the `ToastPrimitive`
            namespace.
          </Text>
          <pre class="code-block">
{`import { Portal } from "solid-js/web";
import { ToastRegion, ToastList } from "solid-ui-components";

<Portal>
  <ToastRegion limit={10}>
    <ToastList />
  </ToastRegion>
</Portal>`}
          </pre>
        </Stack>
      </div>

      <Show when={mounted()}>
        <Portal>
          <ToastRegion limit={5}>
            <ToastList />
          </ToastRegion>
        </Portal>
      </Show>
    </div>
  );
};
