import { NextRequest } from 'next/server';
import { afterEach, describe, expect, test } from 'vitest';
import { contentSecurityPolicy, cspHeaderName, parseCspReports } from '@/lib/csp';
import { config, proxy } from '@/proxy';

const original = process.env.CSP_ENFORCE;
afterEach(() => {
  if (original === undefined) delete process.env.CSP_ENFORCE;
  else process.env.CSP_ENFORCE = original;
});

const directive = (policy: string, name: string) => policy.split('; ').find((d) => d.startsWith(`${name} `) || d === name);

describe('content security policy', () => {
  test('scripts need the nonce; framing, plugins and base tags are shut', () => {
    const policy = contentSecurityPolicy('abc123', { dev: false, enforce: false });
    expect(directive(policy, 'script-src')).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic' 'unsafe-inline' https:");
    expect(directive(policy, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(policy, 'object-src')).toBe("object-src 'none'");
    expect(directive(policy, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(policy, 'report-uri')).toBe('report-uri /api/csp-report');
    expect(directive(policy, 'report-to')).toBe('report-to csp');
    expect(policy).not.toContain('unsafe-eval');
    expect(directive(policy, 'upgrade-insecure-requests')).toBeUndefined();
  });

  test('allows Google Analytics, Tag Manager and AdSense requests and frames ahead of time', () => {
    const policy = contentSecurityPolicy('n', { dev: false, enforce: false });
    for (const d of ['connect-src', 'frame-src']) {
      for (const host of ['https://*.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.googlesyndication.com', 'https://*.doubleclick.net']) {
        expect(directive(policy, d)).toContain(host);
      }
    }
  });

  test('development adds eval and the dev server socket; enforcing in production upgrades http', () => {
    const dev = contentSecurityPolicy('n', { dev: true, enforce: true });
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(dev, 'connect-src')).toContain('ws:');
    expect(directive(dev, 'upgrade-insecure-requests')).toBeUndefined();
    expect(directive(contentSecurityPolicy('n', { dev: false, enforce: true }), 'upgrade-insecure-requests')).toBe('upgrade-insecure-requests');
  });

  test('report-only until CSP_ENFORCE=1', () => {
    delete process.env.CSP_ENFORCE;
    expect(cspHeaderName()).toBe('Content-Security-Policy-Report-Only');
    process.env.CSP_ENFORCE = '1';
    expect(cspHeaderName()).toBe('Content-Security-Policy');
  });
});

describe('violation reports', () => {
  test('reads the Reporting API format and the older csp-report format', () => {
    const modern = [
      { type: 'csp-violation', body: { documentURL: 'https://q.app/x', effectiveDirective: 'script-src-elem', blockedURL: 'https://evil.example/a.js', disposition: 'report', lineNumber: 3 } },
      { type: 'deprecation', body: { id: 'x' } },
    ];
    expect(parseCspReports(modern)).toEqual([{ directive: 'script-src-elem', blocked: 'https://evil.example/a.js', page: 'https://q.app/x', source: undefined, line: 3, sample: undefined, disposition: 'report' }]);
    const legacy = { 'csp-report': { 'document-uri': 'https://q.app/y', 'violated-directive': 'img-src', 'blocked-uri': 'data' } };
    expect(parseCspReports(legacy)).toMatchObject([{ directive: 'img-src', blocked: 'data', page: 'https://q.app/y' }]);
  });

  test('ignores junk, caps the count and trims long values', () => {
    expect(parseCspReports('nope')).toEqual([]);
    expect(parseCspReports({ hello: 1 })).toEqual([]);
    const many = Array.from({ length: 50 }, () => ({ type: 'csp-violation', body: { blockedURL: 'x'.repeat(1000) } }));
    const parsed = parseCspReports(many);
    expect(parsed).toHaveLength(20);
    expect(parsed[0].blocked).toHaveLength(300);
  });
});

describe('proxy', () => {
  test('pages get a fresh nonce in a report-only policy', () => {
    delete process.env.CSP_ENFORCE;
    const a = proxy(new NextRequest('https://quizzmonkey.vercel.app/exams/ccdv-f'));
    const b = proxy(new NextRequest('https://quizzmonkey.vercel.app/exams/ccdv-f'));
    const policyA = a.headers.get('content-security-policy-report-only') ?? '';
    const nonceA = /'nonce-([^']+)'/.exec(policyA)?.[1];
    expect(nonceA).toBeTruthy();
    expect(policyA).not.toBe(b.headers.get('content-security-policy-report-only'));
    expect(a.headers.get('reporting-endpoints')).toBe('csp="https://quizzmonkey.vercel.app/api/csp-report"');
    // Next reads the nonce from the request headers it forwards to the page.
    expect(a.headers.get('x-middleware-request-x-nonce')).toBe(nonceA);
  });

  test('signed-out visitors to protected pages still go to sign-in first', () => {
    const res = proxy(new NextRequest('https://quizzmonkey.vercel.app/dashboard?x=1'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://quizzmonkey.vercel.app/sign-in?next=%2Fdashboard%3Fx%3D1');
  });

  test('skips API routes, build assets, icons, share images and crawler files', () => {
    const source = new RegExp(`^${config.matcher[0].source}$`);
    for (const path of ['/', '/explore', '/exams/ccdv-f', '/exams/ccdv-f/sample-questions', '/admin/questions']) expect(source.test(path), path).toBe(true);
    for (const path of ['/api/attempts', '/_next/static/chunks/a.js', '/_next/image', '/favicon.ico', '/icon.svg', '/apple-icon.png', '/opengraph-image', '/exams/ccdv-f/opengraph-image', '/robots.txt', '/sitemap.xml', '/llms.txt']) {
      expect(source.test(path), path).toBe(false);
    }
  });
});
