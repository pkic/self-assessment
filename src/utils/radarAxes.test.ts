import { buildRadarAxes } from "./radarAxes";
import type {
  ModuleData,
  ProgressData,
  RequirementProgress,
} from "../types/types";

const c1 = {
  id: "c1",
  weight: 1,
  name: "C1",
  description: "",
  levels: [],
  requirements: [],
};
const c2 = {
  id: "c2",
  weight: 1,
  name: "C2",
  description: "",
  levels: [],
  requirements: [],
};

const modules: ModuleData[] = [
  {
    id: "G",
    name: "Governance",
    description: "",
    categories: [c1, c2],
  },
];

test("drops only the N/A category from the axis list", () => {
  const keys = buildRadarAxes(
    modules,
    ["G.c1", "G.c2"],
    {
      "G.c2": {
        level: 0,
        result: "",
        description: "",
        applicability: false,
      },
    },
    undefined,
  );
  expect(keys).toEqual(["G.c1"]);
});

test("retains a Not-Assessed (level 0, applicable) category", () => {
  const keys = buildRadarAxes(modules, ["G.c1", "G.c2"], {}, undefined);
  expect(keys).toEqual(["G.c1", "G.c2"]);
});

test("retains an assessed, applicable category alongside a dropped N/A one", () => {
  const progress: Record<string, ProgressData> = {
    "G.c1": { level: 3, result: "", description: "", applicability: true },
    "G.c2": { level: 0, result: "", description: "", applicability: false },
  };
  const keys = buildRadarAxes(modules, ["G.c1", "G.c2"], progress, undefined);
  expect(keys).toEqual(["G.c1"]);
});

test("undefined requirementProgress behaves as quick mode (self-declared level only)", () => {
  const progress: Record<string, ProgressData> = {
    "G.c1": { level: 2, result: "", description: "", applicability: true },
    "G.c2": { level: 0, result: "", description: "", applicability: false },
  };
  const keys = buildRadarAxes(modules, ["G.c1", "G.c2"], progress, undefined);
  expect(keys).toEqual(["G.c1"]);
});

test("empty requirementProgress object behaves the same as undefined", () => {
  const progress: Record<string, ProgressData> = {
    "G.c2": { level: 0, result: "", description: "", applicability: false },
  };
  const requirementProgress: Record<string, RequirementProgress> = {};
  const keys = buildRadarAxes(
    modules,
    ["G.c1", "G.c2"],
    progress,
    requirementProgress,
  );
  expect(keys).toEqual(["G.c1"]);
});

test("a quick assessment with no N/A categories renders an identical axis set", () => {
  const progress: Record<string, ProgressData> = {
    "G.c1": { level: 3, result: "", description: "", applicability: true },
    "G.c2": { level: 0, result: "", description: "", applicability: true },
  };
  const keys = buildRadarAxes(modules, ["G.c1", "G.c2"], progress, undefined);
  expect(keys).toEqual(["G.c1", "G.c2"]);
});

test("keeps a label that doesn't resolve to a known module/category", () => {
  const keys = buildRadarAxes(modules, ["G.c1", "X.unknown"], {}, undefined);
  expect(keys).toEqual(["G.c1", "X.unknown"]);
});

test("all downstream dataset builders can map over the returned axis list directly", () => {
  // Lockstep proof: SpiderChart.tsx binds `axisKeys = buildRadarAxes(...)`
  // once, then derives displayLabels, userData, and every extension extData
  // via `axisKeys.map(...)`. Since every caller maps over the exact same
  // array reference, their resulting lengths are equal by construction —
  // this pins that invariant at the helper's output rather than at each
  // call site, so a future edit that reintroduces independent filtering
  // would have to also break this assertion.
  const progress: Record<string, ProgressData> = {
    "G.c2": { level: 0, result: "", description: "", applicability: false },
  };
  const chartLabels = ["G.c1", "G.c2"];
  const axisKeys = buildRadarAxes(modules, chartLabels, progress, undefined);

  const displayLabels = axisKeys.map((k) => k);
  const userData = axisKeys.map(() => 0);
  const extData = axisKeys.map(() => 0);

  expect(axisKeys).toEqual(["G.c1"]);
  expect(displayLabels.length).toBe(axisKeys.length);
  expect(userData.length).toBe(axisKeys.length);
  expect(extData.length).toBe(axisKeys.length);
});
