import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  Dropdown,
  type DropdownItem,
  type DropdownTriggerState,
} from "./Dropdown";

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
    // No trigger slot, so the focus goes back to the button, as it always has.
    expect(document.activeElement).toBe(trigger);
    expect(trigger.tagName).toBe("BUTTON");
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

describe("Dropdown — item indicators", () => {
  const coded: DropdownItem[] = [
    { id: "a", label: "Baseline", color: "#a855f7", shape: "circle" },
    { id: "b", label: "Lean", color: "#22d3ee", shape: "diamond" },
    { id: "c", label: "Plain", color: "#f97316" },
    { id: "d", label: "Bare" },
  ];

  const mountCoded = () =>
    render(() => <Dropdown items={coded} value="b" onChange={() => {}} />)
      .container;

  it("renders a dot for color alone and a glyph when a shape is set", async () => {
    const container = mountCoded();
    container
      .querySelector<HTMLButtonElement>(".sui-dropdown__trigger")!
      .click();
    await tick();
    const options = [
      ...container.querySelectorAll<HTMLElement>('[role="option"]'),
    ];
    // color + shape → svg glyph, no dot.
    expect(options[0].querySelector(".sui-dropdown__glyph")).toBeTruthy();
    expect(options[0].querySelector(".sui-dropdown__dot")).toBeNull();
    // color alone → today's dot, unchanged.
    expect(options[2].querySelector(".sui-dropdown__dot")).toBeTruthy();
    expect(options[2].querySelector(".sui-dropdown__glyph")).toBeNull();
    // no color → no indicator at all.
    expect(options[3].querySelector(".sui-dropdown__dot")).toBeNull();
    expect(options[3].querySelector(".sui-dropdown__glyph")).toBeNull();
  });

  it("draws the selected item's glyph in the trigger by default", () => {
    const trigger = mountCoded().querySelector(".sui-dropdown__trigger")!;
    const glyph = trigger.querySelector(".sui-dropdown__glyph");
    expect(glyph).toBeTruthy();
    // Decorative: the label carries the identity for assistive tech.
    expect(glyph!.getAttribute("aria-hidden")).toBe("true");
    expect(glyph!.querySelector("path")).toBeTruthy(); // diamond → path, not circle
  });

  it("sizes a shape glyph exactly like the dot it replaces", () => {
    // `shape: "circle"` and a bare `color` are the same mark, so a list mixing
    // them must not look ragged. jsdom applies no stylesheet, so a
    // computed-style assertion would pass whatever the CSS says — read the two
    // rules instead, and check the SVG's own box agrees with them.
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "./Dropdown.css"),
      "utf8",
    );
    const boxOf = (selector: string) => {
      const body = css.match(
        new RegExp(`(?:^|\\n)\\s*\\${selector}\\s*\\{([^}]*)\\}`),
      )?.[1];
      if (!body) throw new Error(`rule not found: ${selector}`);
      return {
        width: body.match(/(?:^|;)\s*width:\s*([^;]+)/)?.[1].trim(),
        height: body.match(/(?:^|;)\s*height:\s*([^;]+)/)?.[1].trim(),
      };
    };
    const dot = boxOf(".sui-dropdown__dot");
    expect(boxOf(".sui-dropdown__glyph")).toEqual(dot);

    const glyph = mountCoded().querySelector(".sui-dropdown__glyph")!;
    expect(`${glyph.getAttribute("width")}px`).toBe(dot.width);
    expect(`${glyph.getAttribute("height")}px`).toBe(dot.height);
  });

  it("selecting an unmarked item leaves the trigger with no indicator", async () => {
    const container = mountCoded();
    const trigger = container.querySelector<HTMLButtonElement>(
      ".sui-dropdown__trigger",
    )!;
    expect(trigger.querySelector(".sui-dropdown__glyph")).toBeTruthy();
    // "Bare" carries neither colour nor shape, so the trigger shows no mark.
    trigger.click();
    await tick();
    [...container.querySelectorAll<HTMLElement>('[role="option"]')][3].click();
    // The item list is the controlled `value`'s source of truth; re-mounting at
    // that id is what the parent would render.
    cleanup();
    const bare = render(() => (
      <Dropdown items={coded} value="d" onChange={() => {}} />
    )).container.querySelector(".sui-dropdown__trigger")!;
    expect(bare.querySelector(".sui-dropdown__glyph")).toBeNull();
    expect(bare.querySelector(".sui-dropdown__dot")).toBeNull();
  });
});

