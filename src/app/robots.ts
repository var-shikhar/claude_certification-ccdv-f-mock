import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

// One group for every crawler, AI search and answer engines included (OAI-SearchBot,
// ChatGPT-User, GPTBot, PerplexityBot, ClaudeBot, Claude-SearchBot, Google-Extended…):
// public pages are meant to be found and cited, and question banks are never public.
// To keep AI training crawlers out later, add a group per user agent with `disallow: '/'`
// (a crawler that matches its own group ignores this one).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/attempt/', '/dashboard', '/progress', '/saved', '/settings', '/teams', '/onboarding', '/interviews/'],
    }],
    sitemap: siteUrl('/sitemap.xml'),
    host: siteUrl(),
  };
}
