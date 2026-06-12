import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { PopoverMenu, RightPopoverMenu } from "./index";

const ITEMS = [{ id: "logout", label: "Logout" }] as const;

const openPanel = (container: HTMLElement) => {
  fireEvent.click(container.querySelector(".sui-popover-menu__trigger")!);
};

describe("PopoverMenu header slot", () => {
  it("renders no header element when header is omitted", () => {
    const { container } = render(() => (
      <PopoverMenu trigger="Account" items={[...ITEMS]} onSelect={() => {}} />
    ));
    openPanel(container);
    expect(container.querySelector(".sui-popover-menu__header")).toBeNull();
  });

  it("renders the header above the items, non-interactive and out of keyboard nav", () => {
    const { container, getByText } = render(() => (
      <PopoverMenu
        trigger="Account"
        header={<span>user@example.com</span>}
        items={[...ITEMS]}
        onSelect={() => {}}
      />
    ));
    openPanel(container);

    const header = container.querySelector(
      ".sui-popover-menu__header",
    ) as HTMLElement;
    expect(header).not.toBeNull();
    expect(getByText("user@example.com")).toBeTruthy();
    // role=presentation removes it from menu semantics; no tabindex → not focusable.
    expect(header.getAttribute("role")).toBe("presentation");
    expect(header.hasAttribute("tabindex")).toBe(false);
    // It is the first child of the panel, above the menu items.
    const panel = container.querySelector(".sui-popover-menu__panel")!;
    expect(panel.firstElementChild).toBe(header);
  });

  it("header does not trigger onSelect when clicked", () => {
    let selected: string | null = null;
    const { container, getByText } = render(() => (
      <PopoverMenu
        trigger="Account"
        header={<span>user@example.com</span>}
        items={[...ITEMS]}
        onSelect={(id) => (selected = id)}
      />
    ));
    openPanel(container);
    fireEvent.click(getByText("user@example.com"));
    expect(selected).toBeNull();
  });

  it("RightPopoverMenu inherits the header slot", () => {
    const { container, getByText } = render(() => (
      <RightPopoverMenu
        trigger="Account"
        header={<span>me@corp.io</span>}
        items={[...ITEMS]}
        onSelect={() => {}}
      />
    ));
    openPanel(container);
    expect(getByText("me@corp.io")).toBeTruthy();
    expect(container.querySelector(".sui-popover-menu__header")).not.toBeNull();
  });
});
