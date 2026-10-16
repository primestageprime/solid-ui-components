import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import type { TableColumn } from "../Table/types";
import { TreeTable } from "./TreeTable";

interface Part {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
  readonly parts?: readonly Part[];
}

const DATA: readonly Part[] = [
  {
    id: "pump",
    name: "Pump",
    cost: 300,
    parts: [
      {
        id: "motor",
        name: "Motor",
        cost: 200,
        parts: [{ id: "rotor", name: "Rotor", cost: 200 }],
      },
      { id: "seal", name: "Seal", cost: 10 },
      { id: "impeller", name: "Impeller", cost: 90 },
    ],
  },
  { id: "hose", name: "Hose", cost: 14 },
];

const COLUMNS: TableColumn<Part>[] = [
  { id: "name", header: "Name", accessor: "name", sortable: true },
  { id: "cost", header: "Cost", accessor: "cost", sortable: true },
];

const base = {
  columns: COLUMNS,
  childrenOf: (p: Part) => p.parts,
  getRowId: (p: Part) => p.id,
  getRowLabel: (p: Part) => p.name,
};

const bodyRows = (c: HTMLElement) => Array.from(c.querySelectorAll("tbody tr"));
const names = (c: HTMLElement) =>
  bodyRows(c).map((r) => r.querySelector("td")?.textContent?.trim());
const rowOf = (c: HTMLElement, name: string) => {
  const row = bodyRows(c).find(
    (r) => r.querySelector("td")?.textContent?.trim() === name,
  );
  if (!row) throw new Error(`no row ${name}`);
  return row as HTMLElement;
};
const header = (c: HTMLElement, label: string) => {
  const th = Array.from(c.querySelectorAll("th")).find((h) =>
    h.textContent?.includes(label),
  );
  if (!th) throw new Error(`no header ${label}`);
  return th as HTMLElement;
};

/** A table with its own expanded state, as a caller would wire it. */
const Controlled = (props: { initial?: string[]; selection?: boolean }) => {
  const [expanded, setExpanded] = createSignal<ReadonlySet<string>>(
    new Set(props.initial ?? []),
  );
  const [selected, setSelected] = createSignal<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <TreeTable
      {...base}
      data={DATA}
      expanded={expanded()}
      onToggle={toggle}
      selection={
        props.selection
          ? { selected: selected(), onChange: setSelected }
          : undefined
      }
    />
  );
};

