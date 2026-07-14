import { summarizeWorkspaceLinks } from "./workspaceLinks";

const options = {
  pocs: [
    { id: "poc1", name: "Jane Doe", role: "PKI Admin" },
    { id: "poc2", name: "Sam Lee" },
  ],
  artifacts: [
    { id: "art1", title: "CPS document" },
    { id: "art2", title: "Key ceremony log" },
    { id: "art3", title: "HSM inventory" },
  ],
};

test("returns 'none yet' when nothing is linked", () => {
  expect(summarizeWorkspaceLinks(undefined, options)).toBe("none yet");
  expect(summarizeWorkspaceLinks({}, options)).toBe("none yet");
});

test("POC only resolves the name", () => {
  expect(summarizeWorkspaceLinks({ pocId: "poc1" }, options)).toBe("Jane Doe");
});

test("an unresolved pocId is skipped", () => {
  expect(summarizeWorkspaceLinks({ pocId: "ghost" }, options)).toBe("none yet");
});

test("a single artifact shows its title, not a count", () => {
  expect(summarizeWorkspaceLinks({ artifactIds: ["art2"] }, options)).toBe(
    "Key ceremony log",
  );
});

test("multiple artifacts show a count", () => {
  expect(
    summarizeWorkspaceLinks({ artifactIds: ["art1", "art3"] }, options),
  ).toBe("2 artifacts");
});

test("duplicate and unresolved artifact ids are counted once / skipped", () => {
  expect(
    summarizeWorkspaceLinks(
      { artifactIds: ["art1", "art1", "ghost"] },
      options,
    ),
  ).toBe("CPS document");
});

test("interview date only", () => {
  expect(
    summarizeWorkspaceLinks({ interviewDate: "2026-08-01" }, options),
  ).toBe("interview 2026-08-01");
});

test("all three parts join in POC · artifacts · interview order", () => {
  expect(
    summarizeWorkspaceLinks(
      {
        pocId: "poc1",
        artifactIds: ["art1", "art2"],
        interviewDate: "2026-08-01",
      },
      options,
    ),
  ).toBe("Jane Doe · 2 artifacts · interview 2026-08-01");
});
