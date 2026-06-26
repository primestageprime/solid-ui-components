import { Component } from "solid-js";
import { WorkerCard } from "../../src/components/WorkerCard";
import { Row } from "../../src/components/Layout/Row";

export const WorkerCardShowcase: Component = () => {
  const now = Date.now();
  return (
    <div class="component-section">
      <h2>WorkerCard — Composed (Depth 2)</h2>
      <p class="text-meta">
        Card visualizing a single extraction-worker slot's state: status,
        elapsed time, jobs completed, projected completion vs. estimate.
      </p>
      <div class="example-group">
        <Row gap="sm" align="start" wrap>
          <WorkerCard
            slotId={1}
            status="extracting"
            now={now}
            startedAt={now - 4 * 60_000}
            extractStartedAt={now - 90_000}
            jobsCompleted={42}
            avgRatePerSec={1.4}
            estimatedS={300}
          />
          <WorkerCard
            slotId={2}
            status="idle"
            now={now}
            startedAt={now - 30 * 60_000}
            extractStartedAt={now - 30 * 60_000}
            jobsCompleted={120}
            avgRatePerSec={0}
            estimatedS={0}
          />
          <WorkerCard
            slotId={3}
            status="extracting"
            now={now}
            startedAt={now - 8 * 60_000}
            extractStartedAt={now - 7 * 60_000}
            jobsCompleted={300}
            avgRatePerSec={1.0}
            estimatedS={300}
            overdue
          />
        </Row>
      </div>
    </div>
  );
};