describe("Dropdown — trigger slot", () => {
  /** A consumer trigger: an editable name input plus the caret it now owns. */
  const nameSlot = (state: DropdownTriggerState) => (
    <>
      <input class="name-input" value={state.selected?.label ?? ""} />
      <button
        type="button"
        class="slot-caret"
        aria-label="Open"
        onClick={state.toggle}
      >
        &#9660;
      </button>
    </>
  );

  const mountSlot = () => {
    const { container } = render(() => (
      <Dropdown
        items={items}
        value="b"
        onChange={() => {}}
        trigger={nameSlot}
      />
    ));
    return container;
  };

  it("wraps the slot in a div[role=combobox], not a button", () => {
    const container = mountSlot();
    const trigger = container.querySelector(".sui-dropdown__trigger")!;
    expect(trigger.tagName).toBe("DIV");
    expect(trigger.getAttribute("role")).toBe("combobox");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    // The slot draws the label, so the built-in one is gone.
    expect(trigger.querySelector(".sui-dropdown__label")).toBeNull();
    expect(trigger.querySelector<HTMLInputElement>(".name-input")!.value).toBe(
      "Banana",
    );
  });

  it("leaves a click on the slot input alone", async () => {
    const container = mountSlot();
    container.querySelector<HTMLInputElement>(".name-input")!.click();
    await tick();
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("opens on toggle with no option focused", async () => {
    const container = mountSlot();
    container.querySelector<HTMLButtonElement>(".slot-caret")!.click();
    await tick();
    const options = [
      ...container.querySelectorAll<HTMLElement>('[role="option"]'),
    ];
    expect(options.length).toBe(3);
    expect(options).not.toContain(document.activeElement);
    // Nothing holds the roving tab stop: `activeIndex` stays at -1.
    expect(options.map((o) => o.getAttribute("tabindex"))).toEqual([
      "-1",
      "-1",
      "-1",
    ]);
  });

  it("ArrowDown on the wrapper opens the menu and focuses the first option", async () => {
    const container = mountSlot();
    key(container.querySelector(".sui-dropdown__trigger")!, "ArrowDown");
    await tick();
    const options = [
      ...container.querySelectorAll<HTMLElement>('[role="option"]'),
    ];
    expect(options.length).toBe(3);
    expect(document.activeElement).toBe(options[0]);
    expect(options[0].getAttribute("tabindex")).toBe("0");
  });

  it("gives the focus back to the slot element after a pick", async () => {
    const container = mountSlot();
    const input = container.querySelector<HTMLInputElement>(".name-input")!;
    input.focus();
    expect(document.activeElement).toBe(input);
    container.querySelector<HTMLButtonElement>(".slot-caret")!.click();
    await tick();
    [...container.querySelectorAll<HTMLElement>('[role="option"]')][2].click();
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    // The ARIA combobox pattern returns focus to the consumer's own element,
    // so the consumer must not refocus it in `onChange`.
    expect(document.activeElement).toBe(input);
  });

  it("keeps the button trigger when the slot is absent", () => {
    const { trigger } = mount();
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("role")).toBeNull();
  });
});

describe("Dropdown — disabled items", () => {
  // Banana and Date are unavailable. The list keeps a selectable row at the
  // start and in the middle, so a skip has somewhere to land in both
  // directions, and it ends on a disabled row, so End must step back.
  const mixed: DropdownItem[] = [
    { id: "a", label: "Apple" },
    { id: "b", label: "Banana", disabled: true },
    { id: "c", label: "Cherry" },
    { id: "d", label: "Date", disabled: true },
  ];

  const mountMixed = async (
    onChange: (id: string) => void = () => {},
    items: DropdownItem[] = mixed,
    value = "a",
  ) => {
    const { container } = render(() => (
      <Dropdown items={items} value={value} onChange={onChange} />
    ));
    const trigger = container.querySelector<HTMLButtonElement>(
      ".sui-dropdown__trigger",
    )!;
    trigger.click();
    await tick();
    const options = [
      ...container.querySelectorAll<HTMLElement>('[role="option"]'),
    ];
    return { container, trigger, options };
  };

  const tabStops = (options: HTMLElement[]) =>
    options.map((o) => o.getAttribute("tabindex"));

  it("marks a disabled row with aria-disabled and its own class", async () => {
    const { options } = await mountMixed();
    expect(options[1].getAttribute("aria-disabled")).toBe("true");
    expect(options[1].classList.contains("sui-dropdown__item--disabled")).toBe(
      true,
    );
    // An available row says nothing at all, as it always has.
    expect(options[0].getAttribute("aria-disabled")).toBeNull();
    expect(options[0].classList.contains("sui-dropdown__item--disabled")).toBe(
      false,
    );
  });

  it("clicking a disabled row fires no onChange and leaves the menu open", async () => {
    const picked: string[] = [];
    const { container, options } = await mountMixed((id) => picked.push(id));
    // Enter and Space activate the same native button click, so this covers
    // the keyboard path too.
    options[1].click();
    expect(picked).toEqual([]);
    expect(container.querySelector('[role="listbox"]')).toBeTruthy();
    // An available row still selects and still closes.
    options[2].click();
    expect(picked).toEqual(["c"]);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("ArrowDown and ArrowUp step over a disabled row", async () => {
    const { options } = await mountMixed();
    expect(document.activeElement).toBe(options[0]);
    key(options[0], "ArrowDown"); // Banana is unavailable → Cherry
    expect(document.activeElement).toBe(options[2]);
    expect(tabStops(options)).toEqual(["-1", "-1", "0", "-1"]);
    key(options[2], "ArrowUp"); // back over Banana → Apple
    expect(document.activeElement).toBe(options[0]);
    expect(tabStops(options)).toEqual(["0", "-1", "-1", "-1"]);
  });

  it("holds the focus when only disabled rows lie ahead", async () => {
    const { options } = await mountMixed();
    key(options[0], "ArrowDown"); // → Cherry
    key(options[2], "ArrowDown"); // Date is unavailable and last → stay
    expect(document.activeElement).toBe(options[2]);
    expect(tabStops(options)).toEqual(["-1", "-1", "0", "-1"]);
  });

  it("Home and End land on the first and last available row", async () => {
    const { options } = await mountMixed();
    key(options[0], "End"); // Date is unavailable → Cherry
    expect(document.activeElement).toBe(options[2]);
    key(options[2], "Home");
    expect(document.activeElement).toBe(options[0]);
    expect(tabStops(options)).toEqual(["0", "-1", "-1", "-1"]);
  });

  it("opens on an available row when the value itself is disabled", async () => {
    const { options } = await mountMixed(() => {}, mixed, "b");
    expect(document.activeElement).toBe(options[2]);
    expect(tabStops(options)).toEqual(["-1", "-1", "0", "-1"]);
  });

  it("gives no row the tab stop when every row is disabled", async () => {
    const allOff: DropdownItem[] = [
      { id: "a", label: "Apple", disabled: true },
      { id: "b", label: "Banana", disabled: true },
    ];
    const { container, options } = await mountMixed(() => {}, allOff, "a");
    expect(options.length).toBe(2);
    expect(options).not.toContain(document.activeElement);
    expect(tabStops(options)).toEqual(["-1", "-1"]);
    // The search stops at each end instead of looping, so these return.
    key(options[0], "ArrowDown");
    key(options[0], "ArrowUp");
    key(options[0], "Home");
    key(options[0], "End");
    expect(tabStops(options)).toEqual(["-1", "-1"]);
    expect(container.querySelector('[role="listbox"]')).toBeTruthy();
  });

  it("dims the whole row, and not by the muted colour alone", async () => {
    // jsdom applies no stylesheet, so read the rule itself — the same way the
    // indicator suite compares the dot and the glyph boxes.
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "./Dropdown.css"),
      "utf8",
    );
    const body = css.match(
      /\.sui-dropdown__item--disabled[^{]*\{([^}]*)\}/,
    )?.[1];
    if (body === undefined)
      throw new Error("no --disabled rule in Dropdown.css");
    // The muted token carries the text.
    expect(body).toContain("color: var(--sui-text-muted)");
    // The opacity carries the label and the indicator together, and it is what
    // separates a disabled row from a row whose own accent is that same token.
    const opacity = Number(body.match(/opacity:\s*([\d.]+)/)?.[1]);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
  });
});
