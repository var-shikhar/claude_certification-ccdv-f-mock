import type { NextConfig } from 'next';

// Crawlers that read raw HTML without running JavaScript get each page's title and description
// in <head> rather than streamed later. Setting this replaces Next's own list, so that list is
// repeated here (next/dist/shared/lib/router/utils/html-bots.js, Next 16.3), followed by AI
// search and answer crawlers, which also read raw HTML.
const NEXT_DEFAULT_HTML_LIMITED_BOTS = String.raw`[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight`;
const AI_CRAWLERS = 'GPTBot|OAI-SearchBot|ChatGPT-User|PerplexityBot|Perplexity-User|ClaudeBot|Claude-SearchBot|Claude-User|anthropic-ai|CCBot|cohere-ai|Amazonbot|DuckAssistBot|meta-externalagent|MistralAI-User|YouBot';

// The parts of the Content Security Policy that are safe to enforce right away. Browsers ignore
// frame-ancestors in a report-only policy, so clickjacking protection can't wait for the full
// policy (src/lib/csp.ts, report-only until CSP_ENFORCE=1, which then supersedes this).
const BASELINE_CSP = "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'";

const SECURITY_HEADERS = [
  ...(process.env.CSP_ENFORCE === '1' ? [] : [{ key: 'Content-Security-Policy', value: BASELINE_CSP }]),
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Only what the app uses: fullscreen (the exam player), clipboard and Web Share (copying and sharing links).
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self), clipboard-write=(self), web-share=(self)' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  // PGlite ships WebAssembly and must be loaded by Node at runtime, not bundled.
  serverExternalPackages: ['@electric-sql/pglite'],
  // `npm run build` type-checks the project's own sources first (tsconfig.typecheck.json).
  // Next's built-in pass also reads .next/dev/types, which a running `next dev` rewrites
  // mid-build, so it is skipped rather than failing on half-written generated files.
  typescript: { ignoreBuildErrors: true },
  htmlLimitedBots: new RegExp(`${NEXT_DEFAULT_HTML_LIMITED_BOTS}|${AI_CRAWLERS}`, 'i'),
};

export default nextConfig;
