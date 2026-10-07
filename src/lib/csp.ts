// Content Security Policy for every page, built per request in proxy.ts.
//
// - Scripts: only those carrying this request's nonce. Next adds it to its own
//   scripts; 'strict-dynamic' then trusts whatever they load (Vercel Speed
//   Insights today; Google Tag Manager, Analytics or AdSense later, as long as
//   their loader tag carries the nonce). 'unsafe-inline' and https: are only
//   fallbacks for browsers too old to understand nonces; modern ones ignore them.
// - Styles allow inline because the UI sets style attributes.
// - Google's analytics and ad domains are allowed ahead of time for frames and
//   network requests, so adding GA/GTM or AdSense doesn't need a policy change.
//
// Rollout: report-only until CSP_ENFORCE=1. Violations are posted to
// /api/csp-report and appear in the server logs as "[csp]" lines.

const GOOGLE_ANALYTICS_AND_ADS = [
  'https://*.google.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://*.googletagmanager.com',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://*.gstatic.com',
  'https://*.adtrafficquality.google',
];

export const CSP_REPORT_PATH = '/api/csp-report';

export const cspEnforced = () => process.env.CSP_ENFORCE === '1';

/** The header the policy travels in: report-only (logs, blocks nothing) until it is enforced. */
export const cspHeaderName = () => (cspEnforced() ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only');

export function contentSecurityPolicy(nonce: string, { dev = false, enforce = cspEnforced() } = {}) {
  const directives: [string, ...string[]][] = [
    ['default-src', "'self'"],
    ['script-src', "'self'", `'nonce-${nonce}'`, "'strict-dynamic'", "'unsafe-inline'", 'https:', ...(dev ? ["'unsafe-eval'"] : [])],
    ['style-src', "'self'", "'unsafe-inline'"],
    ['img-src', "'self'", 'data:', 'blob:', 'https:'],
    ['font-src', "'self'", 'data:'],
    ['connect-src', "'self'", ...GOOGLE_ANALYTICS_AND_ADS, ...(dev ? ['ws:', 'wss:'] : [])],
    ['frame-src', "'self'", ...GOOGLE_ANALYTICS_AND_ADS],
    ['worker-src', "'self'", 'blob:'],
    ['manifest-src', "'self'"],
    ['object-src', "'none'"],
    ['base-uri', "'self'"],
    ['form-action', "'self'"],
    ['frame-ancestors', "'none'"],
    // Browsers ignore this one in report-only mode, and on http://localhost it would break the dev server.
    ...(enforce && !dev ? [['upgrade-insecure-requests'] as [string]] : []),
    ['report-uri', CSP_REPORT_PATH],
    ['report-to', 'csp'],
  ];
  return directives.map((d) => d.join(' ')).join('; ');
}

export interface CspViolation {
  directive?: string;
  blocked?: string;
  page?: string;
  source?: string;
  line?: number;
  sample?: string;
  disposition?: string;
}

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 300) : undefined);

/**
 * Violations from a report body in either format browsers send: the Reporting API
 * (`application/reports+json`, an array) or the older `application/csp-report`.
 */
export function parseCspReports(body: unknown, max = 20): CspViolation[] {
  const reports: Raw[] = Array.isArray(body)
    ? body.filter((r): r is Raw => Boolean(r) && typeof r === 'object' && (r as Raw).type === 'csp-violation').map((r) => (r.body ?? {}) as Raw)
    : body && typeof body === 'object' && (body as Raw)['csp-report'] && typeof (body as Raw)['csp-report'] === 'object'
      ? [(body as Raw)['csp-report'] as Raw]
      : [];
  return reports.slice(0, max).map((r) => ({
    directive: str(r.effectiveDirective ?? r['effective-directive'] ?? r['violated-directive']),
    blocked: str(r.blockedURL ?? r['blocked-uri']),
    page: str(r.documentURL ?? r['document-uri']),
    source: str(r.sourceFile ?? r['source-file']),
    line: typeof (r.lineNumber ?? r['line-number']) === 'number' ? Number(r.lineNumber ?? r['line-number']) : undefined,
    sample: str(r.sample ?? r['script-sample']),
    disposition: str(r.disposition),
  }));
}
