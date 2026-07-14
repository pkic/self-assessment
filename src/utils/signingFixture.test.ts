/**
 * Permanent fixture: proves the assessment-export signing pipeline —
 * JCS (RFC 8785) canonical bytes + detached b64:false ES256 JWS —
 * round-trips with the libraries the widget will ship.
 * jose v6 emits payload: "" for b64:false + Uint8Array payload — the
 * flattened JWS is already detached.
 * Requires NODE_OPTIONS=--experimental-vm-modules (jose v6 is ESM-only);
 * the ExperimentalWarning is disabled in the npm test script for clean output.
 */
import canonicalize from "canonicalize";
import { FlattenedSign, flattenedVerify, generateKeyPair } from "jose";

const sampleExport = {
  formatVersion: 2,
  kind: "pkimm-assessment",
  profile: "certification",
  // "3.0.0" here is a sample value illustrating the signed export format,
  // not a claim about the widget's actual package version.
  tool: { name: "@pkic/self-assessment", version: "3.0.0" },
  exportedAt: "2026-07-05T12:00:00.000Z",
  assessment: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Fixture",
    dataVersion: "2.0.0",
    progress: {
      "G.strategy-and-vision": {
        level: 3,
        result: "Advanced",
        description: "",
        applicability: true,
      },
    },
  },
};

describe("JCS canonicalization (RFC 8785)", () => {
  it("is independent of object key order, including nested objects", () => {
    // Manual reconstruction with different insertion order at BOTH levels.
    // (Never use JSON.stringify replacer-arrays for this — they are a
    // recursive allow-list and empty out nested objects; verified.)
    const shuffled = {
      assessment: {
        dataVersion: sampleExport.assessment.dataVersion,
        progress: {
          "G.strategy-and-vision": {
            applicability: true,
            description: "",
            result: "Advanced",
            level: 3,
          },
        },
        name: sampleExport.assessment.name,
        id: sampleExport.assessment.id,
      },
      kind: sampleExport.kind,
      exportedAt: sampleExport.exportedAt,
      formatVersion: sampleExport.formatVersion,
      profile: sampleExport.profile,
      tool: {
        version: sampleExport.tool.version,
        name: sampleExport.tool.name,
      },
    };
    expect(canonicalize(shuffled)).toBe(canonicalize(sampleExport));
  });

  it("is byte-stable across repeat calls", () => {
    expect(canonicalize(sampleExport)).toBe(canonicalize(sampleExport));
  });
});

describe("detached b64:false ES256 JWS over JCS bytes", () => {
  it("signs and verifies; tampered payload fails", async () => {
    const { publicKey, privateKey } = await generateKeyPair("ES256");
    // canonicalize returns undefined only for undefined input — never the case here
    const payload = new TextEncoder().encode(canonicalize(sampleExport)!);

    const jws = await new FlattenedSign(payload)
      .setProtectedHeader({ alg: "ES256", b64: false, crit: ["b64"] })
      .sign(privateKey);
    // Empirically verified: b64:false + Uint8Array → payload member is ""
    expect(jws.payload).toBe("");

    const verified = await flattenedVerify({ ...jws, payload }, publicKey);
    // protectedHeader is always present after a successful flattenedVerify
    expect(verified.protectedHeader!.alg).toBe("ES256");

    const tampered = new TextEncoder().encode(
      canonicalize({
        ...sampleExport,
        exportedAt: "2027-01-01T00:00:00.000Z",
      })!,
    );
    await expect(
      flattenedVerify({ ...jws, payload: tampered }, publicKey),
    ).rejects.toThrow();
  });
});
