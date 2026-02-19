// ============================================
// DigitRoller — Atomic (Depth 1)
// Owns CSS (DigitRoller.css), no component imports.
// Animated digit-by-digit value transition.
// ============================================
import { Component, For, Show, createEffect, createSignal, splitProps } from "solid-js";
import "./DigitRoller.css";

export interface DigitRollerProps {
  /** The current value to display, e.g. "2.116" */
  value: string;
  /** The previous value to animate from, e.g. "3.412" */
  previousValue?: string | null;
  /** Whether to play the roll animation */
  animate?: boolean;
  /** Called when all digit animations have finished */
  onAnimationEnd?: () => void;
  /** Duration in ms per digit transition (default 600) */
  duration?: number;
  /** Stagger delay in ms between digits (default 80) */
  stagger?: number;
  class?: string;
}

interface ColumnDef {
  type: "digit" | "static";
  from: number;
  to: number;
  char: string; // for static chars like "."
}

function buildDigitSequence(from: number, to: number): number[] {
  if (from === to) return [from];
  const digits: number[] = [];
  if (from < to) {
    for (let i = from; i <= to; i++) digits.push(i);
  } else {
    // Roll down: e.g. 7→2 goes 7,6,5,4,3,2
    for (let i = from; i >= to; i--) digits.push(i);
  }
  return digits;
}

function alignOnDecimal(a: string, b: string): [string, string] {
  const aDot = a.indexOf(".");
  const bDot = b.indexOf(".");

  // No decimals in either → just pad on the left to same length
  if (aDot === -1 && bDot === -1) {
    const maxLen = Math.max(a.length, b.length);
    return [a.padStart(maxLen, "0"), b.padStart(maxLen, "0")];
  }

  const aInt = aDot === -1 ? a : a.slice(0, aDot);
  const aDec = aDot === -1 ? "" : a.slice(aDot + 1);
  const bInt = bDot === -1 ? b : b.slice(0, bDot);
  const bDec = bDot === -1 ? "" : b.slice(bDot + 1);

  const maxInt = Math.max(aInt.length, bInt.length);
  const maxDec = Math.max(aDec.length, bDec.length);

  const padA = aInt.padStart(maxInt, "0") + (maxDec > 0 ? "." + aDec.padEnd(maxDec, "0") : "");
  const padB = bInt.padStart(maxInt, "0") + (maxDec > 0 ? "." + bDec.padEnd(maxDec, "0") : "");
  return [padA, padB];
}

function buildColumns(fromStr: string, toStr: string): ColumnDef[] {
  const [alignedFrom, alignedTo] = alignOnDecimal(fromStr, toStr);
  const cols: ColumnDef[] = [];

  for (let i = 0; i < alignedTo.length; i++) {
    const fc = alignedFrom[i] ?? "0";
    const tc = alignedTo[i] ?? "0";

    if (tc === "." || tc === "," || tc === "-" || tc === " ") {
      cols.push({ type: "static", from: 0, to: 0, char: tc });
    } else {
      const fromDigit = /\d/.test(fc) ? parseInt(fc, 10) : 0;
      const toDigit = /\d/.test(tc) ? parseInt(tc, 10) : 0;
      cols.push({ type: "digit", from: fromDigit, to: toDigit, char: tc });
    }
  }
  return cols;
}

export const DigitRoller: Component<DigitRollerProps> = (props) => {
  const [local] = splitProps(props, [
    "value",
    "previousValue",
    "animate",
    "onAnimationEnd",
    "duration",
    "stagger",
    "class",
  ]);

  const duration = () => local.duration ?? 600;
  const stagger = () => local.stagger ?? 80;

  const shouldAnimate = () =>
    local.animate === true &&
    local.previousValue != null &&
    local.previousValue !== local.value;

  const columns = () => {
    if (shouldAnimate()) {
      return buildColumns(local.previousValue!, local.value);
    }
    // Static: just show the value characters
    return [...local.value].map((ch) => {
      if (/\d/.test(ch)) {
        const d = parseInt(ch, 10);
        return { type: "digit" as const, from: d, to: d, char: ch };
      }
      return { type: "static" as const, from: 0, to: 0, char: ch };
    });
  };

  // Track animation: start from top (showing "from"), then transition to bottom (showing "to")
  const [started, setStarted] = createSignal(false);

  // When animate becomes true, trigger the transition after one frame
  createEffect(() => {
    if (shouldAnimate()) {
      setStarted(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setStarted(true);
        });
      });
    } else {
      setStarted(false);
    }
  });

  // Fire onAnimationEnd after the last digit finishes
  createEffect(() => {
    if (started()) {
      const cols = columns();
      const digitCount = cols.filter((c) => c.type === "digit").length;
      const totalMs = duration() + stagger() * (digitCount - 1);
      const timer = setTimeout(() => {
        local.onAnimationEnd?.();
      }, totalMs + 50); // small buffer
      return () => clearTimeout(timer);
    }
  });

  // If same value or no previous, fire immediately
  createEffect(() => {
    if (local.animate && (local.previousValue == null || local.previousValue === local.value)) {
      local.onAnimationEnd?.();
    }
  });

  const classes = () => {
    const list = ["digit-roller"];
    if (local.class) list.push(local.class);
    return list.join(" ");
  };

  return (
    <span class={classes()}>
      <For each={columns()}>
        {(col, colIndex) => (
          <Show
            when={col.type === "digit"}
            fallback={<span class="digit-roller__static">{col.char}</span>}
          >
            {(() => {
              const seq = buildDigitSequence(col.from, col.to);
              const isAnimating = () => shouldAnimate() && col.from !== col.to;
              const targetOffset = seq.length - 1;

              const digitIndex = () => {
                let count = 0;
                const cols = columns();
                for (let i = 0; i < colIndex(); i++) {
                  if (cols[i].type === "digit") count++;
                }
                return count;
              };

              const translateY = () => {
                if (!isAnimating()) return "0em";
                if (!started()) return "0em";
                return `-${targetOffset}em`;
              };

              const transitionStyle = () => {
                if (!isAnimating()) return "none";
                return `transform ${duration()}ms cubic-bezier(0.23, 1, 0.32, 1) ${digitIndex() * stagger()}ms`;
              };

              return (
                <span class="digit-roller__column">
                  <span
                    class="digit-roller__strip"
                    style={{
                      transform: `translateY(${translateY()})`,
                      transition: transitionStyle(),
                    }}
                  >
                    <For each={seq}>
                      {(digit) => (
                        <span class="digit-roller__char">{digit}</span>
                      )}
                    </For>
                  </span>
                </span>
              );
            })()}
          </Show>
        )}
      </For>
    </span>
  );
};
