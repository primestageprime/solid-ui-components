import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { GroupBracket } from "./index";

describe("GroupBracket", () => {
  it("renders an empty gutter for position none (no spine)", () => {
    const { container } = render(() => <GroupBracket position="none" />);
    const root = container.querySelector(".sui-group-bracket")!;
    expect(root.querySelector(".sui-group-bracket__spine")).toBeNull();
    expect(root.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders spine only for an interior row", () => {
    const { container } = render(() => <GroupBracket position="interior" />);
    expect(container.querySelector(".sui-group-bracket__spine")).toBeTruthy();
    expect(container.querySelector(".sui-group-bracket__stub--top")).toBeNull();
    expect(container.querySelector(".sui-group-bracket__stub--bottom")).toBeNull();
  });

  it("leader shows the top stub, badge, and is not aria-hidden", () => {
    const { container } = render(() => (
      <GroupBracket position="leader" badge="×3" />
    ));
    const root = container.querySelector(".sui-group-bracket")!;
    expect(container.querySelector(".sui-group-bracket__stub--top")).toBeTruthy();
    expect(container.querySelector(".sui-group-bracket__stub--bottom")).toBeNull();
    const badge = container.querySelector(".sui-group-bracket__badge")!;
    expect(badge.textContent).toBe("×3");
    expect(root.getAttribute("aria-hidden")).toBe("false");
  });

  it("leader-tail shows both stubs", () => {
    const { container } = render(() => (
      <GroupBracket position="leader-tail" badge="×1" />
    ));
    expect(container.querySelector(".sui-group-bracket__stub--top")).toBeTruthy();
    expect(container.querySelector(".sui-group-bracket__stub--bottom")).toBeTruthy();
  });

  it("does not render a badge for a tail row even if one is passed", () => {
    const { container } = render(() => (
      <GroupBracket position="tail" badge="×9" />
    ));
    expect(container.querySelector(".sui-group-bracket__stub--bottom")).toBeTruthy();
    expect(container.querySelector(".sui-group-bracket__badge")).toBeNull();
  });

  it("channels caller colors through CSS variables", () => {
    const { container } = render(() => (
      <GroupBracket position="leader" color="#0af" badgeFill="rgba(0,0,0,0.1)" />
    ));
    const root = container.querySelector(".sui-group-bracket") as HTMLElement;
    expect(root.style.getPropertyValue("--sui-group-bracket-color")).toBe("#0af");
    expect(root.style.getPropertyValue("--sui-group-bracket-badge-fill")).toBe(
      "rgba(0,0,0,0.1)",
    );
  });
});
