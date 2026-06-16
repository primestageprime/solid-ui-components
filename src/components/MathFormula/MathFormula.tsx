// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// MathFormula + FormulaProvider — Atomic (Depth 1)
// Owns CSS (MathFormula.css), no component imports.
// KaTeX renderer with interactive variable highlighting.
// ============================================
import { createContext, useContext, createSignal, createEffect, on, ParentComponent, Component, JSX, Accessor } from "solid-js";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./MathFormula.css";
import { splitLatexSegments, hasSplittableOperators } from "./latexSegments";

// ============================================
// Formula Highlight Context
// ============================================

interface FormulaHighlightContextValue {
  hoveredVar: Accessor<string | null>;
  setHoveredVar: (varId: string | null) => void;
}

const FormulaHighlightContext = createContext<FormulaHighlightContextValue>();

/**
 * Provider that enables hover interactions between formula variables and table rows.
 * Wrap both the variable table and the MathFormula with this provider.
 */
export const FormulaProvider: ParentComponent = (props) => {
  const [hoveredVar, setHoveredVar] = createSignal<string | null>(null);

  return (
    <FormulaHighlightContext.Provider value={{ hoveredVar, setHoveredVar }}>
      {props.children}
    </FormulaHighlightContext.Provider>
  );
};

/**
 * Hook to access the formula highlight context
 */
export function useFormulaHighlight() {
  return useContext(FormulaHighlightContext);
}

// ============================================
// MathFormula Component
// ============================================

export interface MathFormulaProps {
  /** LaTeX string to render. Use \var{id}{content} for hoverable variables. */
  latex: string;
  /** Display mode (block) vs inline */
  displayMode?: boolean;
  /**
   * Opt-in: split the formula at top-level `+`/`-`/`=` operators and render
   * each term as its own inline KaTeX element inside a `flex-wrap` row, so a
   * formula too wide for its container WRAPS to multiple lines at operator
   * boundaries instead of overflowing. Defaults to `false` (single block),
   * preserving the historical render exactly. Only takes effect when the
   * formula actually has a top-level operator to break on.
   */
  wrap?: boolean;
  /** Additional CSS class */
  class?: string;
  /** Custom styles */
  style?: JSX.CSSProperties;
}

/**
 * Renders a LaTeX formula with KaTeX.
 *
 * Use the custom \var{id}{content} syntax to create hoverable variables
 * that link to table rows via FormulaProvider.
 *
 * Example:
 * ```tsx
 * <MathFormula latex="1.38 + \frac{\var{nox}{NOx} \times \var{f2}{F_2} \times 2760}{836200 \times \var{kw}{kW}}" />
 * ```
 */
export const MathFormula: Component<MathFormulaProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const ctx = useFormulaHighlight();

  // Pre-process LaTeX to convert \var{id}{content} to \htmlClass{formula-var formula-var-id}{content}
  const processLatex = (latex: string): string => {
    return latex.replace(/\\var\{([^}]+)\}\{([^}]+)\}/g, (_, id, content) => {
      return `\\htmlClass{formula-var formula-var-${id}}{${content}}`;
    });
  };

  // Add interactivity to rendered formula variables
  const addInteractivity = () => {
    if (!containerRef || !ctx) return;

    // Find all elements with formula-var class
    const varElements = containerRef.querySelectorAll('.formula-var');

    varElements.forEach((el) => {
      // Extract varId from class list (formula-var-{id})
      const classes = Array.from(el.classList);
      const varClass = classes.find(c => c.startsWith('formula-var-') && c !== 'formula-var');
      if (!varClass) return;

      const varId = varClass.replace('formula-var-', '');
      (el as HTMLElement).dataset.formulaVar = varId;

      el.addEventListener('mouseenter', () => ctx.setHoveredVar(varId));
      el.addEventListener('mouseleave', () => ctx.setHoveredVar(null));
    });
  };

  // Render a single chunk of LaTeX to a KaTeX HTML string.
  const renderChunk = (latex: string, displayMode: boolean): string =>
    katex.renderToString(processLatex(latex), {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true, // Enable \htmlId, \htmlClass, etc.
    });

  // Single-block render — the historical (default) behaviour.
  const renderSingleBlock = (): string =>
    renderChunk(props.latex, props.displayMode ?? true);

  // Wrapping render — split at top-level operators and emit one inline KaTeX
  // element per term plus standalone operator elements, all inside a
  // flex-wrap row so the formula breaks to new lines at `+`/`=` boundaries
  // when its container is narrow. `\displaystyle` keeps fractions full-size
  // even though each term is rendered in inline (non-display) mode.
  const renderWrapped = (): string => {
    const segments = splitLatexSegments(props.latex);
    const pieces = segments.map((seg) => {
      const cls = seg.kind === "op" ? "math-formula-op" : "math-formula-term";
      const body =
        seg.kind === "op"
          ? renderChunk(seg.latex, false)
          : renderChunk(`\\displaystyle ${seg.latex}`, false);
      return `<span class="${cls}">${body}</span>`;
    });
    return `<span class="math-formula-row">${pieces.join("")}</span>`;
  };

  // Render and set up interactivity
  const renderFormula = () => {
    if (!containerRef) return;

    try {
      const useWrap = (props.wrap ?? false) && hasSplittableOperators(props.latex);
      containerRef.innerHTML = useWrap ? renderWrapped() : renderSingleBlock();
      containerRef.classList.toggle("math-formula--wrap", useWrap);

      addInteractivity();
    } catch (e) {
      console.error('KaTeX render error:', e);
      containerRef.textContent = props.latex;
    }
  };

  // Render on mount and whenever the latex / wrap / displayMode inputs change.
  createEffect(on(
    () => [props.latex, props.wrap, props.displayMode] as const,
    () => renderFormula(),
  ));

  // Update highlighting when hoveredVar changes
  createEffect(() => {
    if (!containerRef || !ctx) return;

    const hoveredId = ctx.hoveredVar();
    const varElements = containerRef.querySelectorAll('.formula-var');

    varElements.forEach((el) => {
      const elVarId = (el as HTMLElement).dataset.formulaVar;
      if (elVarId === hoveredId) {
        el.classList.add('formula-var-highlight');
      } else {
        el.classList.remove('formula-var-highlight');
      }
    });
  });

  return (
    <div
      ref={containerRef}
      class={`math-formula ${props.class ?? ""}`}
      style={props.style}
    />
  );
};

// ============================================
// FormulaVarRow - Table row that highlights on hover
// ============================================

export interface FormulaVarRowProps {
  /** Variable ID matching the \var{id}{...} in the formula */
  varId: string;
  /** Additional CSS class */
  class?: string;
  /** Row content */
  children: JSX.Element;
}

/**
 * A table row that highlights when its corresponding formula variable is hovered.
 * Must be used within a FormulaProvider.
 */
export const FormulaVarRow: ParentComponent<FormulaVarRowProps> = (props) => {
  const ctx = useFormulaHighlight();

  const isHighlighted = () => ctx?.hoveredVar() === props.varId;

  // Also allow row hover to highlight formula
  const handleMouseEnter = () => ctx?.setHoveredVar(props.varId);
  const handleMouseLeave = () => ctx?.setHoveredVar(null);

  return (
    <tr
      class={`data-row ${isHighlighted() ? 'formula-row-highlight' : ''} ${props.class ?? ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {props.children}
    </tr>
  );
};
