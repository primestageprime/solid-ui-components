import { describe, it, expect } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { ScrubChart } from "./ScrubChart";
import {
  DEFAULT_TOP_ACTION_ICON,
  DEFAULT_TOP_ACTION_LABEL,
  ScrubChartTopActionControl,
} from "./ScrubChartTopActionControl";
import { dailyCells, type Cell } from "../DateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const cells10 = (): Cell[] => dailyCells(d("2026-05-01"), d("2026-05-10"));

/** The top-right button — the control is ONE button. */
const topButton = (container: HTMLElement): HTMLElement =>
  container.querySelector<HTMLElement>(".sui-scrub-chart__top-action-btn")!;

/** The bar's restore button. */
const restoreButton = (container: HTMLElement): HTMLElement =>
  container.querySelector<HTMLElement>(".sui-scrub-chart__restore-btn")!;

/** The frame's height, in px, as the inline style states it. */
const frameHeight = (container: HTMLElement): string =>
  container.querySelector<HTMLElement>(".sui-scrub-chart__frame")!.style.height;

const chart = (props: Record<string, unknown>) => (
  <ScrubChart
    cells={cells10()}
    chartHeight={200}
    renderChart={() => <svg data-testid="plot" />}
    renderCell={() => <div />}
    {...props}
  />
);

describe("ScrubChartTopActionControl", () => {
  it("renders one button and calls the handler on a click", () => {
    let clicks = 0;
    const { container } = render(() => (
      <ScrubChartTopActionControl
        icon={() => DEFAULT_TOP_ACTION_ICON}
        label={() => DEFAULT_TOP_ACTION_LABEL}
        onClick={() => clicks++}
      />
    ));
    expect(
      container.querySelectorAll(".sui-scrub-chart__top-action-btn"),
    ).toHaveLength(1);
    const btn = topButton(container);
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.getAttribute("type")).toBe("button");
    fireEvent.click(btn);
    expect(clicks).toBe(1);
  });

  // The look comes from the SHARED corner classes, so the three corner
  // controls cannot drift apart. The `__top-action` names stay on the markup
  // as the hook a consumer overrides this one button with.
  it("takes the shared corner classes and its own name", () => {
    const { container } = render(() => (
      <ScrubChartTopActionControl
        icon={() => DEFAULT_TOP_ACTION_ICON}
        label={() => DEFAULT_TOP_ACTION_LABEL}
        onClick={() => {}}
      />
    ));
    const corner = container.querySelector<HTMLElement>(
      ".sui-scrub-chart__corner",
    )!;
    expect(corner.classList.contains("sui-scrub-chart__top-action")).toBe(true);
    expect(
      topButton(container).classList.contains("sui-scrub-chart__corner-btn"),
    ).toBe(true);
  });

  // The button takes its NAME from the label, because the Tooltip's trigger
  // span is not focusable and the button is what a keyboard reaches.
  it("names itself from the label it is given", () => {
    const { container } = render(() => (
      <ScrubChartTopActionControl
        icon={() => "settings"}
        label={() => "Open settings"}
        onClick={() => {}}
      />
    ));
    expect(topButton(container).getAttribute("aria-label")).toBe(
      "Open settings",
    );
  });

  // The default glyph DEPICTS the bar a click leaves behind.
  it("defaults to the minus glyph and the minimize name", () => {
    expect(DEFAULT_TOP_ACTION_ICON).toBe("minus");
    expect(DEFAULT_TOP_ACTION_LABEL).toBe("Minimize chart");
  });
});

