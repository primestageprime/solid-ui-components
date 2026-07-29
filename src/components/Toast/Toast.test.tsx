import { describe, it, expect, afterEach } from "vitest";
import { render } from "@solidjs/testing-library";
import { ToastRegion, ToastList, showToast, toaster } from "./Toast";

afterEach(() => {
  toaster.clear();
});

describe("ToastList", () => {
  it("renders the kobalte list with the base class", () => {
    const { container } = render(() => (
      <ToastRegion>
        <ToastList />
      </ToastRegion>
    ));
    expect(container.querySelector(".sui-toast__list")).toBeTruthy();
  });

  it("merges a caller class onto the list", () => {
    const { container } = render(() => (
      <ToastRegion>
        <ToastList class="pinned" />
      </ToastRegion>
    ));
    const list = container.querySelector(".sui-toast__list")!;
    expect(list.classList.contains("pinned")).toBe(true);
  });
});

describe("ToastRegion", () => {
  it("renders slotted children", () => {
    const { getByText } = render(() => (
      <ToastRegion>
        <span>slot</span>
      </ToastRegion>
    ));
    expect(getByText("slot")).toBeTruthy();
  });

  it("renders a dismiss-all button when showDismissAll is set", () => {
    const { getByText } = render(() => <ToastRegion showDismissAll />);
    expect(getByText("Dismiss all")).toBeTruthy();
  });

  it("omits the dismiss-all button by default", () => {
    const { queryByText } = render(() => <ToastRegion />);
    expect(queryByText("Dismiss all")).toBeNull();
  });
});

describe("showToast", () => {
  it("returns a numeric id and a dismiss handle", () => {
    const handle = showToast({ title: "Saved" });
    expect(typeof handle.id).toBe("number");
    expect(typeof handle.dismiss).toBe("function");
    expect(() => handle.dismiss()).not.toThrow();
  });
});
