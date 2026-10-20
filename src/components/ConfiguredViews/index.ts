export {
  ConfiguredCard,
  ConfiguredDetail,
  ConfiguredLog,
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
  tableSection,
} from "../../listDetail/views";
export type {
  CardConfig,
  DetailConfig,
  DetailSection,
  SideConfig,
  StatusMap,
  StatusVariant,
  TableSection,
} from "../../listDetail/views";
