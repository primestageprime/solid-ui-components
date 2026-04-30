import { Component, createSignal, onCleanup, onMount, For } from "solid-js";
import { HeartbeatSparkline } from "../../src/components/HeartbeatSparkline";
import { LiveHeartbeatTrace } from "../../src/components/LiveHeartbeatTrace";
import { ConnectionStatus } from "../../src/components/ConnectionStatus";
import { Row } from "../../src/components/Layout";

// --- Synthetic sample generators for the atom showcase ---
const flatLow = (n: number) =>
  Array.from({ length: n }, () => 0.05 + Math.random() * 0.05);
const sawtooth75 = (n: number, period = 8) =>
  Array.from({ length: n }, (_, i) => (((i % period) + 1) / period) * 0.75);
const flatTop = (n: number) => Array.from({ length: n }, () => 1);
const sawtooth = (n: number, period = 8) =>
  Array.from({ length: n }, (_, i) => ((i % period) + 1) / period);

export const ConnectionStatusShowcase: Component = () => {
  // Healthy: heartbeats every 1s, timeout 5s → line stays near 20% (reassuring, low).
  const [healthyBeat, setHealthyBeat] = createSignal(Date.now());
  // Idle: heartbeats every 3s, timeout 4s → drifts to 75% then snaps back.
  const [idleBeat, setIdleBeat] = createSignal(Date.now());
  // Error: heartbeats are still landing but the service keeps reporting errors → blinks red.
  const [errorBeat, setErrorBeat] = createSignal(Date.now());
  const [errorAt, setErrorAt] = createSignal(Date.now());

  onMount(() => {
    const healthy = window.setInterval(() => setHealthyBeat(Date.now()), 1000);
    const idle = window.setInterval(() => setIdleBeat(Date.now()), 3000);
    const errBeat = window.setInterval(() => {
      const t = Date.now();
      setErrorBeat(t);
      setErrorAt(t + 1); // keep error fresher than the heartbeat
    }, 1000);
    onCleanup(() => {
      window.clearInterval(healthy);
      window.clearInterval(idle);
      window.clearInterval(errBeat);
    });
  });

  return (
    <div class="component-section">
      <h2>ConnectionStatus — Depth 3</h2>
      <p class="text-meta">
        Composes LiveHeartbeatTrace (Depth 2) + StatusLight + Text + Stack.
        Label on top, sparkline beneath. Reassuring when healthy — no time
        readout, just the trace.
      </p>

      <div class="example-group">
        <h3>Four states</h3>
        <Row gap="xl" align="start" wrap>
          {/* Healthy — 1s heartbeats, 5s timeout */}
          <ConnectionStatus
            name="worker-bee"
            lastHeartbeatAt={healthyBeat()}
            timeoutMs={5000}
          />
          {/* Idle — 3s heartbeats, 4s timeout → peaks ~75% */}
          <ConnectionStatus
            name="idle"
            lastHeartbeatAt={idleBeat()}
            timeoutMs={4000}
          />
          {/* Error — heartbeats still landing but errorAt set */}
          <ConnectionStatus
            name="problem"
            lastHeartbeatAt={errorBeat()}
            errorAt={errorAt()}
            timeoutMs={5000}
          />
          {/* Off — never seen */}
          <ConnectionStatus
            name="off"
            lastHeartbeatAt={null}
            timeoutMs={5000}
          />
        </Row>
      </div>

      <h2 style={{ "margin-top": "32px" }}>LiveHeartbeatTrace — Depth 2</h2>
      <p class="text-meta">
        Stateful: owns the rolling sample buffer + tick timer. Derives state
        from lastHeartbeatAt + timeoutMs.
      </p>
      <div class="example-group">
        <h3>Same four states, raw</h3>
        <Row gap="lg" align="center" wrap>
          <LiveHeartbeatTrace lastHeartbeatAt={healthyBeat()} timeoutMs={5000} width={120} height={20} />
          <LiveHeartbeatTrace lastHeartbeatAt={idleBeat()} timeoutMs={4000} width={120} height={20} />
          <LiveHeartbeatTrace
            lastHeartbeatAt={errorBeat()}
            errorAt={errorAt()}
            timeoutMs={5000}
            width={120}
            height={20}
          />
          <LiveHeartbeatTrace lastHeartbeatAt={null} timeoutMs={5000} width={120} height={20} />
        </Row>
      </div>

      <h2 style={{ "margin-top": "32px" }}>HeartbeatSparkline — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Pure SVG. Owns CSS, no timers, no business logic. Caller feeds samples
        (0..1 = fraction of timeout consumed).
      </p>
      <div class="example-group">
        <h3>Hand-fed samples</h3>
        <For
          each={
            [
              { label: "connected · flat low (active)", state: "connected" as const, samples: flatLow(60) },
              { label: "connected · sawtooth peaking 75% (idle)", state: "connected" as const, samples: sawtooth75(60) },
              { label: "connected · sawtooth 100% (drifting)", state: "connected" as const, samples: sawtooth(60) },
              { label: "disconnected · flat top (off / timeout)", state: "disconnected" as const, samples: flatTop(60) },
              { label: "error · sawtooth (blinks)", state: "error" as const, samples: sawtooth75(60) },
            ]
          }
        >
          {(row) => (
            <Row gap="md" align="center">
              <span style={{ "min-width": "22rem", "font-size": "0.8rem" }}>{row.label}</span>
              <HeartbeatSparkline state={row.state} samples={row.samples} width={160} height={20} />
            </Row>
          )}
        </For>
      </div>
    </div>
  );
};
