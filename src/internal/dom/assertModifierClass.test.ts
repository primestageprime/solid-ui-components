// The guard exists because a templated modifier class with no CSS rule renders
// as nothing at all, silently. These pin the two behaviours that matter: it
// fires on the real defect, and it stays quiet the rest of the time — a warning
// that cries wolf gets muted, and then it protects nothing.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const addSheet = (css: string) => {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  return style;
};

describe("assertModifierClass", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    for (const el of Array.from(document.head.querySelectorAll("style"))) {
      el.remove();
    }
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.resetModules();
  });
  afterEach(() => warn.mockRestore());

  it("warns when the emitted class has no CSS rule — the goose `gap=md` case", async () => {
    addSheet(".row--gap-xs { gap: 4px } .row--gap-sm { gap: 8px }");
    const { assertModifierClass: fresh } = await import("./assertModifierClass");
    fresh("Row", "gap", "md", "row--gap-md");
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    // The message has to be actionable without a hunt: component, prop, value,
    // and the dead class all present.
    expect(msg).toContain("Row");
    expect(msg).toContain("gap");
    expect(msg).toContain("md");
    expect(msg).toContain("row--gap-md");
  });

  it("stays silent when the class is defined", async () => {
    addSheet(".row--gap-sm { gap: 8px }");
    const { assertModifierClass: fresh } = await import("./assertModifierClass");
    fresh("Row", "gap", "sm", "row--gap-sm");
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once per class, not once per render", async () => {
    addSheet(".stack--gap-xs { gap: 4px }");
    const { assertModifierClass: fresh } = await import("./assertModifierClass");
    fresh("Stack", "gap", "lg", "stack--gap-lg");
    fresh("Stack", "gap", "lg", "stack--gap-lg");
    fresh("Stack", "gap", "lg", "stack--gap-lg");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("stays silent when NO stylesheet has loaded yet", async () => {
    // First render can beat the stylesheet. Treating "nothing loaded" as
    // "nothing defined" would report every modifier in the app as missing,
    // which is the fastest way to get a warning ignored forever.
    const { assertModifierClass: fresh } = await import("./assertModifierClass");
    fresh("Row", "gap", "sm", "row--gap-sm");
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not accuse a real class when the sheet loaded after the first check", async () => {
    // The cry-wolf case, observed for real: the class set was cached while only
    // some stylesheets had loaded, so a class that plainly exists was reported
    // missing. A miss must re-collect before warning.
    addSheet(".unrelated { color: red }");
    const { assertModifierClass: fresh } = await import("./assertModifierClass");
    fresh("Row", "gap", "sm", "row--gap-sm"); // caches a set without Layout.css
    expect(warn).toHaveBeenCalledTimes(1); // genuinely absent at this point
    addSheet(".row--gap-xs { gap: 4px }"); // stylesheet lands late
    fresh("Row", "gap", "xs", "row--gap-xs");
    expect(warn).toHaveBeenCalledTimes(1); // …and is NOT accused
  });

  it("finds classes in compound and descendant selectors", async () => {
    addSheet(".panel .row--gap-sm:hover { gap: 8px }");
    const { assertModifierClass: fresh } = await import("./assertModifierClass");
    fresh("Row", "gap", "sm", "row--gap-sm");
    expect(warn).not.toHaveBeenCalled();
  });
});
