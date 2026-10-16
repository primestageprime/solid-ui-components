import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { StampedRow, PinnedStampedRow } from "./variants";
import { STAMP_GLYPHS, formatStampTime, stampGlyph, type StampKind } from "./StampedRow";

afterEach(cleanup);

describe("stampGlyph", () => {
  const kinds: StampKind[] = ["done", "active", "note", "started", "completed"];
  it("gives every kind a glyph", () => {
    expect(kinds.map((k) => [k, stampGlyph(k).name, stampGlyph(k).variant])).toEqual([
      ["done", "check", "outline"],
      ["active", "clock", "outline"],
      ["note", "edit", "outline"],
      ["started", "arrow-right", "outline"],
      ["completed", "check", "solid"],
    ]);
    expect(Object.keys(STAMP_GLYPHS).sort()).toEqual([...kinds].sort());
  });

  it("defaults to the note glyph and lets a stated icon win", () => {
    expect(stampGlyph().name).toBe("edit");
    expect(stampGlyph("done", "trash")).toEqual({ name: "trash", variant: "outline" });
  });
});

describe("formatStampTime", () => {
  it("prints 24-hour HH:mm in the stated zone", () => {
    expect(formatStampTime("2026-10-15T14:05:00Z", "UTC")).toBe("14:05");
    expect(formatStampTime("2026-10-15T14:05:00Z", "America/New_York")).toBe("10:05");
    expect(formatStampTime(new Date("2026-10-15T00:05:00Z"), "UTC")).toBe("00:05");
  });

  it("prints an unreadable time as empty, not Invalid Date", () => {
    expect(formatStampTime("not a date")).toBe("");
  });
});

describe("StampedRow", () => {
  const at = new Date(2026, 9, 15, 14, 5); // local 14:05 in any host zone

  it("mounts a glyph, the label and the time", () => {
    const { container } = render(() => <StampedRow kind="done" label="Wrote the spec" t={at} />);
    expect(container.textContent).toContain("Wrote the spec");
    expect(container.textContent).toContain("14:05");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("is a 22px line, and PinnedStampedRow is a 40px bar", () => {
    const list = render(() => <StampedRow label="a" t={at} />);
    expect((list.container.firstElementChild as HTMLElement).style.minHeight).toBe("22px");
    cleanup();
    const pinned = render(() => <PinnedStampedRow label="a" t={at} />);
    expect((pinned.container.firstElementChild as HTMLElement).style.minHeight).toBe("40px");
  });

  it("keeps the full label as a tooltip for an ellipsized one", () => {
    const { container } = render(() => <StampedRow label="a very long label" t={at} />);
    expect(container.querySelector('[title="a very long label"]')).not.toBeNull();
  });
});
