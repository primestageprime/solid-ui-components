// ============================================
// PROTOTYPE — bench chrome shared by all three variants.
// This is NOT variant layout. It prints the note and the raw live value so a
// reader sees that the control moves real state. The tick markup stays inside
// each variant file.
// ============================================
import { type Component, type JSX, Show } from "solid-js";
import "./BenchCaseFrame.css";
import type { TickCase } from "./cases";

interface BenchCaseFrameProps {
  tickCase: TickCase;
  /** Raw value in the case's own units, printed unformatted. */
  value: number;
  children: JSX.Element;
}

/** Wraps one live slider with its note and its raw value. */
export const BenchCaseFrame: Component<BenchCaseFrameProps> = (props) => (
  <div class="slider-ticks-frame">
    <Show when={props.tickCase.note}>
      {(note) => <span class="slider-ticks-frame__note">{note()}</span>}
    </Show>
    {props.children}
    <span class="slider-ticks-frame__state">
      raw value: {props.value} · ticks: {props.tickCase.ticks.length}
    </span>
  </div>
);
