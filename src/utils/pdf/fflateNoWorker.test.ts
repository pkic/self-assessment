import { zlibSync, strToU8, strFromU8, type FlateError } from "fflate/browser";
import { unzlib, unzlibSync } from "./fflateNoWorker";

/** `png-js` inflates a PNG's IDAT stream with `unzlib(data, cb)`, and fflate
 *  services that call in a Web Worker built from a `blob:` URL. A strict
 *  Content-Security-Policy without `worker-src blob:` blocks that worker, and
 *  because fflate's worker glue only listens for `message` — never `error` —
 *  the callback is never invoked and the PDF promise never settles. This
 *  module replaces `unzlib` with a main-thread equivalent, so the only thing
 *  worth pinning here is that it decodes correctly and starts no worker. */
describe("fflateNoWorker", () => {
  const globals = globalThis as { Worker?: unknown };
  const originalWorker = globals.Worker;
  let workerCtor: jest.Mock;

  beforeEach(() => {
    workerCtor = jest.fn();
    globals.Worker = workerCtor;
  });

  afterEach(() => {
    globals.Worker = originalWorker;
  });

  it("inflates zlib data through the callback without constructing a Worker", () => {
    const payload = strToU8("PKI Maturity Model report chart ".repeat(64));
    const cb = jest.fn();

    unzlib(zlibSync(payload), cb);

    expect(cb).toHaveBeenCalledTimes(1);
    const [err, data] = cb.mock.calls[0] as [FlateError | null, Uint8Array];
    expect(err).toBeNull();
    expect(strFromU8(data)).toBe(strFromU8(payload));
    expect(workerCtor).not.toHaveBeenCalled();
  });

  it("accepts the (data, opts, cb) overload as well", () => {
    const payload = strToU8("chart");
    const cb = jest.fn();

    unzlib(zlibSync(payload), {}, cb);

    expect(cb).toHaveBeenCalledTimes(1);
    const [err, data] = cb.mock.calls[0] as [FlateError | null, Uint8Array];
    expect(err).toBeNull();
    expect(strFromU8(data)).toBe("chart");
    expect(workerCtor).not.toHaveBeenCalled();
  });

  it("reports corrupt input through the callback instead of leaving it pending", () => {
    const cb = jest.fn();

    expect(() =>
      unzlib(new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9]), cb),
    ).not.toThrow();

    expect(cb).toHaveBeenCalledTimes(1);
    const [err, data] = cb.mock.calls[0] as [FlateError | null, Uint8Array];
    expect(err).toBeInstanceOf(Error);
    expect(data).toBeNull();
    expect(workerCtor).not.toHaveBeenCalled();
  });

  it("returns a callable terminable, as fflate's own signature promises", () => {
    const handle = unzlib(zlibSync(strToU8("x")), jest.fn());

    expect(typeof handle).toBe("function");
    expect(() => handle()).not.toThrow();
  });

  it("re-exports the rest of the fflate API it stands in for", () => {
    expect(strFromU8(unzlibSync(zlibSync(strToU8("kept"))))).toBe("kept");
  });
});
