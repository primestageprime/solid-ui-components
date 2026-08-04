// ============================================
// Sidebar — persistence, clamping, and the mirrored resize direction.
//
// Unlike the other Layout primitives, Sidebar holds state: a width signal, a
// localStorage round-trip keyed by `id`, and three ways to change it (drag,
// arrow keys, double-click). None of it was covered — it surfaced in the
// `componentsNeverRendered` backlog with 170 lines and no test.
//
// The subtle rule is DIRECTION MIRRORING. `handle="left"` means a right-docked
// sidebar whose handle is on its left edge, so dragging left or pressing
// ArrowLeft must GROW it. Both the pointer path (`delta`) and the keyboard path
// (`grow`) invert independently — two separate sign flips that have to agree,
// which is exactly the kind of thing that gets half-fixed. Each is asserted for
// both dock sides below.
//
// `aria-valuenow` is the observable for width because it is also the contract
// with assistive tech: the splitter reports its position, so a width change
// that fails to reach the ARIA attribute is a real defect, not a test detail.
//
// Widths come from the component's own constants — DEFAULT 300, MIN 200,
// MAX 720, STEP 16 — which are module-private. They are written as literals
// here deliberately: a test that recomputed them from the source would agree
// with any change, including a wrong one.
// ============================================
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { pointer } from "../../test-utils";
import { Sidebar } from "./Sidebar";

const KEY = "sui-sidebar-width:test-pane";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

interface MountOptions {
  handle?: "left" | "right";
  gap?: "xs" | "sm";
}

const mount = (options: MountOptions = {}) => {
  const { container } = render(() => (
    <Sidebar id="test-pane" handle={options.handle} gap={options.gap}>
      panel
    </Sidebar>
  ));
  const root = container.firstElementChild as HTMLElement;
  const handle = root.querySelector('[role="separator"]') as HTMLElement;
  return {
    root,
    handle,
    width: () => Number(handle.getAttribute("aria-valuenow")),
  };
};

describe("Sidebar — initial width", () => {
  it("starts at the canonical default with nothing persisted", () => {
    const { root, width } = mount();
    expect(width()).toBe(300);
    expect(root.style.width).toBe("300px");
  });

  it("restores a persisted width on mount", () => {
    window.localStorage.setItem(KEY, "420");
    expect(mount().width()).toBe(420);
  });

  it("clamps a persisted width that is out of range", () => {
    window.localStorage.setItem(KEY, "9000");
    expect(mount().width()).toBe(720);
  });

  it("ignores an unparseable persisted value rather than rendering NaN", () => {
    window.localStorage.setItem(KEY, "wide");
    expect(mount().width()).toBe(300);
  });

  it("keys persistence by `id`, so two sidebars do not share a width", () => {
    window.localStorage.setItem("sui-sidebar-width:other", "500");
    expect(mount().width()).toBe(300);
  });
});

describe("Sidebar — the splitter's contract with assistive tech", () => {
  it("reports its range and orientation", () => {
    const { handle } = mount();
    expect(handle.getAttribute("aria-valuemin")).toBe("200");
    expect(handle.getAttribute("aria-valuemax")).toBe("720");
    expect(handle.getAttribute("aria-orientation")).toBe("vertical");
    expect(handle.getAttribute("aria-label")).toBe("Resize sidebar");
  });

  it("is focusable — a splitter nobody can tab to cannot be keyboard-resized", () => {
    expect(mount().handle.tabIndex).toBe(0);
  });

  it("puts the handle on the right edge by default, and the left when asked", () => {
    expect(mount().handle.className).toMatch(/sidebar__handle--right/);
    cleanup();
    expect(mount({ handle: "left" }).handle.className).toMatch(
      /sidebar__handle--left/,
    );
  });
});

