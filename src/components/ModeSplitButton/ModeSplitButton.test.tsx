import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { ModeSplitButton, type ModeInfo, modeInfo } from "./index";

type Mode = "auto" | "manual";

const MODES: readonly ModeInfo<Mode>[] = [
  {
    mode: "auto",
    label: "Full auto",
    icon: "arrows-up-down",
    action: "Flows automatically",
    disabled: true,
  },
  {
    mode: "manual",
    label: "Manual",
    icon: "fit",
    action: "Flow once",
    disabled: false,
  },
];

const face = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>(
    "button:not(.sui-popover-menu__trigger)",
  );

describe("modeInfo", () => {
  it("finds the row for a mode, falling back to the first", () => {
    expect(modeInfo(MODES, "manual").label).toBe("Manual");
    expect(modeInfo(MODES, "nope" as Mode).mode).toBe("auto");
  });
});

describe("ModeSplitButton", () => {
  it("the face shows the current mode's icon and action, disabled when the mode says so", () => {
    const [mode, setMode] = createSignal<Mode>("auto");
    const onPress = vi.fn();
    const { container } = render(() => (
      <ModeSplitButton
        modes={MODES}
        mode={mode()}
        onPress={onPress}
        menuLabel="Schedule mode"
      />
    ));
    expect(face(container)?.getAttribute("aria-label")).toBe(
      "Flows automatically",
    );
    expect(face(container)?.disabled).toBe(true);
    setMode("manual");
    expect(face(container)?.getAttribute("aria-label")).toBe("Flow once");
    expect(face(container)?.querySelector('[aria-label="fit"]')).toBeTruthy();
    fireEvent.click(face(container) as HTMLButtonElement);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("the ▾ is named by menuLabel, marks the current mode and reports a pick", () => {
    const onModeChange = vi.fn();
    const { container } = render(() => (
      <ModeSplitButton
        modes={MODES}
        mode="auto"
        onModeChange={onModeChange}
        menuLabel="Schedule mode"
      />
    ));
    const trigger = container.querySelector(
      ".sui-popover-menu__trigger",
    ) as HTMLElement;
    expect(trigger.textContent).toBe("Schedule mode");
    fireEvent.click(trigger);
    const items = [...document.querySelectorAll('[role="menuitem"]')];
    expect(items.map((i) => i.getAttribute("aria-current"))).toEqual([
      "true",
      null,
    ]);
    fireEvent.click(items[1]);
    expect(onModeChange).toHaveBeenCalledWith("manual");
  });
});
