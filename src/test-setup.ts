// Test setup. Tests use the Solid testing-library `render` + raw DOM
// assertions; no extra matchers required.
//
// jsdom ships without a canvas implementation, so any component that reaches
// for a 2D context (e.g. ScrubChart's label-width measurement) triggers a
// noisy "Not implemented: HTMLCanvasElement.prototype.getContext" report on
// every run. The production code already falls back gracefully, but the
// reporter fires before the null return. We install a minimal functional 2D
// context so the fallback path is never hit and the noise is gone — while
// still returning plausible measurements to exercise the real code path.

const measureText = (text: string) =>
  // Rough monospace-ish estimate: good enough for layout math under test,
  // deterministic, and non-zero so callers don't fall back to their own guess.
  ({ width: (text?.length ?? 0) * 7 } as TextMetrics);

const stubContext2d = () =>
  new Proxy(
    { measureText, font: "" },
    {
      get(target, prop, receiver) {
        if (prop in target) return Reflect.get(target, prop, receiver);
        // Any unimplemented method (fillRect, beginPath, …) is a no-op.
        return () => undefined;
      },
    },
  ) as unknown as CanvasRenderingContext2D;

if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = function getContext(
    contextId: string,
  ) {
    return contextId === "2d" ? stubContext2d() : null;
  } as HTMLCanvasElement["getContext"];
}

export {};
