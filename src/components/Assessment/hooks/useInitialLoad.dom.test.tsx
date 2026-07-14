import { TextEncoder, TextDecoder } from "util";

// jsdom does not implement TextEncoder/TextDecoder; urlGenerator's
// base64 helpers (used to build a #progress= hash for the transient test)
// need them. Node's util implementations are sufficient here.
if (typeof globalThis.TextEncoder === "undefined") {
  (globalThis as { TextEncoder?: typeof TextEncoder }).TextEncoder =
    TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  (globalThis as unknown as { TextDecoder?: typeof TextDecoder }).TextDecoder =
    TextDecoder;
}

import { renderHook, waitFor } from "@testing-library/react";
import { generateURL } from "../../../utils/urlGenerator";
import type {
  SavedState,
  Assessment,
  ExtensionData,
} from "../../../types/types";
import { useInitialLoad } from "./useInitialLoad";

const readSavedState = jest.fn();
const listExtensions = jest.fn();

jest.mock("../../../utils/storageAdapter", () => ({
  getStorageAdapter: jest.fn(() =>
    Promise.resolve({
      backend: "indexeddb",
      readSavedState: (...args: unknown[]) =>
        (readSavedState as (...a: unknown[]) => Promise<unknown>)(...args),
      listExtensions: (...args: unknown[]) =>
        (listExtensions as (...a: unknown[]) => Promise<unknown>)(...args),
    }),
  ),
}));

const MODEL_YAML = `
schemaVersion: "2.0.0"
version: "2.0.0"
modules:
  - id: "G"
    name: "Governance"
    description: "Gov"
    categories:
      - id: "strategy-and-vision"
        weight: 5
        name: "Strategy and vision"
        description: "Strategy."
        levels:
          - number: 1
            name: "Initial"
            description: "Level 1 desc"
          - number: 2
            name: "Foundational"
            description: "Level 2 desc"
        requirements:
          - id: "r1"
            weight: 1
            description: "Requirement one"
            guidance: ""
            assessment: ""
            references: []
`;

const REFERENCES_YAML = `
schemaVersion: "1.0.0"
version: "1.0.0"
references:
  - id: "ref-1"
    title: "Reference One"
    url: "https://example.test/ref-1"
    authority: "ISO"
    regions: ["GLOBAL"]
`;

const MODEL_URL = "https://example.test/model.yaml";
const REFERENCES_URL = "https://example.test/references.yaml";

const RESPONSES: Record<string, string> = {
  [MODEL_URL]: MODEL_YAML,
  [REFERENCES_URL]: REFERENCES_YAML,
};

const mkExt = (
  id: string,
  compatibility: string[],
  references?: ExtensionData["references"],
): ExtensionData => ({
  schemaVersion: "1.0.0",
  extension: {
    id,
    name: `Extension ${id}`,
    version: "1.0.0",
    description: `test extension ${id}`,
    compatibility,
  },
  relevance: { modules: [] },
  ...(references ? { references } : {}),
});

