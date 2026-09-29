// ModeSplitButton — a split button over a MODE.
//
// The face shows the current mode's icon and does that mode's action; the ▾
// picks the mode. The page plays the CONSUMER: it owns the modes, their words,
// and what pressing the face means — here each press is counted, so the demo
// proves the face fires only where its mode has something to do. A mode whose
// face has nothing to do is DISABLED and says why (hover it), never a silent
// no-op.
//
// It renders a fragment, so the caller groups it: inside a `ButtonGroup` it
// reads as one control.
import { type Component, createSignal } from "solid-js";
import { ButtonGroup } from "../../src/components/ButtonGroup";
import {
  type ModeInfo,
  ModeSplitButton,
  modeInfo,
} from "../../src/components/ModeSplitButton";
import {
  ClusterRow,
  SpacedStack,
  TightStack,
} from "../../src/components/Layout";
import {
  CaptionLabel,
  MutedBody,
  SectionTitle,
  SubsectionTitle,
  TextSublabel,
} from "../../src/components/Text";

type Placement = "auto" | "manual";

const PLACEMENT: readonly ModeInfo<Placement>[] = [
  {
    mode: "auto",
    label: "Full auto: unlocked jobs reflow by order",
    icon: "arrows-up-down",
    action: "Unlocked jobs flow automatically",
    disabled: true,
  },
  {
    mode: "manual",
    label: "Manual: drag sets exact dates",
    icon: "fit",
    action: "Flow once: pack unlocked jobs, keeping their order",
    disabled: false,
  },
];

type Scale = "grow" | "fit" | "locked";

const SCALE: readonly ModeInfo<Scale>[] = [
  {
    mode: "grow",
    label: "Auto-grow",
    icon: "arrows-up-down",
    action: "Refit to the data now",
    disabled: false,
  },
  {
    mode: "fit",
    label: "Full auto",
    icon: "fit",
    action: "Already fitting the data",
    disabled: true,
  },
  {
    mode: "locked",
    label: "Locked",
    icon: "lock",
    action: "Edit the locked range",
    disabled: false,
  },
];

const TwoModes: Component = () => {
  const [mode, setMode] = createSignal<Placement>("manual");
  const [presses, setPresses] = createSignal(0);
  return (
    <ClusterRow>
      <ButtonGroup>
        <ModeSplitButton<Placement>
          modes={PLACEMENT}
          mode={mode()}
          onModeChange={setMode}
          onPress={() => setPresses((n) => n + 1)}
          menuLabel="Schedule mode"
        />
      </ButtonGroup>
      <TextSublabel>
        {`${modeInfo(PLACEMENT, mode()).label} · flowed ${presses()}×`}
      </TextSublabel>
    </ClusterRow>
  );
};

const ThreeModes: Component = () => {
  const [mode, setMode] = createSignal<Scale>("grow");
  const [last, setLast] = createSignal("nothing yet");
  return (
    <ClusterRow>
      <ButtonGroup>
        <ModeSplitButton<Scale>
          modes={SCALE}
          mode={mode()}
          onModeChange={setMode}
          onPress={() => setLast(modeInfo(SCALE, mode()).action)}
          menuLabel="Y-axis mode"
        />
      </ButtonGroup>
      <TextSublabel>{`Mode: ${modeInfo(SCALE, mode()).label} · last press: ${last()}`}</TextSublabel>
    </ClusterRow>
  );
};

export const ModeSplitButtonShowcase: Component = () => (
  <div class="component-section component-section--full">
    <SpacedStack>
      <TightStack>
        <SectionTitle>ModeSplitButton</SectionTitle>
        <MutedBody>
          Composite (Depth 2): the face acts in the current mode, the ▾ picks
          the mode. ChartFrame's y-axis control is one; a scheduler's full auto
          / manual placement is another.
        </MutedBody>
      </TightStack>

      <div class="example-group">
        <SubsectionTitle>Two modes</SubsectionTitle>
        <CaptionLabel>
          In Manual the face flows the jobs once; in Full auto it is disabled,
          because the jobs already flow.
        </CaptionLabel>
        <TwoModes />
      </div>

      <div class="example-group">
        <SubsectionTitle>Three modes</SubsectionTitle>
        <CaptionLabel>
          The y-axis vocabulary: the middle mode's face has nothing to do.
        </CaptionLabel>
        <ThreeModes />
      </div>
    </SpacedStack>
  </div>
);
