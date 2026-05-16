// ============================================
// Chart context — shared scales/dims for slot children.
// ============================================
import { Accessor, createContext, useContext } from "solid-js";
import { Scale } from "./scales";

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartContextValue {
  width: Accessor<number>;
  height: Accessor<number>;
  margin: Accessor<Margin>;
  innerWidth: Accessor<number>;
  innerHeight: Accessor<number>;
  xScale: Accessor<Scale>;
  yScale: Accessor<Scale>;
  /** Hover x-position in DATA domain, or null when not hovering. */
  hoverX: Accessor<number | null>;
  setHoverX: (x: number | null) => void;
  /** Currently-active drag selection in DATA-domain units, or null when no drag. */
  dragRange: Accessor<{ start: number; end: number } | null>;
  setDragRange: (range: { start: number; end: number } | null) => void;
}

export const ChartContext = createContext<ChartContextValue>();

export const useChart = (): ChartContextValue => {
  const ctx = useContext(ChartContext);
  if (!ctx) {
    throw new Error("Chart child component used outside <Chart>");
  }
  return ctx;
};
