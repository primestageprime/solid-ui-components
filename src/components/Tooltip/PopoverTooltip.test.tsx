import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { PopoverTooltip } from "./PopoverTooltip";

const content = () => document.querySelector(".sui-popover-tooltip__content");

describe("PopoverTooltip", () => {
  it("renders the trigger wrapping its children with the trigger class", () => {
    const { container, getByText } = render(() => (
      <PopoverTooltip content="help text">
        <span>tap me</span>
      </PopoverTooltip>
    ));
    const trigger = container.querySelector(".sui-popover-tooltip__trigger")!;
    expect(trigger).toBeTruthy();
    expect(getByText("tap me")).toBeTruthy();
  });

  it("keeps popover content out of the DOM while closed", () => {
    render(() => (
      <PopoverTooltip content="secret">
        <span>t</span>
      </PopoverTooltip>
    ));
    expect(content()).toBeNull();
  });

  describe("tap/click to open", () => {
    it("opens on trigger click", () => {
      const { container } = render(() => (
        <PopoverTooltip content="visible now">
          <span>t</span>
        </PopoverTooltip>
      ));
      const trigger = container.querySelector("button")!;
      fireEvent.click(trigger);
      expect(content()).toBeTruthy();
      expect(content()!.textContent).toContain("visible now");
    });

    it("toggles closed on a second click", () => {
      const { container } = render(() => (
        <PopoverTooltip content="c">
          <span>t</span>
        </PopoverTooltip>
      ));
      const trigger = container.querySelector("button")!;
      fireEvent.click(trigger);
      expect(content()).toBeTruthy();
      fireEvent.click(trigger);
      expect(content()).toBeNull();
    });

    it("opening via click does not depend on pointerType (real touch taps fire click too)", () => {
      const { container } = render(() => (
        <PopoverTooltip content="c">
          <span>t</span>
        </PopoverTooltip>
      ));
      const trigger = container.querySelector("button")!;
      // A touch tap dispatches pointerdown(touch) -> click, same as a mouse
      // click from this component's point of view: only the click matters.
      fireEvent.pointerDown(trigger, { pointerType: "touch" });
      fireEvent.click(trigger);
      expect(content()).toBeTruthy();
    });
  });

  describe("dismissal", () => {
    it("closes on an outside click", async () => {
      const { container } = render(() => (
        <PopoverTooltip content="c">
          <span>t</span>
        </PopoverTooltip>
      ));
      const trigger = container.querySelector("button")!;
      fireEvent.click(trigger);
      expect(content()).toBeTruthy();

      // Kobalte delays registering its outside-pointerdown listener by a
      // real macrotask (setTimeout 0), to avoid the same click that opened
      // the popover being read as "outside" — a microtask flush isn't
      // enough here.
      await new Promise((r) => setTimeout(r, 0));
      fireEvent.pointerDown(document.body);
      expect(content()).toBeNull();
    });

    it("closes on Escape", async () => {
      const { container } = render(() => (
        <PopoverTooltip content="c">
          <span>t</span>
        </PopoverTooltip>
      ));
      const trigger = container.querySelector("button")!;
      fireEvent.click(trigger);
      expect(content()).toBeTruthy();

      await new Promise((r) => setTimeout(r, 0));
      fireEvent.keyDown(document, { key: "Escape" });
      expect(content()).toBeNull();
    });
  });

  describe("hover still works", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("opens on pointerenter and closes on pointerleave after the grace delay", () => {
      const { container } = render(() => (
        <PopoverTooltip content="c" closeDelay={100}>
          <span>t</span>
        </PopoverTooltip>
      ));
      const trigger = container.querySelector("button")!;

      fireEvent.pointerEnter(trigger);
      expect(content()).toBeTruthy();

      fireEvent.pointerLeave(trigger);
      // still open during the grace period
      expect(content()).toBeTruthy();

      vi.advanceTimersByTime(150);
      expect(content()).toBeNull();
    });

    it("ignores touch pointers for hover-open (hover-open is mouse/pen only)", () => {
      const { container } = render(() => (
        <PopoverTooltip content="c">
          <span>t</span>
        </PopoverTooltip>
      ));
      const trigger = container.querySelector("button")!;

      fireEvent.pointerEnter(trigger, { pointerType: "touch" });
      expect(content()).toBeNull();
    });

    it("stays open while the pointer moves from trigger into the content (scrolling a long popover)", () => {
      const { container } = render(() => (
        <PopoverTooltip content="c" closeDelay={100}>
          <span>t</span>
        </PopoverTooltip>
      ));
      const trigger = container.querySelector("button")!;

      fireEvent.pointerEnter(trigger);
      expect(content()).toBeTruthy();

      fireEvent.pointerLeave(trigger);
      // pointer arrives on the content before the grace delay elapses
      vi.advanceTimersByTime(30);
      fireEvent.pointerEnter(content()!);
      vi.advanceTimersByTime(150);
      expect(content()).toBeTruthy();

      fireEvent.pointerLeave(content()!);
      vi.advanceTimersByTime(150);
      expect(content()).toBeNull();
    });

    it("keeps hover-open independent of a later tap-toggle close", () => {
      const { container } = render(() => (
        <PopoverTooltip content="c" closeDelay={100}>
          <span>t</span>
        </PopoverTooltip>
      ));
      const trigger = container.querySelector("button")!;

      fireEvent.pointerEnter(trigger);
      expect(content()).toBeTruthy();

      // Clicking while hover-open toggles it fully closed, even though the
      // pointer is still physically over the trigger — matches ordinary
      // popover-toggle semantics.
      fireEvent.click(trigger);
      expect(content()).toBeNull();
    });
  });

  describe("keyboard focus still works", () => {
    it("opens on trigger focus and closes on blur", () => {
      const { container } = render(() => (
        <PopoverTooltip content="c">
          <span>t</span>
        </PopoverTooltip>
      ));
      const trigger = container.querySelector("button")!;

      fireEvent.focus(trigger);
      expect(content()).toBeTruthy();

      fireEvent.blur(trigger);
      expect(content()).toBeNull();
    });
  });

  it("renders the trigger as the element the caller names via triggerAs", () => {
    const { container } = render(() => (
      <PopoverTooltip content="c" triggerAs="span">
        <a href="/somewhere">t</a>
      </PopoverTooltip>
    ));
    expect(container.querySelector("button")).toBeNull();
    const trigger = container.querySelector("span.sui-popover-tooltip__trigger");
    expect(trigger).toBeTruthy();
    expect(trigger!.querySelector("a")).toBeTruthy();
  });

  it("resolves an accessor content function", () => {
    const { container } = render(() => (
      <PopoverTooltip content={() => "lazy"}>
        <span>t</span>
      </PopoverTooltip>
    ));
    fireEvent.click(container.querySelector("button")!);
    expect(content()!.textContent).toContain("lazy");
  });
});
