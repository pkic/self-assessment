import { fetchTextWithLimit } from "./fetch";

describe("bounded remote text loading", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns a response whose streamed bytes remain within the limit", async () => {
    globalThis.fetch = jest.fn(async () => new Response("safe model"));
    await expect(
      fetchTextWithLimit("https://example.test/model", "model", 32),
    ).resolves.toBe("safe model");
  });

  it("rejects an oversized declared response before reading it", async () => {
    globalThis.fetch = jest.fn(
      async () =>
        new Response("small", {
          headers: { "content-length": "1024" },
        }),
    );
    await expect(
      fetchTextWithLimit("https://example.test/model", "model", 16),
    ).rejects.toThrow("exceeds the 16-byte safety limit");
  });

  it("rejects streamed bytes when content-length is absent or false", async () => {
    globalThis.fetch = jest.fn(async () => new Response("x".repeat(33)));
    await expect(
      fetchTextWithLimit("https://example.test/model", "model", 32),
    ).rejects.toThrow("exceeds the 32-byte safety limit");
  });
});