describe("ScrubChart top action", () => {
  // The master switch. An existing caller passes no `topAction` and gains no
  // button, so no chart minimizes by surprise.
  it("renders no button without topAction", () => {
    const { container } = render(() => chart({}));
    expect(container.querySelector(".sui-scrub-chart__top-action")).toBeNull();
  });

  it("renders the default button for topAction and for an empty object", () => {
    for (const value of [true, {}]) {
      const { container } = render(() => chart({ topAction: value }));
      expect(topButton(container).getAttribute("aria-label")).toBe(
        "Minimize chart",
      );
    }
  });

  it("takes the caller's glyph and name", () => {
    const { container } = render(() =>
      chart({ topAction: { icon: "gear", label: "Configure" } }),
    );
    expect(topButton(container).getAttribute("aria-label")).toBe("Configure");
  });

  // The default behaviour: the frame and the ribbon give way to the bar, and
  // the restore button brings them back.
  it("minimizes to the bar and restores from it", () => {
    const { container } = render(() => chart({ topAction: true }));
    expect(container.querySelector('[data-testid="plot"]')).not.toBeNull();
    expect(container.querySelector(".sui-scrub-chart__minimized")).toBeNull();

    fireEvent.click(topButton(container));
    expect(container.querySelector(".sui-scrub-chart__frame")).toBeNull();
    expect(container.querySelector(".sui-date-axis")).toBeNull();
    expect(container.querySelector('[data-testid="plot"]')).toBeNull();
    expect(
      container.querySelector(".sui-scrub-chart__minimized"),
    ).not.toBeNull();

    fireEvent.click(restoreButton(container));
    expect(container.querySelector(".sui-scrub-chart__frame")).not.toBeNull();
    expect(container.querySelector('[data-testid="plot"]')).not.toBeNull();
    expect(container.querySelector(".sui-scrub-chart__minimized")).toBeNull();
  });

  // A caller's own handler REPLACES the minimize step. The button is the
  // page's, and the chart never leaves the frame.
  it("does not minimize when the caller states an onClick", () => {
    let clicks = 0;
    const { container } = render(() =>
      chart({ topAction: { onClick: () => clicks++ } }),
    );
    fireEvent.click(topButton(container));
    expect(clicks).toBe(1);
    expect(container.querySelector(".sui-scrub-chart__frame")).not.toBeNull();
    expect(container.querySelector(".sui-scrub-chart__minimized")).toBeNull();
  });

  it("reports every minimize and restore", () => {
    const reported: boolean[] = [];
    const { container } = render(() =>
      chart({
        topAction: true,
        onMinimizedChange: (n: boolean) => reported.push(n),
      }),
    );
    fireEvent.click(topButton(container));
    fireEvent.click(restoreButton(container));
    expect(reported).toEqual([true, false]);
  });

  // Controlled: the caller's `minimized` wins, so a click changes nothing
  // until the caller answers it.
  it("holds the caller's state when minimized is controlled", () => {
    const reported: boolean[] = [];
    const { container } = render(() =>
      chart({
        topAction: true,
        minimized: false,
        onMinimizedChange: (n: boolean) => reported.push(n),
      }),
    );
    fireEvent.click(topButton(container));
    expect(reported).toEqual([true]);
    expect(container.querySelector(".sui-scrub-chart__frame")).not.toBeNull();
  });

  it("shows the bar when the caller states minimized", () => {
    const { container } = render(() =>
      chart({ topAction: true, minimized: true }),
    );
    expect(
      container.querySelector(".sui-scrub-chart__minimized"),
    ).not.toBeNull();
    expect(container.querySelector(".sui-scrub-chart__frame")).toBeNull();
  });

  // `minimized` with no `topAction` shows the chart: nothing can restore a
  // bar that has no button to raise it, so a caller cannot strand a reader.
  it("ignores minimized without topAction", () => {
    const { container } = render(() => chart({ minimized: true }));
    expect(container.querySelector(".sui-scrub-chart__frame")).not.toBeNull();
    expect(container.querySelector(".sui-scrub-chart__minimized")).toBeNull();
  });

  // Minimized is its OWN axis. The frame's height signals are untouched, so
  // a chart minimized while expanded comes back expanded.
  it("comes back at the height it left", () => {
    const { container } = render(() =>
      chart({
        topAction: true,
        chartHeightExpanded: 480,
        expandTransition: false,
      }),
    );
    fireEvent.click(
      container.querySelector<HTMLElement>(".sui-scrub-chart__expand-btn")!,
    );
    expect(frameHeight(container)).toBe("480px");
    fireEvent.click(topButton(container));
    fireEvent.click(restoreButton(container));
    expect(frameHeight(container)).toBe("480px");
  });

  // The bar replaces the frame, so the expand chevron has nothing to move and
  // does not render beside it.
  it("hides the other two corner controls while the bar is up", () => {
    const { container } = render(() =>
      chart({
        topAction: true,
        chartHeightExpanded: 480,
        yFitDomain: () => [10, 90] as [number, number],
      }),
    );
    expect(container.querySelectorAll(".sui-scrub-chart__corner")).toHaveLength(
      3,
    );
    fireEvent.click(topButton(container));
    expect(container.querySelectorAll(".sui-scrub-chart__corner")).toHaveLength(
      0,
    );
    expect(container.querySelector(".sui-scrub-chart__expand-btn")).toBeNull();
    expect(container.querySelector(".sui-scrub-chart__y-fit-btn")).toBeNull();
  });

  // The top action takes the corner OPPOSITE the origin, so all three
  // controls coexist on one chart without overlapping.
  it("keeps all three corner controls apart", () => {
    const { container } = render(() =>
      chart({
        topAction: true,
        chartHeightExpanded: 480,
        yFitDomain: () => [10, 90] as [number, number],
      }),
    );
    for (const name of ["y-fit", "expand", "top-action"]) {
      expect(
        container.querySelectorAll(`.sui-scrub-chart__${name}`),
      ).toHaveLength(1);
    }
  });

  // FILL MODE gives way to the bar: the modifier would stretch one line down
  // the whole container.
  it("drops the fill modifier while the bar is up", () => {
    const { container } = render(() =>
      chart({ chartHeight: "fill", topAction: true }),
    );
    const root = container.querySelector<HTMLElement>(".sui-scrub-chart")!;
    expect(root.classList.contains("sui-scrub-chart--fill")).toBe(true);
    fireEvent.click(topButton(container));
    expect(root.classList.contains("sui-scrub-chart--fill")).toBe(false);
    fireEvent.click(restoreButton(container));
    expect(root.classList.contains("sui-scrub-chart--fill")).toBe(true);
  });

  // The frame UNMOUNTS while the bar is up, so the chart must draw again when
  // it comes back — the measurement attaches per mount, not once.
  it("draws the plot again after a round trip", () => {
    let renders = 0;
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        chartHeight={200}
        topAction={true}
        renderChart={() => {
          renders++;
          return <svg data-testid="plot" />;
        }}
        renderCell={() => <div />}
      />
    ));
    const first = renders;
    expect(first).toBeGreaterThan(0);
    fireEvent.click(topButton(container));
    fireEvent.click(restoreButton(container));
    expect(container.querySelector('[data-testid="plot"]')).not.toBeNull();
    expect(renders).toBeGreaterThan(first);
  });
});
