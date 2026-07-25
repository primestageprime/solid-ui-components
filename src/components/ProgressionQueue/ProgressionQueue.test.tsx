import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { ProgressionQueue, type ProgressionSection } from "./ProgressionQueue";

afterEach(cleanup);

interface Item {
  id: string;
  bucket: string;
}

const SECTIONS: ProgressionSection[] = [
  { key: "a", label: "Alpha", tone: "success" },
  { key: "b", label: "Beta", tone: "danger" },
  { key: "c", label: "Gamma", tone: "accent", weight: 2 },
];

const renderQueue = (items: Item[], extra: Record<string, unknown> = {}) =>
  render(() => (
    <ProgressionQueue<Item>
      sections={SECTIONS}
      items={items}
      bucketOf={(i) => i.bucket}
      keyOf={(i) => i.id}
      renderItem={(i) => <span>{i.id}</span>}
      height={600}
      {...extra}
    />
  ));

describe("ProgressionQueue", () => {
  it("always renders every section with its count", () => {
    const { container } = renderQueue([
      { id: "1", bucket: "a" },
      { id: "2", bucket: "a" },
      { id: "3", bucket: "b" },
    ]);
    const counts = [...container.querySelectorAll(".prog-queue__count")].map((c) => c.textContent);
    expect(counts).toEqual(["2", "1", "0"]); // gamma empty still shown
  });

  it("buckets items into their section and renders their rows", () => {
    const { container } = renderQueue([
      { id: "x", bucket: "a" },
      { id: "y", bucket: "c" },
    ]);
    const sections = container.querySelectorAll(".prog-queue__section");
    expect(sections[0].textContent).toContain("x");
    expect(sections[2].textContent).toContain("y");
  });

  it("carries the section tone on the dot only (chrome stays neutral)", () => {
    const { container } = renderQueue([{ id: "1", bucket: "a" }]);
    expect(container.querySelector(".prog-queue__dot--success")).toBeTruthy();
    expect(container.querySelector(".prog-queue__dot--danger")).toBeTruthy();
    expect(container.querySelector(".prog-queue__dot--accent")).toBeTruthy();
  });

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

  it("renders a section's emptyLabel when it has no items", () => {
    const sections: ProgressionSection[] = [
      { key: "a", label: "Alpha", tone: "success" },
      { key: "b", label: "Beta", tone: "accent", emptyLabel: "All clear" },
    ];
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={sections}
        items={[{ id: "1", bucket: "a" }]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(container.querySelector(".prog-queue__empty")?.textContent).toBe("All clear");
  });

  it("omits the empty strip when a section declares no emptyLabel", () => {
    const { container } = renderQueue([{ id: "1", bucket: "a" }]);
    expect(container.querySelector(".prog-queue__empty")).toBeNull();
  });

  it("renders nothing for an item whose bucket matches no section", () => {
    const { container } = renderQueue([
      { id: "real", bucket: "a" },
      { id: "ghost", bucket: "nowhere" },
    ]);
    expect(container.textContent).toContain("real");
    expect(container.textContent).not.toContain("ghost");
  });

  // Sizing is deterministic in jsdom: measurement returns 0, so the component
  // keeps its fallbacks (header 34, row 54, +2 border). With height=600 and
  // three sections at gap 8, the two empty sections take 36 each, leaving
  // ample pool — so each populated section gets exactly its natural height.
  const FIVE_IN_A: Item[] = [1, 2, 3, 4, 5].map((n) => ({
    id: String(n),
    bucket: "a",
  }));

  const sectionHeights = (container: HTMLElement) =>
    [...container.querySelectorAll(".prog-queue__section")].map(
      (s) => (s as HTMLElement).style.height,
    );

  it("shrink-wraps a section to its content when it declares no capRows", () => {
    const { container } = renderQueue(FIVE_IN_A);
    expect(sectionHeights(container)[0]).toBe("306px"); // 34 + 5*54 + 2
  });

  it("caps a section at capRows and keeps every row mounted so the body scrolls", () => {
    const capped: ProgressionSection[] = [
      { key: "a", label: "Alpha", tone: "success", capRows: 2 },
      { key: "b", label: "Beta", tone: "danger" },
      { key: "c", label: "Gamma", tone: "accent" },
    ];
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={capped}
        items={FIVE_IN_A}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(sectionHeights(container)[0]).toBe("144px"); // 34 + 2*54 + 2
    // Capping is a viewport, not a filter — all five rows stay in the DOM.
    expect(container.querySelectorAll(".prog-queue__row")).toHaveLength(5);
  });

  it("ignores capRows larger than the row count", () => {
    const capped: ProgressionSection[] = [
      { key: "a", label: "Alpha", tone: "success", capRows: 99 },
      { key: "b", label: "Beta", tone: "danger" },
      { key: "c", label: "Gamma", tone: "accent" },
    ];
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={capped}
        items={FIVE_IN_A}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(sectionHeights(container)[0]).toBe("306px"); // still content-driven
  });

  const SELECTABLE: ProgressionSection[] = [
    { key: "a", label: "Alpha", tone: "success" },
    { key: "b", label: "Beta", tone: "accent", selectable: true },
  ];

  const renderSelectable = (extra: Record<string, unknown>) =>
    render(() => (
      <ProgressionQueue<Item>
        sections={SELECTABLE}
        items={[
          { id: "plain", bucket: "a" },
          { id: "check", bucket: "b" },
        ]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        {...extra}
      />
    ));

  const rowFor = (container: HTMLElement, key: string) =>
    container.querySelector(`[data-pq-key="${key}"]`) as HTMLElement;

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

  const rows = (container: HTMLElement) =>
    [...container.querySelectorAll("[data-pq-key]")] as HTMLElement[];

  it("gives exactly one row the tab stop", () => {
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {} },
    );
    const tabbable = rows(container).filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
  });

  it("prefers focusedKey for the tab stop", () => {
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {}, focusedKey: "2" },
    );
    expect(rowFor(container, "2").getAttribute("tabindex")).toBe("0");
    expect(rowFor(container, "1").getAttribute("tabindex")).toBe("-1");
  });

  it("moves focus DOWN across a section boundary and reports it", () => {
    const moved: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {}, onFocusChange: (k: string | null) => moved.push(k) },
    );
    fireEvent.keyDown(rowFor(container, "1"), { key: "ArrowDown" });
    expect(moved).toEqual(["2"]);
  });

  it("does not wrap at either end", () => {
    const moved: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {}, onFocusChange: (k: string | null) => moved.push(k) },
    );
    fireEvent.keyDown(rowFor(container, "1"), { key: "ArrowUp" });
    fireEvent.keyDown(rowFor(container, "2"), { key: "ArrowDown" });
    expect(moved).toEqual(["1", "2"]);
  });

  it("Home and End jump to the first and last row", () => {
    const moved: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
        { id: "3", bucket: "c" },
      ],
      { onSelect: () => {}, onFocusChange: (k: string | null) => moved.push(k) },
    );
    fireEvent.keyDown(rowFor(container, "1"), { key: "End" });
    fireEvent.keyDown(rowFor(container, "3"), { key: "Home" });
    expect(moved).toEqual(["3", "1"]);
  });

  it("Enter selects the focused row", () => {
    let selected: string | undefined;
    const { container } = renderQueue([{ id: "1", bucket: "a" }], {
      onSelect: (k: string) => (selected = k),
    });
    fireEvent.keyDown(rowFor(container, "1"), { key: "Enter" });
    expect(selected).toBe("1");
  });

  it("Space toggles the check on a selectable row in select mode", () => {
    let toggled: string | undefined;
    let selected: string | undefined;
    const { container } = renderSelectable({
      onSelect: (k: string) => (selected = k),
      checkedKeys: new Set<string>(),
      onToggleCheck: (k: string) => (toggled = k),
    });
    fireEvent.keyDown(rowFor(container, "check"), { key: " " });
    expect(toggled).toBe("check");
    expect(selected).toBeUndefined();
  });

  it("prefers focusedKey over selectedKey for the tab stop", () => {
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {}, focusedKey: "2", selectedKey: "1" },
    );
    expect(rowFor(container, "2").getAttribute("tabindex")).toBe("0");
    expect(rowFor(container, "1").getAttribute("tabindex")).toBe("-1");
  });

  // A row is interactive iff onSelect is set OR its section is selectable in
  // select mode. With no onSelect and only "b" selectable, "a"'s rows are
  // inert — they must never take the tab stop or an arrow-key landing, even
  // though a non-selectable, non-first-rendered section's row is what the
  // ported (unfiltered) allKeys/moveFocus would have fallen through to.
  const MIXED: ProgressionSection[] = [
    { key: "a", label: "Alpha", tone: "success" },
    { key: "b", label: "Beta", tone: "accent", selectable: true },
  ];

  const renderMixed = (extra: Record<string, unknown>) =>
    render(() => (
      <ProgressionQueue<Item>
        sections={MIXED}
        items={[
          { id: "inert-1", bucket: "a" },
          { id: "inert-2", bucket: "a" },
          { id: "live-1", bucket: "b" },
        ]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        {...extra}
      />
    ));

  it("gives the tab stop to the selectable section's row when a non-selectable section renders first", () => {
    const { container } = renderMixed({
      checkedKeys: new Set<string>(),
      onToggleCheck: () => {},
    });
    const tabbable = rows(container).filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].dataset.pqKey).toBe("live-1");
  });

  it("skips non-interactive rows on arrow navigation and never reports them via onFocusChange", () => {
    // Three sections — selectable / non-selectable / selectable — with the
    // inert row sandwiched between two interactive ones, so ArrowDown from
    // the first interactive row has an inert row to actually skip over.
    const SANDWICH: ProgressionSection[] = [
      { key: "a", label: "Alpha", tone: "success", selectable: true },
      { key: "b", label: "Beta", tone: "danger" },
      { key: "c", label: "Gamma", tone: "accent", selectable: true },
    ];
    const moved: (string | null)[] = [];
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={SANDWICH}
        items={[
          { id: "live-1", bucket: "a" },
          { id: "inert-1", bucket: "b" },
          { id: "live-2", bucket: "c" },
        ]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        checkedKeys={new Set<string>()}
        onToggleCheck={() => {}}
        onFocusChange={(k: string | null) => moved.push(k)}
      />
    ));
    fireEvent.keyDown(rowFor(container, "live-1"), { key: "ArrowDown" });
    expect(moved).toEqual(["live-2"]);
    expect(moved).not.toContain("inert-1");
  });

  it("has zero tab stops and does not throw for a fully read-only queue", () => {
    const { container } = renderQueue([
      { id: "1", bucket: "a" },
      { id: "2", bucket: "b" },
    ]);
    const tabbable = rows(container).filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(0);
  });

  it("scrolls the matching row into view when scrollToKey changes", async () => {
    const calls: string[] = [];
    // jsdom has no scrollIntoView; record the row it is called on.
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
      function (this: Element) {
        calls.push((this as HTMLElement).dataset.pqKey ?? "");
      };
    const [key, setKey] = createSignal<string | undefined>(undefined);
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={[
          { id: "1", bucket: "a" },
          { id: "2", bucket: "b" },
        ]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        scrollToKey={key()}
      />
    ));
    expect(container).toBeTruthy();
    setKey("2");
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(calls).toEqual(["2"]);
  });

  it("is a no-op when scrollToKey matches no row", async () => {
    const calls: string[] = [];
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
      function (this: Element) {
        calls.push((this as HTMLElement).dataset.pqKey ?? "");
      };
    const [key, setKey] = createSignal<string | undefined>(undefined);
    render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={[{ id: "1", bucket: "a" }]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        scrollToKey={key()}
      />
    ));
    setKey("nope");
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(calls).toEqual([]);
  });
});
