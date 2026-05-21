import { generateURL, decodeProgressHash, base64ToUtf8 } from "./urlGenerator";

describe("generateURL", () => {
  beforeEach(() => {
    delete (global as { window?: unknown }).window;
    (global as unknown as { window: Window }).window = {
      location: { href: "https://example.test/" },
    } as Window;
  });

  it("encodes dataVersion and stateSchemaVersion in the hash payload", () => {
    const url = generateURL({
      progress: {
        "G.strategy-and-vision": {
          level: 3,
          result: "3 - Advanced",
          description: "x",
          applicability: true,
        },
      },
      enabledExtensions: [{ id: "pqc", version: "0.2.0" }],
      dataVersion: "2.0.0",
      stateSchemaVersion: 1,
      assessmentName: "X",
      assessorName: "Y",
      useCaseDescription: "Z",
    });
    const hash = new URL(url).hash.slice(1);
    const params = new URLSearchParams(hash);
    const payload = JSON.parse(base64ToUtf8(params.get("progress")!));
    expect(payload.dataVersion).toBe("2.0.0");
    expect(payload.stateSchemaVersion).toBe(1);
    expect(payload.enabledExtensions[0]).toEqual({
      id: "pqc",
      version: "0.2.0",
    });
  });
});

describe("decodeProgressHash", () => {
  beforeEach(() => {
    delete (global as { window?: unknown }).window;
    (global as unknown as { window: Window }).window = {
      location: { href: "https://example.test/" },
    } as Window;
  });

  it("returns parsed payload for a new-format hash", () => {
    const url = generateURL({
      progress: {},
      enabledExtensions: [],
      dataVersion: "2.0.0",
      stateSchemaVersion: 1,
      assessmentName: "",
      assessorName: "",
      useCaseDescription: "",
    });
    const out = decodeProgressHash(new URL(url).hash.slice(1));
    expect(out?.dataVersion).toBe("2.0.0");
    expect(out?.stateSchemaVersion).toBe(1);
  });

  it("defaults missing dataVersion to 1.0.0 (legacy compat)", () => {
    const legacy = btoa(
      JSON.stringify({ progress: {}, enabledExtensions: [] }),
    );
    const out = decodeProgressHash(`progress=${legacy}`);
    expect(out?.dataVersion).toBe("1.0.0");
    expect(out?.stateSchemaVersion).toBe(1);
  });

  it("rejects an unknown future stateSchemaVersion", () => {
    const future = btoa(
      JSON.stringify({
        progress: {},
        enabledExtensions: [],
        stateSchemaVersion: 9999,
      }),
    );
    expect(() => decodeProgressHash(`progress=${future}`)).toThrow(
      /stateSchemaVersion/,
    );
  });
});
