import { Component } from "solid-js";
import { DTable, DTableWithHeader, DHeader, DH, DRow, DT, DD, Units, Val, SigFig } from "../../src/components/DataList";
import { NumberWithUnits } from "../../src/components/DataDisplay";
import { StatusBadge } from "../../src/components/Badge";
import { Stack } from "../../src/components/Layout";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const DataListShowcase: Component<Depth2Props> = (props) => {
  return (
    <div class="component-section">
      <h2>DataList — Depth 3 (zero CSS)</h2>
      <p class="text-meta">Composes Cell + Text (curried) + StatusBadge (Atomic). Semantic key-value table with DTable, DT, DD, Val, Units, SigFig.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Key-Value Pairs</h3>
          <DTable>
            <DT>Vessel</DT><DD primary>PACIFIC VOYAGER</DD>
            <DT>Asset</DT><DD>A-1042</DD>
            <DT>Status</DT><DD success>Active</DD>
            <DT>Duration</DT><DD highlight>48h 12m</DD>
            <DT muted>Notes</DT><DD muted>No issues reported</DD>
          </DTable>

          <h3 style={{ "margin-top": "24px" }}>Composed — With NumberWithUnits</h3>
          <DTable>
            <DT>NOx</DT><DD highlight><NumberWithUnits value={8.42} units="ppm" /></DD>
            <DT>Flow Rate</DT><DD><NumberWithUnits value={2841.3} units="scfm" precision={1} /></DD>
            <DT>Engine</DT><DD><NumberWithUnits value={1200} units="kW" precision={0} /></DD>
          </DTable>

          <h3 style={{ "margin-top": "24px" }}>Composed — With Val + Units (legacy)</h3>
          <DTable>
            <DT>CE Level</DT><DD highlight>90<Units>%</Units></DD>
            <DT>NOx</DT><DD><Val value={8.42} /><Units>ppm</Units></DD>
            <DT>Engine</DT><DD><Val value={1200} precision={0} /><Units>kW</Units></DD>
            <DT>Precision</DT><DD><SigFig value={0.004218} figures={3} /></DD>
          </DTable>

          <h3 style={{ "margin-top": "24px" }}>Composed — With Headers</h3>
          <DTableWithHeader
            header={
              <DHeader>
                <DH>Parameter</DH>
                <DH align="right">Value</DH>
              </DHeader>
            }
          >
            <DRow border><DT>Temperature</DT><DD><NumberWithUnits value={72.4} units="°F" precision={1} /></DD></DRow>
            <DRow border><DT>Humidity</DT><DD><NumberWithUnits value={45} units="%" /></DD></DRow>
            <DRow border highlight><DT>Pressure</DT><DD highlight><NumberWithUnits value={29.92} units="inHg" precision={2} /></DD></DRow>
          </DTableWithHeader>
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Cell</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">KVTable</div>
              <div class="text-meta">table wrapper — border-collapse, 0.75rem</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">DataTerm / DataTermMuted</div>
              <div class="text-meta">label td — primary or muted color</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">DataValue + variants</div>
              <div class="text-meta">value td — highlight / success / primary / muted</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">DataHeader / Right / Center</div>
              <div class="text-meta">th cells with alignment variants</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">CellRow / BorderRow</div>
              <div class="text-meta">tr with optional border / highlight</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Text</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">InlineUnits</div>
              <div class="text-meta">muted text suffix, font-size: inherit</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Badge</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">StatusBadge sm</div>
              <div class="text-meta">Badge wraps StatusBadge with variant map</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Value Formatters</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">Val</div>
              <div class="text-meta">toFixed(precision) with null fallback</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">SigFig</div>
              <div class="text-meta">toPrecision(figures) with null fallback</div>
            </div>
          </div>
          <h3>Depth 2</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Data Display</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("number-with-units")}>
              <div class="depth2-atom__label">NumberWithUnits</div>
              <div class="text-meta">preferred over Val + Units for new code</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
