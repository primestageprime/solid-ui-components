// ============================================
// ProgressFlags mounts: the frame, the chart, one flag per step, the "now"
// line when cut, and the hover/select pair reporting 1-based step numbers.
// The numbers behind the picture are model.test.ts's business; this file only
// checks that the paint follows the model and the callbacks carry step numbers.
// ============================================
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { length } from "../../fn";
import { SCENARIOS, TOPIC_18 } from "./fixtures";
import { MIN_MS, startOf } from "./model";
import { ProgressFlags } from "./ProgressFlags";

const pinsIn = (container: HTMLElement) => container.querySelectorAll("[data-id^=\"step-\"]");

describe("ProgressFlags", () => {
  it("mounts the frame with its title and one flag per step", () => {
    const { container, getByText } = render(() => (
      <ProgressFlags title="Ahead" trace={TOPIC_18} />
    ));
    expect(getByText("Ahead")).toBeTruthy();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(length([...pinsIn(container)])).toBe(11);
  });

  it("draws a now line only when cut with asOf", () => {
    const cut = render(() => (
      <ProgressFlags title="In progress" trace={TOPIC_18} asOf={startOf(TOPIC_18) + 12 * MIN_MS} />
    ));
    expect(cut.container.textContent).toContain("now");
    const whole = render(() => <ProgressFlags title="Ahead" trace={TOPIC_18} />);
    expect(whole.container.textContent).not.toContain("now");
  });

  it("mounts every showcase scenario", () => {
    for (const sc of SCENARIOS) {
      const { container } = render(() => (
        <ProgressFlags title={sc.name} trace={sc.topic} asOf={sc.nowMin === undefined ? undefined : startOf(sc.topic) + sc.nowMin * MIN_MS} />
      ));
      expect(length([...pinsIn(container)])).toBe(Math.max(1, sc.topic.steps.length));
    }
  });

  it("reports hover and selection as 1-based step numbers", () => {
    const [hovered, setHovered] = createSignal<number | undefined>(undefined);
    const [selected, setSelected] = createSignal<number | undefined>(undefined);
    const { container } = render(() => (
      <ProgressFlags
        title="Ahead"
        trace={TOPIC_18}
        hoveredStep={hovered()}
        onHoverStep={setHovered}
        selectedStep={selected()}
        onSelectStep={setSelected}
      />
    ));
    const third = pinsIn(container)[2] as Element;
        fireEvent.pointerEnter(third);
    expect(hovered()).toBe(3);
    fireEvent.pointerDown(third);
    expect(selected()).toBe(3);
  });

  it("lights the hovered and selected steps' flags from outside", () => {
    const { container } = render(() => (
      <ProgressFlags title="Ahead" trace={TOPIC_18} hoveredStep={2} selectedStep={5} />
    ));
    const pins = [...pinsIn(container)];
    expect(pins[1]?.getAttribute("data-emphasized")).toBe("true");
    expect(pins[0]?.getAttribute("data-emphasized")).toBeNull();
    expect(pins[4]?.getAttribute("data-selected")).toBe("true");
  });

  it("words its own y axis", () => {
    const { container } = render(() => <ProgressFlags title="Ahead" trace={TOPIC_18} />);
    expect(container.textContent).toContain("Planned minutes earned");
  });
});
