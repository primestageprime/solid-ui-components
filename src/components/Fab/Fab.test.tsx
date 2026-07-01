import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { Fab } from "./index";
import { AddFab } from "./variants";

describe("Fab", () => {
  it("renders a <button> element", () => {
    const { container } = render(() => <Fab icon="plus" label="Add item" />);
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("contains an icon span inside the button", () => {
    const { container } = render(() => <Fab icon="plus" label="Add item" />);
    const btn = container.querySelector("button")!;
    // Icon renders as a <span> with class jtf-icon
    expect(btn.querySelector("span.jtf-icon")).toBeTruthy();
  });

  it("applies the sui-fab class", () => {
    const { container } = render(() => <Fab icon="plus" label="Add" />);
    expect(container.querySelector("button")!.className).toMatch(/sui-fab/);
  });

  it("merges a consumer-supplied class", () => {
    const { container } = render(() => (
      <Fab icon="plus" label="Add" class="extra" />
    ));
    const btn = container.querySelector("button")!;
    expect(btn.className).toMatch(/sui-fab/);
    expect(btn.className).toMatch(/extra/);
  });

  it("sets aria-label from label prop", () => {
    const { container } = render(() => <Fab icon="plus" label="Add item" />);
    expect(container.querySelector("button")!.getAttribute("aria-label")).toBe(
      "Add item",
    );
  });

  it("sets title from label prop", () => {
    const { container } = render(() => <Fab icon="plus" label="Add item" />);
    expect(container.querySelector("button")!.getAttribute("title")).toBe(
      "Add item",
    );
  });

  it("fires onClick when clicked", () => {
    const handler = vi.fn();
    const { container } = render(() => (
      <Fab icon="plus" label="Add" onClick={handler} />
    ));
    fireEvent.click(container.querySelector("button")!);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is set", () => {
    const handler = vi.fn();
    const { container } = render(() => (
      <Fab icon="plus" label="Add" disabled onClick={handler} />
    ));
    const btn = container.querySelector("button")!;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes arbitrary props through to the button element", () => {
    const { container } = render(() => (
      <Fab icon="plus" label="Add" data-testid="my-fab" />
    ));
    expect(container.querySelector("button")!.getAttribute("data-testid")).toBe(
      "my-fab",
    );
  });
});

describe("AddFab (curried variant)", () => {
  it("renders with the baked-in plus icon", () => {
    const { container } = render(() => <AddFab label="Add item" />);
    const btn = container.querySelector("button")!;
    expect(btn).toBeTruthy();
    // Icon renders as a <span class="jtf-icon">
    expect(btn.querySelector("span.jtf-icon")).toBeTruthy();
  });

  it("passes label through as aria-label", () => {
    const { container } = render(() => <AddFab label="Add item" />);
    expect(container.querySelector("button")!.getAttribute("aria-label")).toBe(
      "Add item",
    );
  });

  it("passes onClick through to the underlying button", () => {
    const handler = vi.fn();
    const { container } = render(() => (
      <AddFab label="Add item" onClick={handler} />
    ));
    fireEvent.click(container.querySelector("button")!);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("respects the disabled prop", () => {
    const handler = vi.fn();
    const { container } = render(() => (
      <AddFab label="Add item" disabled onClick={handler} />
    ));
    const btn = container.querySelector("button")!;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(handler).not.toHaveBeenCalled();
  });

  it("applies the sui-fab class (structural shape is preserved)", () => {
    const { container } = render(() => <AddFab label="Add item" />);
    expect(container.querySelector("button")!.className).toMatch(/sui-fab/);
  });
});
