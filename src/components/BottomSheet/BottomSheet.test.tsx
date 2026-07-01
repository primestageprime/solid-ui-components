import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { BottomSheet } from "./index";

describe("BottomSheet", () => {
  it("does not render body children when closed", () => {
    const { queryByText } = render(() => (
      <BottomSheet open={false} onClose={() => {}}>
        <span>sheet body content</span>
      </BottomSheet>
    ));
    expect(queryByText("sheet body content")).toBeNull();
  });

  it("renders body children when open", () => {
    const { queryByText } = render(() => (
      <BottomSheet open={true} onClose={() => {}}>
        <span>sheet body content</span>
      </BottomSheet>
    ));
    expect(queryByText("sheet body content")).toBeTruthy();
  });

  it("fires onClose when the grabber is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(() => (
      <BottomSheet open={true} onClose={onClose}>
        <span>body</span>
      </BottomSheet>
    ));
    const grabber = container.querySelector(".sui-bottom-sheet__grabber")!;
    fireEvent.click(grabber);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fires onClose on a direct scrim click", () => {
    const onClose = vi.fn();
    const { container } = render(() => (
      <BottomSheet open={true} onClose={onClose}>
        <span>body</span>
      </BottomSheet>
    ));
    const scrim = container.querySelector(".sui-bottom-sheet-scrim")!;
    // A direct click on the scrim element itself (target === currentTarget).
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire onClose when the sheet body is clicked", () => {
    const onClose = vi.fn();
    const { getByText } = render(() => (
      <BottomSheet open={true} onClose={onClose}>
        <span>body content</span>
      </BottomSheet>
    ));
    // Clicking inside the sheet body must not bubble up to a scrim dismiss.
    fireEvent.click(getByText("body content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("applies the open modifier class only when open", () => {
    const { container, unmount } = render(() => (
      <BottomSheet open={false} onClose={() => {}} />
    ));
    expect(container.querySelector(".sui-bottom-sheet--open")).toBeNull();
    unmount();

    const reopened = render(() => (
      <BottomSheet open={true} onClose={() => {}} />
    ));
    expect(
      reopened.container.querySelector(".sui-bottom-sheet--open"),
    ).toBeTruthy();
  });

  it("uses the label prop as the dialog aria-label", () => {
    const { container } = render(() => (
      <BottomSheet open={true} onClose={() => {}} label="Filter options" />
    ));
    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-label")).toBe("Filter options");
  });
});
