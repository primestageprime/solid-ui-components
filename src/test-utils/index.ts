// ============================================
// Test harness. Not part of the public API — nothing here is re-exported from
// `src/index.ts`, and no production module may import it.
//
// Reach for these instead of hand-rolling a double. Before this barrel existed
// sixteen files carried their own ResizeObserver, eight their own rect spy,
// five the same three DnD helpers and three their own pointer driver — four
// incompatible shapes per concern, so a fix to one never reached the others.
//
// Each module's header explains what it deliberately does NOT do; read it
// before extending one.
// ============================================
export { domStructure, type DomStructureOptions } from "./domStructure";
export {
  installFakeSizer,
  type FakeSizer,
  type SizeObservation,
} from "./fakeSizer";
export {
  installRects,
  rectOf,
  verticalRows,
  liveFlow,
  type RectProvider,
  type RectBox,
  type VerticalRowsOptions,
  type LiveFlowOptions,
} from "./fakeRects";
export {
  pointer,
  installPointerCapture,
  type PointerDriver,
  type PointerPosition,
  type PointerCapture,
  type Recorder,
} from "./pointer";
export {
  makeDataTransfer,
  fireDrag,
  flush,
  type FakeDataTransfer,
  type DragEventOptions,
} from "./drag";
