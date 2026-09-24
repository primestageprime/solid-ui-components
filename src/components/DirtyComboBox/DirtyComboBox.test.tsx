import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { DirtyComboBox } from "./DirtyComboBox";
import { viewOf, type DirtyComboStore } from "./dirtyComboModel";
import { PAYROLL_STORE, type PayrollConfig } from "./dirtyComboFixtures";

afterEach(cleanup);

const tick = () => new Promise((r) => queueMicrotask(() => r(null)));
const isInert = (el: Element | null | undefined): boolean =>
  (el as (HTMLElement & { inert?: boolean }) | null)?.inert === true;

function mount(store: DirtyComboStore<PayrollConfig>) {
  const deleted: string[] = [];
  const calls: string[] = [];
  const { container } = render(() => (
    <DirtyComboBox
      reference="Baseline"
      items={store.items}
      selectedId={store.selectedId}
      view={viewOf(store)}
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

describe("DirtyComboBox", () => {
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
    press(options[0]!); // the selected row
    press(options[2]!);
    expect(deleted).toEqual(["s3"]);
  });

  it("selecting a row reports it", async () => {
    const [store] = createSignal(PAYROLL_STORE);
    const { container, calls, open } = mount(store());
    await open();
    (container.querySelectorAll('[role="option"]')[1] as HTMLElement).click();
    expect(calls).toEqual(["select:s2"]);
  });
});
