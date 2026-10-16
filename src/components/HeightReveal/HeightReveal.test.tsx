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

  it("holds its children at the open height while it moves, so a chart clips instead of squashing", () => {
    vi.useFakeTimers();
    const [open, setOpen] = createSignal(true);
    const { container } = render(() => (
      <HeightReveal when={open()}>
        <span>body</span>
      </HeightReveal>
    ));
    const content = container.querySelector<HTMLElement>(".sui-height-reveal__content")!;
    // jsdom does no layout: give the open content a height.
    Object.defineProperty(content, "offsetHeight", { configurable: true, value: 240 });
    expect(content.style.height).toBe("");

    setOpen(false);
    expect(content.style.height).toBe("240px");
    vi.advanceTimersByTime(HEIGHT_REVEAL_MS);

    // It opens at the height it last had open, then lets go and fills again.
    setOpen(true);
    expect(content.style.height).toBe("240px");
    vi.advanceTimersByTime(HEIGHT_REVEAL_MS);
    expect(content.style.height).toBe("");
  });

  it("holds the height it had open even when the close already sees the closed layout", () => {
    // A fill ChartFrame shrinks its column in the same update as the close,
    // so a read at the close finds a filling child at 0px.
    vi.useFakeTimers();
    let height = 240;
    const proto = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get: () => height,
    });
    try {
      const [open, setOpen] = createSignal(true);
      const { container } = render(() => (
        <HeightReveal when={open()}>
          <span>body</span>
        </HeightReveal>
      ));
      const content = container.querySelector<HTMLElement>(".sui-height-reveal__content")!;
      height = 0;
      setOpen(false);
      expect(content.style.height).toBe("240px");
    } finally {
      if (proto) Object.defineProperty(HTMLElement.prototype, "offsetHeight", proto);
    }
  });

  it("holds nothing on a first open, when it has no open height yet", () => {
    vi.useFakeTimers();
    const [open, setOpen] = createSignal(false);
    const { container } = render(() => (
      <HeightReveal when={open()}>
        <span>body</span>
      </HeightReveal>
    ));
    setOpen(true);
    const content = container.querySelector<HTMLElement>(".sui-height-reveal__content")!;
    expect(content.style.height).toBe("");
  });

  it("is never wider than its parent, so wide content clips instead of drawing outside", () => {
    // An `auto` column and a `min-width: auto` item let a wide child (a chart's <svg width>)
    // grow the column past the parent; the chart then drew outside its frame (2026-10-15).
    expect(css).toMatch(/\.sui-height-reveal\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
    expect(css).toMatch(/\.sui-height-reveal__inner\s*\{[^}]*min-width: 0;[^}]*overflow: clip;/);
  });
});
