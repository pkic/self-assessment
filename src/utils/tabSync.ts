/** Multi-tab coordination: Web Locks coordinate writes (auto-released
 *  on tab crash), BroadcastChannel signals "state changed, re-read". The
 *  `storage` event does not fire for IndexedDB, so this replaces it.
 *  Callers must skip this wiring entirely when the storage backend is
 *  "memory" — it provides single-tab semantics only. */

const WRITE_LOCK_NAME = "pkimm-sa-write";
const CHANNEL_NAME = "pkimm-sa";
export const editLockName = (assessmentId: string): string =>
  `pkimm-sa-edit-${assessmentId}`;

type LockGrantedCallback = (lock: unknown) => Promise<unknown>;
interface LocksApi {
  request(
    name: string,
    optsOrCb: { ifAvailable?: boolean } | LockGrantedCallback,
    cb?: LockGrantedCallback,
  ): Promise<unknown>;
}

const getLocks = (): LocksApi | null => {
  const nav = (globalThis as { navigator?: { locks?: LocksApi } }).navigator;
  return nav?.locks ?? null;
};

export const withWriteLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const locks = getLocks();
  if (!locks) return fn();
  return locks.request(
    WRITE_LOCK_NAME,
    fn as LockGrantedCallback,
  ) as Promise<T>;
};

export interface EditLockHandle {
  release(): void;
}

/** Exclusive per-assessment edit lock. Resolves null when another tab holds
 *  it. Held by a never-resolving callback until release(). */
export const acquireEditLock = async (
  assessmentId: string,
): Promise<EditLockHandle | null> => {
  const locks = getLocks();
  if (!locks) return { release: () => {} };
  return new Promise((resolveOuter) => {
    void locks.request(
      editLockName(assessmentId),
      { ifAvailable: true },
      (lock) =>
        new Promise<void>((releaseLock) => {
          if (!lock) {
            resolveOuter(null);
            releaseLock();
            return;
          }
          resolveOuter({ release: () => releaseLock() });
        }),
    );
  });
};

export interface TabSync {
  notify(): void;
  close(): void;
}

export const createTabSync = (onExternalChange: () => void): TabSync => {
  const BC = (globalThis as { BroadcastChannel?: typeof BroadcastChannel })
    .BroadcastChannel;
  if (!BC) return { notify: () => {}, close: () => {} };
  const channel = new BC(CHANNEL_NAME);
  channel.onmessage = () => onExternalChange();
  return {
    notify: () => channel.postMessage("changed"),
    close: () => channel.close(),
  };
};
