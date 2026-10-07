import 'server-only';

// A small in-process cache for catalog data that changes rarely (exam
// blueprints, study notes, question pools and counts). Every page reads it,
// and each read would otherwise be a database round trip.
//
// - Promises are cached, so concurrent callers share one query.
// - Failures are never cached.
// - Entries expire after their TTL; admin writes clear the catalog at once in
//   this process, and other server instances catch up within the TTL.

interface Entry { at: number; ttl: number; value: Promise<unknown> }

const g = globalThis as unknown as { __quizzmonkeyCache?: Map<string, Entry> };
const store = (g.__quizzmonkeyCache ??= new Map());

export const CATALOG_TTL = 5 * 60_000;

export function cached<T>(key: string, fn: () => Promise<T>, ttl = CATALOG_TTL): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value as Promise<T>;
  const value = fn().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, { at: Date.now(), ttl, value });
  return value;
}

/** Drops cached catalog entries (all of them, or those whose key starts with `prefix`). */
export function invalidateCatalog(prefix = '') {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
