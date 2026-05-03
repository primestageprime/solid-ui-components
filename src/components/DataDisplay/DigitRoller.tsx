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

type Direction = "up" | "down";

/**
 * Build an odometer-style mod-10 path from `from` to `to` in the given direction.
 *  - direction "up": from, (from+1)%10, …, to. Always rolls forward through 0→9→0.
 *  - direction "down": from, (from-1+10)%10, …, to. Always rolls backward.
 *
 * The overall number's direction (computed from the parsed value) is passed to
 * every column so cross-decade columns (e.g. units 9→0 when the whole number
 * goes 19→20) roll in the same direction as the rest.
 */
function buildOdometerPath(from: number, to: number, direction: Direction): number[] {
  if (from === to) return [from];
  const path: number[] = [from];
  let cur = from;
  // Safety cap at 10 steps — a single column can't take more than that.
  for (let i = 0; i < 10 && cur !== to; i++) {
    cur = direction === "up" ? (cur + 1) % 10 : (cur - 1 + 10) % 10;
    path.push(cur);
  }
  return path;
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

  /**
   * Overall direction is derived from the whole-number comparison so every
   * column rolls the same way. Without this, units 9→0 (when the number
   * goes 19→20) would be treated as a decrease and roll the wrong direction.
   */
  const overallDirection = (): Direction => {
    const prev = parseFloat(local.previousValue ?? local.value);
    const curr = parseFloat(local.value);
    if (Number.isNaN(prev) || Number.isNaN(curr)) return "up";
    return curr >= prev ? "up" : "down";
  };

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
              // For overall-up direction: strip is the odometer path top-to-bottom,
              //   strip translates UP (0 → -end em) — new digit enters from below.
              // For overall-down direction: strip is the REVERSED path so "from" sits
              //   at the bottom, strip translates DOWN (-end → 0 em) — new digit
              //   enters from above. This gives the natural odometer feel.
              const dir = overallDirection();
              const path = buildOdometerPath(col.from, col.to, dir);
              const seq = dir === "up" ? path : [...path].reverse();
              const isAnimating = () => shouldAnimate() && col.from !== col.to;
              const endOffset = seq.length - 1;
              const initialOffset = dir === "up" ? 0 : endOffset;
              const targetOffset = dir === "up" ? endOffset : 0;

              const digitIndex = () => {
                let count = 0;
                const cols = columns();
                for (let i = 0; i < colIndex(); i++) {
                  if (cols[i].type === "digit") count++;
                }
                return count;
              };

              const translateY = () => {
                if (!isAnimating()) return `-${initialOffset}em`;
                if (!started()) return `-${initialOffset}em`;
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
