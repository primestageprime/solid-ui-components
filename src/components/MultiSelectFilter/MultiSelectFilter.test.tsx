import { render, fireEvent } from "@solidjs/testing-library";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { MultiSelectFilter, type MultiSelectOption } from "./MultiSelectFilter";

// In jsdom clientWidth is 0, so the control always resolves to "bar" mode
// (containerWidth === 0 short-circuits to bar). These tests exercise bar mode
// plus the mode-independent click semantics.

// jsdom has no ResizeObserver; onMount installs one. A no-op stub is enough —
// clientWidth stays 0, so the control keeps rendering the button bar.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
beforeAll(() => vi.stubGlobal("ResizeObserver", NoopResizeObserver));
afterAll(() => vi.unstubAllGlobals());

const OPTS: MultiSelectOption[] = [
  { value: "a", label: "Apple" },
  { value: "b", label: "Banana" },
  { value: "c" }, // label falls back to value
];

const chips = () =>
  [...document.querySelectorAll<HTMLButtonElement>(".sui-msf__chip")];
const chipByText = (t: string) =>
  chips().find((c) => c.textContent === t)!;

describe("MultiSelectFilter (bar mode)", () => {
  it("renders one chip per option, labelled by label ?? value", () => {
    render(() => (
      <MultiSelectFilter options={OPTS} selected={[]} onChange={() => {}} />
    ));
    expect(chips().map((c) => c.textContent)).toEqual(["Apple", "Banana", "c"]);
  });

  it("renders an optional leading label", () => {
    render(() => (
      <MultiSelectFilter
        label="Fruit"
        options={OPTS}
        selected={[]}
        onChange={() => {}}
      />
    ));
    expect(document.querySelector(".sui-msf__label")?.textContent).toBe("Fruit");
  });

  it("treats empty selection as all-inactive", () => {
    render(() => (
      <MultiSelectFilter options={OPTS} selected={[]} onChange={() => {}} />
    ));
    expect(chips().some((c) => c.classList.contains("sui-msf__chip--active"))).toBe(
      false,
    );
    expect(chips().every((c) => c.getAttribute("aria-pressed") === "false")).toBe(
      true,
    );
  });

  it("focuses to just one option when clicking a chip from the empty state", () => {
    const onChange = vi.fn();
    render(() => (
      <MultiSelectFilter options={OPTS} selected={[]} onChange={onChange} />
    ));
    fireEvent.click(chipByText("Banana"));
    expect(onChange).toHaveBeenCalledWith(["b"]);
  });

  it("adds to the selection when clicking an inactive chip with some selected", () => {
    const onChange = vi.fn();
    render(() => (
      <MultiSelectFilter options={OPTS} selected={["a"]} onChange={onChange} />
    ));
    fireEvent.click(chipByText("Banana"));
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });

  it("toggles an active chip off (can return to empty = all)", () => {
    const onChange = vi.fn();
    render(() => (
      <MultiSelectFilter options={OPTS} selected={["a"]} onChange={onChange} />
    ));
    fireEvent.click(chipByText("Apple"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("marks selected chips active with aria-pressed", () => {
    render(() => (
      <MultiSelectFilter
        options={OPTS}
        selected={["b"]}
        onChange={() => {}}
      />
    ));
    const banana = chipByText("Banana");
    expect(banana.classList.contains("sui-msf__chip--active")).toBe(true);
    expect(banana.getAttribute("aria-pressed")).toBe("true");
  });
});
