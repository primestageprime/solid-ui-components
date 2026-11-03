// ============================================
// PayChain — Composite (Depth 2, zero CSS)
// Tags: shows:text, shows:money, does:view, does:layout, data:steps, role:row
// Composes StepChain, curried for pay: the call site is data only. Cleans the
// steps (drops zero-length $0 gaps, merges equal consecutive amounts), words
// them in whole dollars with the cadence's unit (mo for monthly, wk for
// bi-weekly), and hands them to StepChain, which folds by measured width.
// Curried StepChain preset, so there is no factory: nothing is left to freeze.
// ============================================
import type { Component } from "solid-js";
import { StepChain } from "../StepChain";
import { type PayCadence, type PayStep, cadenceTag, toChainSteps } from "./steps";

export interface PayChainProps {
  name: string;
  cadence: PayCadence;
  steps: readonly PayStep[];
  /** A chain that stops ends in "done"; an open one in a bare arrow. */
  ends?: boolean;
}

export const PayChain: Component<PayChainProps> = (props) => (
  <StepChain
    name={props.name}
    tag={cadenceTag(props.cadence)}
    steps={toChainSteps(props.steps, props.cadence)}
    ends={props.ends}
  />
);
