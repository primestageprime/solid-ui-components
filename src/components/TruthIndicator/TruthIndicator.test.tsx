import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
// Tests exercise the base (incl. baked-away props like `size`) — import it directly.
import { TruthIndicator, createTruthIndicator } from "./TruthIndicator";

describe("TruthIndicator", () => {
  it("value=true renders the check path with the true variant class", () => {
    const { container } = render(() => <TruthIndicator value={true} />);
    const root = container.firstElementChild!;
    expect(root.className).toMatch(/sui-truth--true/);
    expect(container.querySelector(".sui-truth__check")).toBeTruthy();
    expect(container.querySelector(".sui-truth__no")).toBeFalsy();
  });

  it("value=false renders the prohibition glyph with the false variant class", () => {
    const { container } = render(() => <TruthIndicator value={false} />);
    const root = container.firstElementChild!;
    expect(root.className).toMatch(/sui-truth--false/);
    expect(container.querySelector(".sui-truth__no")).toBeTruthy();
    expect(container.querySelector(".sui-truth__check")).toBeFalsy();
  });

  it("size class applies", () => {
    const { container } = render(() => (
      <TruthIndicator value={true} size="lg" />
    ));
    expect(container.firstElementChild!.className).toMatch(/sui-truth--lg/);
  });

  it("onClick promotes the element to a native button (focusable, click + keyboard)", () => {
    const { container } = render(() => (
      <TruthIndicator value={true} onClick={() => {}} />
    ));
    const root = container.firstElementChild! as HTMLButtonElement;
    // A native <button> carries an implicit button role and is focusable
    // without an explicit tabindex, and activates on Enter/Space for free.
    expect(root.tagName).toBe("BUTTON");
    expect(root.type).toBe("button");
  });

  it("read-only (no onClick) renders a span with role=img", () => {
    const { container } = render(() => <TruthIndicator value={true} />);
    const root = container.firstElementChild!;
    expect(root.tagName).toBe("SPAN");
    expect(root.getAttribute("role")).toBe("img");
  });

  it("createTruthIndicator yields a curried component", () => {
    const Sm = createTruthIndicator({ size: "sm" });
    const { container } = render(() => <Sm value={true} />);
    expect(container.firstElementChild!.className).toMatch(/sui-truth--sm/);
  });
});
