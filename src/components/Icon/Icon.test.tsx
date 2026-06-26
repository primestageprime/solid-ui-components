import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Icon } from "./Icon";

describe("Icon download glyph", () => {
  it("renders an svg path for the download icon", () => {
    const { container } = render(() => <Icon name="download" />);
    const path = container.querySelector("svg path");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("d")).toBeTruthy();
  });
});
