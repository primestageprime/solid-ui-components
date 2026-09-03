import { type Component, createSignal } from "solid-js";
import { Slider, createSlider } from "../../src/components/Slider";
import { ThemedNumberInput } from "../../src/components/ThemedNumberInput";
import { Row } from "../../src/components/Layout/Row";
import { Stack } from "../../src/components/Layout/Stack";

/** Integer cents in, dollars out — the value never becomes a dollar. */
const perMonth = (cents: number): string =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo`;

/** A curried formatter: the unit is a static decision, so it is curried away. */
const MonthsSlider = createSlider({
  format: (n) => `${n} months`,
  ticks: [3, 6, 12, 18],
});

/**
 * The consumer's real shape: a slider and the typed field for the same value,
 * both editing one signal. Dragging the thumb moves the number and typing
 * moves the thumb — this is the proof the control is genuinely controlled.
 */
const PairedField: Component = () => {
  const [cents, setCents] = createSignal(600_000);
  return (
    <Stack gap="sm">
      <Slider
        label="Monthly draw"
        value={cents()}
        onChange={setCents}
        min={0}
        max={1_155_000}
        step={10_000}
        format={perMonth}
      />
      <ThemedNumberInput
        name="draw-dollars"
        size="sm"
        value={() => cents() / 100}
        onChange={(v) => setCents(Math.round((v ?? 0) * 100))}
        min={0}
        max={11_550}
        step={100}
      />
      <span class="text-meta">Signal holds {cents()} cents.</span>
    </Stack>
  );
};

const MountCounter: Component = () => {
  const [value, setValue] = createSignal(40);
  const [calls, setCalls] = createSignal(0);
  return (
    <Stack gap="sm">
      <Slider
        label="Emits only on a real move"
        value={value()}
        onChange={(v) => {
          setValue(v);
          setCalls((n) => n + 1);
        }}
        min={0}
        max={100}
        step={5}
      />
      <span class="text-meta">
        onChange called {calls()} times. It is 0 until you drag the thumb or
        press a key that moves it — never at mount.
      </span>
    </Stack>
  );
};

/* ── valueLabel: one discount, three readings ────────────────────────────
   The suite card that asked for this. A coach reads the percent against the
   track, the monthly figure against the monthly plan, and the yearly figure
   against the invoice. Each one is a field, because a coach who knows they
   want $1,627.08 types it rather than hunting for the percent. */

/** The monthly plan the annual price discounts, in whole dollars. */
const LIST_PER_MONTH = 149;
const MONTHS_PER_YEAR = 12;
const LIST_PER_YEAR = LIST_PER_MONTH * MONTHS_PER_YEAR;

/** The yearly charge at a given discount. */
const yearlyAt = (percent: number): number =>
  (LIST_PER_YEAR * (100 - percent)) / 100;

/** The same charge read per month. */
const monthlyAt = (percent: number): number =>
  yearlyAt(percent) / MONTHS_PER_YEAR;

/** The discount a typed yearly charge asks for. */
const percentFromYearly = (dollars: number): number =>
  (1 - dollars / LIST_PER_YEAR) * 100;

/** The discount a typed monthly charge asks for. */
const percentFromMonthly = (dollars: number): number =>
  (1 - dollars / LIST_PER_MONTH) * 100;

/** Whole percents, inside the domain the slider offers. */
const snapPercent = (percent: number): number =>
  Math.min(20, Math.max(0, Math.round(percent)));

const money = (dollars: number): string =>
  `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** A typed figure, or null when the text carries no number. */
const parseAmount = (text: string): number | null => {
  const typed = Number.parseFloat(text.replace(/[$,%\s]/g, ""));
  return Number.isFinite(typed) ? typed : null;
};

/**
 * One figure of the readout. The caller owns the parse, so each field reads
 * its own text back to a discount.
 */
