import type { Metadata } from 'next';
import { Reveal } from '@/components/common/reveal';
import { SavedList } from '@/components/saved/saved-list';
import { aiEnabled } from '@/server/ai/client';
import { listBookmarks } from '@/server/library';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Saved questions' };

export default async function SavedPage() {
  const user = await requireUser('/saved');
  const items = await listBookmarks(user.id);
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <Reveal className="space-y-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Saved questions</h1>
        <p className="text-muted-foreground">Your personal revision list, with your own notes. Practise them any time.</p>
      </Reveal>
      <SavedList initial={items} aiTutor={aiEnabled()} />
    </div>
  );
}
