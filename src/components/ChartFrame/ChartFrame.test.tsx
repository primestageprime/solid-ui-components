import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import {
  CHART_FRAME_HEIGHT,
  ChartFrame,
  type ChartYAxisMode,
  chartYAxisModeInfo,
  createChartFrame,
} from "./index";

const button = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);

describe("ChartFrame", () => {
  it("draws the title, the vertical y-title and the chart", () => {
    const { getByText } = render(() => (
      <ChartFrame title="Pay levels" yTitle="Salary ($)">
        <span>chart</span>
      </ChartFrame>
    ));
    expect(getByText("Pay levels")).toBeTruthy();
    expect(getByText("chart")).toBeTruthy();
    const yTitle = getByText("Salary ($)") as HTMLElement;
    expect(yTitle.style.writingMode).toBe("vertical-rl");
  });

  it("states its in-flow height on the fullscreen box's first child", () => {
    const { container } = render(() => (
      <ChartFrame title="T">
        <span />
      </ChartFrame>
    ));
    const box = container.querySelector(".sui-fullscreen-box")!;
    const column = box.firstElementChild as HTMLElement;
    expect(column.style.height).toBe(`${CHART_FRAME_HEIGHT}px`);
    const Fill = createChartFrame({ height: "fill" });
    const filled = render(() => (
      <Fill title="T">
        <span />
      </Fill>
    ));
    const fillColumn = filled.container.querySelector(".sui-fullscreen-box")!
      .firstElementChild as HTMLElement;
    expect(fillColumn.style.height).toBe("100%");
  });

  it("toggles full screen from its own button, owned or controlled", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <ChartFrame title="T" onFullscreenChange={onChange}>
        <span />
      </ChartFrame>
    ));
    const box = container.querySelector(".sui-fullscreen-box")!;
    expect(box.getAttribute("data-fullscreen")).toBe("false");
    const enter = button(container, "Full screen")!;
    expect(enter.querySelector('[aria-label="fullscreen"]')).toBeTruthy();
    fireEvent.click(enter);
    expect(box.getAttribute("data-fullscreen")).toBe("true");
    expect(onChange).toHaveBeenCalledWith(true);
    const exit = button(container, "Exit full screen")!;
    expect(exit.querySelector('[aria-label="fullscreen-exit"]')).toBeTruthy();
    // FullscreenBox's own corner is off: the frame's button is the only one.
    expect(container.querySelector(".sui-fullscreen-box__corner")).toBeNull();
  });

  it("draws no strategy button without a yAxisMode", () => {
    const { container } = render(() => (
      <ChartFrame title="T">
        <span />
      </ChartFrame>
    ));
    expect(container.querySelector(".sui-popover-menu")).toBeNull();
  });

  it("main face acts per mode; Full auto's is disabled", () => {
    const onPress = vi.fn();
    const [mode, setMode] = createSignal<ChartYAxisMode>("auto");
    const { container } = render(() => (
      <ChartFrame title="T" yAxisMode={mode()} onYAxisPress={onPress}>
        <span />
      </ChartFrame>
    ));
    fireEvent.click(button(container, chartYAxisModeInfo("auto").action)!);
    expect(onPress).toHaveBeenCalledTimes(1);
    setMode("autoscale");
    expect(button(container, chartYAxisModeInfo("autoscale").action)!.disabled).toBe(true);
    setMode("fixed");
    const lock = button(container, chartYAxisModeInfo("fixed").action)!;
    expect(lock.disabled).toBe(false);
    expect(lock.querySelector('[aria-label="lock"]')).toBeTruthy();
  });

  it("the ▾ has an accessible name and picks a mode", () => {
    const onMode = vi.fn();
    const { container } = render(() => (
      <ChartFrame title="T" yAxisMode="auto" onYAxisModeChange={onMode}>
        <span />
      </ChartFrame>
    ));
    const trigger = container.querySelector(".sui-popover-menu__trigger")!;
    expect(trigger.textContent).toBe("Y-axis mode");
    expect(trigger.querySelector(".sui-sr-only")).toBeTruthy();
    fireEvent.click(trigger);
    // The menu is portaled to document.body.
    const locked = [...document.querySelectorAll('[role="menuitem"]')].find(
      (item) => item.textContent?.includes("Locked"),
    )!;
    fireEvent.click(locked);
    expect(onMode).toHaveBeenCalledWith("fixed");
  });

  it("draws actions before fullscreen and the y-axis split, and nothing extra without them", () => {
    const { container } = render(() => (
      <ChartFrame title="Work mix" yAxisMode="auto" actions={<input aria-label="Cap" />}>
        <span />
      </ChartFrame>
    ));
    const cap = container.querySelector('input[aria-label="Cap"]')!;
    const full = button(container, "Full screen")!;
    // Cap precedes fullscreen in document order.
    expect(cap.compareDocumentPosition(full) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Without actions the header row is title + button group, as before.
    const bare = render(() => (
      <ChartFrame title="Work mix">
        <span />
      </ChartFrame>
    ));
    const header = bare.container.querySelector(".sui-fullscreen-box")!.firstElementChild!
      .firstElementChild as HTMLElement;
    expect(header.children).toHaveLength(2);
    expect(header.children[1].querySelector('button[aria-label="Full screen"]')).toBeTruthy();
    expect(header.children[1].querySelector("input")).toBeNull();
  });
});
