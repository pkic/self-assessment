import { withWriteLock, acquireEditLock, createTabSync } from "./tabSync";

type LockGrantedCallback = (lock: unknown) => Promise<unknown>;
type LocksLike = {
  request: (
    name: string,
    optsOrCb: { ifAvailable?: boolean } | LockGrantedCallback,
    cb?: LockGrantedCallback,
  ) => Promise<unknown>;
};

const setNavigator = (locks: LocksLike | undefined): void => {
  Object.defineProperty(globalThis, "navigator", {
    value: locks ? { locks } : {},
    configurable: true,
    writable: true,
  });
};

afterEach(() => {
  delete (globalThis as { navigator?: unknown }).navigator;
});

describe("withWriteLock", () => {
  it("runs the function directly when Web Locks are unavailable", async () => {
    setNavigator(undefined);
    expect(await withWriteLock(async () => 42)).toBe(42);
  });

  it("routes through navigator.locks.request when available", async () => {
    const calls: string[] = [];
    setNavigator({
      request: async (name, cb) => {
        calls.push(name);
        return (cb as LockGrantedCallback)({});
      },
    });
    expect(await withWriteLock(async () => "ok")).toBe("ok");
    expect(calls).toEqual(["pkimm-sa-write"]);
  });
});

describe("acquireEditLock", () => {
  it("returns a handle when no lock API exists (single-tab assumption)", async () => {
    setNavigator(undefined);
    const handle = await acquireEditLock("id-1");
    expect(handle).not.toBeNull();
    handle!.release();
  });

  it("returns null when the lock is already held elsewhere", async () => {
    setNavigator({
      request: async (_name, _opts, cb) => (cb as LockGrantedCallback)(null),
    });
    expect(await acquireEditLock("id-1")).toBeNull();
  });

  it("holds the lock until release() and uses the per-assessment name", async () => {
    let requestedName = "";
    let lockResolved = false;
    setNavigator({
      request: async (name, _opts, cb) => {
        requestedName = name;
        await (cb as LockGrantedCallback)({}).then(() => {
          lockResolved = true;
        });
        return undefined;
      },
    });
    const handle = await acquireEditLock("abc");
    expect(requestedName).toBe("pkimm-sa-edit-abc");
    expect(handle).not.toBeNull();
    expect(lockResolved).toBe(false);
    handle!.release();
    await new Promise((r) => setTimeout(r, 0));
    expect(lockResolved).toBe(true);
  });
});

describe("createTabSync", () => {
  it("is a safe no-op without BroadcastChannel", () => {
    const original = (globalThis as { BroadcastChannel?: unknown })
      .BroadcastChannel;
    delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    const sync = createTabSync(() => {});
    expect(() => sync.notify()).not.toThrow();
    sync.close();
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = original;
  });

  it("notifies other channels, not itself (Node ships BroadcastChannel)", async () => {
    let external = 0;
    const receiver = createTabSync(() => {
      external += 1;
    });
    const sender = createTabSync(() => {
      throw new Error("sender must not receive its own notify");
    });
    sender.notify();
    await new Promise((r) => setTimeout(r, 20));
    expect(external).toBe(1);
    receiver.close();
    sender.close();
  });
});
