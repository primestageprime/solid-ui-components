import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { TruthIndicator, createTruthIndicator } from "./index";

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
    const { container } = render(() => <TruthIndicator value={true} size="lg" />);
    expect(container.firstElementChild!.className).toMatch(/sui-truth--lg/);
  });

  it("onClick promotes the element to a button (role + tabindex)", () => {
    const { container } = render(() => (
      <TruthIndicator value={true} onClick={() => {}} />
    ));
    const root = container.firstElementChild!;
    expect(root.getAttribute("role")).toBe("button");
    expect(root.getAttribute("tabindex")).toBe("0");
  });

  it("createTruthIndicator yields a curried component", () => {
    const Sm = createTruthIndicator({ size: "sm" });
    const { container } = render(() => <Sm value={true} />);
    expect(container.firstElementChild!.className).toMatch(/sui-truth--sm/);
  });
});
