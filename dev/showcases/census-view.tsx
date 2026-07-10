// dev/showcases/census-view.tsx — CensusView showcase
// Note: adapters (adaptNetSuite, etc.) stay app-side; SUI ships normalized types + view only.
import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import { CensusView, type CensusTable } from "../../src/components/CensusView";
import { GhostButton } from "../../src/components/Button";

// ── Seed tables — one entry per bucket (all 8) plus extras for scroll visibility ──
const SEED_TABLES: CensusTable[] = [
  // single (exactly 1 row)
  { key: "currency", entity: "Currency",       fieldCount: 4,  sourceRows: 1,          localRows: 1,     status: "done",    subtitle: "NS/Currency" },

  // lt100 (< 100 rows) — done, fills bucket with enough to scroll
  { key: "account",  entity: "Account",        fieldCount: 10, sourceRows: 50,          localRows: 50,    status: "done",    subtitle: "NS/Account",  keyLabel: "auto-inc", keyTitle: "integer PK", columns: [{ name: "AccountId", type: "Int" }, { name: "Name", type: "String" }, { name: "Code", type: "String" }] },
  { key: "terms",    entity: "Terms",          fieldCount: 6,  sourceRows: 22,          localRows: 22,    status: "done",    subtitle: "NS/Terms" },
  { key: "category", entity: "Category",       fieldCount: 8,  sourceRows: 45,          localRows: 40,    status: "partial", subtitle: "NS/Category", note: "5 rows still in flight" },
  { key: "taxcode",  entity: "TaxCode",        fieldCount: 5,  sourceRows: 80,          localRows: 0,     status: "todo",    subtitle: "NS/TaxCode" },

  // lt100k (< 100k rows)
  { key: "contact",  entity: "Contact",        fieldCount: 42, sourceRows: 18_420,      localRows: 18_420,status: "done",    subtitle: "NS/Contact", fieldCountByType: { string: 22, int: 8, datetime: 6, bool: 4, decimal: 2 } },
  { key: "vendor",   entity: "Vendor",         fieldCount: 38, sourceRows: 3_200,       localRows: 2_950, status: "short",   subtitle: "NS/Vendor" },

  // lt1m (< 1M rows)
  { key: "tranline", entity: "TransactionLine",fieldCount: 55, sourceRows: 500_000,     localRows: 0,     status: "todo",    subtitle: "NS/TransactionLine", approx: true },
  { key: "invoice",  entity: "Invoice",        fieldCount: 48, sourceRows: 220_000,     localRows: 218_500,status: "doing",  subtitle: "NS/Invoice" },

  // gte1m (≥ 1M rows)
  { key: "biglog",   entity: "AuditLog",       fieldCount: 12, sourceRows: 4_100_000,   localRows: 0,     status: "todo",    subtitle: "NS/AuditLog" },

  // deep (uncounted / truncated)
  { key: "attach",   entity: "Attachment",     fieldCount: 9,  sourceRows: null,        localRows: 0,     status: "todo",    truncated: true,  note: "count truncated at 2000" },
  { key: "syslog",   entity: "SystemLog",      fieldCount: 7,  sourceRows: null,        localRows: 0,     status: "pending" },

  // empty (counted at 0 — nothing to export)
  { key: "empty1",   entity: "BudgetSnapshot", fieldCount: 3,  sourceRows: 0,           localRows: 0,     status: "empty" },

  // noaccess (error / uncountable)
  { key: "noaccess1",entity: "SystemConfig",   fieldCount: null, sourceRows: null,      localRows: null,  status: "error",  error: "403 Forbidden — insufficient role" },
  { key: "noaccess2",entity: "HiddenTable",    fieldCount: null, sourceRows: null,      localRows: null,  status: "noaccess", error: "Restricted — NetSuite permissions gate" },
];

export const CensusViewShowcase: Component = () => {
  const [lastAction, setLastAction] = createSignal<string | null>(null);

  return (
    <div class="component-section">
      <h2>CensusView — Composite (Depth 3)</h2>
      <p class="text-meta">
        Bucketed census composition: tables grouped by size/access bucket, each
        bucket rendered as a compact sortable table. Clicking a row opens a
        sticky detail panel. Adapters (adaptNetSuite etc.) stay app-side — SUI
        ships the normalized types + view only.
      </p>

      <div class="example-group">
        <h3>All 8 buckets + working actions slot</h3>
        {lastAction() && (
          <p class="text-meta" style={{ "margin-bottom": "8px" }}>
            Last action: <code>{lastAction()}</code>
          </p>
        )}
        {/* maxHeight on each bucket table is controlled by BaseTable maxHeight in the
            component; the showcase demonstrates sticky-header scrolling via the overall
            page scroll. The lt100 bucket has 5 rows so the table scrolls within its
            maxHeight if the viewport is short. */}
        <CensusView
          tables={SEED_TABLES}
          actions={(t) => (
            <div style={{ display: "flex", gap: "8px", "margin-top": "12px", "flex-wrap": "wrap" }}>
              <GhostButton
                size="sm"
                onClick={() => setLastAction(`Recount: ${t.entity}`)}
              >
                Recount
              </GhostButton>
              <GhostButton
                size="sm"
                onClick={() => setLastAction(`Queue export: ${t.entity}`)}
              >
                Queue export
              </GhostButton>
            </div>
          )}
        />
      </div>

      <div class="example-group">
        <h3>Controlled selection (selectedKey prop)</h3>
        <p class="text-meta">Table is pre-selected on "Invoice" (key: invoice).</p>
        <CensusView
          tables={SEED_TABLES.slice(7, 12)}
          selectedKey="invoice"
        />
      </div>
    </div>
  );
};
