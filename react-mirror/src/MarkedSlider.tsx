// SUI's MarkedSlider, as React markup: SUI's own geometry (sui:MarkedSlider/
// geometry) drawn into the same SVG marks, with the static markup Kobalte's
// vertical slider renders around a thumb. It draws a state; it does not drag.
import type { ReactElement } from "react";
import "../../src/components/MarkedSlider/MarkedSlider.css";
import {
  BAND_HALF,
  CHANGE_HALF,
  DELTA_X,
  type DialGeometry,
  type Domain,
  PRIOR_LABEL_X,
  TRACK_X,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  dialGeometry,
  dragStep,
  trackPath,
} from "sui:MarkedSlider/geometry";
import { classNames } from "./internal/classes.ts";
import { mergeDefined } from "./internal/props.ts";

export interface MarkedSliderProps {
  readonly domain: Domain;
  readonly range: Domain;
  readonly value: number | null;
  readonly prior: number | null;
  readonly height?: number;
  readonly snap?: number;
  readonly dragStep?: number;
  readonly keyStep?: number;
  readonly deltaLabel?: string | null;
  readonly priorLabel?: string | null;
  readonly label: string;
  readonly valueText?: string;
  readonly active?: boolean;
  readonly onChange?: (value: number) => void;
  readonly onChangeEnd?: (value: number) => void;
  readonly onMeasure?: (height: number) => void;
  readonly onDragStart?: () => void;
  readonly class?: string;
  readonly className?: string;
}
export type MarkedSliderDataProps = Omit<MarkedSliderProps, "snap">;

const NBSP = " ";
const LINE_EM = 1.2;

/** Kobalte's thumb offset: the value's share of the domain, as `calc(N%)`. */
export const thumbOffset = (domain: Domain, value: number): string =>
  `calc(${((value - domain[0]) / (domain[1] - domain[0])) * 100}%)`;

/** Kobalte's default value text: a decimal number in the reader's locale. */
export const numberText = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { style: "decimal" }).format(value);

const readerLocale = (): string =>
  typeof navigator === "undefined" ? "en-US" : navigator.language;

export interface DeltaLine {
  readonly dy: string | undefined;
  readonly text: string;
}

/** A delta label's lines; more than one is centred as a block on its line. */
export const deltaLines = (label: string | null): readonly DeltaLine[] => {
  if (label === null) return [];
  const lines = label.split("\n");
  if (lines.length === 1) return [{ dy: undefined, text: label }];
  return lines.map((text, index) => ({
    dy:
      index === 0 ? `${(-(lines.length - 1) * LINE_EM) / 2}em` : `${LINE_EM}em`,
    text,
  }));
};

const Marks = (props: {
  readonly dial: DialGeometry;
  readonly deltaLabel: string | null;
  readonly priorLabel: string | null;
  readonly height: number;
}): ReactElement => {
  const { dial, deltaLabel, priorLabel, height } = props;
  const lines = deltaLines(deltaLabel);
  return (
    <svg
      className="sui-marked-slider__marks"
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path className="sui-marked-slider__track-line" d={trackPath(height)} />
      <rect
        className="sui-marked-slider__band"
        x={TRACK_X - BAND_HALF}
        y={dial.band.y}
        width={BAND_HALF * 2}
        height={dial.band.height}
      />
      {dial.changeLine && (
        <rect
          className={`sui-marked-slider__change sui-marked-slider__change--${dial.changeTone}`}
          x={TRACK_X - CHANGE_HALF}
          y={dial.changeLine.y}
          width={CHANGE_HALF * 2}
          height={dial.changeLine.height}
        />
      )}
      {dial.priorArrow && (
        <path className="sui-marked-slider__arrow--prior" d={dial.priorArrow} />
      )}
      {dial.futureArrow && (
        <path
          className="sui-marked-slider__arrow--future"
          d={dial.futureArrow}
        />
      )}
      <text
        className={classNames(
          "sui-marked-slider__delta",
          `sui-marked-slider__delta--${dial.changeTone}`,
          deltaLabel === null && "sui-marked-slider__reserved",
        )}
        x={DELTA_X}
        y={dial.deltaY ?? 0}
      >
        {lines.length > 1
          ? lines.map((line, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional, as SUI's <Index>
              <tspan key={index} x={DELTA_X} dy={line.dy}>
                {line.text}
              </tspan>
            ))
          : (deltaLabel ?? NBSP)}
      </text>
      {priorLabel !== null && dial.oldY !== null && (
        <text
          className="sui-marked-slider__prior-label"
          x={PRIOR_LABEL_X}
          y={dial.oldY}
        >
          {priorLabel}
        </text>
      )}
    </svg>
  );
};

// Kobalte's visuallyHiddenStyles, verbatim.
const VISUALLY_HIDDEN = {
  border: "0",
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: "1px",
  margin: "0 -1px -1px 0",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  width: "1px",
  whiteSpace: "nowrap",
} as const;

export const MarkedSlider = (props: MarkedSliderProps): ReactElement => {
  const height = props.height ?? VIEW_HEIGHT;
  const dial = dialGeometry(
    props.domain,
    {
      id: "",
      label: props.label,
      old: props.prior,
      value: props.value,
      range: props.range,
    },
    height,
  );
  const removed = props.value === null;
  const current = dial.clampedValue ?? dial.range[0];
  const disabled = removed ? "" : undefined;
  const locale = readerLocale();
  return (
    // biome-ignore lint/a11y/useSemanticElements: Kobalte's slider root is a div with role=group; the mirror draws the same tree
    <div
      role="group"
      data-disabled={disabled}
      data-orientation="vertical"
      className={classNames(
        "sui-marked-slider",
        props.class,
        props.className,
        props.active && "sui-marked-slider--active",
      )}
      data-removed={disabled}
    >
      <Marks
        dial={dial}
        deltaLabel={props.deltaLabel ?? null}
        priorLabel={props.priorLabel ?? null}
        height={height}
      />
      <div
        data-disabled={disabled}
        data-orientation="vertical"
        className="sui-marked-slider__track"
      >
        {!dial.removed && (
          <span
            role="slider"
            tabIndex={0}
            style={{
              position: "absolute",
              transform: "translateY(50%)",
              touchAction: "none",
              bottom: thumbOffset(props.domain, current),
            }}
            aria-valuetext={props.valueText ?? numberText(current, locale)}
            aria-valuemin={dial.range[0]}
            aria-valuemax={dial.range[1]}
            aria-orientation="vertical"
            aria-label={props.label}
            data-orientation="vertical"
            className="sui-marked-slider__thumb"
            aria-valuenow={current}
          >
            <input
              type="range"
              tabIndex={-1}
              min={props.domain[0]}
              max={props.domain[1]}
              step={props.dragStep ?? dragStep(props.domain)}
              style={VISUALLY_HIDDEN}
              aria-orientation="vertical"
              aria-valuetext={numberText(current, locale)}
              data-orientation="vertical"
            />
          </span>
        )}
      </div>
    </div>
  );
};

export const createMarkedSlider =
  (defaults: Partial<Pick<MarkedSliderProps, "snap">>) =>
  (props: MarkedSliderDataProps): ReactElement => (
    <MarkedSlider {...mergeDefined(defaults, props)} />
  );
