import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { fireEvent, render } from "@solidjs/testing-library";
import {
  SectionedList,
  type SectionedListSection,
  createSectionedList,
} from "./SectionedList";
import { CompactSectionedList } from "./variants";

const SECTIONS: readonly SectionedListSection[] = [
  {
    id: "new",
    label: "New this import",
    items: [
      { id: "acme", label: "Acme Lumber Supply" },
      { id: "birch", label: "Birchwood Freight" },
    ],
  },
  {
    id: "rec",
    label: "Recurring",
    items: [
      {
        id: "cobalt",
        label: "Cobalt Telecom",
        status: { tone: "success", label: "done" },
      },
      {
        id: "delta",
        label: "Delta Water",
        status: { tone: "warning", label: "forced" },
      },
    ],
  },
  {
    id: "fits",
    label: "Fits already",
    collapsible: true,
    items: [
      {
        id: "iris",
        label: "Iris Cleaning",
        muted: true,
        status: { tone: "success", label: "done" },
      },
    ],
  },
  {
    id: "once",
    label: "One-time",
    collapsible: true,
    defaultOpen: true,
    items: [{ id: "garnet", label: "Garnet Office" }],
  },
];

const rowIds = (c: HTMLElement): (string | undefined)[] =>
  Array.from(c.querySelectorAll<HTMLElement>(".sui-sectioned-list__row")).map(
    (r) => r.dataset.itemId,
  );
const toggleFor = (c: HTMLElement, label: string): HTMLButtonElement => {
  const b = Array.from(
    c.querySelectorAll<HTMLButtonElement>("button[aria-expanded]"),
  ).find((el) => el.textContent?.includes(label));
  if (!b) throw new Error(`no toggle for ${label}`);
  return b;
};
const row = (c: HTMLElement, id: string): HTMLButtonElement => {
  const r = c.querySelector<HTMLButtonElement>(`[data-item-id="${id}"]`);
  if (!r) throw new Error(`no row ${id}`);
  return r;
};

describe("SectionedList", () => {
  it("shows each title with its count", () => {
    const { getAllByRole } = render(() => (
      <SectionedList sections={SECTIONS} />
    ));
    const headings = getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "New this import2",
      "Recurring2",
      "Fits already1",
      "One-time1",
    ]);
  });

  it("starts a collapsible section collapsed unless defaultOpen, and toggles it", () => {
    const { container } = render(() => <SectionedList sections={SECTIONS} />);
    expect(rowIds(container)).not.toContain("iris");
    expect(rowIds(container)).toContain("garnet");
    const fits = toggleFor(container, "Fits already");
    expect(fits.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(fits);
    expect(fits.getAttribute("aria-expanded")).toBe("true");
    expect(rowIds(container)).toContain("iris");
    expect(fits.getAttribute("aria-controls")).toBe(
      container.querySelector(`[data-item-id="iris"]`)?.parentElement?.id,
    );
  });

  it("gives a fixed section a plain heading, not a button", () => {
    const { container } = render(() => <SectionedList sections={SECTIONS} />);
    const toggles = container.querySelectorAll("button[aria-expanded]");
    expect(toggles).toHaveLength(2);
  });

  it("follows a controlled open state and reports the toggle", () => {
    const onSectionToggle = vi.fn();
    const [open, setOpen] = createSignal(false);
    const sections = (): SectionedListSection[] => [
      { ...SECTIONS[2], open: open() },
    ];
    const { container } = render(() => (
      <SectionedList sections={sections()} onSectionToggle={onSectionToggle} />
    ));
    fireEvent.click(toggleFor(container, "Fits already"));
    expect(onSectionToggle).toHaveBeenCalledWith("fits", true);
    expect(rowIds(container)).toEqual([]);
    setOpen(true);
    expect(rowIds(container)).toEqual(["iris"]);
  });

  it("calls onSelect with the row id and marks the selected row", () => {
    const onSelect = vi.fn();
    const { container } = render(() => (
      <SectionedList
        sections={SECTIONS}
        selectedId="cobalt"
        onSelect={onSelect}
      />
    ));
    fireEvent.click(row(container, "delta"));
    expect(onSelect).toHaveBeenCalledWith("delta");
    const sel = row(container, "cobalt");
    expect(sel.getAttribute("aria-current")).toBe("true");
    expect(sel.classList.contains("sui-sectioned-list__row--selected")).toBe(
      true,
    );
    expect(row(container, "delta").getAttribute("aria-current")).toBeNull();
  });

  it("reads a muted row muted and hides its status", () => {
    const { container } = render(() => (
      <SectionedList sections={[{ ...SECTIONS[2], defaultOpen: true }]} />
    ));
    const iris = row(container, "iris");
    expect(iris.classList.contains("sui-sectioned-list__row--muted")).toBe(
      true,
    );
    expect(iris.querySelector(".sui-sectioned-list__status")).toBeNull();
  });

  it("draws a status as a toned shape plus its word, with the word for screen readers", () => {
    const { container } = render(() => <SectionedList sections={SECTIONS} />);
    const st = row(container, "delta").querySelector(
      ".sui-sectioned-list__status",
    );
    expect(st?.getAttribute("data-tone")).toBe("warning");
    expect(st?.getAttribute("aria-hidden")).toBe("true");
    expect(
      row(container, "delta").querySelector(".sui-sectioned-list__sr")
        ?.textContent,
    ).toBe(", forced");
  });

  it("hides the status word in the compact variant", () => {
    const { container } = render(() => (
      <CompactSectionedList sections={SECTIONS} />
    ));
    const root = container.querySelector(".sui-sectioned-list");
    expect(root?.getAttribute("data-status-labels")).toBe("false");
  });

  it("is one tab stop, and the arrow keys, Home and End move the focus", () => {
    const { container } = render(() => (
      <SectionedList sections={SECTIONS} selectedId="cobalt" />
    ));
    const tabbable = Array.from(
      container.querySelectorAll<HTMLElement>(
        '.sui-sectioned-list__row[tabindex="0"]',
      ),
    );
    expect(tabbable.map((r) => r.dataset.itemId)).toEqual(["cobalt"]);
    const cobalt = row(container, "cobalt");
    cobalt.focus();
    fireEvent.keyDown(cobalt, { key: "ArrowDown" });
    expect(document.activeElement).toBe(row(container, "delta"));
    fireEvent.keyDown(row(container, "delta"), { key: "Home" });
    expect(document.activeElement).toBe(row(container, "acme"));
    fireEvent.keyDown(row(container, "acme"), { key: "End" });
    expect(document.activeElement).toBe(row(container, "garnet"));
  });

  it("puts the tab stop on the first row when the selection does not show", () => {
    const { container } = render(() => (
      <SectionedList sections={SECTIONS} selectedId="iris" />
    ));
    expect(row(container, "acme").getAttribute("tabindex")).toBe("0");
  });

  it("shows the empty message with no sections", () => {
    const { container } = render(() => (
      <SectionedList sections={[]} emptyMessage="No groups yet" />
    ));
    expect(
      container.querySelector(".sui-sectioned-list__empty")?.textContent,
    ).toBe("No groups yet");
  });

  it("createSectionedList bakes the statusLabels override", () => {
    const Curried = createSectionedList({ statusLabels: false });
    const { container } = render(() => <Curried sections={SECTIONS} />);
    expect(
      container
        .querySelector(".sui-sectioned-list")
        ?.getAttribute("data-status-labels"),
    ).toBe("false");
  });
});
