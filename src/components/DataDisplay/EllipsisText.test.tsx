// G23 — EllipsisText must CONVERGE as a flex item. The crash (thorcasting
// Coverage, prod Roofer): the span was clipped only by a flex sibling's share;
// the tooltip then wrapped it in a <button> that became the flex item and
// hugged its content, so the span was no longer clipped, the tooltip
// unmounted, the bare span was clipped again … until "Maximum call stack
// size exceeded".
//
// jsdom has no layout, so the flex row is MODELLED: the measured span is
// clipped (120 of 290) only while it is itself the row's child — exactly the
// geometry that made the old component flip. The fix holds the span as the one
// stable host, so the model must settle, and stay settled, however often the
// observer fires.
import { render } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type FakeSizer, installFakeSizer } from "../../test-utils/fakeSizer";
import { EllipsisText } from "./EllipsisText";

const NATURAL = 290;
const SQUEEZED = 120;

let sizer: FakeSizer;
const restore: (() => void)[] = [];

/** Clipped iff the measured span sits DIRECTLY in the [data-row] flex row. */
const modelFlexRow = () => {
  const define = (key: "scrollWidth" | "clientWidth", get: (el: HTMLElement) => number) => {
    const before = Object.getOwnPropertyDescriptor(HTMLElement.prototype, key);
    Object.defineProperty(HTMLElement.prototype, key, {
      configurable: true,
      get(this: HTMLElement) {
        return get(this);
      },
    });
    restore.push(() => {
      if (before) Object.defineProperty(HTMLElement.prototype, key, before);
    });
  };
  define("scrollWidth", () => NATURAL);
  define("clientWidth", (el) =>
    el.parentElement?.hasAttribute("data-row") ? SQUEEZED : NATURAL,
  );
};

beforeEach(() => {
  sizer = installFakeSizer();
  modelFlexRow();
});
afterEach(() => {
  sizer.restore();
  for (const undo of restore.splice(0)) undo();
});

describe("EllipsisText — one stable host (G23)", () => {
  it("settles as a squeezed flex item: clipped, tooltip on, no recursion", async () => {
    const { container } = render(() => (
      <div data-row>
        <EllipsisText tooltip="Roofer — Coverage summary long name" />
        <span>x</span>
      </div>
    ));
    const host = container.querySelector<HTMLElement>(".sui-ellipsis-text")!;
    expect(host.parentElement?.hasAttribute("data-row")).toBe(true);
    expect(container.querySelector(".sui-ellipsis-text__trigger")).toBeTruthy();
    // Fire the observer repeatedly, as a window drag would: the host, the
    // clip state and the tooltip must all hold.
    for (let frame = 0; frame < 20; frame++) {
      await sizer.resize(host, { width: SQUEEZED + (frame % 2), height: 20 });
      expect(container.querySelector(".sui-ellipsis-text")).toBe(host);
      expect(host.parentElement?.hasAttribute("data-row")).toBe(true);
      expect(container.querySelector(".sui-ellipsis-text__trigger")).toBeTruthy();
    }
  });

  it("keeps the tooltip trigger INSIDE the measured span, reachable by keyboard", () => {
    const { container } = render(() => (
      <div data-row>
        <EllipsisText tooltip="Roofer — Coverage summary long name" />
      </div>
    ));
    const host = container.querySelector<HTMLElement>(".sui-ellipsis-text")!;
    const trigger = container.querySelector<HTMLElement>(".sui-ellipsis-text__trigger")!;
    expect(host.contains(trigger)).toBe(true);
    expect(trigger.tagName).toBe("SPAN");
    expect(trigger.tabIndex).toBe(0);
  });

  it("adds no trigger and no tab stop when the text fits", () => {
    const { container } = render(() => (
      <div>
        <EllipsisText tooltip="Reno" />
      </div>
    ));
    expect(container.querySelector(".sui-ellipsis-text__trigger")).toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
  });
});
