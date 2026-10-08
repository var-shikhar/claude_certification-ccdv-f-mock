import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { Providers } from '@/components/providers/providers';
import { JsonLd } from '@/components/seo/json-ld';
import { graph, organizationLd, websiteLd } from '@/lib/seo';
import { SITE_NAME, siteUrl } from '@/lib/site';
import { cn } from '@/lib/utils';
import './globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-sans' });
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display' });
// Only timers and code use it, so don't make every page preload it.
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', preload: false });

// No canonical here: it would be inherited by every page. Pages set their own.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'quizzMonkey · Mock exams, quizzes & interview practice', template: '%s · quizzMonkey' },
  description: 'Timed certification mocks, practice drills, readiness analytics and AI mock interviews, all in one place.',
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: 'website', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdf8ef' },
    { media: '(prefers-color-scheme: dark)', color: '#1d1611' },
  ],
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set by proxy.ts for the Content Security Policy (Next applies it to its own scripts).
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning className={cn(sans.variable, display.variable, mono.variable)}>
      <body className="min-h-dvh">
        <JsonLd data={graph(organizationLd(), websiteLd())} />
        <Providers nonce={nonce}>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
