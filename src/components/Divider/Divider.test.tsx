import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  Divider,
  DashedDivider,
  VerticalDivider,
  createDivider,
} from "./index";

describe("Divider", () => {
  it("renders an <hr> with default horizontal/solid/md-spacing classes", () => {
    const { container } = render(() => <Divider />);
    const hr = container.querySelector("hr.sui-divider")!;
    expect(hr).toBeTruthy();
    expect(hr.classList.contains("sui-divider--horizontal")).toBe(true);
    expect(hr.classList.contains("sui-divider--solid")).toBe(true);
    expect(hr.classList.contains("sui-divider--spacing-md")).toBe(true);
  });

  it("DashedDivider bakes the dashed variant", () => {
    const { container } = render(() => <DashedDivider />);
    const hr = container.querySelector(".sui-divider")!;
    expect(hr.classList.contains("sui-divider--dashed")).toBe(true);
  });

  it("VerticalDivider bakes the vertical orientation", () => {
    const { container } = render(() => <VerticalDivider />);
    const hr = container.querySelector(".sui-divider")!;
    expect(hr.classList.contains("sui-divider--vertical")).toBe(true);
    expect(hr.classList.contains("sui-divider--horizontal")).toBe(false);
  });

  it("createDivider merges spacing default and passes call-site class", () => {
    const Curried = createDivider({ spacing: "lg" });
    const { container } = render(() => <Curried class="my-rule" />);
    const hr = container.querySelector(".sui-divider")!;
    expect(hr.classList.contains("sui-divider--spacing-lg")).toBe(true);
    expect(hr.classList.contains("my-rule")).toBe(true);
  });
});
