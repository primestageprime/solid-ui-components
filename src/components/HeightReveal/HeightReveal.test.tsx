import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { HEIGHT_REVEAL_MS, HeightReveal } from "./HeightReveal";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** `inert` is set as the DOM property (jsdom does not reflect it). */
const isInert = (el: Element): boolean =>
  (el as HTMLElement & { inert?: boolean }).inert === true;

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "HeightReveal.css"),
  "utf8",
);

const reveal = (container: HTMLElement) =>
  container.querySelector(".sui-height-reveal")!;

describe("HeightReveal", () => {
  it("renders no children while it starts shut", () => {
    const { container, queryByText } = render(() => (
      <HeightReveal when={false}>
        <span>body</span>
      </HeightReveal>
    ));
    expect(queryByText("body")).toBeNull();
    expect(isInert(reveal(container))).toBe(true);
    expect(reveal(container).getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps the children through the close, then unmounts them", () => {
    vi.useFakeTimers();
    const [open, setOpen] = createSignal(true);
    const { container, queryByText } = render(() => (
      <HeightReveal when={open()}>
        <span>body</span>
      </HeightReveal>
    ));
    expect(reveal(container).classList.contains("sui-height-reveal--open")).toBe(true);
    setOpen(false);
    expect(reveal(container).classList.contains("sui-height-reveal--open")).toBe(false);
    expect(isInert(reveal(container))).toBe(true);
    expect(queryByText("body")).toBeTruthy();
    vi.advanceTimersByTime(HEIGHT_REVEAL_MS);
    expect(queryByText("body")).toBeNull();
  });

  it("keeps the children when it opens again before the close ends", () => {
    vi.useFakeTimers();
    const [open, setOpen] = createSignal(true);
    const { queryByText } = render(() => (
      <HeightReveal when={open()}>
        <span>body</span>
      </HeightReveal>
    ));
    setOpen(false);
    vi.advanceTimersByTime(HEIGHT_REVEAL_MS / 2);
    setOpen(true);
    vi.advanceTimersByTime(HEIGHT_REVEAL_MS);
    expect(queryByText("body")).toBeTruthy();
  });

  it("unmounts at once under reduced motion", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      const [open, setOpen] = createSignal(true);
      const { queryByText } = render(() => (
        <HeightReveal when={open()}>
          <span>body</span>
        </HeightReveal>
      ));
      setOpen(false);
      expect(queryByText("body")).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });

  it("animates its row 0fr ↔ 1fr in the same time as the unmount, and not at all under reduced motion", () => {
    expect(css).toMatch(new RegExp(`grid-template-rows ${HEIGHT_REVEAL_MS}ms`));
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\.sui-height-reveal\s*\{\s*transition: none/,
    );
  });
});
