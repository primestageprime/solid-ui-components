import { type Component, createSignal, onCleanup, onMount, For } from "solid-js";
import { HeartbeatSparkline } from "../../src/components/HeartbeatSparkline";
import { LiveHeartbeatTrace } from "../../src/components/LiveHeartbeatTrace";
import { ConnectionStatus } from "../../src/components/ConnectionStatus";
import { Row } from "../../src/components/Layout/Row";

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
      <h2>ConnectionStatus — Depth 2</h2>
      <p class="text-meta">
        Stacked indicator: label on top, sparkline beneath. Reassuring when
        healthy — no time-since text, just the trace.
      </p>

      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Four states</h3>
          <Row gap="sm" align="start" wrap>
            <ConnectionStatus name="worker-bee" lastHeartbeatAt={healthyBeat()} timeoutMs={5000} />
            <ConnectionStatus name="idle" lastHeartbeatAt={idleBeat()} timeoutMs={4000} />
            <ConnectionStatus
              name="problem"
              lastHeartbeatAt={errorBeat()}
              errorAt={errorAt()}
              timeoutMs={5000}
            />
            <ConnectionStatus name="off" lastHeartbeatAt={null} timeoutMs={5000} />
          </Row>

          <h3 style={{ "margin-top": "32px" }}>LiveHeartbeatTrace — Depth 1 (raw)</h3>
          <p class="text-meta">
            Same four states, without the surrounding label.
          </p>
          <Row gap="sm" align="center" wrap>
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

          <h3 style={{ "margin-top": "32px" }}>HeartbeatSparkline — Primitive (Depth 0, hand-fed)</h3>
          <p class="text-meta">
            Pure SVG. Caller feeds samples (0..1 = fraction of timeout consumed).
          </p>
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
              <Row gap="sm" align="center">
                <span style={{ "min-width": "22rem", "font-size": "0.8rem" }}>{row.label}</span>
                <HeartbeatSparkline state={row.state} samples={row.samples} width={160} height={20} />
              </Row>
            )}
          </For>
        </div>

        <div class="depth2-atoms">
          <h3>Composed from</h3>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Depth 2</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">LiveHeartbeatTrace</div>
              <div class="text-meta">
                tick timer + sample buffer + state derivation; wraps HeartbeatSparkline
              </div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Atomic (Depth 1)</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">HeartbeatSparkline</div>
              <div class="text-meta">
                pure SVG rect sparkline; connected / disconnected / error variants
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">StatusLight</div>
              <div class="text-meta">fallback dot when showSparkline=false</div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Layout (Depth 1)</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">Stack</div>
              <div class="text-meta">label-on-top / sparkline-beneath column</div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Text (Depth 1)</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">TextLabel</div>
              <div class="text-meta">service name above the trace</div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">State derivation</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">connected</div>
              <div class="text-meta">
                lastHeartbeatAt set, now − last &lt; timeoutMs, no fresher errorAt
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">disconnected</div>
              <div class="text-meta">lastHeartbeatAt null OR now − last ≥ timeoutMs</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">error</div>
              <div class="text-meta">errorAt ≥ lastHeartbeatAt (or no heartbeat yet)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
