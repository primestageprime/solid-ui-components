import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { ResizableContainer } from "./ResizableContainer";

describe("ResizableContainer", () => {
  it("renders children and a handle per default direction", () => {
    const { container, getByText } = render(() => (
      <ResizableContainer>
        <span>content</span>
      </ResizableContainer>
    ));
    expect(getByText("content")).toBeTruthy();
    // Defaults expose right + bottom handles.
    expect(
      container.querySelector(".sui-resizable__handle--right"),
    ).toBeTruthy();
    expect(
      container.querySelector(".sui-resizable__handle--bottom"),
    ).toBeTruthy();
    expect(
      container.querySelectorAll(".sui-resizable__handle").length,
    ).toBe(2);
  });

  it("renders only the requested direction handles", () => {
    const { container } = render(() => (
      <ResizableContainer directions={["left"]}>x</ResizableContainer>
    ));
    expect(
      container.querySelectorAll(".sui-resizable__handle").length,
    ).toBe(1);
    expect(
      container.querySelector(".sui-resizable__handle--left"),
    ).toBeTruthy();
  });

  it("applies initial width/height as inline styles", () => {
    const { container } = render(() => (
      <ResizableContainer initialWidth={320} initialHeight={240}>
        x
      </ResizableContainer>
    ));
    const root = container.querySelector(".sui-resizable") as HTMLElement;
    expect(root.style.width).toBe("320px");
    expect(root.style.height).toBe("240px");
  });

  it("omits inline dimensions in gridMode", () => {
    const { container } = render(() => (
      <ResizableContainer gridMode initialWidth={320}>
        x
      </ResizableContainer>
    ));
    const root = container.querySelector(".sui-resizable") as HTMLElement;
    expect(root.style.width).toBe("");
    expect(root.style.height).toBe("");
  });

  it("nudges width and fires onResize on ArrowRight of the right handle", () => {
    const onResize = vi.fn();
    const { container } = render(() => (
      <ResizableContainer initialWidth={300} onResize={onResize}>
        x
      </ResizableContainer>
    ));
    const handle = container.querySelector(".sui-resizable__handle--right")!;
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onResize).toHaveBeenCalledOnce();
    // STEP is 16, so width grows from 300 to 316.
    expect(onResize).toHaveBeenCalledWith(
      expect.objectContaining({ width: 316 }),
    );
  });

  it("exposes separator role and aria bounds on each handle", () => {
    const { container } = render(() => (
      <ResizableContainer minWidth={100} maxWidth={500} initialWidth={300}>
        x
      </ResizableContainer>
    ));
    const handle = container.querySelector(".sui-resizable__handle--right")!;
    expect(handle.getAttribute("role")).toBe("separator");
    expect(handle.getAttribute("aria-valuemin")).toBe("100");
    expect(handle.getAttribute("aria-valuemax")).toBe("500");
  });
});
