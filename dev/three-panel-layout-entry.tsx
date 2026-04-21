/* @refresh reload */
/** Standalone entry for the ThreePanelLayout v0.11.1 column-placement smoke.
 * Bypasses main.tsx (which currently fails to boot because several pre-existing
 * showcases import symbols that the respective barrels do not re-export —
 * unrelated to this patch). */
import { render } from "solid-js/web";
import "../src/styles/global.css";
import "../src/themes/default.css";
import "./main.css";
import { ThreePanelLayoutShowcase } from "./showcases/three-panel-layout";

render(
  () => (
    <div class="showcase">
      <main class="showcase__content">
        <ThreePanelLayoutShowcase />
      </main>
    </div>
  ),
  document.getElementById("root")!,
);
