'use client';

import { Copy, Printer, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function CertificateActions({ url, title }: { url: string; title: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Verification link copied');
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  }
  const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  return (
    <div className="flex flex-wrap justify-center gap-2 print:hidden">
      <Button variant="premium" onClick={() => window.print()}><Printer /> Print or save as PDF</Button>
      <Button variant="outline" onClick={copy}><Copy /> Copy verify link</Button>
      <Button asChild variant="outline"><a href={linkedIn} target="_blank" rel="noopener noreferrer" aria-label={`Share ${title} on LinkedIn`}><Share2 /> Share on LinkedIn</a></Button>
    </div>
  );
}
