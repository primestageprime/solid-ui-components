import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSignal } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { CollapsiblePanel, isControlled } from "./CollapsiblePanel";

describe("isControlled", () => {
  it("is controlled exactly when open is defined", () => {
    expect([true, false, undefined].map(isControlled)).toEqual([true, true, false]);
  });
});

describe("CollapsiblePanel controlled (open / onToggle)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("follows open: expanded while true, a strip while false", () => {
    const [open, setOpen] = createSignal(true);
    const { container } = render(() => (
      <CollapsiblePanel side="left" label="Nav" open={open()}>
        body
      </CollapsiblePanel>
    ));
    expect(container.querySelector("aside")).not.toBeNull();
    setOpen(false);
    expect(container.querySelector("aside")).toBeNull();
    expect(container.querySelector(".sui-collapsible-panel__strip")).not.toBeNull();
    setOpen(true);
    expect(container.querySelector("aside")).not.toBeNull();
  });

  it("only asks via onToggle: a press does not move a controlled panel", () => {
    const onToggle = vi.fn();
    const { container } = render(() => (
      <CollapsiblePanel side="left" label="Nav" open={true} onToggle={onToggle}>
        body
      </CollapsiblePanel>
    ));
    fireEvent.click(container.querySelector(".sui-collapsible-panel__tab")!);
    expect(onToggle).toHaveBeenCalledWith(false);
    expect(container.querySelector("aside")).not.toBeNull();
  });

  it("a strip press asks for open", () => {
    const onToggle = vi.fn();
    const { container } = render(() => (
      <CollapsiblePanel side="right" label="Nav" open={false} onToggle={onToggle} />
    ));
    fireEvent.click(container.querySelector(".sui-collapsible-panel__strip")!);
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(container.querySelector("aside")).toBeNull();
  });

  it("round-trips when the caller wires onToggle back to open", () => {
    const [open, setOpen] = createSignal(true);
    const { container } = render(() => (
      <CollapsiblePanel side="left" label="Nav" open={open()} onToggle={setOpen}>
        body
      </CollapsiblePanel>
    ));
    fireEvent.click(container.querySelector(".sui-collapsible-panel__tab")!);
    expect(open()).toBe(false);
    expect(container.querySelector(".sui-collapsible-panel__strip")).not.toBeNull();
    fireEvent.click(container.querySelector(".sui-collapsible-panel__strip")!);
    expect(open()).toBe(true);
  });

  it("ignores persistKey and defaultCollapsed while controlled", () => {
    window.localStorage.setItem("k", "1");
    const { container } = render(() => (
      <CollapsiblePanel side="left" label="Nav" open={true} persistKey="k" defaultCollapsed />
    ));
    expect(container.querySelector("aside")).not.toBeNull();
    expect(window.localStorage.getItem("k")).toBe("1");
  });

  it("uncontrolled stays as before, and now also reports the next state", () => {
    const onToggle = vi.fn();
    const { container } = render(() => (
      <CollapsiblePanel side="left" label="Nav" onToggle={onToggle}>
        body
      </CollapsiblePanel>
    ));
    fireEvent.click(container.querySelector(".sui-collapsible-panel__tab")!);
    expect(container.querySelector("aside")).toBeNull();
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
