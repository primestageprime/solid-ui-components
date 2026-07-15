import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Page } from "./Page";

describe("Page", () => {
  it("renders base container wrapping children in a content region", () => {
    const { container } = render(() => <Page>hello</Page>);
    const root = container.querySelector(".sui-page")!;
    expect(root).toBeTruthy();
    expect(root.querySelector(".sui-page__content")!.textContent).toBe("hello");
  });

  it("adds no overlay modifiers by default", () => {
    const { container } = render(() => <Page>x</Page>);
    const root = container.querySelector(".sui-page")!;
    expect(root.classList.contains("sui-page--scanlines")).toBe(false);
    expect(root.classList.contains("sui-page--grid")).toBe(false);
    expect(root.classList.contains("sui-page--fill")).toBe(false);
  });

  it("flips overlay and fill modifiers when enabled", () => {
    const { container } = render(() => (
      <Page scanLines gridPattern fillHeight>
        x
      </Page>
    ));
    const root = container.querySelector(".sui-page")!;
    expect(root.classList.contains("sui-page--scanlines")).toBe(true);
    expect(root.classList.contains("sui-page--grid")).toBe(true);
    expect(root.classList.contains("sui-page--fill")).toBe(true);
  });

  it("merges a caller-supplied class and passes through DOM attributes", () => {
    const { container } = render(() => (
      <Page class="my-page" id="main">
        x
      </Page>
    ));
    const root = container.querySelector(".sui-page")!;
    expect(root.classList.contains("my-page")).toBe(true);
    expect(root.getAttribute("id")).toBe("main");
  });
});
