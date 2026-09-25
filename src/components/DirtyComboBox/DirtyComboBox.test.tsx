import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { ScenarioComboBox } from "./variants";
import { map } from "../../fn";
import { createDirtyComboBox } from "./DirtyComboBox";
import {
  DIRTY_COMBO_NONE_ID,
  dirtyComboCreate,
  dirtyComboRename,
  dirtyComboReset,
  dirtyComboSelect,
  dirtyComboViewOf,
  type DirtyComboStore,
} from "./dirtyComboModel";
import { PAYROLL_STORE, type PayrollConfig } from "./dirtyComboFixtures";

afterEach(cleanup);

const tick = () => new Promise((r) => queueMicrotask(() => r(null)));
const isInert = (el: Element | null | undefined): boolean =>
  (el as (HTMLElement & { inert?: boolean }) | null)?.inert === true;

function mount(store: DirtyComboStore<PayrollConfig>) {
  const deleted: string[] = [];
  const calls: string[] = [];
  const { container } = render(() => (
    <ScenarioComboBox
      items={store.items}
      selectedId={store.selectedId}
      view={dirtyComboViewOf(store)}
      onSelect={(id) => calls.push(`select:${id}`)}
      onSave={() => calls.push("save")}
      onReset={() => calls.push("reset")}
      onDelete={(id) => deleted.push(id)}
    />
  ));
  const saveReveal = () =>
    container
      .querySelector('[aria-label="Save"]')
      ?.closest(".sui-slide-reveal");
  const resetReveal = () =>
    container
      .querySelector('[aria-label="Reset to saved"]')
      ?.closest(".sui-slide-reveal");
  const open = async () => {
    container
      .querySelector<HTMLButtonElement>(".sui-dropdown__trigger button")!
      .click();
    await tick();
  };
  return { container, deleted, calls, saveReveal, resetReveal, open };
}

const dirtyStore = {
  ...PAYROLL_STORE,
  draft: { ...PAYROLL_STORE.draft, engineer: 999 },
};

describe("DirtyComboBox (as ScenarioComboBox)", () => {
  it("speaks the curried words: pill, versus, save, reset", () => {
    const { container } = mount(PAYROLL_STORE);
    expect(container.textContent).toContain("Baseline");
    expect(container.textContent).toContain("vs");
    expect(container.querySelector('[aria-label="Save"]')).toBeTruthy();
    expect(
      container.querySelector('[aria-label="Reset to saved"]'),
    ).toBeTruthy();
  });

  it("pristine: save and reset are collapsed and inert", () => {
    const { saveReveal, resetReveal } = mount(PAYROLL_STORE);
    expect(isInert(saveReveal())).toBe(true);
    expect(isInert(resetReveal())).toBe(true);
  });

  it("dirty: save and reset slide out and fire their commands", () => {
    const { container, calls, saveReveal, resetReveal } = mount(dirtyStore);
    expect(isInert(saveReveal())).toBe(false);
    expect(isInert(resetReveal())).toBe(false);
    container.querySelector<HTMLButtonElement>('[aria-label="Save"]')!.click();
    container
      .querySelector<HTMLButtonElement>('[aria-label="Reset to saved"]')!
      .click();
    expect(calls).toEqual(["save", "reset"]);
  });

  it("shows the selected label in the combo", () => {
    const { container } = mount(PAYROLL_STORE);
    expect(
      container.querySelector(".sui-dropdown-fit__label")?.textContent,
    ).toBe("S-2026-09-24");
  });

  it("puts a trash on every row but the selected one", async () => {
    const { container, deleted, open } = mount(PAYROLL_STORE);
    await open();
    const trashes = container.querySelectorAll('[aria-label^="Delete "]');
    expect(trashes).toHaveLength(PAYROLL_STORE.items.length - 1);
    expect(
      container.querySelector('[aria-label="Delete S-2026-09-24"]'),
    ).toBeNull();
    (trashes[0] as HTMLButtonElement).click();
    expect(deleted).toEqual(["s2"]);
  });

  it("Delete on a focused row deletes it, but never the selected row", async () => {
    const { container, deleted, open } = mount(PAYROLL_STORE);
    await open();
    const options = container.querySelectorAll('[role="option"]');
    const press = (el: Element) =>
      el.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Delete", bubbles: true }),
      );
    // options[0] is "None" (ScenarioComboBox names it), which is no item.
    press(options[0]!);
    press(options[1]!); // the selected row
    press(options[3]!);
    expect(deleted).toEqual(["s3"]);
  });

  it("selecting a row reports it", async () => {
    const [store] = createSignal(PAYROLL_STORE);
    const { container, calls, open } = mount(store());
    await open();
    // [0] is "None", [1] the selected row.
    (container.querySelectorAll('[role="option"]')[2] as HTMLElement).click();
    expect(calls).toEqual(["select:s2"]);
  });
});

