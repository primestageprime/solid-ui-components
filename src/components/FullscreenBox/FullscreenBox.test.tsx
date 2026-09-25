import { describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { fireEvent, render } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FullscreenBox, createFullscreenBox } from "./index";

const box = (root: HTMLElement) => root.querySelector<HTMLElement>(".sui-fullscreen-box")!;
const cornerBtn = (root: HTMLElement) =>
  root.querySelector<HTMLButtonElement>(".sui-fullscreen-box__corner button")!;

describe("FullscreenBox", () => {
  it("toggles the SAME element and the SAME child in and out of fullscreen", () => {
    const { container } = render(() => (
      <FullscreenBox>
        <div data-child="chart">chart</div>
      </FullscreenBox>
    ));
    const el = box(container);
    const child = container.querySelector("[data-child]");
    expect(el.classList.contains("sui-fullscreen-box--on")).toBe(false);
    expect(cornerBtn(container).getAttribute("aria-label")).toBe("Full screen");
    cornerBtn(container).click();
    expect(box(container)).toBe(el);
    expect(el.classList.contains("sui-fullscreen-box--on")).toBe(true);
    expect(container.querySelector("[data-child]")).toBe(child);
    expect(cornerBtn(container).getAttribute("aria-label")).toBe("Exit full screen");
    cornerBtn(container).click();
    expect(el.classList.contains("sui-fullscreen-box--on")).toBe(false);
    expect(container.querySelector("[data-child]")).toBe(child);
  });

  it("closes on Escape only while open, and leaves a handled Escape alone", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <FullscreenBox onFullscreenChange={onChange}>x</FullscreenBox>
    ));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onChange).not.toHaveBeenCalled();
    cornerBtn(container).click();
    const handled = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    handled.preventDefault();
    document.dispatchEvent(handled);
    expect(box(container).dataset.fullscreen).toBe("true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(box(container).dataset.fullscreen).toBe("false");
    expect(onChange.mock.calls.map(([v]) => v)).toEqual([true, false]);
  });

  it("follows a controlled prop and reports instead of flipping itself", () => {
    const [on, setOn] = createSignal(true);
    const onChange = vi.fn();
    const { container } = render(() => (
      <FullscreenBox fullscreen={on()} onFullscreenChange={onChange}>
        x
      </FullscreenBox>
    ));
    expect(box(container).dataset.fullscreen).toBe("true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onChange).toHaveBeenCalledWith(false);
    expect(box(container).dataset.fullscreen).toBe("true");
    setOn(false);
    expect(box(container).dataset.fullscreen).toBe("false");
  });

  it("takes a caller's corner, or none, and a variant can turn Escape off", () => {
    const custom = render(() => (
      <FullscreenBox renderCorner={(c) => <button type="button" onClick={c.toggle}>{c.fullscreen ? "Done" : "Big"}</button>}>
        x
      </FullscreenBox>
    ));
    cornerBtn(custom.container).click();
    expect(cornerBtn(custom.container).textContent).toBe("Done");
    const none = render(() => <FullscreenBox renderCorner={() => null}>x</FullscreenBox>);
    expect(none.container.querySelector(".sui-fullscreen-box__corner")).toBeNull();
    const Sticky = createFullscreenBox({ escapeCloses: false });
    const sticky = render(() => <Sticky fullscreen>x</Sticky>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(box(sticky.container).dataset.fullscreen).toBe("true");
  });

  it("layers above content and below Modal and the portaled popovers", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const z = (file: string, selector: string) => {
      const css = readFileSync(join(here, "..", file), "utf8");
      const block = css.slice(css.indexOf(`${selector} {`));
      return Number(/z-index:\s*(\d+)/.exec(block.slice(0, block.indexOf("}")))![1]);
    };
    const mine = z("FullscreenBox/FullscreenBox.css", ".sui-fullscreen-box--on");
    expect(mine).toBe(900);
    // The first z-index each stylesheet states is its layer (the overlay).
    const firstZ = (file: string) =>
      Number(/z-index:\s*(\d+)/.exec(readFileSync(join(here, "..", file), "utf8"))![1]);
    expect(mine).toBeLessThan(firstZ("Modal/Modal.css"));
    const tooltip = firstZ("Tooltip/Tooltip.css");
    expect(mine).toBeLessThan(tooltip);
  });
});

// One visual language with ChartFrame (2026-09-25): corner brackets, never
// arrows — an inward arrow means `fit`, not "back to windowed".
describe("FullscreenBox default corner icons", () => {
  it("draws fullscreen in flow and fullscreen-exit when full screen", () => {
    const { container } = render(() => (
      <FullscreenBox>
        <span />
      </FullscreenBox>
    ));
    const corner = () => container.querySelector(".sui-fullscreen-box__corner")!;
    expect(corner().querySelector('[aria-label="fullscreen"]')).toBeTruthy();
    fireEvent.click(corner().querySelector("button")!);
    expect(corner().querySelector('[aria-label="fullscreen-exit"]')).toBeTruthy();
  });
});
