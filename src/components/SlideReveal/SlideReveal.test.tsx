import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SlideReveal } from "./SlideReveal";

afterEach(cleanup);

/** `inert` is set as the DOM property (jsdom does not reflect it). */
const isInert = (el: Element): boolean =>
  (el as HTMLElement & { inert?: boolean }).inert === true;

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "SlideReveal.css"),
  "utf8",
);

describe("SlideReveal", () => {
  it("keeps its children mounted but inert and hidden while collapsed", () => {
    const { container } = render(() => (
      <SlideReveal when={false}>
        <button type="button">Save</button>
      </SlideReveal>
    ));
    const root = container.querySelector(".sui-slide-reveal")!;
    expect(container.querySelector("button")).toBeTruthy();
    expect(isInert(root)).toBe(true);
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.classList.contains("sui-slide-reveal--open")).toBe(false);
  });

  it("opens and closes with `when`, dropping inert while open", () => {
    const [open, setOpen] = createSignal(false);
    const { container } = render(() => (
      <SlideReveal when={open()}>
        <span>x</span>
      </SlideReveal>
    ));
    const root = container.querySelector(".sui-slide-reveal")!;
    setOpen(true);
    expect(root.classList.contains("sui-slide-reveal--open")).toBe(true);
    expect(isInert(root)).toBe(false);
    expect(root.hasAttribute("aria-hidden")).toBe(false);
    setOpen(false);
    expect(isInert(root)).toBe(true);
  });

  it("animates only what is visible — never its size — in 180ms, and not at all under reduced motion", () => {
    expect(css).toMatch(/clip-path 180ms/);
    // The rule: nothing that sizes the box may transition.
    expect(css).not.toMatch(/(grid-template-columns|width|max-width)\s+\d+ms/);
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\.sui-slide-reveal\s*\{\s*transition: none/,
    );
  });
});
