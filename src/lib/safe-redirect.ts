/**
 * Returns `next` only when it is a same-site path, otherwise `fallback`.
 *
 * `startsWith('/')` alone is not enough: browsers treat `//evil.example`
 * and `/\evil.example` as links to another host, and they strip tabs and
 * newlines, so `/\t/evil.example` becomes `//evil.example`.
 */
export function safeRedirectPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  if (next.includes('\\') || /[\u0000- \u007f]/.test(next)) return fallback;
  const base = 'http://quizzmonkey.invalid';
  try {
    return new URL(next, base).origin === base ? next : fallback;
  } catch {
    return fallback;
  }
}
