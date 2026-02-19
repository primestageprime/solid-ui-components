import { Component } from "solid-js";
import {
  IdCell, StringCell, TagCell, MoneyCell, DateCell, DateTimeCell,
  MinuteDateTimeCell, DurationCell, StatusCell, CheckboxCell,
  FloatCell, IntCell, MetricValueCell, LongTextCell,
  withCellStyle, withValueColor,
} from "../../src/components/Table";
import { Stack } from "../../src/components/Layout";

const AccentFloat = withCellStyle(FloatCell, { color: "#00d4ff", fontWeight: 600 });
const SmallDate = withCellStyle(DateCell, { fontSize: "0.75rem" });
const NoxCell = withValueColor(FloatCell, (v) => (v != null && v > 2.8) ? "#ff6b6b" : "#00ff88", { textAlign: "right" });

export const CellRendererShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>CellRenderers — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (CellRenderers.css), no component imports. Typed cell renderers for tables.</p>

      <div class="example-group">
        <h3>Text Cells</h3>
        <Stack gap="md">
          <div>
            <IdCell value="JTF-0042" />
            <div class="text-meta">IdCell — monospace, clipped corners, accent bg</div>
          </div>
          <div>
            <StringCell value="Pacific Explorer" />
            <div class="text-meta">StringCell — default text color</div>
          </div>
          <div>
            <LongTextCell value="This is a very long text value that should be truncated after fifty characters to keep the table compact and readable." />
            <div class="text-meta">LongTextCell — truncated at 50 chars with "more..." toggle</div>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Tag Cell</h3>
        <Stack gap="sm">
          <div style={{ display: "flex", gap: "12px", "flex-wrap": "wrap", "align-items": "center" }}>
            <TagCell value="Default" />
            <TagCell value="Primary" variant="primary" />
            <TagCell value="Success" variant="success" />
            <TagCell value="Warning" variant="warning" />
            <TagCell value="Danger" variant="danger" />
            <TagCell value="Info" variant="info" />
          </div>
          <div class="text-meta">TagCell — uppercase tag with variant colors, clipped corners</div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Number Cells</h3>
        <Stack gap="md">
          <div>
            <IntCell value={1234567} />
            <div class="text-meta">IntCell — formatted integer, monospace, right-aligned</div>
          </div>
          <div>
            <FloatCell value={3.14159} precision={3} />
            <div class="text-meta">FloatCell — formatted decimal (precision: 3), monospace</div>
          </div>
          <div>
            <MoneyCell value={42500.5} />
            <div class="text-meta">MoneyCell — USD currency format, green glow</div>
          </div>
          <div>
            <MetricValueCell value={2.8134} compliant={true} />
            <div class="text-meta">MetricValueCell — compliant (#00d4ff), toPrecision(4)</div>
          </div>
          <div>
            <MetricValueCell value={3.9521} compliant={false} />
            <div class="text-meta">MetricValueCell — violation (#ff0040), toPrecision(4)</div>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Date & Time Cells</h3>
        <Stack gap="md">
          <div>
            <DateCell value="2026-02-13T08:30:00Z" />
            <div class="text-meta">DateCell — ISO format (YYYY-MM-DD), monospace</div>
          </div>
          <div>
            <DateTimeCell value="2026-02-13T08:30:00Z" />
            <div class="text-meta">DateTimeCell — ISO format (YYYY-MM-DD HH:mm:ss), monospace</div>
          </div>
          <div>
            <MinuteDateTimeCell value="2026-02-13T08:30:00Z" />
            <div class="text-meta">MinuteDateTimeCell — minute precision (YYYY-MM-DD HH:mm)</div>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Duration Cell</h3>
        <Stack gap="md">
          <div>
            <DurationCell value={45} />
            <div class="text-meta">45 seconds → "45s"</div>
          </div>
          <div>
            <DurationCell value={3725} />
            <div class="text-meta">3725 seconds → "1h 2m"</div>
          </div>
          <div>
            <DurationCell value={180} unit="m" />
            <div class="text-meta">180 minutes → "3h"</div>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Status Cell</h3>
        <Stack gap="sm">
          <div style={{ display: "flex", gap: "24px", "flex-wrap": "wrap", "align-items": "center" }}>
            <StatusCell value="active" />
            <StatusCell value="success" />
            <StatusCell value="warning" />
            <StatusCell value="error" />
            <StatusCell value="pending" />
            <StatusCell value="inactive" />
          </div>
          <div class="text-meta">StatusCell — dot indicator + label, auto-mapped from value string</div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Checkbox Cell</h3>
        <Stack gap="sm">
          <div style={{ display: "flex", gap: "24px", "align-items": "center" }}>
            <CheckboxCell value={true} />
            <CheckboxCell value={false} />
            <CheckboxCell value={true} disabled />
          </div>
          <div class="text-meta">CheckboxCell — HUD-styled checkbox, clipped corners</div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Empty States</h3>
        <Stack gap="sm">
          <div style={{ display: "flex", gap: "24px", "align-items": "center" }}>
            <IdCell value={null} />
            <StringCell value={null} />
            <FloatCell value={null} />
            <DateCell value={null} />
          </div>
          <div class="text-meta">All cells show "—" for null/undefined/empty values</div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Curried Variants (withCellStyle / withValueColor)</h3>
        <Stack gap="md">
          <div>
            <AccentFloat value={98.76} />
            <div class="text-meta">withCellStyle(FloatCell, {"{"} color: "#00d4ff", fontWeight: 600 {"}"})</div>
          </div>
          <div>
            <SmallDate value="2026-02-13" />
            <div class="text-meta">withCellStyle(DateCell, {"{"} fontSize: "0.75rem" {"}"})</div>
          </div>
          <div>
            <NoxCell value={2.1} />
            <div class="text-meta">withValueColor(FloatCell, v {`=>`} v {">"} 2.8 ? "#ff6b6b" : "#00ff88") — compliant</div>
          </div>
          <div>
            <NoxCell value={3.5} />
            <div class="text-meta">withValueColor(FloatCell, v {`=>`} v {">"} 2.8 ? "#ff6b6b" : "#00ff88") — violation</div>
          </div>
        </Stack>
      </div>
    </div>
  );
};
