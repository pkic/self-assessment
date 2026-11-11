import {
  unzlibSync,
  type AsyncTerminable,
  type AsyncUnzlibOptions,
  type FlateCallback,
  type FlateError,
  type UnzlibOptions,
} from "fflate/browser";

export * from "fflate/browser";

/** `png-js` inflates a PNG's IDAT stream with fflate's async `unzlib`, which
 *  runs in a Web Worker created from a `blob:` URL. That is how the report's
 *  chart image reaches the PDF, so every export depends on it.
 *
 *  A strict Content-Security-Policy that does not allow `worker-src blob:`
 *  blocks the worker, and the browser reports it by firing an `error` event
 *  rather than throwing. fflate's worker glue only listens for `message`, so
 *  the callback is never invoked, `pdf().toBlob()` never settles, and the
 *  generating modal spins forever.
 *
 *  Webpack aliases `fflate` to this module so that call inflates on the main
 *  thread instead. For chart-sized images the cost is sub-millisecond, and it
 *  makes the export work under any CSP — which matters because the widget is
 *  embedded on sites whose headers we do not control. Everything else fflate
 *  exports is re-exported untouched. */

/** Mirrors fflate's own async-to-sync option mapping. */
const toSyncOptions = (
  opts: AsyncUnzlibOptions | undefined,
): UnzlibOptions<ArrayBuffer> | undefined =>
  opts && {
    out: opts.size ? new Uint8Array(opts.size) : undefined,
    dictionary: opts.dictionary,
  };

export function unzlib(
  data: Uint8Array,
  opts: AsyncUnzlibOptions,
  cb: FlateCallback,
): AsyncTerminable;
export function unzlib(data: Uint8Array, cb: FlateCallback): AsyncTerminable;
export function unzlib(
  data: Uint8Array,
  optsOrCb: AsyncUnzlibOptions | FlateCallback,
  maybeCb?: FlateCallback,
): AsyncTerminable {
  const isCallbackOnly = typeof optsOrCb === "function";
  const cb = (isCallbackOnly ? optsOrCb : maybeCb) as FlateCallback;
  const opts = isCallbackOnly ? undefined : optsOrCb;

  try {
    cb(null, unzlibSync<ArrayBuffer>(data, toSyncOptions(opts)));
  } catch (err) {
    // fflate passes `null` data alongside an error; match that shape.
    cb(err as FlateError, null as unknown as Uint8Array<ArrayBuffer>);
  }

  // Nothing ran off-thread, so there is no worker left to terminate.
  return () => {};
}
