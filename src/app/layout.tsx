import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Providers } from '@/components/providers/providers';
import { cn } from '@/lib/utils';
import './globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-sans' });
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'),
  title: { default: 'quizzMonkey · Mock exams, quizzes & interview practice', template: '%s · quizzMonkey' },
  description: 'Timed certification mocks, practice drills, readiness analytics and AI mock interviews, all in one place.',
  applicationName: 'quizzMonkey',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdf8ef' },
    { media: '(prefers-color-scheme: dark)', color: '#1d1611' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(sans.variable, display.variable, mono.variable)}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
