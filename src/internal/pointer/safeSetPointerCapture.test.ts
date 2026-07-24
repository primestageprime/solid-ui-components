import { afterEach, describe, expect, it, vi } from "vitest";

import { safeSetPointerCapture } from "./safeSetPointerCapture";

/** Builds a minimal Element-like stub whose setPointerCapture we control. */
const elWithCapture = (impl: (pointerId: number) => void) =>
  ({ setPointerCapture: impl }) as unknown as Element;

/** A DOMException carrying a specific `name`, as browsers throw. */
const domException = (name: string) =>
  new DOMException(`simulated ${name}`, name);

describe("safeSetPointerCapture", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards to the element's setPointerCapture with the pointer id", () => {
    const setPointerCapture = vi.fn();
    safeSetPointerCapture(elWithCapture(setPointerCapture), 7);
    expect(setPointerCapture).toHaveBeenCalledWith(7);
  });

  it("is a no-op when the element is null or undefined", () => {
    expect(() => safeSetPointerCapture(null, 1)).not.toThrow();
    expect(() => safeSetPointerCapture(undefined, 1)).not.toThrow();
  });

  it("is a no-op when the method is absent (e.g. jsdom)", () => {
    const el = {} as unknown as Element;
    expect(() => safeSetPointerCapture(el, 1)).not.toThrow();
  });

  it("swallows InvalidStateError (element disconnected from the DOM)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = elWithCapture(() => {
      throw domException("InvalidStateError");
    });
    expect(() => safeSetPointerCapture(el, 3)).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it("swallows NotFoundError (no active pointer with that id)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = elWithCapture(() => {
      throw domException("NotFoundError");
    });
    expect(() => safeSetPointerCapture(el, 3)).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns (but does not rethrow) on an unexpected error", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const boom = new TypeError("unexpected");
    const el = elWithCapture(() => {
      throw boom;
    });
    expect(() => safeSetPointerCapture(el, 3)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[SUI] setPointerCapture threw:",
      boom,
    );
  });
});
