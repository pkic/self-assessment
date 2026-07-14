import type { ProgressData } from "../types/types";
import LevelResult from "../enums/LevelResult";
import {
  computeNextCategoryApplicability,
  computeNextCategoryField,
  computeNextCategoryLevel,
  computeNextCategoryNotes,
  computeNextCategoryReason,
  defaultCategoryProgress,
} from "./categoryProgress";

describe("defaultCategoryProgress", () => {
  it("returns the level-0, applicable, empty-description shape", () => {
    expect(defaultCategoryProgress()).toEqual({
      level: 0,
      result: "Not Assessed",
      description: "",
      applicability: true,
    });
  });
});

describe("computeNextCategoryApplicability", () => {
  it("flips an in-scope, unassessed category to Not Applicable", () => {
    const prev: ProgressData = {
      level: 0,
      result: "Not Assessed",
      description: "",
      applicability: true,
    };
    const result = computeNextCategoryApplicability(prev);
    expect(result.applicability).toBe(false);
    expect(result.result).toBe("Not Applicable");
  });

  it("flips an out-of-scope category back to in-scope, deriving result from the stored level", () => {
    const prev: ProgressData = {
      level: 3,
      result: "Not Applicable",
      description: "some level-3 description",
      applicability: false,
    };
    const result = computeNextCategoryApplicability(prev);
    expect(result.applicability).toBe(true);
    expect(result.result).toBe("3 - Advanced");
    expect(result.level).toBe(3);
    expect(result.description).toBe("some level-3 description");
  });

  it("defaults a never-touched entry to Not Applicable on first toggle", () => {
    const result = computeNextCategoryApplicability(undefined);
    expect(result.applicability).toBe(false);
    expect(result.result).toBe("Not Applicable");
    expect(result.level).toBe(0);
  });

  // Regression (companion fix): handleApplicabilityChange used
  // to rebuild the entry from only level/description/result/applicability,
  // silently dropping applicabilityReason on every toggle. This must survive
  // a full out -> in -> out round trip.
  it("preserves applicabilityReason across a toggle", () => {
    const prev: ProgressData = {
      level: 2,
      result: "Not Applicable",
      description: "",
      applicability: false,
      applicabilityReason: "Not relevant to our deployment model",
    };
    const result = computeNextCategoryApplicability(prev);
    expect(result.applicability).toBe(true);
    expect(result.applicabilityReason).toBe(
      "Not relevant to our deployment model",
    );
  });

  it("round-trips a reason through out-of-scope -> in-scope -> out-of-scope again", () => {
    let entry: ProgressData | undefined = undefined;
    // 1. Toggle to Not Applicable.
    entry = computeNextCategoryApplicability(entry);
    expect(entry.applicability).toBe(false);
    // 2. Capture a reason while out of scope.
    entry = computeNextCategoryReason(entry, "Outsourced to a third party");
    expect(entry.applicabilityReason).toBe("Outsourced to a third party");
    // 3. Toggle back in scope.
    entry = computeNextCategoryApplicability(entry);
    expect(entry.applicability).toBe(true);
    expect(entry.applicabilityReason).toBe("Outsourced to a third party");
    // 4. Toggle out of scope again — the reason must still be present.
    entry = computeNextCategoryApplicability(entry);
    expect(entry.applicability).toBe(false);
    expect(entry.applicabilityReason).toBe("Outsourced to a third party");
  });
});

describe("computeNextCategoryReason", () => {
  it("writes the reason onto a default entry when prev is undefined", () => {
    const result = computeNextCategoryReason(undefined, "Reason text");
    expect(result.applicabilityReason).toBe("Reason text");
    expect(result.level).toBe(0);
    expect(result.applicability).toBe(true);
  });

  it("merges the reason onto prev, preserving other fields (level/applicability/description)", () => {
    const prev: ProgressData = {
      level: 4,
      result: "Not Applicable",
      description: "d",
      applicability: false,
    };
    const result = computeNextCategoryReason(prev, "New reason");
    expect(result).toEqual({
      level: 4,
      result: "Not Applicable",
      description: "d",
      applicability: false,
      applicabilityReason: "New reason",
    });
  });

  it("does not mutate the original entry", () => {
    const prev: ProgressData = {
      level: 1,
      result: "Not Applicable",
      description: "",
      applicability: false,
    };
    computeNextCategoryReason(prev, "x");
    expect(prev.applicabilityReason).toBeUndefined();
  });
});

