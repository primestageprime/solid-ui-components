// Barrel. The base is NOT exported — `FullscreenBox` is the default curried
// variant; curry another with `createFullscreenBox` in a variants file.
export {
  FullscreenBox,
  FillFullscreenBox,
  createFullscreenBox,
} from "./FullscreenBox";
export type {
  FullscreenBoxDataProps,
  FullscreenBoxOverrides,
  FullscreenBoxCornerContext,
} from "./FullscreenBox";
