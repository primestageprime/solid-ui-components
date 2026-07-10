import { type Component, createSignal, onCleanup, onMount, For } from "solid-js";
import { ServiceHealthDot } from "../../src/components/ServiceHealthDot";

// ── Ticking harness (showcase only — NOT in the component) ───────────────────
// Each service has a lastBeat timestamp. Every 1 Hz tick we compute ageMs from
// Date.now() − lastBeat and push a new sample into a fixed-length history buffer.

const THRESHOLD_MS = 15_000;
const CAPACITY = 30;

interface ServiceState {
  name: string;
  ageMs: number | null | undefined;
  samples: number[];
}

function initialServices(): ServiceState[] {
  return [
    { name: "broker",    ageMs: 800,   samples: [] },
    { name: "worker",    ageMs: 7_500, samples: [] },
    { name: "scheduler", ageMs: 13_200, samples: [] },
    { name: "dead-svc",  ageMs: null,  samples: [] },
  ];
}

export const ServiceHealthDotShowcase: Component = () => {
  // lastBeat tracks when each service last beat (null = never).
  const [services, setServices] = createSignal<ServiceState[]>(initialServices());

  // Each service "beats" on its own period; we simulate by recording a lastBeat
  // time and letting the 1 Hz timer advance ageMs relative to now.
  const lastBeats: (number | null)[] = [Date.now(), Date.now() - 7_500, Date.now() - 13_200, null];

  onMount(() => {
    // Simulated heartbeat periods (ms). 0 = never beats (dead).
    const periods = [1_000, 8_000, 14_000, 0];

    // Simulate broker getting a fresh beat every period.
    const beatTimers = periods.map((period, i) => {
      if (!period) return undefined;
      return window.setInterval(() => {
        lastBeats[i] = Date.now();
      }, period);
    });

    // 1 Hz tick: recompute ageMs + push sample for all services.
    const tick = window.setInterval(() => {
      setServices(prev =>
        prev.map((svc, i) => {
          const lb = lastBeats[i];
          const ageMs = lb == null ? null : Date.now() - lb;
          const fraction = ageMs == null ? 1 : Math.min(1, ageMs / THRESHOLD_MS);
          const prevSamples = svc.samples;
          const next = [...prevSamples, fraction];
          return {
            ...svc,
            ageMs,
            samples: next.length > CAPACITY ? next.slice(next.length - CAPACITY) : next,
          };
        })
      );
    }, 1_000);

    onCleanup(() => {
      beatTimers.forEach(t => t != null && window.clearInterval(t));
      window.clearInterval(tick);
    });
  });

  return (
    <div class="component-section">
      <h2>ServiceHealthDot — Depth 2</h2>
      <p class="text-meta">
        6px dot + name label. Alive: success color, opacity decays 1→0.15 as age
        approaches the staleness threshold. Dead: danger color, full opacity, 1s
        pulse. Hover reveals a sparkline popover. No internal clock — ageMs and
        samples come from the caller.
      </p>

      <div class="example-group">
        <h3>Live ticking harness (four services)</h3>
        <p class="text-meta">
          broker beats every 1s (fresh), worker every 8s (drifting),
          scheduler every 14s (nearly stale), dead-svc never beats.
          Hover each dot to see the sparkline popover.
        </p>
        <div style={{ display: "flex", gap: "24px", "align-items": "center", "flex-wrap": "wrap", padding: "16px 0" }}>
          <For each={services()}>
            {svc => (
              <ServiceHealthDot
                name={svc.name}
                ageMs={svc.ageMs}
                staleThresholdMs={THRESHOLD_MS}
                samples={svc.samples}
              />
            )}
          </For>
        </div>
      </div>

      <div class="example-group">
        <h3>Static fixtures — opacity math</h3>
        <p class="text-meta">
          Pure snapshots demonstrating the opacity ramp at various ages
          (threshold = 15 000 ms). No ticking.
        </p>
        <div style={{ display: "flex", gap: "24px", "align-items": "center", "flex-wrap": "wrap", padding: "16px 0" }}>
          <For each={[
            { name: "0 ms (fresh)",      ageMs: 0,      samples: [0.0, 0.0, 0.0] },
            { name: "3 750 ms (25%)",    ageMs: 3_750,  samples: [0.1, 0.15, 0.25] },
            { name: "7 500 ms (50%)",    ageMs: 7_500,  samples: [0.2, 0.35, 0.5] },
            { name: "13 500 ms (90%)",   ageMs: 13_500, samples: [0.5, 0.75, 0.9] },
            { name: "dead (null)",        ageMs: null,   samples: [] },
          ]}>
            {fixture => (
              <ServiceHealthDot
                name={fixture.name}
                ageMs={fixture.ageMs}
                staleThresholdMs={15_000}
                samples={fixture.samples}
              />
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
