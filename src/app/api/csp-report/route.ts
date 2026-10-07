import { parseCspReports } from '@/lib/csp';

// Browsers post Content Security Policy violations here (no session, by design). Each one is
// logged as a compact "[csp]" line, readable in Vercel's runtime logs. Oversized bodies and
// anything that isn't a report are ignored.
const MAX_BODY = 64 * 1024;

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length <= MAX_BODY) {
    try {
      for (const v of parseCspReports(JSON.parse(text))) console.warn('[csp]', JSON.stringify(v));
    } catch {
      // not JSON: nothing to log
    }
  }
  return new Response(null, { status: 204 });
}
