import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Toggle, createToggle, TruthToggle } from "./index";

describe("Toggle", () => {
  it("renders an input[type=checkbox]", () => {
    const { container } = render(() => <Toggle />);
    const input = container.querySelector("input")!;
    expect(input).toBeTruthy();
    expect(input.type).toBe("checkbox");
  });

  it("size applies as a class", () => {
    const { container } = render(() => <Toggle size="sm" />);
    expect(container.querySelector(".sui-toggle--sm")).toBeTruthy();
  });

  it("createToggle bakes defaults", () => {
    const Small = createToggle({ size: "sm" });
    const { container } = render(() => <Small />);
    expect(container.querySelector(".sui-toggle--sm")).toBeTruthy();
  });

  it("TruthToggle is small + primary", () => {
    const { container } = render(() => <TruthToggle />);
    expect(container.querySelector(".sui-toggle--sm")).toBeTruthy();
    expect(container.querySelector(".sui-toggle--primary")).toBeTruthy();
  });
});
