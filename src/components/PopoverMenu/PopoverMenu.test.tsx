import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { PopoverMenu, RightPopoverMenu } from "./index";

// The panel portals to document.body (5081e93: ancestor overflow must not
// clip it), so panel/header queries go to the body, not the render container;
// cleanup between tests disposes the portal so body queries never see a
// previous test's panel.
afterEach(cleanup);

const ITEMS = [{ id: "logout", label: "Logout" }] as const;

const openPanel = (container: HTMLElement) => {
  fireEvent.click(container.querySelector(".sui-popover-menu__trigger")!);
};

const headerEl = (): HTMLElement | null =>
  document.body.querySelector(".sui-popover-menu__header");

describe("PopoverMenu header slot", () => {
  it("renders no header element when header is omitted", () => {
    const { container } = render(() => (
      <PopoverMenu trigger="Account" items={[...ITEMS]} onSelect={() => {}} />
    ));
    openPanel(container);
    expect(headerEl()).toBeNull();
  });

  it("renders the header above the items, non-interactive and out of keyboard nav", () => {
    const { container } = render(() => (
      <PopoverMenu
        trigger="Account"
        header={<span>user@example.com</span>}
        items={[...ITEMS]}
        onSelect={() => {}}
      />
    ));
    openPanel(container);

    const header = headerEl() as HTMLElement;
    expect(header).not.toBeNull();
    expect(header.textContent).toContain("user@example.com");
    // role=presentation removes it from menu semantics; no tabindex → not focusable.
    expect(header.getAttribute("role")).toBe("presentation");
    expect(header.hasAttribute("tabindex")).toBe(false);
    // It is the first child of the panel, above the menu items.
    const panel = document.body.querySelector(".sui-popover-menu__panel")!;
    expect(panel.firstElementChild).toBe(header);
  });

  it("header does not trigger onSelect when clicked", () => {
    let selected: string | null = null;
    const { container } = render(() => (
      <PopoverMenu
        trigger="Account"
        header={<span>user@example.com</span>}
        items={[...ITEMS]}
        onSelect={(id) => (selected = id)}
      />
    ));
    openPanel(container);
    fireEvent.click(headerEl()!);
    expect(selected).toBeNull();
  });

  it("RightPopoverMenu inherits the header slot", () => {
    const { container } = render(() => (
      <RightPopoverMenu
        trigger="Account"
        header={<span>me@corp.io</span>}
        items={[...ITEMS]}
        onSelect={() => {}}
      />
    ));
    openPanel(container);
    const header = headerEl();
    expect(header).not.toBeNull();
    expect(header!.textContent).toContain("me@corp.io");
  });
});

describe("PopoverMenu active item", () => {
  const itemEls = (): HTMLElement[] =>
    Array.from(document.body.querySelectorAll(".sui-popover-menu__item"));

  it("marks only the active item with the modifier class and aria-current", () => {
    const { container } = render(() => (
      <PopoverMenu
        trigger="View"
        items={[
          { id: "day", label: "Day" },
          { id: "week", label: "Week", active: true },
        ]}
        onSelect={() => {}}
      />
    ));
    openPanel(container);

    const [day, week] = itemEls();
    expect(week.classList.contains("sui-popover-menu__item--active")).toBe(
      true,
    );
    expect(week.getAttribute("aria-current")).toBe("true");
    // The role stays menuitem — aria-current, not aria-checked.
    expect(week.getAttribute("role")).toBe("menuitem");
    expect(week.hasAttribute("aria-checked")).toBe(false);

    expect(day.classList.contains("sui-popover-menu__item--active")).toBe(
      false,
    );
    expect(day.hasAttribute("aria-current")).toBe(false);
  });

  it("omits the modifier and aria-current when active is absent", () => {
    const { container } = render(() => (
      <PopoverMenu trigger="View" items={[...ITEMS]} onSelect={() => {}} />
    ));
    openPanel(container);

    const [only] = itemEls();
    expect(only.classList.contains("sui-popover-menu__item--active")).toBe(
      false,
    );
    expect(only.hasAttribute("aria-current")).toBe(false);
  });
});
