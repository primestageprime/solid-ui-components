// The scale every dial in a row shares: the track domain, the drag and key
// steps, and the height to draw at.
import { createSignal } from "solid-js";
import {
  type Domain,
  dialHeightFor,
  dragStep,
  niceStep,
  trackDomainOf,
} from "../MarkedSlider/geometry";
import type { MutationSlidersProps } from "./props";

export interface RowScale {
  readonly domain: () => Domain;
  /** What a POINTER drag moves by. */
  readonly step: () => number;
  /** What an ARROW KEY moves by. */
  readonly keyStep: () => number;
  /** The height to DRAW at: the container's, floored, or the fixed default. */
  readonly dialHeight: () => number;
  readonly measureDial: (height: number) => void;
}

export const createRowScale = (props: MutationSlidersProps): RowScale => {
  // Every dial in a row is the same height, so ONE signal serves them all —
  // whichever reports first, and they agree thereafter.
  const [measuredDialHeight, setMeasuredDialHeight] = createSignal(0);
  const dialHeight = (): number => dialHeightFor(measuredDialHeight());

  /**
   * A zero reading is no information, not a measurement — writing it would
   * clobber a real size the observer already delivered (under jsdom every rect
   * is zero).
   */
  const measureDial = (height: number): void => {
    if (height > 0) setMeasuredDialHeight(height);
  };

  /**
   * The track every dial shares. The caller's if they gave one, otherwise the
   * span the entities themselves bracket.
   */
  const domain = (): Domain => props.domain ?? trackDomainOf(props.entities);

  /**
   * What a POINTER drag moves by: the finest unit the domain can express, so
   * the thumb tracks the pointer instead of jumping between rungs. Kobalte's
   * `step` governs the drag as well as the keyboard, which is why this is not
   * `niceStep` — see `dragStep` in geometry.ts.
   */
  const step = (): number => props.snap ?? dragStep(domain());

  /**
   * What an ARROW KEY moves by. Ten of these for a page key.
   *
   * `snap` raises it when it is coarser: a grid of round units with a finer
   * key step would let the keyboard land between the rungs a drag is confined
   * to, so two ways of moving the same thumb would disagree about which values
   * exist.
   */
  const keyStep = (): number => Math.max(niceStep(domain()), props.snap ?? 0);

  return { domain, step, keyStep, dialHeight, measureDial };
};
