// Barrel — the PUBLIC surface, re-exported from src/index.ts.
//
// `geometry.ts` is a private module: pure, printable as a table, and its
// exports exist so `geometry.test.ts` can read the frame without a browser —
// not so a consumer can. `RailWidth` is the exception, because a call site
// that curries its own board has to name the type of the `rail` override.
//
// Clients import `BuilderBoard` (the gauge-railed board, the only one today)
// or curry their own once with `createBuilderBoard`.
export { BuilderBoard, createBuilderBoard } from "./BuilderBoard";
export type {
  BuilderBoardProps,
  BuilderBoardOverrides,
  BuilderBoardDataProps,
} from "./BuilderBoard";
export type { RailWidth as BuilderBoardRailWidth } from "./geometry";
