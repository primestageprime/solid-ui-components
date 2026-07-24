import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Surface, createSurface } from "./Surface";
import {
  CompactCard,
  CardSurface,
  ContentSurface,
  CenteredSurface,
  PopoverSurface,
} from "./index";

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
    const Big = createSurface({ padding: "md" });
    const { container } = render(() => <Big>x</Big>);
    expect(container.firstElementChild!).toBeTruthy();
  });

  it("bare Surface gets default md padding and sm radius", () => {
    const { container } = render(() => <Surface>x</Surface>);
    const cls = container.firstElementChild!.className;
    expect(cls).toMatch(/surface--padding-md/);
    expect(cls).toMatch(/surface--radius-sm/);
  });

  it("explicit padding overrides the default", () => {
    const { container } = render(() => <Surface padding="none">x</Surface>);
    expect(container.firstElementChild!.className).toMatch(
      /surface--padding-none/,
    );
    expect(container.firstElementChild!.className).not.toMatch(
      /surface--padding-md/,
    );
  });

  it("ContentSurface curried variant applies column direction", () => {
    const { container } = render(() => <ContentSurface>x</ContentSurface>);
    expect(container.firstElementChild!.className).toMatch(
      /surface--dir-column/,
    );
  });

  it("CenteredSurface applies center align", () => {
    const { container } = render(() => <CenteredSurface>x</CenteredSurface>);
    expect(container.firstElementChild!.className).toMatch(
      /surface--align-center/,
    );
  });
});

describe("Surface shadow", () => {
  it("adds .surface--shadow when shadow is set", () => {
    const { container } = render(() => <Surface shadow>x</Surface>);
    expect(
      container.firstElementChild?.classList.contains("surface--shadow"),
    ).toBe(true);
  });
  it("PopoverSurface is elevated + shadowed + width-bounded", () => {
    const { container } = render(() => <PopoverSurface>x</PopoverSurface>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.classList.contains("surface--shadow")).toBe(true);
    expect(el.style.minWidth).toBe("280px");
    expect(el.style.maxWidth).toBe("360px");
  });
});
