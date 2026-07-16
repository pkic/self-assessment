import { buildAssessmentCardModel } from "./assessmentCard";
import type { Assessment, ModuleData } from "../types/types";

const modules: ModuleData[] = [
  {
    id: "G",
    name: "Governance",
    description: "",
    categories: [
      {
        id: "strategy",
        name: "Strategy",
        description: "",
        weight: 5,
        levels: [
          { number: 1, name: "Initial", description: "d1" },
          { number: 2, name: "Foundational", description: "d2" },
        ],
        requirements: [],
      },
    ],
  },
];

const base = (over: Partial<Assessment> = {}): Assessment => ({
  id: "a1",
  name: "A1",
  dataVersion: "2.0.0",
  progress: {
    "G.strategy": {
      level: 2,
      result: "",
      description: "",
      applicability: true,
    },
  },
  enabledExtensions: [],
  assessmentName: "A1",
  assessorName: "",
  useCaseDescription: "",
  sourceStructure: { byKey: {} },
  meta: {
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  ...over,
});

test("scorable (compatible + modules) → non-null level, counts, isScorable true", () => {
  const m = buildAssessmentCardModel(base(), modules, "2.0.0", []);
  expect(m.isCompatible).toBe(true);
  expect(m.isScorable).toBe(true);
  expect(m.overallLevel).not.toBeNull();
  expect(m.totalCount).toBeGreaterThan(0);
});

test("incompatible dataVersion → overallLevel null, counts 0, isCompatible/isScorable false", () => {
  const m = buildAssessmentCardModel(
    base({ dataVersion: "1.0.0" }),
    modules,
    "2.0.0",
    [],
  );
  expect(m.isCompatible).toBe(false);
  expect(m.isScorable).toBe(false);
  expect(m.overallLevel).toBeNull();
  expect(m.totalCount).toBe(0);
});

test("compatible but modules null → isCompatible true, isScorable false, level null", () => {
  const m = buildAssessmentCardModel(base(), null, "2.0.0", []);
  expect(m.isCompatible).toBe(true);
  expect(m.isScorable).toBe(false);
  expect(m.overallLevel).toBeNull();
});

test("isFull reflects hasV2Content; typeLabel null when unset, mapped when set", () => {
  expect(
    buildAssessmentCardModel(base(), modules, "2.0.0", []).typeLabel,
  ).toBeNull();
  const typed = buildAssessmentCardModel(
    base({ assessmentType: "self", requirementProgress: {} }),
    modules,
    "2.0.0",
    [],
  );
  expect(typed.isFull).toBe(true);
  expect(typeof typed.typeLabel).toBe("string");
});
