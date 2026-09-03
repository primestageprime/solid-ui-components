// Barrel — the base component ships alongside the factory, because a slider's
// formatter is often genuinely reactive (a currency or a unit the user
// switches), and forcing every consumer through a curried variant would hide
// that. Same reasoning as BandRail.
export { Slider, createSlider } from "./Slider";
export type { SliderProps, SliderDataProps, SliderOverrides } from "./Slider";

// `SliderField` ships too. `Slider`'s own `editable` path draws one, and a
// caller who draws a `valueLabel` node needs the same field for each figure in
// it — without the export it would hand-roll the focus swap, the width and the
// commit, which is what the showcase did before this.
export { SliderField } from "./SliderField";
export type { SliderFieldProps } from "./SliderField";
