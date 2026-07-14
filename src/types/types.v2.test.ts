import type {
  Assessment,
  RequirementProgress,
  Workspace,
  ActionPlans,
  ProgressData,
} from "./types";

// Compile-time shape checks: a quick assessment needs none of the v2 fields;
// a full assessment can carry requirementProgress and metadata.
describe("state schema v2 optional shape", () => {
  it("a v1-shaped assessment still satisfies the type (all v2 fields optional)", () => {
    const quick: Assessment = {
      id: "a",
      name: "Quick",
      dataVersion: "2.0.0",
      progress: {},
      enabledExtensions: [],
      assessmentName: "",
      assessorName: "",
      useCaseDescription: "",
      sourceStructure: { byKey: {} },
      meta: { createdAt: "t", updatedAt: "t" },
    };
    expect(quick.requirementProgress).toBeUndefined();
  });

  it("a full assessment carries requirementProgress keyed by module.category.requirement", () => {
    const rp: RequirementProgress = {
      level: 3,
      applicability: true,
      notes: "why level 3",
      evidence: "link",
    };
    const full: Assessment = {
      id: "b",
      name: "Full",
      dataVersion: "2.0.0",
      progress: {},
      requirementProgress: { "G.strategy-and-vision.sponsor-support": rp },
      enabledExtensions: [],
      assessmentName: "",
      assessorName: "",
      useCaseDescription: "",
      organizationName: "Acme",
      assessorPosition: "external",
      assessmentType: "third-party",
      pkiEnvironment: { components: "CA + RA" },
      sourceStructure: { byKey: {} },
      meta: { createdAt: "t", updatedAt: "t" },
      lastView: "full",
    };
    expect(
      full.requirementProgress!["G.strategy-and-vision.sponsor-support"].level,
    ).toBe(3);
    expect(full.assessorPosition).toBe("external");
  });

  it("ProgressData carries an optional applicabilityReason", () => {
    const p: ProgressData = {
      level: -1,
      result: "Not Applicable",
      description: "",
      applicability: false,
      applicabilityReason: "out of scope for this use case",
    };
    expect(p.applicabilityReason).toBe("out of scope for this use case");
  });

  it("ProgressData accepts an optional notes string", () => {
    const p: ProgressData = {
      level: 0,
      result: "Not Assessed",
      description: "",
      applicability: true,
      notes: "some note",
    };
    expect(p.notes).toBe("some note");
  });

  it("Workspace and ActionPlans are well-formed", () => {
    const ws: Workspace = {
      intake: [{ questionId: "q1", question: "How many CAs?", answer: "3" }],
      pocs: [{ id: "p1", name: "Jane" }],
      checklist: [{ itemId: "c1", label: "Identify POCs", done: false }],
    };
    const ap = {
      categories: {
        "G.strategy-and-vision": { targetLevel: 4, objectives: "x" },
      },
    } as unknown as ActionPlans;
    expect(ws.intake![0].question).toBe("How many CAs?");
    expect(ap.categories!["G.strategy-and-vision"].targetLevel).toBe(4);
  });
});
