import { type Component, createSignal, onCleanup } from "solid-js";
import {
  TrendSparkline,
  trendOf,
} from "../../src/components/TrendSparkline/TrendSparkline";
import {
  ClusterRow,
  TightStack,
  WrappedClusterRow,
} from "../../src/components/Layout";
import { TextSublabel } from "../../src/components/Text";

export const TrendSparklineShowcase: Component = () => {
  // Live-appending signal demo
  const CAPACITY = 60;
  const [liveValues, setLiveValues] = createSignal<number[]>([50]);

  let t = 0;
  const timer = setInterval(() => {
    t += 0.25;
    const next = 50 + Math.sin(t) * 20 + (Math.random() - 0.5) * 8;
    setLiveValues((prev) => {
      const arr = [...prev, next];
      return arr.length > CAPACITY ? arr.slice(arr.length - CAPACITY) : arr;
    });
  }, 250);
  onCleanup(() => clearInterval(timer));

  const liveTrend = () =>
    trendOf(liveValues()[0] ?? 50, liveValues()[liveValues().length - 1] ?? 50);

  // Static fixtures
  const upValues = [10, 18, 15, 25, 22, 30, 28, 38, 35, 45];
  const downValues = [45, 38, 42, 32, 36, 25, 28, 18, 20, 10];
  const flatValues = [30, 32, 28, 31, 29, 30, 31, 29, 30, 30];

  // yDomain example: three series sharing a common scale
  const seriesA = [10, 40, 30, 50, 20];
  const seriesB = [5, 15, 25, 20, 30];
  const seriesC = [45, 35, 50, 30, 40];
  const allValues = [...seriesA, ...seriesB, ...seriesC];
  const sharedDomain: [number, number] = [
    Math.min(...allValues),
    Math.max(...allValues),
  ];

  return (
    <div class="component-section">
      <h2>TrendSparkline — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Tiny value sparkline (no axes). Series scaled into a fixed rect, stroked
        by trajectory: <strong>up</strong> (green), <strong>down</strong> (red),{" "}
        <strong>flat</strong> (grey). Exports <code>trendOf(initial, final)</code>{" "}
        as the pure color rule. Use for: projected balances, rolling totals, any
        "how is this heading?" micro-visual.
      </p>

      <h3>Trend directions</h3>
      <div class="example-group">
        <WrappedClusterRow>
          <TightStack>
            <TextSublabel>UP</TextSublabel>
            <TrendSparkline
              values={upValues}
              trend={trendOf(upValues[0], upValues[upValues.length - 1])}
              width={120}
              height={32}
            />
          </TightStack>
          <TightStack>
            <TextSublabel>DOWN</TextSublabel>
            <TrendSparkline
              values={downValues}
              trend={trendOf(downValues[0], downValues[downValues.length - 1])}
              width={120}
              height={32}
            />
          </TightStack>
          <TightStack>
            <TextSublabel>FLAT</TextSublabel>
            <TrendSparkline
              values={flatValues}
              trend={trendOf(flatValues[0], flatValues[flatValues.length - 1])}
              width={120}
              height={32}
            />
          </TightStack>
        </WrappedClusterRow>
      </div>

      <h3>
        Shared <code>yDomain</code> (apples-to-apples scale)
      </h3>
      <p class="text-meta">
        Without <code>yDomain</code> each sparkline auto-scales independently.
        Pass the same <code>[min, max]</code> to all three for a common baseline.
      </p>
      <div class="example-group">
        <ClusterRow>
          <TrendSparkline
            values={seriesA}
            trend={trendOf(seriesA[0], seriesA[seriesA.length - 1])}
            width={100}
            height={28}
            yDomain={sharedDomain}
          />
          <TrendSparkline
            values={seriesB}
            trend={trendOf(seriesB[0], seriesB[seriesB.length - 1])}
            width={100}
            height={28}
            yDomain={sharedDomain}
          />
          <TrendSparkline
            values={seriesC}
            trend={trendOf(seriesC[0], seriesC[seriesC.length - 1])}
            width={100}
            height={28}
            yDomain={sharedDomain}
          />
        </ClusterRow>
      </div>

      <h3>Live-appending signal</h3>
      <p class="text-meta">
        A new sample arrives every 250 ms (capacity 60). The trend color
        re-derives from <code>trendOf(first, last)</code> each tick.
      </p>
      <div class="example-group">
        <TrendSparkline
          values={liveValues()}
          trend={liveTrend()}
          width={240}
          height={40}
          capacity={CAPACITY}
        />
      </div>
    </div>
  );
};
