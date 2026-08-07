import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ConfirmationModal } from "./ConfirmationModal";

// Like Modal's own tests: the dialog renders through a Portal, so queries go
// through `document` rather than the render() container.
const confirmButton = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>(".sui-modal__footer button")).at(-1);

// The focus lands one microtask after render (the Portal doesn't exist yet
// when the opening effect runs) — awaiting an already-resolved promise flushes
// exactly that queue.
const flushMicrotasks = () => Promise.resolve();

describe("ConfirmationModal autoFocusConfirm", () => {
  it("leaves focus alone by default", async () => {
    render(() => (
      <ConfirmationModal open={true} onClose={() => {}} onConfirm={() => {}} title="Delete?" />
    ));
    await flushMicrotasks();
    expect(document.activeElement).not.toBe(confirmButton());
  });

  it("focuses the confirm button when asked", async () => {
    render(() => (
      <ConfirmationModal
        open={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete?"
        confirmLabel="Delete"
        autoFocusConfirm
      />
    ));
    await flushMicrotasks();
    const button = confirmButton();
    expect(button?.textContent).toContain("Delete");
    expect(document.activeElement).toBe(button);
  });
});