const makeAssessment = (id: string, name: string): Assessment => ({
  id,
  name,
  dataVersion: "2.0.0",
  progress: {},
  enabledExtensions: [],
  assessmentName: name,
  assessorName: "",
  useCaseDescription: "",
  sourceStructure: { byKey: {} },
  meta: {
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
});

const flushEffects = async (): Promise<void> => {
  // The load effect chains several sequential awaits (adapter -> fetch ->
  // fetch -> fetch -> setState); give the microtask queue several turns.
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

describe("useInitialLoad", () => {
  beforeEach(() => {
    readSavedState.mockReset();
    listExtensions.mockReset();
    listExtensions.mockResolvedValue([]);
    global.fetch = jest.fn((url: string) => {
      const body = RESPONSES[url];
      if (body === undefined) {
        return Promise.reject(new Error(`unexpected fetch url: ${url}`));
      }
      return Promise.resolve({
        text: () => Promise.resolve(body),
      }) as unknown as Promise<Response>;
    }) as unknown as typeof fetch;
    localStorage.clear();
    window.location.hash = "";
  });

  it("normal branch: existing saved state with an activeId loads to the report tab", async () => {
    const state: SavedState = {
      stateSchemaVersion: 1,
      activeId: "a1",
      assessments: [makeAssessment("a1", "Existing")],
    };
    readSavedState.mockResolvedValue(state);

    const setSavedState = jest.fn();
    const setCurrentTab = jest.fn();
    const setStorageBackend = jest.fn();

    const { result } = renderHook(() =>
      useInitialLoad({
        src: MODEL_URL,
        references: null as unknown as string,
        setSavedState,
        setCurrentTab,
        setStorageBackend,
      }),
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());
    await waitFor(() => expect(setSavedState).toHaveBeenCalledWith(state));

    expect(setCurrentTab).toHaveBeenCalledWith("report");
    expect(setStorageBackend).toHaveBeenCalledWith("indexeddb");
    expect(result.current.data?.version).toBe("2.0.0");
  });

  it("auto-create branch: empty saved state + model creates a new empty assessment on overview", async () => {
    readSavedState.mockResolvedValue({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });

    const setSavedState = jest.fn();
    const setCurrentTab = jest.fn();
    const setStorageBackend = jest.fn();

    renderHook(() =>
      useInitialLoad({
        src: MODEL_URL,
        references: null as unknown as string,
        setSavedState,
        setCurrentTab,
        setStorageBackend,
      }),
    );

    await waitFor(() => expect(setCurrentTab).toHaveBeenCalledWith("overview"));

    expect(setSavedState).toHaveBeenCalledTimes(1);
    const arg = setSavedState.mock.calls[0][0] as SavedState;
    expect(arg.assessments).toHaveLength(1);
    expect(arg.activeId).toBe(arg.assessments[0].id);
    expect(arg.assessments[0].dataVersion).toBe("2.0.0");
  });

  it("transient hash branch: a #progress= hash creates a transient- assessment on the report tab", async () => {
    (globalThis as unknown as { window: Window }).window ??=
      window as unknown as Window;
    const url = generateURL({
      progress: {
        "G.strategy-and-vision": {
          level: 2,
          result: "2 - Foundational",
          description: "ignored, re-hydrated from source",
          applicability: true,
        },
      },
      enabledExtensions: [],
      dataVersion: "2.0.0",
      stateSchemaVersion: 1,
      assessmentName: "Shared Name",
      assessorName: "Shared Assessor",
      useCaseDescription: "Shared use case",
    });
    window.location.hash = new URL(url).hash;

    readSavedState.mockResolvedValue({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });

    const setSavedState = jest.fn();
    const setCurrentTab = jest.fn();
    const setStorageBackend = jest.fn();

    renderHook(() =>
      useInitialLoad({
        src: MODEL_URL,
        references: null as unknown as string,
        setSavedState,
        setCurrentTab,
        setStorageBackend,
      }),
    );

    await waitFor(() => expect(setCurrentTab).toHaveBeenCalledWith("report"));

    expect(setSavedState).toHaveBeenCalledTimes(1);
    const arg = setSavedState.mock.calls[0][0] as SavedState;
    expect(arg.activeId?.startsWith("transient-")).toBe(true);
    const transient = arg.assessments.find((a) => a.id === arg.activeId);
    expect(transient).toBeDefined();
    expect(transient?.assessmentName).toBe("Shared Name");
    // Re-hydrated from the source YAML's level-2 description, not the
    // (ignored) description carried in the hash payload.
    expect(transient?.progress["G.strategy-and-vision"].description).toBe(
      "Level 2 desc",
    );
  });

  it("v2 hash branch: a full param carries requirementProgress onto the transient", async () => {
    (globalThis as unknown as { window: Window }).window ??=
      window as unknown as Window;
    const url = generateURL({
      progress: {
        "G.strategy-and-vision": {
          level: 0,
          result: "Not Assessed",
          description: "",
          applicability: true,
        },
      },
      enabledExtensions: [],
      dataVersion: "2.0.0",
      stateSchemaVersion: 1,
      assessmentName: "Full Shared Name",
      assessorName: "Full Shared Assessor",
      useCaseDescription: "Full shared use case",
      modules: [
        {
          id: "G",
          name: "Governance",
          description: "",
          categories: [
            {
              id: "strategy-and-vision",
              weight: 5,
              name: "Strategy and vision",
              description: "",
              levels: [],
              requirements: [
                {
                  id: "r1",
                  weight: 1,
                  description: "Requirement one",
                  guidance: "",
                  assessment: "",
                  references: [],
                },
              ],
            },
          ],
        },
      ],
      requirementProgress: {
        "G.strategy-and-vision.r1": {
          level: 3,
          applicability: true,
          notes: "",
          evidence: "",
        },
      },
    });
    window.location.hash = new URL(url).hash;

    readSavedState.mockResolvedValue({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });

    const setSavedState = jest.fn();
    const setCurrentTab = jest.fn();
    const setStorageBackend = jest.fn();

    renderHook(() =>
      useInitialLoad({
        src: MODEL_URL,
        references: null as unknown as string,
        setSavedState,
        setCurrentTab,
        setStorageBackend,
      }),
    );

    await waitFor(() => expect(setCurrentTab).toHaveBeenCalledWith("report"));

    expect(setSavedState).toHaveBeenCalledTimes(1);
    const arg = setSavedState.mock.calls[0][0] as SavedState;
    const transient = arg.assessments.find((a) => a.id === arg.activeId);
    expect(transient).toBeDefined();
    expect(
      transient?.requirementProgress?.["G.strategy-and-vision.r1"],
    ).toEqual({ level: 3, applicability: true, notes: "", evidence: "" });
  });

  it("forward-compat branch: readSavedState throwing sets forwardCompatFailure and skips init", async () => {
    readSavedState.mockRejectedValue(
      new Error(
        "Saved state uses stateSchemaVersion 99; widget supports up to 1.",
      ),
    );

    const setSavedState = jest.fn();
    const setCurrentTab = jest.fn();
    const setStorageBackend = jest.fn();

    const { result } = renderHook(() =>
      useInitialLoad({
        src: MODEL_URL,
        references: null as unknown as string,
        setSavedState,
        setCurrentTab,
        setStorageBackend,
      }),
    );

    await waitFor(() =>
      expect(result.current.forwardCompatFailure).toBe(
        "Saved state uses stateSchemaVersion 99; widget supports up to 1.",
      ),
    );

    await flushEffects();
    expect(setSavedState).not.toHaveBeenCalled();
    expect(setCurrentTab).not.toHaveBeenCalled();
    // storageBackend IS set before the throw only when the adapter itself
    // resolves; here readSavedState (not getStorageAdapter) throws, so the
    // backend setter still fires with the resolved adapter's backend.
    expect(setStorageBackend).toHaveBeenCalledWith("indexeddb");
  });

  it("legacy branch: empty saved state + legacy key present sets hasLegacyData and legacyPrompt", async () => {
    const legacyPayload = {
      progress: {
        "G.1": {
          level: 2,
          result: "2 - Basic",
          description: "legacy",
          applicability: true,
        },
      },
      assessmentName: "Legacy Name",
      assessorName: "",
      useCaseDescription: "",
      enabledExtensions: [],
    };
    localStorage.setItem("assessmentData", JSON.stringify(legacyPayload));

    readSavedState.mockResolvedValue({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });

    const setSavedState = jest.fn();
    const setCurrentTab = jest.fn();
    const setStorageBackend = jest.fn();

    const { result } = renderHook(() =>
      useInitialLoad({
        src: MODEL_URL,
        references: null as unknown as string,
        setSavedState,
        setCurrentTab,
        setStorageBackend,
      }),
    );

    await waitFor(() => expect(result.current.hasLegacyData).toBe(true));
    await waitFor(() => expect(result.current.legacyPrompt).not.toBeNull());

    expect(result.current.legacyPrompt?.assessmentName).toBe("Legacy Name");
    // Legacy-detected branch: savedState stays the (empty) state as-is and
    // the widget lands on overview so the user can act on the prompt.
    await waitFor(() => expect(setCurrentTab).toHaveBeenCalledWith("overview"));
  });

  it("incompatible extension branch: an incompatible extension lands in incompatibleExtensionIds but stays in extensionsData", async () => {
    readSavedState.mockResolvedValue({
      stateSchemaVersion: 1,
      activeId: "a1",
      assessments: [makeAssessment("a1", "Existing")],
    });
    listExtensions.mockResolvedValue([
      mkExt("ext-a", ["2.0.0"]),
      mkExt("ext-b", ["1.0.0"]),
    ]);

    const setSavedState = jest.fn();
    const setCurrentTab = jest.fn();
    const setStorageBackend = jest.fn();

    const { result } = renderHook(() =>
      useInitialLoad({
        src: MODEL_URL,
        references: null as unknown as string,
        setSavedState,
        setCurrentTab,
        setStorageBackend,
      }),
    );

    await waitFor(() => expect(result.current.extensionsData).toHaveLength(2));

    expect(result.current.incompatibleExtensionIds.has("ext-b")).toBe(true);
    expect(result.current.incompatibleExtensionIds.has("ext-a")).toBe(false);
    expect(
      result.current.extensionsData
        .map((e: ExtensionData) => e.extension.id)
        .sort(),
    ).toEqual(["ext-a", "ext-b"]);
  });

  it("default branch: no stored extensions yields empty extensionsData/incompatibleExtensionIds and no extension fetch", async () => {
    readSavedState.mockResolvedValue({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });
    const fetchSpy = jest.spyOn(globalThis, "fetch");

    const { result } = renderHook(() =>
      useInitialLoad({
        src: MODEL_URL,
        references: null as unknown as string,
        setSavedState: jest.fn(),
        setCurrentTab: jest.fn(),
        setStorageBackend: jest.fn(),
      }),
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(listExtensions).toHaveBeenCalled();
    expect(result.current.extensionsData).toEqual([]);
    expect(result.current.incompatibleExtensionIds.size).toBe(0);
    // Extensions load from the store now — never from a URL — so no fetch
    // call should ever target something extension-shaped.
    expect(fetchSpy.mock.calls.some(([u]) => String(u).match(/ext/i))).toBe(
      false,
    );
  });

  it("stored extension references merge into referencesLookup", async () => {
    readSavedState.mockResolvedValue({
      stateSchemaVersion: 1,
      activeId: "a1",
      assessments: [makeAssessment("a1", "Existing")],
    });
    listExtensions.mockResolvedValue([
      mkExt(
        "ext-d",
        ["2.0.0"],
        [
          {
            id: "x-ref",
            title: "X",
            url: "https://example.test/x-ref",
            authority: "ISO",
            regions: ["GLOBAL"],
          },
        ],
      ),
    ]);

    const { result } = renderHook(() =>
      useInitialLoad({
        src: MODEL_URL,
        references: null as unknown as string,
        setSavedState: jest.fn(),
        setCurrentTab: jest.fn(),
        setStorageBackend: jest.fn(),
      }),
    );

    await waitFor(() =>
      expect(result.current.referencesLookup.get("x-ref")?.title).toBe("X"),
    );
  });

  it("populates referencesLookup from the references catalog (fire-and-forget)", async () => {
    readSavedState.mockResolvedValue({
      stateSchemaVersion: 1,
      activeId: "a1",
      assessments: [makeAssessment("a1", "Existing")],
    });

    const setSavedState = jest.fn();
    const setCurrentTab = jest.fn();
    const setStorageBackend = jest.fn();

    const { result } = renderHook(() =>
      useInitialLoad({
        src: MODEL_URL,
        references: REFERENCES_URL,
        setSavedState,
        setCurrentTab,
        setStorageBackend,
      }),
    );

    await waitFor(() =>
      expect(result.current.referencesLookup.get("ref-1")?.title).toBe(
        "Reference One",
      ),
    );
  });

  it("loads the bundled latest model (2.0.0) when no src is provided", async () => {
    readSavedState.mockResolvedValue({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });
    const fetchSpy = jest.spyOn(globalThis, "fetch");
    const { result } = renderHook(() =>
      useInitialLoad({
        src: undefined,
        references: undefined,
        setSavedState: jest.fn(),
        setCurrentTab: jest.fn(),
        setStorageBackend: jest.fn(),
      }),
    );
    await waitFor(() => expect(result.current.data?.version).toBe("2.0.0"));
    // Bundled path must not fetch the model or references.
    expect(
      fetchSpy.mock.calls.some(([u]) =>
        String(u).match(/pkimm-model|pkimm-references/),
      ),
    ).toBe(false);
  });

  it("populates referencesLookup from the bundled catalog when no referencesUrl", async () => {
    readSavedState.mockResolvedValue({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });
    const { result } = renderHook(() =>
      useInitialLoad({
        src: undefined,
        references: undefined,
        setSavedState: jest.fn(),
        setCurrentTab: jest.fn(),
        setStorageBackend: jest.fn(),
      }),
    );
    await waitFor(() =>
      expect(result.current.referencesLookup.size).toBeGreaterThan(0),
    );
    // A known id from the bundled catalog resolves (proves the RIGHT catalog
    // loaded, not just a non-empty map).
    expect(
      result.current.referencesLookup.get("cab-baseline-requirements")?.title,
    ).toBe("CA/B Forum baseline requirements");
  });

  it("checks extension compatibility against the bundled default model version", async () => {
    readSavedState.mockResolvedValue({
      stateSchemaVersion: 1,
      activeId: null,
      assessments: [],
    });
    // A single stored extension declaring `compatibility: ["2.0.0"]`. Assert
    // it loads and is NOT marked incompatible (i.e. compatibility was checked
    // against 2.0.0, the bundled default, not "1.0.0").
    listExtensions.mockResolvedValue([mkExt("ext-c", ["2.0.0"])]);
    const { result } = renderHook(() =>
      useInitialLoad({
        src: undefined,
        references: undefined,
        setSavedState: jest.fn(),
        setCurrentTab: jest.fn(),
        setStorageBackend: jest.fn(),
      }),
    );
    await waitFor(() => expect(result.current.extensionsData.length).toBe(1));
    expect(result.current.incompatibleExtensionIds.size).toBe(0);
  });
});
