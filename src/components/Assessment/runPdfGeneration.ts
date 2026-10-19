import { ReportTooLargeError } from "../../utils/inputLimits";

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

/** `onError` for both PDF export handlers: logs the error and, when the report
 *  was refused for holding too much text, tells the user why. */
export const reportPdfExportError = (error: unknown): void => {
  console.error("Error exporting to PDF:", error);
  if (error instanceof ReportTooLargeError) globalThis.alert(error.message);
};
