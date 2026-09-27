import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const url = (process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/attempt/', '/dashboard', '/progress', '/saved', '/settings', '/teams', '/onboarding', '/interviews/'],
    }],
    sitemap: `${url}/sitemap.xml`,
  };
}
