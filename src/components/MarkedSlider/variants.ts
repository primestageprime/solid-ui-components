// Pre-configured MarkedSlider variants via createMarkedSlider().
// See ADR-0001: all visual/presentational configuration is locked at variant
// definition time — consumers pass data + callbacks only.
//
// ONE variant, deliberately (SUI: start with one, expand only when a real
// caller demands it). The only thing a variant can lock here is `snap`, the
// grid a caller's scale admits, and the domain-neutral answer to that is "no
// grid, so a drag is continuous". A consumer whose quantities come in round
// units curries their own with the factory — `createMarkedSlider({ snap: 1000 })`
// — rather than SUI guessing which unit they are counting in.

import type { Component } from "solid-js";
import {
  createMarkedSlider,
  type MarkedSliderDataProps,
} from "./MarkedSlider";

/**
 * ContinuousMarkedSlider — the drop-in marked slider.
 *
 * Locked: no `snap`, so the thumb tracks the pointer to the finest unit the
 * domain can express. That is the right default for any scale whose values are
 * genuinely continuous, and the only one that is true of every domain.
 *
 * @example
 *   <ContinuousMarkedSlider
 *     domain={[0, 200]}
 *     range={[40, 60]}
 *     prior={44}
 *     value={value()}
 *     label="Ana"
 *     onChange={setValue}
 *   />
 */
export const ContinuousMarkedSlider: Component<MarkedSliderDataProps> =
  createMarkedSlider({});
