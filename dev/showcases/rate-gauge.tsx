// RateGauge — the right-facing half-ring dial that answers one question: is
// this value above or below its reference, and by how much?
//
// The showcase plays the CONSUMER, which is where every domain decision
// belongs: it owns the cards and their titles, the ±$30k-a-month domain, the
// names, and — since the generic audit — the WORDS. `RateGauge` supplies no
// units and no nouns; `formatAgainst` returns the whole second line of a
// callout and `formatDelta` the whole brace line, so "over breakeven" and "off
// payroll" below are this page's sentences, not the library's.
//
// So the page leads with a curried variant, twice over:
//
//   • `MonthlyRateDial` — `createRateGauge` called ONCE here with this
//     consumer's wording. That is the real drop-in form: every card below
//     passes data only (domain, reference, value, name, threshold).
//   • `RateDial` — the variant SUI ships, which reads bare numbers against
//     zero. It is what a caller gets before they have decided on units, and
//     the last card is it, so the generic default is visible rather than
//     described.
//
// The scrubber comes first, because the thing worth looking at is the gauge
// MOVING: the needle, the brace and the band dimming through zero, into both
// clamps, and down to a delta too narrow for a brace at all. The 3×2 grid
// under it pins the cross-product — reference above and below the value ×
// positive, caution and negative — which is every reading the dial has.
import { createSignal, type Component } from "solid-js";
import {
  createRateGauge,
  RateDial,
  type RateGaugeDomain,
} from "../../src/components/RateGauge";
import { Slider } from "../../src/components/Slider";
import { CardSurface, CompactSurface } from "../../src/components/Surface";
import {
  CaptionLabel,
  MutedBody,
  SectionTitle,
  SubsectionTitle,
  TextTitle,
} from "../../src/components/Text";
import {
  ConstrainedBox,
  SpacedStack,
  TightStack,
  WrapRow,
} from "../../src/components/Layout";

/** The domain every card here is drawn against: ±$30k a month. */
const DOMAIN: RateGaugeDomain = [-30000, 30000];

/**
 * The caution threshold that puts exactly TEN DEGREES of ring in the warning
 * band.
 *
 * Visibility is a property of the ANGLE, not of the rate: $3,333/mo is a wide
 * band on a ±$10k dial and a hairline on a ±$100k one. So the fixture is
 * specified in degrees and converted here — the gauge only ever sees the
 * absolute rate. The positive half maps [0, domainMax] onto 90°, so ten
 * degrees is that fraction of the top of the domain.
 */
const cautionForDegrees = (domain: RateGaugeDomain, degrees: number): number =>
  (domain[1] * degrees) / 90;

const CAUTION = cautionForDegrees(DOMAIN, 10);

/**
 * An amount, never signed — `$3,000/mo`. The sentences below carry the
 * direction, so a sign here would say it twice.
 *
 * A real minus sign (U+2212) where one IS wanted, not a hyphen: it is a
 * mathematical operator at the same width as the plus it alternates with, so
 * the label column does not jitter as a value crosses its reference.
 */
const perMonth = (amount: number): string =>
  `$${Math.round(Math.abs(amount)).toLocaleString("en-US")}/mo`;

/** The whole second line of a callout — this consumer's noun, not the library's. */
const againstBreakeven = (rate: number): string =>
  rate === 0
    ? "at breakeven"
    : `${perMonth(rate)} ${rate > 0 ? "over" : "below"} breakeven`;

/**
 * The whole brace line: the delta as a PAYROLL change, which is the sign
 * flipped — a rate that falls is payroll that rises, because the money has to
 * come from somewhere. That reading is the consumer's, which is exactly why
 * the component hands over a raw signed delta and takes back a sentence.
 */
const asPayroll = (delta: number): string =>
  `${perMonth(delta)} ${delta < 0 ? "to" : "off"} payroll`;

/**
 * The drop-in. Curried ONCE, here, with this product's wording — which is the
 * intended shape for a real consumer too: units are the one thing a component
 * library cannot guess, so they curry at the consumer's own design-system
 * layer and never appear at a call site.
 */
const MonthlyRateDial = createRateGauge({
  baselineLabel: "Breakeven",
  formatAgainst: againstBreakeven,
  formatDelta: asPayroll,
});

/**
 * One card, exactly as a consumer would compose it around the gauge.
 *
 * The gauge fills whatever box it is given, so the CONSUMER decides the size —
 * here by constraining the card, not the gauge.
 */
const RateCard: Component<{
  title: string;
  baseline: number;
  value: number;
  label: string;
  caution?: number;
}> = (props) => (
  <ConstrainedBox>
    <CardSurface>
      <TightStack>
        <TextTitle>{props.title}</TextTitle>
        <MonthlyRateDial
          domain={DOMAIN}
          baseline={props.baseline}
          value={props.value}
          label={props.label}
          caution={props.caution}
        />
      </TightStack>
    </CardSurface>
  </ConstrainedBox>
);

