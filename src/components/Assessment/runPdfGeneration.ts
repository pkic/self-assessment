/** Shared wrapper for both PDF export handlers: drives the generating-modal
 *  state and the chart-capture begin/end pair around the caller-supplied
 *  `generate` closure. `endCapture` and `setGenerating(false)` always run —
 *  including when `generate` throws — because they live in `finally`, not
 *  after the `await`. */
export const runPdfGeneration = async (deps: {
  setGenerating: (v: boolean) => void;
  beginCapture: () => void;
  endCapture: () => void;
  generate: () => Promise<void>;
  onError?: (e: unknown) => void;
}): Promise<void> => {
  deps.setGenerating(true);
  try {
    deps.beginCapture();
    await deps.generate();
  } catch (e) {
    deps.onError?.(e);
  } finally {
    deps.endCapture();
    deps.setGenerating(false);
  }
};
