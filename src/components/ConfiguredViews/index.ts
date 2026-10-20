export {
  ConfiguredCard,
  ConfiguredDetail,
  ConfiguredLog,
  flowNodesOf,
  whenLabel,
} from "./ConfiguredViews";
export type {
  ConfiguredCardProps,
  ConfiguredDetailProps,
  ConfiguredKit,
  ConfiguredLogProps,
} from "./ConfiguredViews";
// The config builders and their types (pure, JSX-free), also exported from /unstable beside the kit. Re-exported here so a
// view-config file (card, detail, side) takes ConfiguredCard, the builders and the column helpers from one import path.
export {
  defineCard,
  defineDetail,
  defineSide,
  flowSection,
  tableSection,
} from "../../listDetail/views";
export type {
  CardConfig,
  CardLayout,
  DetailAction,
  DetailConfig,
  DetailSummary,
  DetailSection,
  FlowNodeSpec,
  FlowSection,
  Progress,
  SideConfig,
  StatusMap,
  StatusVariant,
  TableSection,
} from "../../listDetail/views";
