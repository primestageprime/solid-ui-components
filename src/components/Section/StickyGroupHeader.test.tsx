import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { StickyGroupHeader, SectionLabel } from "./index";

describe("StickyGroupHeader / SectionLabel", () => {
  it("StickyGroupHeader has sticky positioning via class", () => {
    const { container } = render(() => <StickyGroupHeader>x</StickyGroupHeader>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/sticky-group-header/);
    expect(root.style.top).toBe("0px");
  });

  it("offset prop sets top inline", () => {
    const { container } = render(() => <StickyGroupHeader offset={20}>x</StickyGroupHeader>);
    expect((container.firstElementChild as HTMLElement).style.top).toBe("20px");
  });

  it("SectionLabel renders text", () => {
    const { container } = render(() => <SectionLabel>my section</SectionLabel>);
    const el = container.firstElementChild!;
    expect(el.className).toMatch(/sui-section-label/);
    expect(el.textContent).toBe("my section");
  });
});