describe("Sidebar — keyboard resize", () => {
  it("grows on ArrowRight and shrinks on ArrowLeft when docked left", () => {
    const { handle, width } = mount();
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(width()).toBe(316);
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(width()).toBe(300);
  });

  it("MIRRORS both keys when the handle is on the left edge", () => {
    // A right-docked sidebar grows leftward: the key that visually enlarges the
    // column must still enlarge it. Half of this flip is easy to miss.
    const { handle, width } = mount({ handle: "left" });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(width()).toBe(316);
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(width()).toBe(300);
  });

  it("takes a five-times step with Shift held", () => {
    const { handle, width } = mount();
    fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
    expect(width()).toBe(380);
  });

  it("jumps to each bound with Home and End", () => {
    const { handle, width } = mount();
    fireEvent.keyDown(handle, { key: "End" });
    expect(width()).toBe(720);
    fireEvent.keyDown(handle, { key: "Home" });
    expect(width()).toBe(200);
  });

  it("clamps at the bounds instead of running past them", () => {
    const { handle, width } = mount();
    fireEvent.keyDown(handle, { key: "End" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(width()).toBe(720);
    fireEvent.keyDown(handle, { key: "Home" });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(width()).toBe(200);
  });

  it("leaves other keys alone", () => {
    const { handle, width } = mount();
    fireEvent.keyDown(handle, { key: "a" });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(width()).toBe(300);
  });

  it("persists every keyboard nudge immediately", () => {
    // There is no pointerup to hang the write on, so each key must persist on
    // its own or an arrow-key resize is lost on reload.
    const { handle } = mount();
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(window.localStorage.getItem(KEY)).toBe("316");
  });
});

describe("Sidebar — pointer drag", () => {
  it("follows the pointer while dragging and persists on release", () => {
    const { handle, root, width } = mount();
    const drag = pointer(handle);
    drag.down({ clientX: 400, clientY: 0 });
    drag.move({ clientX: 460, clientY: 0 });
    expect(width()).toBe(360);
    expect(root.style.width).toBe("360px");
    // Not yet written — the drag is still in flight.
    expect(window.localStorage.getItem(KEY)).toBeNull();
    drag.up();
    expect(window.localStorage.getItem(KEY)).toBe("360");
  });

  it("MIRRORS the drag delta when the handle is on the left edge", () => {
    const { handle, width } = mount({ handle: "left" });
    const drag = pointer(handle);
    drag.down({ clientX: 400, clientY: 0 });
    drag.move({ clientX: 340, clientY: 0 });
    expect(width()).toBe(360);
    drag.up();
  });

  it("clamps a drag that overshoots the maximum", () => {
    const { handle, width } = mount();
    const drag = pointer(handle);
    drag.down({ clientX: 0, clientY: 0 });
    drag.move({ clientX: 5000, clientY: 0 });
    expect(width()).toBe(720);
    drag.up();
  });

  it("stops following the pointer once released", () => {
    const { handle, width } = mount();
    const drag = pointer(handle);
    drag.down({ clientX: 400, clientY: 0 });
    drag.move({ clientX: 450, clientY: 0 });
    drag.up();
    drag.move({ clientX: 600, clientY: 0 });
    expect(width()).toBe(350);
  });

  it("restores the document cursor and text selection after a drag", () => {
    // Both are set on <body> for the duration; leaking them leaves the whole
    // app stuck at col-resize with nothing selectable.
    const { handle } = mount();
    const drag = pointer(handle);
    drag.down({ clientX: 400, clientY: 0 });
    expect(document.body.style.cursor).toBe("col-resize");
    expect(document.body.style.userSelect).toBe("none");
    drag.up();
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
  });
});

describe("Sidebar — reset", () => {
  it("returns to the default width on double-click, and persists it", () => {
    window.localStorage.setItem(KEY, "500");
    const { handle, width } = mount();
    expect(width()).toBe(500);
    fireEvent.dblClick(handle);
    expect(width()).toBe(300);
    expect(window.localStorage.getItem(KEY)).toBe("300");
  });
});

describe("Sidebar — content", () => {
  it("stacks its children in a content region, separate from the handle", () => {
    const { root } = mount();
    const content = root.querySelector(".sidebar__content") as HTMLElement;
    expect(content.textContent).toBe("panel");
    expect(content.className).toMatch(/stack--gap-sm/);
  });

  it("passes the gap step through to the inner Stack", () => {
    const { root } = mount({ gap: "xs" });
    expect(
      (root.querySelector(".sidebar__content") as HTMLElement).className,
    ).toMatch(/stack--gap-xs/);
  });
});
