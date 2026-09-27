'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowUp, Sparkles } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { RichText } from '@/components/player/rich-text';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface Message { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Why was my answer wrong?',
  'Explain the correct answer simply.',
  'Give me a similar example to test myself.',
  'What should I remember for the exam?',
];

/** "Ask the tutor" button + streaming chat about one question. */
export function TutorButton({ questionId, attemptId, wasCorrect, size = 'sm' }: { questionId: string; attemptId?: string; wasCorrect?: boolean; size?: 'sm' | 'default' }) {
  const desktop = useMediaQuery('(min-width: 768px)', true);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  const ask = useMutation({
    mutationFn: async (text: string) => {
      const history: Message[] = [...messages, { role: 'user', content: text }];
      // Optimistic: the question shows at once, with an empty reply that fills as it streams.
      setMessages([...history, { role: 'assistant', content: '' }]);
      setInput('');
      setStreaming(true);
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId, attemptId, messages: history }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'The tutor is unavailable right now.');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => m.map((msg, i) => (i === m.length - 1 ? { ...msg, content: msg.content + chunk } : msg)));
      }
    },
    onError: (err) => {
      setMessages((m) => m.map((msg, i) => (i === m.length - 1 && msg.role === 'assistant' && !msg.content ? { ...msg, content: `_${err instanceof Error ? err.message : 'Something went wrong.'}_` } : msg)));
    },
    onSettled: () => setStreaming(false),
  });

  const send = (text: string) => { if (text.trim() && !streaming) ask.mutate(text.trim()); };
  const suggestions = wasCorrect ? SUGGESTIONS.slice(1) : SUGGESTIONS;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size={size} className="border-primary/30 text-primary hover:text-primary"><Sparkles /> Ask the tutor</Button>
      </SheetTrigger>
      <SheetContent side={desktop ? 'right' : 'bottom'} className={cn('flex flex-col gap-0 p-0', desktop ? 'w-full sm:max-w-md' : 'h-[85dvh] rounded-t-3xl')}>
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2"><LogoMark className="size-7" /> certMonkey tutor</SheetTitle>
          <SheetDescription>Ask anything about this question. Answers are grounded in its explanation.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Try one of these:</p>
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="block w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/30">{s}</button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' && 'justify-end')}>
              {m.role === 'user' ? (
                <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">{m.content}</p>
              ) : m.content ? (
                <RichText text={m.content} className="max-w-[92%] rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2.5 text-sm" />
              ) : (
                <div className="w-3/4 space-y-2 rounded-2xl rounded-tl-sm border bg-card p-3.5"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /><Skeleton className="h-3 w-2/3" /></div>
              )}
            </div>
          ))}
          <div ref={bottom} />
        </div>

        <div className="border-t p-3">
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-1.5 focus-within:border-primary/50">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask a follow-up…"
              rows={1}
              maxLength={2000}
              className="max-h-32 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              aria-label="Message the tutor"
            />
            <Button size="icon" variant="premium" disabled={!input.trim() || streaming} onClick={() => send(input)} aria-label="Send"><ArrowUp /></Button>
          </div>
          <p className="mt-1.5 text-center text-[0.65rem] text-muted-foreground">AI can make mistakes. The explanation and reference are the source of truth.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
