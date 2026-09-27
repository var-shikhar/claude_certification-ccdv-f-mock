import Link from 'next/link';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <LogoMark className="mx-auto size-16 animate-float" />
        <p className="mt-6 font-heading text-6xl font-bold text-gradient">404</p>
        <h1 className="mt-2 text-2xl font-bold">This page swung off somewhere</h1>
        <p className="mt-2 text-muted-foreground">The link may be old, or the page moved. Let&apos;s get you back to practising.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="premium"><Link href="/">Go home</Link></Button>
          <Button asChild variant="outline"><Link href="/explore">Explore exams</Link></Button>
        </div>
      </div>
    </div>
  );
}
