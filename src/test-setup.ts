// Kobalte writes `calc(NaN%)` on a slider thumb's first render. jsdom 30
// throws on it where a browser (and jsdom 26) drops it. This import installs
// the drop. It is published as `<pkg>/testing/jsdom-nan-shim` so a consumer
// can list it in their own `setupFiles`. See the file for the full reason.
import "./testing/jsdomNaNDeclarationShim";

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
  ({ width: (text?.length ?? 0) * 7 }) as TextMetrics;

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

// jsdom ships no `matchMedia` either, so every media query in the library reads
// as absent. All three call sites guard on that — `choreography.ts:88` and
// `useMediaQuery.ts:20` test `typeof`, `BucketQueue.tsx:259` optional-calls —
// and each resolves to `false`. Installing a default that reports `matches:
// false` is therefore byte-identical to today's behaviour for every existing
// test, while making the branch REACHABLE for the first time: a test can now
// override this global and exercise reduced-motion, which was previously dead
// code under jsdom.
//
// This one IS a global default, unlike the ResizeObserver double in
// `test-utils/fakeSizer.ts`. The difference is that a default ResizeObserver
// changes behaviour — twenty-five unstubbed tests would flip from never
// measuring to measuring zero — whereas this default changes nothing.
const stubMediaQueryList = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    // Deprecated pair — `useMediaQuery.ts:39` still falls back to them.
    addListener: () => {},
    removeListener: () => {},
  }) as unknown as MediaQueryList;

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = stubMediaQueryList;
}

