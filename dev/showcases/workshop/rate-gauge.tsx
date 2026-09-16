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
import { RateGauge } from "../../../src/components/RateGauge";
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
 * What the consumer here calls a comfortable gain: 5% of the baseline. On a
 * baseline of +$5,000/mo that is +$250/mo — three quarters of a degree on this
 * dial, so the yellow is a sliver just above the zero line rather than a slab.
 */
const COMFORTABLE_PERCENT = 5;

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
          max={25}
          step={0.5}
          format={(v) =>
            v === 0
              ? "none"
              : `${v}% — ${perMonth(comfortableGain(baseline, v))}`
          }
        />
        <CaptionLabel>
          Baseline is fixed at {perMonth(baseline)}. The slider runs past both
          ends of the gauge's domain, so the needle parks at a pole and the
          delta reports the value the gauge actually DREW. Close in on the
          baseline and the brace runs out of room: the curls go first, then the
          arms, and at the narrowest the delta's leader is a plain line. Drag
          the comfortable gain to zero and the yellow band disappears
          altogether.
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
          "not yet comfortable" — say the word and it flips. This consumer's
          rule is 5% of the baseline, so the yellow is usually a sliver rather
          than a slab; the gauge never sees the percentage, only the absolute
          rate it works out to.
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
            note="Comfortable is 5% of the baseline (+$1,200/mo). The scenario clears it, so the green lights — but it is still well short of the baseline, so the delta is negative. Tone follows the BAND, not the delta's sign."
            baseline={24000}
            value={12000}
            comfortable={comfortableGain(24000, COMFORTABLE_PERCENT)}
            label="Scenario A"
          />
          <SmallCard
            title="Yellow · baseline above"
            note="Comfortable is +$400/mo and the scenario sits at +$200/mo — inside the sliver, so the yellow lights. The baseline is far above it."
            baseline={8000}
            value={200}
            comfortable={comfortableGain(8000, COMFORTABLE_PERCENT)}
            label="Scenario A"
          />
          <SmallCard
            title="Red · baseline above"
            note="Below zero, so the loss half lights and both gain bands dim — including the sliver, which is still drawn."
            baseline={6000}
            value={-9000}
            comfortable={comfortableGain(6000, COMFORTABLE_PERCENT)}
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
            note="Past a +$200/mo comfortable gain and past the baseline. Also the long-name case — the name truncates in the callout column, full value on hover."
            baseline={4000}
            value={18000}
            comfortable={comfortableGain(4000, COMFORTABLE_PERCENT)}
            label="Bookkeeping retainer · Northern"
          />
          {/* A percentage-of-baseline rule CANNOT produce this combination: if
              the scenario is inside a sliver worth 5% of the baseline, it is by
              definition far below that baseline. So this consumer uses a flat
              comfortable gain instead — which is exactly why the prop is an
              absolute rate rather than a percentage. */}
          <SmallCard
            title="Yellow · baseline below"
            note="A FLAT comfortable gain of +$400/mo, not a percentage — a 5%-of-baseline rule cannot put the baseline below a scenario that is inside its own sliver."
            baseline={20}
            value={200}
            comfortable={400}
            label="Scenario A"
          />
          <SmallCard
            title="Red · baseline below"
            note="Losing, but by less than the baseline was — a positive delta in the red band. Flat comfortable gain again, since 5% of a negative baseline is not a threshold."
            baseline={-18000}
            value={-6000}
            comfortable={1500}
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