describe("createDirtyComboBox", () => {
  it("curries a screen's own words", async () => {
    const PresetComboBox = createDirtyComboBox({
      labels: {
        reference: "Default",
        versus: "or",
        save: "Keep",
        reset: "Undo edits",
        deleteItem: (label) => `Remove preset ${label}`,
      },
    });
    const { container } = render(() => (
      <PresetComboBox
        items={PAYROLL_STORE.items}
        selectedId="s1"
        view={dirtyComboViewOf(PAYROLL_STORE)}
        onSelect={() => {}}
        onSave={() => {}}
        onReset={() => {}}
        onDelete={() => {}}
      />
    ));
    expect(container.textContent).toContain("Default");
    expect(container.querySelector('[aria-label="Keep"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Undo edits"]')).toBeTruthy();
    container
      .querySelector<HTMLButtonElement>(".sui-dropdown__trigger button")!
      .click();
    await tick();
    expect(
      container.querySelector('[aria-label="Remove preset Lean 2027"]'),
    ).toBeTruthy();
  });
});

// ── parity: [ reset | new ], click-to-rename, None, disabled, swatch ──────

function mountLive(initial: DirtyComboStore<PayrollConfig>) {
  const [store, setStore] = createSignal(initial);
  let n = 0;
  const { container } = render(() => (
    <ScenarioComboBox
      items={store().items}
      selectedId={store().selectedId}
      view={dirtyComboViewOf(store())}
      onSelect={(id) => setStore((s) => dirtyComboSelect(s, id))}
      onSave={() => {}}
      onReset={() => setStore(dirtyComboReset)}
      onDelete={() => {}}
      onCreate={() =>
        setStore((s) => dirtyComboCreate(s, { id: `n${++n}`, label: "New scenario" }))
      }
      onRename={(name) => setStore((s) => dirtyComboRename(s, name))}
    />
  ));
  // The live control, not the invisible widest-state reservation.
  const live = () => container.querySelector(".sui-reserved-width__live")!;
  const button = (label: string) =>
    live().querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
  const field = () => live().querySelector<HTMLInputElement>("input");
  return { container, store, live, button, field };
}

describe("DirtyComboBox parity (onCreate + onRename)", () => {
  it("the split always stands; reset is disabled while pristine", () => {
    const { button } = mountLive(PAYROLL_STORE);
    expect(button("New scenario")).toBeTruthy();
    expect(button("Reset to saved").disabled).toBe(true);
  });

  it("reset enables once dirty and resets", () => {
    const { button, store } = mountLive(dirtyStore);
    expect(button("Reset to saved").disabled).toBe(false);
    button("Reset to saved").click();
    expect(dirtyComboViewOf(store()).dirty).toBe(false);
  });

  it("new creates, selects, and opens the name field; Enter names it", async () => {
    const { button, field, store } = mountLive(PAYROLL_STORE);
    button("New scenario").click();
    await tick();
    expect(store().selectedId).toBe("n1");
    const input = field()!;
    expect(input.value).toBe("New scenario");
    fireEvent.input(input, { target: { value: "Lean 2028" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(dirtyComboViewOf(store()).selectedLabel).toBe("Lean 2028");
  });

  it("clicking the name renames on blur; Esc cancels", async () => {
    const { live, field, store } = mountLive(PAYROLL_STORE);
    const name = () =>
      live().querySelector<HTMLButtonElement>(".sui-editable-title__text")!;
    name().click();
    await tick();
    fireEvent.input(field()!, { target: { value: "Renamed" } });
    fireEvent.blur(field()!);
    expect(dirtyComboViewOf(store()).selectedLabel).toBe("Renamed");
    name().click();
    await tick();
    fireEvent.input(field()!, { target: { value: "Nope" } });
    fireEvent.keyDown(field()!, { key: "Escape" });
    expect(dirtyComboViewOf(store()).selectedLabel).toBe("Renamed");
  });

  it("None leads the menu, carries no trash, and makes the name inert", async () => {
    const { live, button, store } = mountLive(PAYROLL_STORE);
    button("Choose a scenario").click();
    await tick();
    const options = live().querySelectorAll('[role="option"]');
    expect(options[0]?.textContent).toContain("None");
    expect(options[0]?.querySelector('[aria-label^="Delete"]')).toBeNull();
    (options[0] as HTMLElement).click();
    await tick();
    expect(store().selectedId).toBe(DIRTY_COMBO_NONE_ID);
    const name = live().querySelector<HTMLButtonElement>(
      ".sui-editable-title__text",
    )!;
    expect(name.textContent).toBe("None");
    expect(name.disabled).toBe(true);
  });

  it("a disabled row states its reason and cannot be picked; swatches draw", async () => {
    const refused = {
      ...PAYROLL_STORE,
      items: map((item: (typeof PAYROLL_STORE.items)[number], i: number) =>
        i === 1
          ? { ...item, color: "red", disabled: true, reason: "Other baseline" }
          : { ...item, color: "blue" },
      PAYROLL_STORE.items),
    };
    const { live, button, store } = mountLive(refused);
    expect(live().querySelector(".sui-scenario-glyph, svg")).toBeTruthy();
    button("Choose a scenario").click();
    await tick();
    const row = live().querySelectorAll<HTMLElement>('[role="option"]')[2]!;
    expect(row.getAttribute("aria-disabled")).toBe("true");
    expect(row.getAttribute("title")).toBe("Other baseline");
    row.click();
    expect(store().selectedId).toBe(PAYROLL_STORE.selectedId);
  });
});
