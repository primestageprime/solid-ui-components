// Barrel — the base component ships alongside the factory, because a slider's
// formatter is often genuinely reactive (a currency or a unit the user
// switches), and forcing every consumer through a curried variant would hide
// that. Same reasoning as ThresholdRail.
export { Slider, createSlider } from "./Slider";
export type { SliderProps, SliderDataProps, SliderOverrides } from "./Slider";
