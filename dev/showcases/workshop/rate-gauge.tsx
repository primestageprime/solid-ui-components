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
 * Three situations, matching the review the component has to survive:
 *   1. above baseline — the green mockup;
 *   2. below baseline — the red mockup;
 *   3. a slider-driven one, so the needle, the bracket and the zone dimming
 *      can be watched moving through zero and into both clamps.
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
 * The consumer's formatter. A real minus sign (U+2212), not a hyphen — it is a
 * mathematical operator at the same width as the plus it alternates with, so
 * the label column does not jitter as the value crosses the baseline.
 */
const perMonth = (delta: number): string =>
  `${delta < 0 ? "−" : "+"}$${Math.abs(delta).toLocaleString("en-US")}/mo`;

/** One card, exactly as a consumer would compose it around the gauge. */
const RateCard: Component<{
  title: string;
  note: string;
  baseline: number;
  value: number;
  label: string;
}> = (props) => (
  <CardSurface>
    <TightStack>
      <TextTitle>{props.title}</TextTitle>
      {/* The gauge fills the box it is given, so the CONSUMER decides how big
          the dial is — here a 400px ConstrainedBox, which is what keeps the
          label text at a readable size relative to the ring. */}
      <ConstrainedBox>
        <RateGauge
          domain={DOMAIN}
          baseline={props.baseline}
          value={props.value}
          label={props.label}
          format={perMonth}
        />
      </ConstrainedBox>
      <CaptionLabel>{props.note}</CaptionLabel>
    </TightStack>
  </CardSurface>
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
const ScrubbedCard: Component = () => {
  const [value, setValue] = createSignal(23000);
  const baseline = 5000;
  return (
    <CardSurface>
      <TightStack>
        <TextTitle>Rate, right now</TextTitle>
        <ConstrainedBox>
          <RateGauge
            domain={DOMAIN}
            baseline={baseline}
            value={value()}
            label="Foo"
            format={perMonth}
          />
        </ConstrainedBox>
        <Slider
          label="Foo's rate"
          value={value()}
          onChange={setValue}
          min={-40000}
          max={40000}
          step={250}
          format={(v) => perMonth(v)}
        />
        <CaptionLabel>
          Baseline is fixed at {perMonth(baseline)}. The slider runs past both
          ends of the gauge's domain, so the needle parks at a pole and the
          delta reports the value the gauge actually DREW.
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
          bracket outside the ring spans that same angle and carries the signed
          delta.
        </MutedBody>
      </TightStack>

      <WrapRow>
        <RateCard
          title="Rate, right now"
          note="Above baseline — the needle is in the positive zone, so the ring's upper half lights and the delta reads green."
          baseline={5000}
          value={23000}
          label="Foo"
        />
        {/* The brief's values, exactly as given: baseline +5,000, needle at
            −8,833, so the delta prints −$13,833/mo. Note that the brief's
            format examples (+$23,000/mo, −$8,833/mo) do NOT reconcile with the
            value/baseline pairs it gives for either card — card 1's delta is
            +18,000, not +23,000 — so they read as illustrations of the
            FORMATTER rather than as the mockups' deltas. If the mockups really
            print those figures, the value/baseline pairs are what needs
            correcting; the slider below reaches either reading. */}
        <RateCard
          title="Rate, right now"
          note="Below zero — the lower half lights, the bracket sweeps back past the baseline, and the delta carries a real minus sign."
          baseline={5000}
          value={-8833}
          label="Foo"
        />
      </WrapRow>

      <WrapRow>
        {/* A name long enough to truncate in the callout column, so the
            ellipsis and its tooltip can be judged in situ rather than only in
            the specimen below. */}
        <RateCard
          title="Rate, right now"
          note="A long scenario name truncates in the callout column and offers the whole of itself on hover."
          baseline={5000}
          value={16500}
          label="Bookkeeping retainer · Northern"
        />
        <CaptionSpecimen />
      </WrapRow>

      <ScrubbedCard />
    </SpacedStack>
  </div>
);

export default RateGaugeBench;
