import type { NextConfig } from 'next';

// Crawlers that read raw HTML without running JavaScript get each page's title and description
// in <head> rather than streamed later. Setting this replaces Next's own list, so that list is
// repeated here (next/dist/shared/lib/router/utils/html-bots.js, Next 16.3), followed by AI
// search and answer crawlers, which also read raw HTML.
const NEXT_DEFAULT_HTML_LIMITED_BOTS = String.raw`[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight`;
const AI_CRAWLERS = 'GPTBot|OAI-SearchBot|ChatGPT-User|PerplexityBot|Perplexity-User|ClaudeBot|Claude-SearchBot|Claude-User|anthropic-ai|CCBot|cohere-ai|Amazonbot|DuckAssistBot|meta-externalagent|MistralAI-User|YouBot';

const nextConfig: NextConfig = {
  // PGlite ships WebAssembly and must be loaded by Node at runtime, not bundled.
  serverExternalPackages: ['@electric-sql/pglite'],
  // `npm run build` type-checks the project's own sources first (tsconfig.typecheck.json).
  // Next's built-in pass also reads .next/dev/types, which a running `next dev` rewrites
  // mid-build, so it is skipped rather than failing on half-written generated files.
  typescript: { ignoreBuildErrors: true },
  htmlLimitedBots: new RegExp(`${NEXT_DEFAULT_HTML_LIMITED_BOTS}|${AI_CRAWLERS}`, 'i'),
};

export default nextConfig;
