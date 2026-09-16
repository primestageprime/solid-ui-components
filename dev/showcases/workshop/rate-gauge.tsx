/**
 * Rate Gauge bench — "Rate, right now", the right-facing half-ring gauge from
 * Peter's two mockups.
 *
 * The bench plays the CONSUMER, which is where every domain decision belongs:
 * it owns the card and its title, the [-30000, 30000] per-month domain, the
 * scenario names, and the money formatter (real minus sign U+2212 included).
 * The gauge is handed a domain, a baseline, a value, a name and that
 * formatter, and paints. It formats nothing and decides no units.
 *
 * The slider-driven card comes FIRST, because the thing worth looking at is
 * the gauge moving: the needle, the brace and the zone dimming through zero,
 * into both clamps, and down to a delta too narrow for a brace at all. The
 * static cards below it pin the two situations from the mockups.
 */
import { createSignal, type Component } from "solid-js";
import { RateGauge, yellowDegrees } from "../../../src/components/RateGauge";
import { Slider } from "../../../src/components/Slider";
import { CardSurface } from "../../../src/components/Surface";
import {
  CaptionLabel,
  EllipsizedHudCaption,
  MutedBody,
  SectionTitle,
  TextTitle,
} from "../../../src/components/Text";
import { Tooltip } from "../../../src/components/Tooltip";
import {
  ConstrainedBox,
  SpacedStack,
  TightStack,
  WrapRow,
} from "../../../src/components/Layout";
import { CompactSurface } from "../../../src/components/Surface";

export const meta = { label: "Rate Gauge" };

/** The domain both mockups are drawn against: ±$30k a month. */
const DOMAIN: readonly [number, number] = [-30000, 30000];

/**
 * The comfortable gain that puts exactly TEN DEGREES of ring in the yellow.
 *
 * Visibility is a property of the angle, not of the rate, so the fixture is
 * specified in degrees and converted here — the gauge only ever sees the
 * absolute rate. The gain half maps [0, domainMax] onto 90°, so ten degrees is
 * that fraction of the top of the domain: on this ±$30k dial, +$3,333/mo.
 */
const YELLOW_DEGREES = 10;

const comfortableForDegrees = (
  domain: readonly [number, number],
  degrees: number,
): number => (domain[1] * degrees) / 90;

const COMFORTABLE = comfortableForDegrees(DOMAIN, YELLOW_DEGREES);

/** The same threshold said as a share of the scrubbed card's baseline. */
const COMFORTABLE_PERCENT = (COMFORTABLE / 5000) * 100;

/**
 * The consumer's formatter. A real minus sign (U+2212), not a hyphen — it is a
 * mathematical operator at the same width as the plus it alternates with, so
 * the label column does not jitter as the value crosses the baseline.
 */
const perMonth = (delta: number): string =>
  `${delta < 0 ? "−" : "+"}$${Math.abs(delta).toLocaleString("en-US")}/mo`;

/**
 * One card, exactly as a consumer would compose it around the gauge.
 *
 * The gauge fills whatever box it is given, so the CONSUMER decides the size —
 * here by constraining the card, not the gauge. The static cards below are
 * constrained to a third of the gallery so three sit in a row; the scrubbed
 * one at the top is left full width.
 */
const RateCard: Component<{
  title: string;
  note: string;
  baseline: number;
  value: number;
  label: string;
  comfortable?: number;
}> = (props) => (
  <CardSurface>
    <TightStack>
      <TextTitle>{props.title}</TextTitle>
      <RateGauge
        domain={DOMAIN}
        baseline={props.baseline}
        value={props.value}
        label={props.label}
        comfortable={props.comfortable}
        format={perMonth}
      />
      <CaptionLabel>{props.note}</CaptionLabel>
    </TightStack>
  </CardSurface>
);

/** A static card at a third of the gallery's width. */
const SmallCard: Component<{
  title: string;
  note: string;
  baseline: number;
  value: number;
  label: string;
  comfortable?: number;
}> = (props) => (
  <ConstrainedBox>
    <RateCard
      title={props.title}
      note={props.note}
      baseline={props.baseline}
      value={props.value}
      label={props.label}
      comfortable={props.comfortable}
    />
  </ConstrainedBox>
);

/**
 * The callout caption on its own, at the width the gauge's label column gives
 * it. A scenario name is consumer-supplied and non-enumerated, so it has to
 * truncate and hand the full string to a Tooltip — this is that variant in
 * isolation, which is easier to judge than the same text on a curve.
 */
const CaptionSpecimen: Component = () => (
  <CompactSurface>
    <TightStack>
      <CaptionLabel>Callout caption — hover for the full name</CaptionLabel>
      <ConstrainedBox>
        <Tooltip content="Bookkeeping retainer · Northern" triggerAs="span">
          <EllipsizedHudCaption>
            Bookkeeping retainer · Northern
          </EllipsizedHudCaption>
        </Tooltip>
      </ConstrainedBox>
    </TightStack>
  </CompactSurface>
);

/** The scrubbable one. The slider is the consumer's control, not the gauge's. */
/**
 * The consumer's rule for what counts as comfortable. A percentage OF THE
 * BASELINE is the shape the rule takes here; the gauge never sees the
 * percentage, only the absolute rate it works out to — which is the whole
 * point of `comfortable` being in the consumer's own units.
 */
const comfortableGain = (baseline: number, percent: number): number =>
  (baseline * percent) / 100;

