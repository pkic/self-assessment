import { runPdfGeneration } from "./runPdfGeneration";

describe("runPdfGeneration", () => {
  it("calls setGenerating(true) -> beginCapture -> generate -> endCapture -> setGenerating(false) on success", async () => {
    const calls: string[] = [];
    const setGenerating = jest.fn((v: boolean) =>
      calls.push(`setGenerating(${v})`),
    );
    const beginCapture = jest.fn(() => calls.push("beginCapture"));
    const endCapture = jest.fn(() => calls.push("endCapture"));
    const generate = jest.fn(async () => {
      calls.push("generate");
    });
    const onError = jest.fn();

    await runPdfGeneration({
      setGenerating,
      beginCapture,
      endCapture,
      generate,
      onError,
    });

    expect(calls).toEqual([
      "setGenerating(true)",
      "beginCapture",
      "generate",
      "endCapture",
      "setGenerating(false)",
    ]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("still runs endCapture and setGenerating(false) and reports the error when generate rejects", async () => {
    const calls: string[] = [];
    const setGenerating = jest.fn((v: boolean) =>
      calls.push(`setGenerating(${v})`),
    );
    const beginCapture = jest.fn(() => calls.push("beginCapture"));
    const endCapture = jest.fn(() => calls.push("endCapture"));
    const error = new Error("boom");
    const generate = jest.fn(async () => {
      calls.push("generate");
      throw error;
    });
    const onError = jest.fn();

    await runPdfGeneration({
      setGenerating,
      beginCapture,
      endCapture,
      generate,
      onError,
    });

    expect(calls).toEqual([
      "setGenerating(true)",
      "beginCapture",
      "generate",
      "endCapture",
      "setGenerating(false)",
    ]);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("does not throw when onError is omitted and generate rejects", async () => {
    const endCapture = jest.fn();
    const setGenerating = jest.fn();
    await expect(
      runPdfGeneration({
        setGenerating,
        beginCapture: jest.fn(),
        endCapture,
        generate: async () => {
          throw new Error("boom");
        },
      }),
    ).resolves.toBeUndefined();
    expect(endCapture).toHaveBeenCalledTimes(1);
    expect(setGenerating).toHaveBeenCalledWith(false);
  });
});
