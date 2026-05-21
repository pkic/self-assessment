/** Bundled snapshot of the released PKIMM 1.0.0 model's category and
 *  requirement names, indexed by the progress keys used by the released
 *  1.0.0 widget. The data lives in the sibling JSON file so the structure
 *  is just data (not source) and stays out of CPD scope. Used to populate
 *  `StructureSnapshot.byKey` when migrating legacy unversioned data
 *  (localStorage or YAML export) into the new storage shape. */
import type { StructureSnapshot } from "../types/types";
import names from "./pkimm-model-1.0.0-names.json";

export const PKIMM_1_0_0_NAMES =
  names as unknown as StructureSnapshot["byKey"];
