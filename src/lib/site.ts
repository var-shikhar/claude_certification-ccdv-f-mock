// The public address of the site: every absolute URL that search engines, AI
// crawlers and shared links see is built from it (canonical links, the sitemap,
// robots.txt, structured data, llms.txt, certificate verify links).
//
// Set SITE_URL when the site moves to its own domain. Sign-in keeps using
// BETTER_AUTH_URL, the address the app is actually served from.

export const DEFAULT_SITE_URL = 'https://quizzmonkey.vercel.app';
export const SITE_NAME = 'quizzMonkey';

/** The site's origin, or an absolute URL for `path` on it. Accepts SITE_URL with or without a scheme. */
export function siteUrl(path = ''): string {
  const raw = process.env.SITE_URL?.trim() || DEFAULT_SITE_URL;
  const origin = (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, '');
  if (!path) return origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
