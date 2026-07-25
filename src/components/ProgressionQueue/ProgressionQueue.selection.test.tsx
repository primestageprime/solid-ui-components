// ProgressionQueue — selection & select mode. Split from
// ProgressionQueue.test.tsx (2026-07-24) to stay under the repo's 500-line
// file limit; substance unchanged from the original tests, see git history
// for prior home.
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent } from "@solidjs/testing-library";
import { renderQueue, renderSelectable, rowFor } from "./testHelpers";

afterEach(cleanup);

describe("ProgressionQueue — selection & select mode", () => {
  it("fires onSelect with the item key and marks the row interactive", () => {
    let picked: string | undefined;
    const { container } = renderQueue([{ id: "row-1", bucket: "a" }], {
      onSelect: (k: string) => (picked = k),
    });
    const row = container.querySelector(".prog-queue__row--interactive") as HTMLElement;
    expect(row).toBeTruthy();
    fireEvent.click(row);
    expect(picked).toBe("row-1");
  });

  it("marks the selected row", () => {
    const { container } = renderQueue([{ id: "row-1", bucket: "a" }], {
      onSelect: () => {},
      selectedKey: "row-1",
    });
    expect(container.querySelector(".prog-queue__row--selected")).toBeTruthy();
  });

  it("renders no check affordance when checkedKeys is absent", () => {
    const { container } = renderSelectable({ onSelect: () => {} });
    expect(container.querySelector(".prog-queue__checkbox")).toBeNull();
  });

  it("renders the check affordance only in selectable sections when checkedKeys is present", () => {
    const { container } = renderSelectable({
      onSelect: () => {},
      checkedKeys: new Set<string>(),
      onToggleCheck: () => {},
    });
    expect(rowFor(container, "check").querySelector(".prog-queue__checkbox")).toBeTruthy();
    expect(rowFor(container, "plain").querySelector(".prog-queue__checkbox")).toBeNull();
  });

  it("marks a row checked when its key is in checkedKeys", () => {
    const { container } = renderSelectable({
      onSelect: () => {},
      checkedKeys: new Set(["check"]),
      onToggleCheck: () => {},
    });
    expect(rowFor(container, "check").classList.contains("prog-queue__row--checked")).toBe(true);
  });

  it("toggles instead of selecting when a selectable row is clicked in select mode", () => {
    let selected: string | undefined;
    let toggled: [string, { shift: boolean; meta: boolean }] | undefined;
    const { container } = renderSelectable({
      onSelect: (k: string) => (selected = k),
      checkedKeys: new Set<string>(),
      onToggleCheck: (k: string, mods: { shift: boolean; meta: boolean }) => (toggled = [k, mods]),
    });
    fireEvent.click(rowFor(container, "check"), { shiftKey: true, metaKey: false });
    expect(toggled?.[0]).toBe("check");
    expect(toggled?.[1]).toEqual({ shift: true, meta: false });
    expect(selected).toBeUndefined();
  });

  it("still selects a NON-selectable section's row while select mode is on", () => {
    let selected: string | undefined;
    let toggled: string | undefined;
    const { container } = renderSelectable({
      onSelect: (k: string) => (selected = k),
      checkedKeys: new Set<string>(),
      onToggleCheck: (k: string) => (toggled = k),
    });
    fireEvent.click(rowFor(container, "plain"));
    expect(selected).toBe("plain");
    expect(toggled).toBeUndefined();
  });

  it("treats ctrl-click as meta", () => {
    let mods: { shift: boolean; meta: boolean } | undefined;
    const { container } = renderSelectable({
      onSelect: () => {},
      checkedKeys: new Set<string>(),
      onToggleCheck: (_k: string, m: { shift: boolean; meta: boolean }) => (mods = m),
    });
    fireEvent.click(rowFor(container, "check"), { ctrlKey: true });
    expect(mods).toEqual({ shift: false, meta: true });
  });
});