const DiscountField: Component<{
  label: string;
  text: string;
  width: number;
  onCommit: (typed: number) => void;
}> = (props) => {
  const [draft, setDraft] = createSignal<string | null>(null);
  const commit = (raw: string): void => {
    const typed = parseAmount(raw);
    if (typed !== null) props.onCommit(typed);
    setDraft(null);
  };
  return (
    <input
      class="slider-discount-field"
      type="text"
      inputmode="decimal"
      aria-label={props.label}
      size={props.width}
      value={draft() ?? props.text}
      onFocus={(event) => event.currentTarget.select()}
      onInput={(event) => setDraft(event.currentTarget.value)}
      onBlur={(event) => commit(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          setDraft(null);
          event.currentTarget.blur();
        }
        // The slider's root moves the thumb on arrow keys. Inside a field
        // those keys belong to the caret.
        event.stopPropagation();
      }}
    />
  );
};

const AnnualDiscount: Component = () => {
  const [percent, setPercent] = createSignal(9);
  return (
    <Slider
      label="Annual discount"
      value={percent()}
      onChange={setPercent}
      min={0}
      max={20}
      format={(n) => `${n}% a year`}
      valueLabel={
        <span class="slider-discount-readout">
          <DiscountField
            label="Discount percent"
            width={3}
            text={`${percent()}%`}
            onCommit={(typed) => setPercent(snapPercent(typed))}
          />
          <span class="slider-discount-sep">|</span>
          <DiscountField
            label="Price per month"
            width={9}
            text={`${money(monthlyAt(percent()))}/mo`}
            onCommit={(typed) =>
              setPercent(snapPercent(percentFromMonthly(typed)))
            }
          />
          <span class="slider-discount-sep">|</span>
          <DiscountField
            label="Price per year"
            width={11}
            text={`${money(yearlyAt(percent()))}/yr`}
            onCommit={(typed) =>
              setPercent(snapPercent(percentFromYearly(typed)))
            }
          />
        </span>
      }
    />
  );
};

