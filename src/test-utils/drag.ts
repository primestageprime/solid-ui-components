// ============================================
// Shared HTML5 drag-and-drop plumbing.
//
// jsdom has neither `DataTransfer` nor `DragEvent`. Five integration tests each
// defined the same three helpers verbatim — fifteen copies in total, across
// roughly a thousand lines of DnD test.
//
// `flush` exists because `createDnDReorder.ts:254` defers its `setDragId` write
// through `setTimeout(…, 0)`: writing the signal synchronously inside
// `dragstart` makes Solid re-render mid-gesture, and the browser aborts the
// native drag. Every caller must therefore let a macrotask pass after
// `dragstart` before asserting on preview order. That deferral is production
// behaviour, so it is surfaced rather than hidden.
//
// Geometry is NOT here — see `fakeRects.ts`. A drag test needs both.
// ============================================

export interface FakeDataTransfer {
  effectAllowed: string;
  dropEffect: string;
  setData(key: string, value: string): void;
  getData(key: string): string;
  setDragImage(): void;
}

/** Minimal DataTransfer stand-in with real get/set round-tripping. */
export function makeDataTransfer(): FakeDataTransfer {
  const store: Record<string, string> = {};
  return {
    effectAllowed: "",
    dropEffect: "",
    setData: (key: string, value: string) => {
      store[key] = value;
    },
    getData: (key: string) => store[key] ?? "",
    setDragImage: () => {},
  };
}

export interface DragEventOptions {
  clientX?: number;
  clientY?: number;
  dataTransfer: FakeDataTransfer;
}

/**
 * Dispatch one drag-family event (`dragstart`, `dragover`, `drop`, `dragend`).
 * Returns the event so a caller can assert on `defaultPrevented` — which is how
 * a drop target signals it accepted the payload.
 */
export function fireDrag(
  el: Element,
  type: string,
  options: DragEventOptions,
): Event {
  const event = Object.assign(
    new Event(type, { bubbles: true, cancelable: true }),
    {
      clientX: options.clientX ?? 0,
      clientY: options.clientY ?? 0,
      dataTransfer: options.dataTransfer,
    },
  );
  el.dispatchEvent(event);
  return event;
}

/** Let the macrotask deferred by `createDnDReorder` run. Await after
 *  `dragstart` and before asserting on preview order. */
export const flush = (): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));
