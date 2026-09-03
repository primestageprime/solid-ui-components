import { type Component, createSignal } from "solid-js";
import { Slider, SliderField, createSlider } from "../../src/components/Slider";
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

/** The discount a typed monthly charge asks for. */
const percentFromMonthly = (dollars: number): number =>
  (1 - dollars / LIST_PER_MONTH) * 100;

/** The domain the track offers. The slider and the commit handler share it. */
const MIN_PERCENT = 0;
const MAX_PERCENT = 20;
const PERCENT_STEP = 1;

/** The nearest step the thumb can land on, counted FROM the minimum. */
const snapPercent = (percent: number): number =>
  MIN_PERCENT +
  Math.round((percent - MIN_PERCENT) / PERCENT_STEP) * PERCENT_STEP;

/** Inside the domain. The field clamps nothing, so the caller clamps. */
const clampPercent = (percent: number): number =>
  Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, percent));

/**
 * A figure with a thousands separator and two decimals, and NO currency sign.
 *
 * The field draws `prefix="$"` beside this text, so a "$" in here would draw
 * "$$1,627.08". `value` carries the number part only.
 */
const amount = (dollars: number): string =>
  dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * A typed figure, or null when the text carries no number.
 *
 * The caller owns the parse, so the caller strips the thousands separator: a
 * person types over "1,591.32" and leaves the comma where it was. An EMPTY
 * field reads as null, never as 0 — `Number("")` is 0, so a blind parse would
 * commit a real zero the moment a person cleared the field.
 */
const parseAmount = (text: string): number | null => {
  const typed = Number.parseFloat(text.replace(/[$,%\s]/g, ""));
  return Number.isFinite(typed) ? typed : null;
};

/**
 * Read one typed figure back to a discount, and move the slider to it.
 *
 * `SliderField` owns none of these four steps, so the handler does all four.
 * Drop any one and a person commits a value the thumb could never reach.
 */
const commitAs =
  (toPercent: (dollars: number) => number, set: (percent: number) => void) =>
  (text: string): void => {
    // 1. PARSE the text the person typed.
    const typed = parseAmount(text);
    // 2. REJECT the empty field. "" and any text without a number commit
    //    NOTHING, so an emptied field leaves the discount where it stands.
    if (typed === null) return;
    // 3. SNAP to the step, then 4. CLAMP to the domain. Snap first, because a
    //    snap after a clamp can push the result back outside the ends.
    set(clampPercent(snapPercent(toPercent(typed))));
  };

const AnnualDiscount: Component = () => {
  const [percent, setPercent] = createSignal(9);
  return (
    <Slider
      label="Annual discount"
      value={percent()}
      onChange={setPercent}
      min={MIN_PERCENT}
      max={MAX_PERCENT}
      step={PERCENT_STEP}
      format={(n) => `${n}% a year`}
      valueLabel={
        <span class="slider-discount-readout">
          {/* Only the number is typeable. The "%" stands beside it as static
              text, and the two read as one string. */}
          <SliderField
            label="Discount percent"
            suffix="%"
            value={String(percent())}
            onCommit={commitAs((n) => n, setPercent)}
          />
          <span class="slider-discount-sep">|</span>
          {/* A prefix as well: the "$" is not part of the number either. */}
          <SliderField
            label="Price per month"
            prefix="$"
            suffix="/mo"
            value={amount(monthlyAt(percent()))}
            onCommit={commitAs(percentFromMonthly, setPercent)}
          />
          <span class="slider-discount-sep">|</span>
          {/* Read-only: each figure is the caller's own decision, and this one
              is a total to read rather than a figure to type. */}
          <span class="slider-discount-static">
            ${amount(yearlyAt(percent()))}/yr
          </span>
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
          and the caption, the label line and the track stay SUI's. Two figures
          are <code>SliderField</code>s, so a coach who knows they want{" "}
          <code>$132.61/mo</code> types it instead of hunting for the percent
          that produces it. The third is plain text, because each figure is the
          caller's own decision to make typeable or not. A composite{" "}
          <code>format</code> string cannot do this, because only one figure
          would stay typeable.
        </span>
        <span class="text-meta">
          Only the NUMBER is an input. The <code>$</code> and the{" "}
          <code>/mo</code> are static text either side of it, and the three
          parts read as one unbroken string: one font, one baseline, and the
          border and the padding on the group rather than on the input. A press
          on the <code>$</code> lands on the number, because the group is the
          input's own label. Keep the <code>$</code> out of <code>value</code>{" "}
          as well, or the field draws <code>$$1,627.08</code>.
        </span>
        <span class="text-meta">
          The caller owns PARSE, CLAMP, SNAP and the EMPTY CASE — read{" "}
          <code>commitAs</code> in this file, which does all four in order. The
          field clamps nothing and snaps nothing, so a typed <code>137</code> on
          a <code>$50–$250 step $5</code> slider would otherwise stand as a
          value the thumb could never reach. Clear a field here and press Enter:
          it commits NOTHING, because <code>Number("")</code> is <code>0</code>{" "}
          and a blind parse writes a real zero.
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
