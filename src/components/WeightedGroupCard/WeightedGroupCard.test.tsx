// WeightedGroupCard — Peter's role-card sketch, 2026-11-20. Carpenters is
// Gerald ×2 and Jen ×1; the group's dial is read-only and sits at their
// count-weighted mean; the count expands the card; resets act on the whole
// set or on one member; every dial shares one height and one scale.
import { cleanup, fireEvent, render, screen, within } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type FakeSizer, installFakeSizer } from "../../test-utils";
import { WeightedGroupCard, type WeightedGroupCardProps } from "./WeightedGroupCard";
import type { WeightedGroup } from "./weighted";

let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());
afterEach(cleanup);

const CARPENTERS: WeightedGroup = {
  id: "carpenters",
  label: "Carpenters",
  range: [40_000, 90_000],
  members: [
    { id: "g", label: "Gerald", count: 2, old: 48_000, value: 64_000 },
    { id: "j", label: "Jen", count: 1, old: 48_000, value: 60_000 },
  ],
};

/** Whole thousands, so the figures read like the sketch: $62.7K → "$63K". */
const thousands = (value: number): string => `$${Math.round(value / 1_000)}K`;

/** A card that holds its own group, so every edit shows. */
function mount(extra: Partial<WeightedGroupCardProps> = {}) {
  const onChange = vi.fn<(next: WeightedGroup) => void>();
  const [group, setGroup] = createSignal<WeightedGroup>(extra.group ?? CARPENTERS);
  const result = render(() => (
    <WeightedGroupCard
      format={thousands}
      {...extra}
      group={group()}
      onChange={(next) => {
        onChange(next);
        setGroup(next);
      }}
    />
  ));
  return { ...result, onChange, group };
}

const sliders = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>('[role="slider"]'));

const expand = (): void => {
  fireEvent.click(screen.getByRole("button", { name: /Show each Carpenters/ }));
};

