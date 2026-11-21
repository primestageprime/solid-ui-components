import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { PopoverMenu, RightPopoverMenu } from "./index";
import { ICON_PATHS, type IconName } from "../Icon/Icon";

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

/** The markup an inline glyph renders, read back through jsdom. */
const glyphMarkup = (name: IconName): string => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.innerHTML = ICON_PATHS[name].outline;
  return svg.innerHTML;
};

const caretOf = (container: HTMLElement): HTMLElement =>
  container.querySelector(".sui-popover-menu__caret") as HTMLElement;

describe("PopoverMenu caretIcon", () => {
  it("draws a chevron that turns over by default", () => {
    const { container } = render(() => (
      <PopoverMenu trigger="Account" items={[...ITEMS]} onSelect={() => {}} />
    ));
    const caret = caretOf(container);
    expect(caret.querySelector("svg")?.innerHTML).toBe(glyphMarkup("chevron-down"));
    expect(caret.classList.contains("sui-popover-menu__caret--still")).toBe(false);
  });

  it("draws the given glyph, which stays still", () => {
    const { container } = render(() => (
      <RightPopoverMenu
        trigger="Mode"
        items={[...ITEMS]}
        onSelect={() => {}}
        caretIcon="menu"
      />
    ));
    const caret = caretOf(container);
    expect(caret.querySelector("svg")?.innerHTML).toBe(glyphMarkup("menu"));
    expect(caret.classList.contains("sui-popover-menu__caret--still")).toBe(true);
  });
});

describe("PopoverMenu triggerLabel", () => {
  it("names the trigger with aria-label when stated", () => {
    const { container } = render(() => (
      <PopoverMenu trigger={<span>AL</span>} triggerLabel="Account menu for Ada" items={[...ITEMS]} onSelect={() => {}} />
    ));
    const t = container.querySelector(".sui-popover-menu__trigger")!;
    expect(t.getAttribute("aria-label")).toBe("Account menu for Ada");
  });

  it("carries no aria-label when the prop is absent", () => {
    const { container } = render(() => (
      <PopoverMenu trigger="Account" items={[...ITEMS]} onSelect={() => {}} />
    ));
    expect(container.querySelector(".sui-popover-menu__trigger")!.hasAttribute("aria-label")).toBe(false);
  });

  it("RightPopoverMenu forwards it", () => {
    const { container } = render(() => (
      <RightPopoverMenu trigger="x" triggerLabel="Menu" items={[...ITEMS]} onSelect={() => {}} />
    ));
    expect(container.querySelector(".sui-popover-menu__trigger")!.getAttribute("aria-label")).toBe("Menu");
  });
});

// The panel is portaled to the end of <body>, so Tab from the trigger never
// reaches it: the menu has to take focus itself (WAI-ARIA menu button).
describe("PopoverMenu keyboard and screen-reader access", () => {
  const THREE = [
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
    { id: "c", label: "Gamma" },
  ] as const;

  const items = (): HTMLElement[] =>
    Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  const trigger = (container: HTMLElement): HTMLElement =>
    container.querySelector(".sui-popover-menu__trigger") as HTMLElement;
  const flush = () => new Promise((r) => requestAnimationFrame(() => r(null)));

  it("announces a menu and whether it is open", () => {
    const { container } = render(() => (
      <PopoverMenu trigger="More" items={[...THREE]} onSelect={() => {}} />
    ));
    expect(trigger(container).getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
    openPanel(container);
    expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
    const panel = document.body.querySelector(".sui-popover-menu__panel")!;
    expect(panel.getAttribute("role")).toBe("menu");
  });

  it("moves focus to the first item on open", async () => {
    const { container } = render(() => (
      <PopoverMenu trigger="More" items={[...THREE]} onSelect={() => {}} />
    ));
    openPanel(container);
    await flush();
    expect(document.activeElement).toBe(items()[0]);
  });

  it("walks the items with the arrow keys, wrapping at both ends", async () => {
    const { container } = render(() => (
      <PopoverMenu trigger="More" items={[...THREE]} onSelect={() => {}} />
    ));
    openPanel(container);
    await flush();
    fireEvent.keyDown(items()[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(items()[1]);
    fireEvent.keyDown(items()[1], { key: "ArrowUp" });
    fireEvent.keyDown(items()[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(items()[2]);
    fireEvent.keyDown(items()[2], { key: "ArrowDown" });
    expect(document.activeElement).toBe(items()[0]);
  });

  it("Escape closes and hands focus back to the trigger", async () => {
    const { container } = render(() => (
      <PopoverMenu trigger="More" items={[...THREE]} onSelect={() => {}} />
    ));
    openPanel(container);
    await flush();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(items()).toHaveLength(0);
    expect(document.activeElement).toBe(trigger(container));
  });

  it("choosing an item hands focus back to the trigger", async () => {
    const { container } = render(() => (
      <PopoverMenu trigger="More" items={[...THREE]} onSelect={() => {}} />
    ));
    openPanel(container);
    await flush();
    fireEvent.keyDown(items()[1], { key: "Enter" });
    expect(items()).toHaveLength(0);
    expect(document.activeElement).toBe(trigger(container));
  });
});