/** The scrubbable one. The sliders are the consumer's controls, not the gauge's. */
const ScrubbedCard: Component = () => {
  const [value, setValue] = createSignal(23000);
  const [caution, setCaution] = createSignal(CAUTION);
  return (
    <CardSurface>
      <TightStack>
        <TextTitle>Rate, right now</TextTitle>
        <ConstrainedBox>
          <MonthlyRateDial
            domain={DOMAIN}
            baseline={5000}
            value={value()}
            caution={caution()}
            label="Scenario A"
          />
        </ConstrainedBox>
        <Slider
          label="Scenario A's rate"
          value={value()}
          onChange={setValue}
          min={-40000}
          max={40000}
          step={250}
          format={(v) => `${v < 0 ? "−" : "+"}${perMonth(v)}`}
        />
        <Slider
          label="Caution threshold"
          value={caution()}
          onChange={setCaution}
          min={0}
          max={30000}
          step={250}
          format={(v) => (v === 0 ? "none" : perMonth(v))}
        />
      </TightStack>
    </CardSurface>
  );
};

/**
 * The name is the ONE string a consumer can make arbitrarily long, so it is
 * the one the dial has to survive: it ellipsizes in the callout column and
 * hands the whole of itself back on hover.
 */
const TruncationSpecimen: Component = () => (
  <RateCard
    title="A name longer than the column"
    baseline={4000}
    value={18000}
    caution={CAUTION}
    label="Bookkeeping retainer · Northern region · Q3 renewal"
  />
);

/**
 * The library's own variant, with no wording curried into it at all.
 *
 * Worth a card of its own because it is what a caller sees FIRST: plain
 * grouped numbers, "at zero" for zero, and "Reference" for the dashed needle.
 * Nothing about money, and nothing about this page's domain.
 */
const GenericSpecimen: Component = () => (
  <ConstrainedBox>
    <CompactSurface>
      <TightStack>
        <CaptionLabel>RateDial — no units curried</CaptionLabel>
        <RateDial domain={[-100, 100]} baseline={20} value={65} label="Signal" />
      </TightStack>
    </CompactSurface>
  </ConstrainedBox>
);

export const RateGaugeShowcase: Component = () => (
  <div class="component-section component-section--full">
    <SpacedStack>
      <TightStack>
        <SectionTitle>RateGauge</SectionTitle>
        <MutedBody>
          A half ring split at ZERO — always the horizontal — with a dashed
          needle at the reference, a solid needle in the band's own tone at the
          value, and a brace spanning the difference. Every word is the
          consumer's: these cards curry `createRateGauge` once with their own
          formatters, and the last card is SUI's `RateDial` with none.
        </MutedBody>
      </TightStack>

      <ScrubbedCard />

      <TightStack>
        <SubsectionTitle>Reference above the value</SubsectionTitle>
        <CaptionLabel>Caution band = 10° of ring</CaptionLabel>
        <WrapRow>
          <RateCard
            title="Positive"
            baseline={24000}
            value={12000}
            caution={CAUTION}
            label="Scenario A"
          />
          <RateCard
            title="Caution"
            baseline={20000}
            value={1500}
            caution={CAUTION}
            label="Scenario A"
          />
          <RateCard
            title="Negative"
            baseline={6000}
            value={-9000}
            caution={CAUTION}
            label="Scenario A"
          />
        </WrapRow>
      </TightStack>

      <TightStack>
        <SubsectionTitle>Reference below the value</SubsectionTitle>
        <CaptionLabel>Caution band = 10° of ring</CaptionLabel>
        <WrapRow>
          <RateCard
            title="Positive"
            baseline={4000}
            value={18000}
            caution={CAUTION}
            label="Scenario A"
          />
          {/* A percentage-of-reference rule CANNOT produce this combination: a
              value inside a sliver worth 5% of its reference is by definition
              far below that reference. So this card uses a flat absolute
              threshold — which is exactly why `caution` is an absolute value
              in the consumer's units rather than a fraction of the domain. */}
          <RateCard
            title="Caution"
            baseline={600}
            value={2400}
            caution={CAUTION}
            label="Scenario A"
          />
          <RateCard
            title="Negative"
            baseline={-18000}
            value={-6000}
            caution={CAUTION}
            label="Scenario A"
          />
        </WrapRow>
      </TightStack>

      <TightStack>
        <SubsectionTitle>The edges</SubsectionTitle>
        <WrapRow>
          <TruncationSpecimen />
          <GenericSpecimen />
        </WrapRow>
      </TightStack>
    </SpacedStack>
  </div>
);