describe("WeightedGroupCard — collapsed", () => {
  it("shows the role, its headcount, and one read-only dial at the weighted mean", () => {
    const { container } = mount();
    expect(screen.getByText("Carpenters")).toBeTruthy();
    // 2 + 1: the members' counts summed.
    expect(screen.getByRole("button", { name: /Show each Carpenters/ }).textContent).toBe("3");
    const [dial, ...rest] = sliders(container);
    expect(rest).toHaveLength(0);
    // (64K·2 + 60K·1) / 3 = 62,666.67
    expect(Number(dial?.getAttribute("aria-valuenow"))).toBeCloseTo(188_000 / 3);
    expect(dial?.getAttribute("aria-readonly")).toBe("true");
  });

  it("prints the per-unit amount and the times-headcount total under it", () => {
    mount();
    expect(screen.getByText("$63K")).toBeTruthy();
    expect(screen.getByText("×3 = $188K")).toBeTruthy();
  });

  it("does not move when a key is pressed on the group's dial", () => {
    const { container, onChange } = mount();
    const [dial] = sliders(container);
    fireEvent.keyDown(dial as HTMLElement, { key: "ArrowUp" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("resets the whole set from the group's Reset", () => {
    const { onChange, group } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Reset Carpenters" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(group().members.map((m) => m.value)).toEqual([48_000, 48_000]);
  });

  it("disables the group's Reset when nothing has moved", () => {
    mount({
      group: {
        ...CARPENTERS,
        members: CARPENTERS.members.map((m) => ({ ...m, value: m.old })),
      },
    });
    const reset = screen.getByRole("button", { name: "Reset Carpenters" }) as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
  });
});

describe("WeightedGroupCard — expanding", () => {
  it("opens to one column per member when the count is clicked, and closes again", () => {
    const { container } = mount();
    const count = screen.getByRole("button", { name: /Show each Carpenters/ });
    expect(count.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(count);
    expect(sliders(container)).toHaveLength(3);
    expect(screen.getByText("Gerald")).toBeTruthy();
    expect(screen.getByText("Jen")).toBeTruthy();
    const open = screen.getByRole("button", { name: /Hide each Carpenters/ });
    expect(open.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(open);
    expect(sliders(container)).toHaveLength(1);
  });

  it("closes from the collapse button in the corner too", () => {
    const { container } = mount();
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Collapse Carpenters" }));
    expect(sliders(container)).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Collapse Carpenters" })).toBeNull();
  });

  it("starts open when asked", () => {
    const { container } = mount({ defaultOpen: true });
    expect(sliders(container)).toHaveLength(3);
  });

  it("gives every dial the same height and the same scale, so the tracks line up", () => {
    const { container } = mount({ defaultOpen: true });
    const all = sliders(container);
    expect(new Set(all.map((s) => s.getAttribute("aria-valuemin")))).toEqual(new Set(["40000"]));
    expect(new Set(all.map((s) => s.getAttribute("aria-valuemax")))).toEqual(new Set(["90000"]));
    const boxes = Array.from(container.querySelectorAll("svg[viewBox]"))
      .map((svg) => svg.getAttribute("viewBox"))
      .filter((box) => box?.startsWith("0 0 88 "));
    expect(boxes).toHaveLength(3);
    expect(new Set(boxes).size).toBe(1);
  });

  it("prints each member's amount and its own times-count total", () => {
    mount({ defaultOpen: true });
    expect(screen.getByText("×2 = $128K")).toBeTruthy();
    expect(screen.getByText("×1 = $60K")).toBeTruthy();
  });

  it("marks a new member's footnote as new", () => {
    const [gerald, jen] = CARPENTERS.members;
    mount({
      defaultOpen: true,
      group: { ...CARPENTERS, members: [gerald!, { ...jen!, old: null }] },
    });
    expect(screen.getByText("New · ×1 = $60K")).toBeTruthy();
  });
});

describe("WeightedGroupCard — editing a member", () => {
  it("moves one member's amount from its own dial, inside the group's range", () => {
    const { container, group } = mount({ defaultOpen: true, snap: 1_000 });
    const jen = sliders(container)[2] as HTMLElement;
    fireEvent.keyDown(jen, { key: "ArrowUp" });
    const value = group().members[1]?.value ?? 0;
    expect(value).toBeGreaterThan(60_000);
    expect(value).toBeLessThanOrEqual(90_000);
    expect(group().members[0]?.value).toBe(64_000);
  });

  it("edits a member's count from its field, and the group's count follows", () => {
    const { group } = mount({ defaultOpen: true });
    // The field is named by its group: the spin button sits inside "Jen count".
    const field = within(screen.getByRole("group", { name: "Jen count" })).getByRole("spinbutton");
    fireEvent.input(field, { target: { value: "4" } });
    expect(group().members[1]?.count).toBe(4);
    expect(screen.getByRole("button", { name: /Hide each Carpenters/ }).textContent).toBe("6");
  });

  it("resets only that member from its own Reset", () => {
    const { group } = mount({ defaultOpen: true });
    fireEvent.click(screen.getByRole("button", { name: "Reset Jen" }));
    expect(group().members.map((m) => m.value)).toEqual([64_000, 48_000]);
  });

  it("removes a member and offers it back", () => {
    const { group } = mount({ defaultOpen: true });
    fireEvent.click(screen.getByRole("button", { name: "Remove Jen" }));
    expect(group().members[1]?.value).toBeNull();
    expect(screen.getByRole("button", { name: /Hide each Carpenters/ }).textContent).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: "Restore Jen" }));
    expect(group().members[1]?.value).toBe(48_000);
  });
});

describe("WeightedGroupCard — the role's range", () => {
  it("opens a min/max dialog from the role's name, and the new range lands on the group", async () => {
    const { group } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Edit range for Carpenters" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.input(screen.getByRole("spinbutton", { name: "Min" }), {
      target: { value: "50000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Set range" }));
    expect(group().range).toEqual([50_000, 90_000]);
  });
});
