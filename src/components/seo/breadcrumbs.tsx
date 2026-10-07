import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/** A breadcrumb trail as an ordered list, the last item marked as the current page. */
export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((it, i) => (
          <li key={`${i}-${it.name}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight aria-hidden className="size-3.5" />}
            {it.href ? (
              <Link href={it.href} className="hover:text-foreground">{it.name}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined} className={i === items.length - 1 ? 'text-foreground' : undefined}>{it.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