describe("computeNextCategoryNotes", () => {
  it("sets notes on a defaulted entry when none exists", () => {
    const next = computeNextCategoryNotes(undefined, "hello");
    expect(next.notes).toBe("hello");
    expect(next.level).toBe(0);
    expect(next.applicability).toBe(true);
  });
  it("merges notes without touching other fields", () => {
    const prev: ProgressData = {
      level: 3,
      result: "Defined",
      description: "d",
      applicability: true,
      applicabilityReason: "r",
    };
    const next = computeNextCategoryNotes(prev, "note2");
    expect(next).toEqual({ ...prev, notes: "note2" });
  });
});

describe("computeNextCategoryLevel", () => {
  it("preserves applicability, applicabilityReason and notes from prev", () => {
    const prev: ProgressData = {
      level: 1,
      result: "Initial",
      description: "old",
      applicability: false,
      applicabilityReason: "reason",
      notes: "keepme",
    };
    const next = computeNextCategoryLevel(prev, {
      level: 4,
      result: "Managed",
      description: "new",
    });
    expect(next.level).toBe(4);
    expect(next.result).toBe("Managed");
    expect(next.description).toBe("new");
    expect(next.applicability).toBe(false);
    expect(next.applicabilityReason).toBe("reason");
    expect(next.notes).toBe("keepme");
  });
  it("defaults applicability to true and omits absent optional fields", () => {
    const next = computeNextCategoryLevel(undefined, {
      level: 2,
      result: "Foundational",
      description: "x",
    });
    expect(next.applicability).toBe(true);
    expect(next.applicabilityReason).toBeUndefined();
    expect(next.notes).toBeUndefined();
  });
  it("drops blank optional strings (matches prior handleLevelChange byte-shape)", () => {
    const prev: ProgressData = {
      level: 1,
      result: "Initial",
      description: "o",
      applicability: true,
      applicabilityReason: "",
      notes: "",
    };
    const next = computeNextCategoryLevel(prev, {
      level: 2,
      result: "Foundational",
      description: "n",
    });
    expect("applicabilityReason" in next).toBe(false);
    expect("notes" in next).toBe(false);
  });
});

describe("computeNextCategoryField", () => {
  it("sets a field while preserving level/applicability/notes", () => {
    const prev: ProgressData = {
      level: 3,
      result: LevelResult[3],
      description: "d",
      applicability: true,
      notes: "keep",
    };
    const next = computeNextCategoryField(prev, "evidence", "found it");
    expect(next.evidence).toBe("found it");
    expect(next.level).toBe(3);
    expect(next.applicability).toBe(true);
    expect(next.notes).toBe("keep");
  });

  it("seeds a default entry when none exists and sets artifactIds", () => {
    const next = computeNextCategoryField(undefined, "artifactIds", ["a1"]);
    expect(next.artifactIds).toEqual(["a1"]);
    expect(next.level).toBe(0);
    expect(next.applicability).toBe(true);
  });
});

describe("computeNextCategoryLevel preserves category-grain richness", () => {
  it("carries evidence/pocId/interviewDate/artifactIds across a level change", () => {
    const prev: ProgressData = {
      level: 1,
      result: LevelResult[1],
      description: "old",
      applicability: true,
      notes: "n",
      evidence: "e",
      pocId: "poc-1",
      interviewDate: "2026-01-02",
      artifactIds: ["a1", "a2"],
    };
    const next = computeNextCategoryLevel(prev, {
      level: 4,
      result: LevelResult[4],
      description: "new",
    });
    expect(next.level).toBe(4);
    expect(next.notes).toBe("n");
    expect(next.evidence).toBe("e");
    expect(next.pocId).toBe("poc-1");
    expect(next.interviewDate).toBe("2026-01-02");
    expect(next.artifactIds).toEqual(["a1", "a2"]);
  });

  it("omits blank/empty new fields", () => {
    const next = computeNextCategoryLevel(
      {
        level: 2,
        result: LevelResult[2],
        description: "d",
        applicability: true,
        evidence: "",
        artifactIds: [],
      },
      { level: 3, result: LevelResult[3], description: "d2" },
    );
    expect(next).not.toHaveProperty("evidence");
    expect(next).not.toHaveProperty("artifactIds");
    expect(next).not.toHaveProperty("pocId");
    expect(next).not.toHaveProperty("interviewDate");
  });
});