const ScrubbedCard: Component = () => {
  const [value, setValue] = createSignal(23000);
  const [percent, setPercent] = createSignal(COMFORTABLE_PERCENT);
  const baseline = 5000;
  const comfortable = () => comfortableGain(baseline, percent());
  return (
    <CardSurface>
      <TightStack>
        <TextTitle>Rate, right now</TextTitle>
        <ConstrainedBox>
          <RateGauge
            domain={DOMAIN}
            baseline={baseline}
            value={value()}
            comfortable={comfortable()}
            label="Scenario A"
            format={perMonth}
          />
        </ConstrainedBox>
        <Slider
          label="Scenario A's rate"
          value={value()}
          onChange={setValue}
          min={-40000}
          max={40000}
          step={250}
          format={(v) => perMonth(v)}
        />
        <Slider
          label="Comfortable gain, as a % of the baseline"
          value={percent()}
          onChange={setPercent}
          min={0}
          max={120}
          step={0.1}
          format={(v) =>
            v === 0
              ? "none"
              : `${v.toFixed(1)}% — ${perMonth(
                  Math.round(comfortableGain(baseline, v)),
                )} — ${yellowDegrees(DOMAIN, comfortableGain(baseline, v)).toFixed(1)}° of ring`
          }
        />
        <CaptionLabel>
          Baseline is fixed at {perMonth(baseline)}. The slider runs past both
          ends of the gauge's domain, so the needle parks at a pole and the
          delta reports the value the gauge actually DREW. Close in on the
          baseline and the brace runs out of room: the curls go first, then the
          arms, and at the narrowest the delta's leader is a plain line. Drag
          the comfortable gain to zero and the yellow band disappears
          altogether; the slider reads out the band's width in degrees, which
          is the figure that decides whether anyone can see it.
        </CaptionLabel>
      </TightStack>
    </CardSurface>
  );
};

const RateGaugeBench: Component = () => (
  <div class="component-section component-section--full">
    <SpacedStack>
      <TightStack>
        <SectionTitle>Rate Gauge</SectionTitle>
        <MutedBody>
          A right-facing half ring split at zero: the upper half is the positive
          zone, the lower half the negative one, and the half the needle is not
          in is dimmed so the live one reads as lit. The dashed needle is the
          baseline and the solid, capped needle is the rate right now; the
          faint sector between them is the change drawn as an area, and the
          curly brace outside the ring spans that same angle and carries the
          signed delta on a leader from its cusp. Scrub the slider first — the
          brace sheds its curls, then its arms, as the difference narrows.
        </MutedBody>
        <MutedBody>
          The gain half of the ring splits again at the consumer's{" "}
          <strong>comfortable</strong> gain: below it the band is yellow, at or
          above it green. The assumption baked in here is that yellow means
          "not yet comfortable" — say the word and it flips. Whether that band
          is legible is a question about the ANGLE it subtends, not about the
          rate, so every static card below is set so the yellow spans exactly
          10° of the ring — on this ±$30k dial, +$3,333/mo. The gauge itself
          only ever sees the absolute rate.
        </MutedBody>
      </TightStack>

      <ScrubbedCard />

      <TightStack>
        <CaptionLabel>
          Baseline ABOVE the scenario — every delta negative
        </CaptionLabel>
        <WrapRow>
          <SmallCard
            title="Green · baseline above"
            note="Yellow = 10°. The scenario clears the comfortable gain, so the green lights — but it is still well short of the baseline, so the delta is negative. Tone follows the BAND, not the delta's sign."
            baseline={24000}
            value={12000}
            comfortable={COMFORTABLE}
            label="Scenario A"
          />
          <SmallCard
            title="Yellow · baseline above"
            note="Yellow = 10°. The scenario sits inside the comfortable band, so the yellow lights; the baseline is far above it."
            baseline={20000}
            value={1500}
            comfortable={COMFORTABLE}
            label="Scenario A"
          />
          <SmallCard
            title="Red · baseline above"
            note="Yellow = 10°. Below zero, so the loss half lights and both gain bands dim — including the yellow, which is still drawn."
            baseline={6000}
            value={-9000}
            comfortable={COMFORTABLE}
            label="Scenario A"
          />
        </WrapRow>
      </TightStack>

      <TightStack>
        <CaptionLabel>
          Baseline BELOW the scenario — every delta positive
        </CaptionLabel>
        <WrapRow>
          {/* This one also carries the long-name case: the scenario's name
              truncates in the callout column and offers itself whole on hover. */}
          <SmallCard
            title="Green · baseline below"
            note="Yellow = 10°. Past both the comfortable gain and the baseline. Also the long-name case — the name truncates in the callout column, full value on hover."
            baseline={4000}
            value={18000}
            comfortable={COMFORTABLE}
            label="Bookkeeping retainer · Northern"
          />
          {/* A percentage-of-baseline rule CANNOT produce this combination: if
              the scenario is inside a sliver worth 5% of the baseline, it is by
              definition far below that baseline. So this consumer uses a flat
              comfortable gain instead — which is exactly why the prop is an
              absolute rate rather than a percentage. */}
          <SmallCard
            title="Yellow · baseline below"
            note="Yellow = 10°. Inside the comfortable band with the baseline below it. Note a percentage-OF-BASELINE rule could not reach this card: a scenario inside a band worth 5% of its baseline is by definition far below that baseline. The threshold here is a flat rate, which is why the prop is absolute."
            baseline={600}
            value={2400}
            comfortable={COMFORTABLE}
            label="Scenario A"
          />
          <SmallCard
            title="Red · baseline below"
            note="Yellow = 10°. Losing, but by less than the baseline was — a positive delta inside the red band."
            baseline={-18000}
            value={-6000}
            comfortable={COMFORTABLE}
            label="Scenario A"
          />
        </WrapRow>
      </TightStack>

      <WrapRow>
        <CaptionSpecimen />
      </WrapRow>

    </SpacedStack>
  </div>
);

export default RateGaugeBench;
