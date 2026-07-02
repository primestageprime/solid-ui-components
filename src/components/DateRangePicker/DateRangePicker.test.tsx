import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "./DateRangePicker";
import type { DateRange } from "./types";

const trigger = () =>
  document.querySelector<HTMLElement>(".sui-drp__trigger")!;
const dayButtons = () =>
  [...document.querySelectorAll<HTMLButtonElement>(".sui-drp__day")];

const rangeOf = (startMs: number, endMs: number): DateRange => ({
  start: new Date(startMs),
  end: new Date(endMs),
});

describe("DateRangePicker", () => {
  it("renders the committed range as the trigger label", () => {
    const value = () => rangeOf(Date.UTC(2026, 3, 20), Date.UTC(2026, 3, 25));
    render(() => (
      <DateRangePicker value={value} onChange={() => {}} timeZone="UTC" />
    ));
    const label = trigger().textContent ?? "";
    expect(label).toContain("–"); // en-dash range separator
    expect(label).toContain("2026");
  });

  it("applies a caller-supplied class to the trigger", () => {
    const value = () => rangeOf(Date.UTC(2026, 3, 20), Date.UTC(2026, 3, 25));
    render(() => (
      <DateRangePicker
        value={value}
        onChange={() => {}}
        timeZone="UTC"
        class="my-trigger"
      />
    ));
    expect(trigger().classList.contains("my-trigger")).toBe(true);
  });

  it("opens the calendar grid when the trigger is clicked", () => {
    const value = () => rangeOf(Date.UTC(2026, 3, 20), Date.UTC(2026, 3, 25));
    render(() => (
      <DateRangePicker value={value} onChange={() => {}} timeZone="UTC" />
    ));
    expect(dayButtons().length).toBe(0);
    fireEvent.click(trigger());
    // 6-week grid → 42 day cells.
    expect(dayButtons().length).toBe(42);
  });

  it("commits an ordered range across two day clicks (end clicked before start)", () => {
    const [value, setValue] = createSignal<DateRange>(
      rangeOf(Date.UTC(2026, 3, 20), Date.UTC(2026, 3, 25)),
    );
    const onChange = vi.fn((r: DateRange) => setValue(r));
    render(() => (
      <DateRangePicker value={value} onChange={onChange} timeZone="UTC" />
    ));
    fireEvent.click(trigger());
    const cells = dayButtons();
    // Click a later day first, then an earlier day — result must be ordered.
    const byNum = (n: number) =>
      cells.find(
        (c) =>
          c.textContent === String(n) &&
          !c.classList.contains("sui-drp__day--outside"),
      )!;
    fireEvent.click(byNum(20));
    fireEvent.click(byNum(10));
    expect(onChange).toHaveBeenCalledTimes(1);
    const committed = onChange.mock.lastCall![0];
    expect(committed.start.getTime()).toBeLessThan(committed.end.getTime());
  });

  it("applies a preset relative to now", () => {
    const value = () => rangeOf(Date.UTC(2026, 3, 20), Date.UTC(2026, 3, 25));
    const onChange = vi.fn();
    render(() => (
      <DateRangePicker
        value={value}
        onChange={onChange}
        timeZone="UTC"
        presets={[{ label: "Last 7 days", days: 7 }]}
      />
    ));
    fireEvent.click(trigger());
    const preset = [
      ...document.querySelectorAll<HTMLButtonElement>("button"),
    ].find((b) => b.textContent === "Last 7 days")!;
    expect(preset).toBeTruthy();
    fireEvent.click(preset);
    expect(onChange).toHaveBeenCalledTimes(1);
    const r = onChange.mock.lastCall![0];
    // ~7 days wide (allow slack for the preset's ms arithmetic).
    const spanDays = (r.end.getTime() - r.start.getTime()) / 86_400_000;
    expect(spanDays).toBeGreaterThan(6.5);
    expect(spanDays).toBeLessThan(7.5);
  });
});
