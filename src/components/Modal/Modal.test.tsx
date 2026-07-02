import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { Modal, createModal } from "./Modal";

// Modal renders through a Portal, so its markup lands on document.body rather
// than the render() container. Queries here go through `document` deliberately.
const dialog = () => document.querySelector('[role="dialog"]');
const overlay = () => document.querySelector(".sui-modal-overlay");
const closeButton = () =>
  document.querySelector<HTMLButtonElement>(".sui-modal__close");

describe("Modal", () => {
  it("renders nothing while closed", () => {
    render(() => <Modal open={false} onClose={() => {}} title="Hi" />);
    expect(dialog()).toBeNull();
  });

  it("renders a labelled dialog when open", () => {
    render(() => <Modal open={true} onClose={() => {}} title="Settings" />);
    const el = dialog();
    expect(el).not.toBeNull();
    expect(el?.getAttribute("aria-modal")).toBe("true");
    expect(document.querySelector(".sui-modal__title")?.textContent).toBe(
      "Settings",
    );
  });

  it("renders subtitle, body children, and footer", () => {
    render(() => (
      <Modal
        open={true}
        onClose={() => {}}
        title="T"
        subtitle="Sub"
        footer={<span class="ft">Footer</span>}
      >
        <p class="body-content">Hello</p>
      </Modal>
    ));
    expect(document.querySelector(".sui-modal__subtitle")?.textContent).toBe(
      "Sub",
    );
    expect(document.querySelector(".body-content")?.textContent).toBe("Hello");
    expect(document.querySelector(".sui-modal__footer .ft")?.textContent).toBe(
      "Footer",
    );
  });

  it("closes on Escape while open", () => {
    const onClose = vi.fn();
    render(() => <Modal open={true} onClose={onClose} title="T" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores non-Escape keys", () => {
    const onClose = vi.fn();
    render(() => <Modal open={true} onClose={onClose} title="T" />);
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not listen for Escape while closed", () => {
    const onClose = vi.fn();
    render(() => <Modal open={false} onClose={onClose} title="T" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when the backdrop itself is clicked", () => {
    const onClose = vi.fn();
    render(() => <Modal open={true} onClose={onClose} title="T" />);
    const ov = overlay()!;
    // A backdrop click has target === currentTarget (the overlay div).
    fireEvent.click(ov);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when content inside the dialog is clicked", () => {
    const onClose = vi.fn();
    render(() => (
      <Modal open={true} onClose={onClose} title="T">
        <button type="button" class="inner">
          Inner
        </button>
      </Modal>
    ));
    fireEvent.click(document.querySelector(".inner")!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes via the close button by default", () => {
    const onClose = vi.fn();
    render(() => <Modal open={true} onClose={onClose} title="T" />);
    expect(closeButton()).not.toBeNull();
    fireEvent.click(closeButton()!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hides the close button when showClose is false", () => {
    render(() => (
      <Modal open={true} onClose={() => {}} title="T" showClose={false} />
    ));
    expect(closeButton()).toBeNull();
  });

  it("renders a custom header slot instead of the title group", () => {
    render(() => (
      <Modal
        open={true}
        onClose={() => {}}
        title="ShouldNotShow"
        header={<span class="custom-head">Custom</span>}
      />
    ));
    expect(document.querySelector(".sui-modal__header-slot")).not.toBeNull();
    expect(document.querySelector(".custom-head")?.textContent).toBe("Custom");
    expect(document.querySelector(".sui-modal__title")).toBeNull();
  });

  it("applies size, variant, and corner modifier classes", () => {
    render(() => (
      <Modal
        open={true}
        onClose={() => {}}
        title="T"
        size="lg"
        variant="success"
        corners="clip"
      />
    ));
    const el = dialog()!;
    expect(el.classList.contains("sui-modal--lg")).toBe(true);
    expect(el.classList.contains("sui-modal--success")).toBe(true);
    expect(el.classList.contains("sui-modal--corners-clip")).toBe(true);
  });

  it("locks body scroll while open and restores it once closed", () => {
    const [open, setOpen] = createSignal(true);
    render(() => <Modal open={open()} onClose={() => {}} title="T" />);
    expect(document.body.style.overflow).toBe("hidden");
    setOpen(false);
    expect(document.body.style.overflow).toBe("");
  });
});

describe("createModal", () => {
  it("bakes visual defaults while exposing data props", () => {
    const Confirm = createModal({ variant: "danger", size: "sm" });
    const onClose = vi.fn();
    render(() => <Confirm open={true} onClose={onClose} title="Delete?" />);
    const el = dialog()!;
    expect(el.classList.contains("sui-modal--danger")).toBe(true);
    expect(el.classList.contains("sui-modal--sm")).toBe(true);
    expect(document.querySelector(".sui-modal__title")?.textContent).toBe(
      "Delete?",
    );
  });
});
