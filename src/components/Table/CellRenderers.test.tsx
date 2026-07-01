import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import {
  IdCell,
  StringCell,
  TagCell,
  MoneyCell,
  DateCell,
  DateTimeCell,
  MinuteDateTimeCell,
  DurationCell,
  StatusCell,
  CheckboxCell,
  FloatCell,
  IntCell,
  MetricValueCell,
  LongTextCell,
  withCellStyle,
  withValueColor,
  createCellRenderer,
} from "./CellRenderers";

afterEach(cleanup);

// Smoke coverage for every exported cell renderer + the styling HOCs and the
// column factory. Guards the module split (behavior must be identical after the
// renderers move to sibling files) and documents each renderer's basic output.

describe("CellRenderers — value + empty rendering", () => {
  it("IdCell renders the value, em-dash when empty", () => {
    const a = render(() => <IdCell value={42} />);
    expect(a.container.querySelector(".cell-id")?.textContent).toBe("42");
    cleanup();
    const b = render(() => <IdCell value={null} />);
    expect(b.container.querySelector(".cell-empty")?.textContent).toBe("—");
  });

  it("StringCell renders the string", () => {
    const { container } = render(() => <StringCell value="hello" />);
    expect(container.querySelector(".cell-string")?.textContent).toBe("hello");
  });

  it("TagCell renders a variant-classed tag", () => {
    const { container } = render(() => (
      <TagCell value="ok" variant="success" />
    ));
    const tag = container.querySelector(".cell-tag");
    expect(tag?.textContent).toBe("ok");
    expect(tag?.classList.contains("cell-tag--success")).toBe(true);
  });

  it("MoneyCell formats as currency", () => {
    const { container } = render(() => <MoneyCell value={1234.5} />);
    expect(container.querySelector(".cell-money")?.textContent).toBe(
      "$1,234.50",
    );
  });

  it("FloatCell honors precision; IntCell rounds", () => {
    const f = render(() => <FloatCell value={Math.PI} precision={2} />);
    expect(f.container.querySelector(".cell-float")?.textContent).toBe("3.14");
    cleanup();
    const i = render(() => <IntCell value={42.7} />);
    expect(i.container.querySelector(".cell-int")?.textContent).toBe("43");
  });

  it("DurationCell formats seconds into h/m/s", () => {
    const { container } = render(() => <DurationCell value={90} unit="s" />);
    expect(container.textContent).toContain("1m 30s");
  });

  it("DateCell iso, DateTimeCell, MinuteDateTimeCell format patterns", () => {
    // Use a local datetime (no trailing Z) so parsing is host-local — a
    // date-only "2026-01-15" would parse as UTC and shift a day in some zones.
    const d = render(() => (
      <DateCell value="2026-01-15T12:00:00" format="iso" />
    ));
    expect(d.container.querySelector(".cell-date")?.textContent).toBe(
      "2026-01-15",
    );
    cleanup();
    const dt = render(() => <DateTimeCell value="2026-01-15T08:30:00" />);
    expect(dt.container.textContent).toContain("2026-01-15 08:30:00");
    cleanup();
    const m = render(() => <MinuteDateTimeCell value="2026-01-15T08:30:00" />);
    expect(m.container.textContent).toContain("2026-01-15 08:30");
  });

  it("StatusCell renders a status pill with a label", () => {
    const { container } = render(() => <StatusCell value="active" />);
    expect(container.querySelector(".cell-status")).toBeTruthy();
    expect(
      container.querySelector(".cell-status__label")?.textContent,
    ).toBeTruthy();
  });

  it("CheckboxCell renders a checkbox reflecting the value", () => {
    const { container } = render(() => <CheckboxCell value={true} />);
    const box = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    expect(box?.checked).toBe(true);
  });

  it("MetricValueCell renders toPrecision output", () => {
    const { container } = render(() => (
      <MetricValueCell value={2.5} compliant={true} />
    ));
    expect(container.querySelector(".cell-metric-value")?.textContent).toBe(
      "2.500",
    );
  });

  it("LongTextCell truncates with an inline more… affordance", () => {
    const { container } = render(() => (
      <LongTextCell value={"x".repeat(80)} maxLength={50} />
    ));
    expect(container.querySelector(".cell-longtext")).toBeTruthy();
    expect(
      container.querySelector(".cell-longtext__more")?.textContent,
    ).toContain("more");
  });
});

describe("CellRenderers — styling HOCs and column factory", () => {
  it("withCellStyle wraps a base cell, preserving its output", () => {
    const Styled = withCellStyle(StringCell, {
      color: "red",
      textAlign: "right",
    });
    const { container } = render(() => <Styled value="x" />);
    expect(container.querySelector(".cell-string")?.textContent).toBe("x");
  });

  it("withValueColor wraps a base cell", () => {
    const Colored = withValueColor(FloatCell, (v: number | null | undefined) =>
      v != null && v > 1 ? "red" : undefined,
    );
    const { container } = render(() => <Colored value={2} />);
    expect(container.querySelector(".cell-float")?.textContent).toBe("2.00");
  });

  it("createCellRenderer builds a row→element renderer via accessor", () => {
    const renderName = createCellRenderer<{ name: string }, string>(
      StringCell,
      "name",
    );
    const { container } = render(() => renderName({ name: "row-value" }));
    expect(container.querySelector(".cell-string")?.textContent).toBe(
      "row-value",
    );
  });
});
