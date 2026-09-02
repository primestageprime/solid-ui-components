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
