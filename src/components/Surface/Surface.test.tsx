import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Surface, CompactCard, CardSurface, createSurface } from "./index";

describe("Surface", () => {
  it("renders a div with the surface class", () => {
    const { container } = render(() => <Surface>x</Surface>);
    const root = container.firstElementChild!;
    expect(root.tagName).toBe("DIV");
    expect(root.className).toMatch(/surface/);
  });

  it("CompactCard curried variant", () => {
    const { container } = render(() => <CompactCard>x</CompactCard>);
    expect(container.firstElementChild!.className).toMatch(/surface/);
  });

  it("CardSurface curried variant", () => {
    const { container } = render(() => <CardSurface>x</CardSurface>);
    expect(container.firstElementChild!.className).toMatch(/surface/);
  });

  it("createSurface bakes defaults", () => {
    const Big = createSurface({ padding: "lg" });
    const { container } = render(() => <Big>x</Big>);
    expect(container.firstElementChild!).toBeTruthy();
  });
});