describe("TreeTable — expand and collapse", () => {
  it("shows only the roots when nothing is expanded", () => {
    const { container } = render(() => <Controlled />);
    expect(names(container)).toEqual(["Pump", "Hose"]);
  });

  it("puts children under an expanded parent, indented one step per level", () => {
    const { container } = render(() => (
      <Controlled initial={["pump", "motor"]} />
    ));
    expect(names(container)).toEqual([
      "Pump",
      "Motor",
      "Rotor",
      "Seal",
      "Impeller",
      "Hose",
    ]);
    const rail = (name: string) =>
      rowOf(container, name).querySelector(".sui-nested-list__row")?.className;
    expect(rail("Pump")).toContain("--indent-0");
    expect(rail("Motor")).toContain("--indent-1");
    expect(rail("Rotor")).toContain("--indent-2");
  });

  it("toggles once on a chevron click, and reports the row id", () => {
    const onToggle = vi.fn();
    const { container } = render(() => (
      <TreeTable
        {...base}
        data={DATA}
        expanded={new Set()}
        onToggle={onToggle}
      />
    ));
    const chevron = container.querySelector(
      'button[aria-label="Expand Pump"]',
    ) as HTMLElement;
    expect(chevron.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(chevron);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("pump");
  });

  it("toggles a parent on a row click, and ignores a leaf row click", () => {
    const { container } = render(() => <Controlled />);
    fireEvent.click(rowOf(container, "Hose"));
    expect(names(container)).toEqual(["Pump", "Hose"]);
    fireEvent.click(rowOf(container, "Pump"));
    expect(names(container)).toEqual([
      "Pump",
      "Motor",
      "Seal",
      "Impeller",
      "Hose",
    ]);
    expect(
      container
        .querySelector('button[aria-label="Collapse Pump"]')
        ?.getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("gives a leaf a hidden, unfocusable slot instead of a chevron", () => {
    const { container } = render(() => <Controlled />);
    const slot = rowOf(container, "Hose").querySelector(
      "button",
    ) as HTMLElement;
    expect(slot.style.visibility).toBe("hidden");
    expect(slot.getAttribute("tabindex")).toBe("-1");
  });
});

describe("TreeTable — checkboxes", () => {
  const boxOf = (c: HTMLElement, name: string) =>
    rowOf(c, name).querySelector('input[type="checkbox"]') as HTMLInputElement;

  it("renders no checkboxes without a selection", () => {
    const { container } = render(() => <Controlled />);
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it("checks every leaf under a parent, and derives the parent states", () => {
    const { container } = render(() => (
      <Controlled initial={["pump", "motor"]} selection />
    ));
    fireEvent.click(boxOf(container, "Motor"));
    expect(boxOf(container, "Rotor").checked).toBe(true);
    expect(boxOf(container, "Motor").checked).toBe(true);
    expect(boxOf(container, "Pump").indeterminate).toBe(true);
    expect(boxOf(container, "Seal").checked).toBe(false);
  });

  it("unchecks every leaf when a checked parent is unchecked", () => {
    const { container } = render(() => (
      <Controlled initial={["pump"]} selection />
    ));
    fireEvent.click(boxOf(container, "Pump"));
    expect(boxOf(container, "Seal").checked).toBe(true);
    fireEvent.click(boxOf(container, "Pump"));
    expect(boxOf(container, "Seal").checked).toBe(false);
    expect(boxOf(container, "Pump").indeterminate).toBe(false);
  });

  it("selects all from the header box, and a box click does not toggle the row", () => {
    const { container } = render(() => <Controlled selection />);
    const all = container.querySelector(
      'thead input[type="checkbox"]',
    ) as HTMLInputElement;
    fireEvent.click(all);
    expect(all.checked).toBe(true);
    expect(boxOf(container, "Pump").checked).toBe(true);
    expect(names(container)).toEqual(["Pump", "Hose"]);
  });
});

describe("TreeTable — sort", () => {
  it("sorts siblings within each parent and keeps children under their parent", () => {
    const { container } = render(() => <Controlled initial={["pump"]} />);
    fireEvent.click(header(container, "Name"));
    expect(names(container)).toEqual([
      "Hose",
      "Pump",
      "Impeller",
      "Motor",
      "Seal",
    ]);
    fireEvent.click(header(container, "Name"));
    expect(names(container)).toEqual([
      "Pump",
      "Seal",
      "Motor",
      "Impeller",
      "Hose",
    ]);
    expect(header(container, "Name").getAttribute("aria-sort")).toBe(
      "descending",
    );
  });

  it("sorts parents by their own values, and clears on the third click", () => {
    const { container } = render(() => <Controlled initial={["pump"]} />);
    fireEvent.click(header(container, "Cost"));
    expect(names(container)).toEqual([
      "Hose",
      "Pump",
      "Seal",
      "Impeller",
      "Motor",
    ]);
    fireEvent.click(header(container, "Cost"));
    fireEvent.click(header(container, "Cost"));
    expect(names(container)).toEqual([
      "Pump",
      "Motor",
      "Seal",
      "Impeller",
      "Hose",
    ]);
  });
});

describe("TreeTable onRowHover", () => {
  it("reports the original row on enter and null when the pointer leaves the body", () => {
    const onRowHover = vi.fn();
    const { container } = render(() => (
      <TreeTable
        {...base}
        data={DATA}
        expanded={new Set(["pump"])}
        onToggle={() => {}}
        onRowHover={onRowHover}
      />
    ));
    fireEvent.mouseEnter(rowOf(container, "Seal"));
    expect(onRowHover).toHaveBeenLastCalledWith(DATA[0]!.parts![1]);
    fireEvent.mouseLeave(container.querySelector("tbody")!);
    expect(onRowHover).toHaveBeenLastCalledWith(null);
  });
});
