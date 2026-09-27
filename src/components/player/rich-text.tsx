import { Fragment } from 'react';
import { cn } from '@/lib/utils';

/**
 * Renders question text safely as React elements (never raw HTML):
 * ```fenced code```, `inline code`, **bold**, "- " bullet lines and line breaks.
 */
export function RichText({ text, className }: { text: string | null | undefined; className?: string }) {
  const source = String(text ?? '');
  const parts = source.split(/```(?:[\w-]+\n)?([\s\S]*?)```/g);
  return (
    <div className={cn('space-y-3 leading-relaxed', className)}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="overflow-x-auto rounded-xl border bg-secondary/60 p-3.5 font-mono text-[0.82rem] leading-relaxed">
            <code>{part.replace(/^\n|\n$/g, '')}</code>
          </pre>
        ) : (
          <Paragraphs key={i} text={part} />
        ),
      )}
    </div>
  );
}

function Paragraphs({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => <li key={j}><Inline text={l.replace(/^\s*[-•]\s+/, '')} /></li>)}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inline text={l} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

function Inline({ text }: { text: string }) {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.startsWith('`') && t.endsWith('`') && t.length > 2) {
          return <code key={i} className="rounded-md border bg-secondary/70 px-1.5 py-0.5 font-mono text-[0.85em]">{t.slice(1, -1)}</code>;
        }
        if (t.startsWith('**') && t.endsWith('**') && t.length > 4) return <strong key={i}>{t.slice(2, -2)}</strong>;
        return <Fragment key={i}>{t}</Fragment>;
      })}
    </>
  );
}
