import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { Dropdown, type DropdownItem } from "./Dropdown";

afterEach(cleanup);

const items: DropdownItem[] = [
  { id: "a", label: "Apple" },
  { id: "b", label: "Banana" },
  { id: "c", label: "Cherry" },
];

const tick = () => new Promise((r) => queueMicrotask(() => r(null)));
const key = (el: Element | Document, k: string) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));

function mount(onChange: (id: string) => void = () => {}, value = "b") {
  const { container } = render(() => (
    <Dropdown items={items} value={value} onChange={onChange} />
  ));
  const trigger = container.querySelector<HTMLButtonElement>(
    ".sui-dropdown__trigger",
  )!;
  return { container, trigger };
}

describe("Dropdown — listbox a11y", () => {
  it("trigger exposes haspopup + collapsed expanded state when closed", () => {
    const { container, trigger } = mount();
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("opens a listbox of options with the value marked aria-selected", async () => {
    const { container, trigger } = mount(() => {}, "b");
    trigger.click();
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const listbox = container.querySelector('[role="listbox"]')!;
    expect(listbox).toBeTruthy();
    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
    const selected = container.querySelector(
      '[role="option"][aria-selected="true"]',
    );
    expect(selected?.textContent).toContain("Banana");
  });

  it("focuses the selected option on open (roving tabindex)", async () => {
    const { container, trigger } = mount(() => {}, "c");
    trigger.click();
    await tick();
    const options = [
      ...container.querySelectorAll<HTMLElement>('[role="option"]'),
    ];
    // The selected option (Cherry, index 2) is the single tab stop and focused.
    expect(options[2].getAttribute("tabindex")).toBe("0");
    expect(options[0].getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(options[2]);
  });

  it("ArrowUp/ArrowDown move the roving tab stop", async () => {
    const { container, trigger } = mount(() => {}, "a");
    trigger.click();
    await tick();
    const options = [
      ...container.querySelectorAll<HTMLElement>('[role="option"]'),
    ];
    expect(options[0].getAttribute("tabindex")).toBe("0"); // Apple focused
    key(options[0], "ArrowDown");
    expect(options[1].getAttribute("tabindex")).toBe("0"); // → Banana
    expect(document.activeElement).toBe(options[1]);
    key(options[1], "ArrowUp");
    expect(options[0].getAttribute("tabindex")).toBe("0"); // ← Apple
  });

  it("clicking an option fires onChange and closes, returning focus to the trigger", async () => {
    const picked: string[] = [];
    const { container, trigger } = mount((id) => picked.push(id), "a");
    trigger.click();
    await tick();
    const banana = [
      ...container.querySelectorAll<HTMLElement>('[role="option"]'),
    ][1];
    banana.click();
    expect(picked).toEqual(["b"]);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("Escape closes the menu and refocuses the trigger", async () => {
    const { container, trigger } = mount();
    trigger.click();
    await tick();
    expect(container.querySelector('[role="listbox"]')).toBeTruthy();
    key(document, "Escape");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });
});
