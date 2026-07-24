import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Icon, ICON_PATHS } from "./Icon";

describe("Icon download glyph", () => {
  it("renders an svg path for the download icon", () => {
    const { container } = render(() => <Icon name="download" />);
    const path = container.querySelector("svg path");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("d")).toBeTruthy();
  });
});

describe("Icon bell glyph", () => {
  it("is registered in ICON_PATHS with outline + solid", () => {
    expect(ICON_PATHS.bell).toBeDefined();
    expect(ICON_PATHS.bell.outline).toContain("<path");
    expect(ICON_PATHS.bell.solid).toContain("<path");
  });
  it("renders a bell icon with the name as aria-label", () => {
    const { container } = render(() => <Icon name="bell" />);
    const el = container.querySelector('[role="img"]');
    expect(el?.getAttribute("aria-label")).toBe("bell");
    expect(el?.querySelector("svg")).toBeTruthy();
  });
});