export const SliderShowcase: Component = () => {
  const [months, setMonths] = createSignal(6);
  const [plain, setPlain] = createSignal(40);
  const [sampled, setSampled] = createSignal(6);
  const [raise, setRaise] = createSignal(3.5);
  const [typed, setTyped] = createSignal(60);

  return (
    <div class="component-section">
      <h2>Slider — Atomic (Depth 1)</h2>
      <p class="text-meta">
        A labelled range control that prints its own live value: the caption on
        the left of the label line, <code>format(value)</code> right-aligned on
        the right. The value stays in the caller's own units — a dial that keeps
        integer cents passes cents and formats dollars. For a value axis that
        also carries named thresholds, use <code> BandRail </code> instead.
      </p>

      <div class="example-group">
        <h3>Base</h3>
        <div class="slider-rail-demo">
          <Stack gap="lg">
            <Slider
              label="Safety buffer"
              value={months()}
              onChange={setMonths}
              min={3}
              max={18}
              format={(n) => `${n} months`}
            />
            {/* No format: the default is String, so the raw number shows. */}
            <Slider
              label="Unformatted"
              value={plain()}
              onChange={setPlain}
              min={0}
              max={100}
              step={5}
            />
            <Slider
              label="Disabled"
              value={12}
              onChange={() => {}}
              min={3}
              max={18}
              format={(n) => `${n} months`}
              disabled
            />
          </Stack>
        </div>
        <span class="text-meta">
          Every example renders inside a 290px column — the width of the draw
          dial's input rail. The track insets by half a thumb on each side so a
          thumb at either end stays inside that column; the label line stays
          flush with it.
        </span>
      </div>

      <div class="example-group">
        <h3>ticks — notches on the track</h3>
        <div class="slider-rail-demo">
          <Stack gap="lg">
            <Slider
              label="Months to sample"
              value={sampled()}
              onChange={setSampled}
              min={3}
              max={24}
              ticks={[3, 6, 12, 18, 24]}
              format={(n) => `${n} mo`}
            />
            <Slider
              label="Annual raise — every step"
              value={raise()}
              onChange={setRaise}
              min={0}
              max={15}
              step={0.5}
              ticks
              format={(n) => `${n}%`}
            />
            <Slider
              label="Disabled with ticks"
              value={12}
              onChange={() => {}}
              min={3}
              max={24}
              ticks={[3, 6, 12, 18, 24]}
              format={(n) => `${n} mo`}
              disabled
            />
          </Stack>
        </div>
        <span class="text-meta">
          <code>ticks</code> takes a list of values, or <code>true</code> for
          every <code>step</code> from <code>min</code> to <code>max</code>. A
          notch the fill has passed flips to the page colour, so it reads as a
          cut in the fill. A value outside the domain is dropped rather than
          pulled to the edge, and a notch at either end sits half its own width
          inside the track so the rounded cap does not clip it. The notches are
          decoration: they take no pointer events and no screen reader reads
          them.
        </span>
      </div>

      <div class="example-group">
        <h3>editable — type the value instead of dragging to it</h3>
        <div class="slider-rail-demo">
          <Stack gap="lg">
            <Slider
              label="Target"
              value={typed()}
              onChange={setTyped}
              min={0}
              max={100}
              step={5}
              editable
              format={(n) => `${n}%`}
            />
          </Stack>
        </div>
        <span class="text-meta">
          The readout becomes a field. It shows <code>format(value)</code> at
          rest and the raw number while focused, because <code>format</code>{" "}
          runs one way. Enter or blur commits: the text is clamped to{" "}
          <code>[min, max]</code> and snapped to <code>step</code>, so a typed
          63 with a step of 5 lands on 65 — the same grid the thumb moves on.
          Escape, and anything that is not a number, revert. The field is a text
          input, never <code>type="number"</code>, so the browser draws no
          spinner arrows beside a control that already has a thumb.
        </span>
      </div>

      <div class="example-group">
        <h3>valueLabel — the caller draws the readout</h3>
        <div class="slider-discount-demo">
          <AnnualDiscount />
        </div>
        <span class="text-meta">
          One discount, three honest readings. <code>valueLabel</code> replaces
          the value node — the value label, or the <code>editable</code> field —
          and the caption, the label line and the track stay SUI's. Every figure
          here is a real input, so a coach who knows they want{" "}
          <code>$1,627.08</code> types it instead of hunting for the percent
          that produces it. The caller owns each parse: the yearly and the
          monthly fields read their text back to a percent and snap it to the
          domain the slider offers. A composite <code>format</code> string
          cannot do this, because only one figure would stay typeable.
        </span>
        <span class="text-meta">
          <code>editable</code> beside <code>valueLabel</code> is a compile
          error: SUI cannot draw a field in a place it gave away. The label line
          stays one flex row, so the node wraps its own figures.{" "}
          <code>format</code> still governs the thumb, which announces{" "}
          <code>9% a year</code> whatever the node shows.
        </span>
      </div>

      <div class="example-group">
        <h3>createSlider — curry the formatter and the ticks</h3>
        <div class="slider-rail-demo">
          <MonthsSlider
            label="Runway"
            value={months()}
            onChange={setMonths}
            min={3}
            max={18}
          />
        </div>
        <span class="text-meta">
          <code>createSlider(&#123; format, ticks &#125;)</code> leaves the call
          site data and callbacks only. A tick set is a property of the scale,
          so it curries away with the unit. Both this and the base slider above
          drive one signal, so moving either moves the other.
        </span>
      </div>

      <div class="example-group">
        <h3>Paired with a typed field</h3>
        <Row gap="lg" wrap>
          <div class="slider-rail-demo">
            <PairedField />
          </div>
        </Row>
      </div>

      <div class="example-group">
        <h3>It does not emit at mount</h3>
        <div class="slider-rail-demo">
          <MountCounter />
        </div>
        <span class="text-meta">
          <code>ThemedNumberInput</code> fires one{" "}
          <code>onChange(undefined)</code> at mount. A form that persists on
          every change writes that mount value over the stored one, so this
          control emits only on a drag or a thumb-moving key.
        </span>
      </div>

      <div class="example-group">
        <h3>Keyboard</h3>
        <span class="text-meta">
          Arrow keys move by <code>step</code>, PageUp and PageDown by a larger
          page, and Home and End go to the domain ends. Home and End act on the
          focused thumb, so tab to it first. The thumb takes a visible focus
          ring, and <code>aria-valuetext</code> reads the formatted value, not
          the bare number.
        </span>
      </div>
    </div>
  );
};
