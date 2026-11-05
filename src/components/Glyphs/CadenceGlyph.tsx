// ============================================
// CadenceGlyph — Composite (Depth 2)
// Tags: shows:icon, shows:calendar, does:hover, data:enum, role:inline
// Composes GlyphFrame. A calendar whose pattern shows the rhythm: weekly is
// five vertical lines (the work week), fortnightly is two rows of five with
// only the second filled, monthly is one lit day among the weeks. Yearly,
// every N months and once are a letter or a digit on the calendar.
// Exported directly: it has no design-config props.
// ============================================
import { type Component, For, Match, Switch } from "solid-js";
import { GlyphFrame } from "./GlyphFrame";

export type Cadence =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "annual"
  | "every-n"
  | "once";

export interface CadenceGlyphProps {
  cadence: Cadence;
  /** With `every-n`: the number of months between payments. */
  n?: number;
}

/** Centres of the five day columns inside the calendar body. */
const COLS = [4, 6, 8, 10, 12];

export const cadenceLabel = (cadence: Cadence, n?: number): string => {
  switch (cadence) {
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Every two weeks";
    case "monthly":
      return "Monthly";
    case "annual":
      return "Every year";
    case "once":
      return "Once";
    case "every-n":
      return n && n > 0 ? `Every ${n} months` : "Every N months";
  }
};

const LETTER: Record<"annual" | "every-n" | "once", string> = {
  annual: "Y",
  "every-n": "N",
  once: "1",
};

export const CadenceGlyph: Component<CadenceGlyphProps> = (props) => (
  <GlyphFrame label={cadenceLabel(props.cadence, props.n)}>
    <rect x="1.75" y="3" width="12.5" height="11" rx="1.75" />
    <path d="M1.75 6.25h12.5M5 1.5v3M11 1.5v3" />
    <Switch>
      <Match when={props.cadence === "weekly"}>
        <For each={COLS}>{(x) => <path d={`M${x} 8v4`} />}</For>
      </Match>
      <Match when={props.cadence === "biweekly"}>
        <For each={COLS}>
          {(x) => (
            <>
              <rect x={x - 0.7} y="7.4" width="1.4" height="1.4" stroke-width="0.8" />
              <rect x={x - 0.7} y="10.5" width="1.4" height="1.4" fill="currentColor" stroke="none" />
            </>
          )}
        </For>
      </Match>
      <Match when={props.cadence === "monthly"}>
        <rect x="9.6" y="9.6" width="2.6" height="2.6" rx="0.6" fill="currentColor" stroke-width="0.6" />
        
      </Match>
      <Match when={true}>
        <text
          x="8"
          y="12.6"
          text-anchor="middle"
          font-size="6.4"
          font-weight="700"
          font-family="inherit"
          fill="currentColor"
          stroke="none"
        >
          {LETTER[props.cadence as "annual" | "every-n" | "once"]}
        </text>
      </Match>
    </Switch>
  </GlyphFrame>
);
