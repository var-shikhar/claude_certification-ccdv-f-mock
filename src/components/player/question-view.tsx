'use client';

import { useState } from 'react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { ArrowDown, ArrowUp, Check, GripVertical, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PublicQuestion, RevealedQuestion } from '@/lib/engine/sanitize';
import { cn } from '@/lib/utils';
import { RichText } from './rich-text';

const LETTERS = 'ABCDEFGH';
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];

export interface QuestionViewProps {
  item: PublicQuestion;
  response: string[];
  onChange?: (next: string[]) => void;
  /** when set, the key and rationales are shown and the item is read-only */
  revealed?: RevealedQuestion | null;
  disabled?: boolean;
}

export function selectHint(item: Pick<PublicQuestion, 'type' | 'select'>, chosen = 0) {
  switch (item.type) {
    case 'multi': return `Select ${WORDS[item.select] ?? item.select}${chosen ? ` · ${chosen} of ${item.select} chosen` : ''}.`;
    case 'order': return 'Drag the items (or use the arrows) into the right order.';
    case 'match': return 'Match each item on the left with one option.';
    case 'fill': return 'Type your answer.';
    case 'truefalse': return 'True or false?';
    default: return 'Select one.';
  }
}

export function QuestionView(props: QuestionViewProps) {
  const { item } = props;
  return <QuestionBody key={`${item.id}:${item.type}:${item.options.map((o) => o.id).join('')}`} {...props} />;
}

function QuestionBody({ item, response, onChange, revealed, disabled }: QuestionViewProps) {
  const readOnly = Boolean(revealed) || disabled || !onChange;
  const change = (next: string[]) => { if (!readOnly) onChange?.(next); };
  switch (item.type) {
    case 'order':
      return <OrderList item={item} response={response} onChange={change} revealed={revealed} readOnly={readOnly} />;
    case 'match':
      return <MatchList item={item} response={response} onChange={change} revealed={revealed} readOnly={readOnly} />;
    case 'fill':
      return <FillIn response={response} onChange={change} revealed={revealed} readOnly={readOnly} />;
    default:
      return <OptionList item={item} response={response} onChange={change} revealed={revealed} readOnly={readOnly} />;
  }
}

// ---------------------------------------------------------------- choice

function OptionList({ item, response, onChange, revealed, readOnly }: {
  item: PublicQuestion; response: string[]; onChange: (r: string[]) => void; revealed?: RevealedQuestion | null; readOnly: boolean;
}) {
  const multi = item.type === 'multi';
  const atCap = multi && response.length >= item.select;
  const keyed = new Map(revealed?.options.map((o) => [o.id, o]) ?? []);

  function toggle(id: string) {
    if (!multi) return onChange([id]);
    if (response.includes(id)) return onChange(response.filter((x) => x !== id));
    if (atCap) return;
    onChange([...response, id]);
  }

  return (
    <fieldset className="space-y-2.5" aria-label="Answer options">
      {item.options.map((o, i) => {
        const selected = response.includes(o.id);
        const key = keyed.get(o.id);
        const isKey = key?.correct;
        const wrongPick = revealed && selected && !isKey;
        const dim = !revealed && !readOnly && multi && atCap && !selected;
        return (
          <label
            key={o.id}
            className={cn(
              'group relative flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-3.5 transition-all duration-200 sm:p-4',
              !readOnly && 'hover:border-primary/40 hover:bg-accent/40',
              selected && !revealed && 'border-primary bg-primary/[0.07] shadow-[0_0_0_1px_var(--primary)]',
              isKey && 'border-success/60 bg-success/[0.08]',
              wrongPick && 'border-destructive/60 bg-destructive/[0.07]',
              revealed && !isKey && !wrongPick && 'opacity-80',
              dim && 'opacity-50',
              readOnly && 'cursor-default',
            )}
          >
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={`q-${item.id}`}
              value={o.id}
              checked={selected}
              disabled={readOnly || dim}
              onChange={() => toggle(o.id)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                'mt-0.5 grid size-7 shrink-0 place-items-center border text-xs font-bold transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                multi ? 'rounded-lg' : 'rounded-full',
                selected && !revealed && 'border-primary bg-primary text-primary-foreground',
                isKey && 'border-success bg-success text-success-foreground',
                wrongPick && 'border-destructive bg-destructive text-white',
              )}
            >
              {isKey ? <Check className="size-4" /> : wrongPick ? <X className="size-4" /> : LETTERS[i]}
            </span>
            <span className="min-w-0 flex-1 space-y-2 pt-0.5">
              <RichText text={o.text} className="text-[0.95rem]" />
              <AnimatePresence initial={false}>
                {key?.why && (
                  <motion.span
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="block overflow-hidden"
                  >
                    <span className={cn('block rounded-xl px-3 py-2 text-sm', isKey ? 'bg-success/10' : 'bg-muted')}>
                      <b className={isKey ? 'text-success' : 'text-muted-foreground'}>{isKey ? 'Correct. ' : 'Incorrect. '}</b>
                      <RichText text={key.why} className="inline text-muted-foreground [&>p]:inline" />
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            {revealed && selected && (
              <span className="absolute -top-2 right-3 rounded-full border bg-background px-2 py-px text-[0.65rem] font-semibold text-muted-foreground">Your answer</span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

// ---------------------------------------------------------------- ordering

function OrderList({ item, response, onChange, revealed, readOnly }: {
  item: PublicQuestion; response: string[]; onChange: (r: string[]) => void; revealed?: RevealedQuestion | null; readOnly: boolean;
}) {
  const byId = new Map(item.options.map((o) => [o.id, o]));
  const initial = response.length === item.options.length ? response : item.options.map((o) => o.id);
  const [order, setOrder] = useState(initial);

  const commit = (next: string[]) => { setOrder(next); onChange(next); };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    commit(next);
  };

  if (revealed) {
    const key = revealed.answerOrder ?? [];
    const mine = response.length ? response : [];
    return (
      <ol className="space-y-2">
        {key.map((id, i) => {
          const right = mine[i] === id;
          return (
            <li key={id} className={cn('flex items-start gap-3 rounded-2xl border p-3.5', right ? 'border-success/50 bg-success/[0.07]' : 'border-destructive/40 bg-destructive/[0.05]')}>
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-success text-xs font-bold text-success-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <RichText text={byId.get(id)?.text} className="text-[0.95rem]" />
                {!right && mine.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">You placed this {ordinal(mine.indexOf(id) + 1)}.</p>
                )}
              </div>
              {right ? <Check className="size-4 text-success" /> : <X className="size-4 text-destructive" />}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className="space-y-2">
      <Reorder.Group axis="y" values={order} onReorder={readOnly ? () => {} : setOrder} className="space-y-2">
        {order.map((id, i) => (
          <Reorder.Item
            key={id}
            value={id}
            dragListener={!readOnly}
            onDragEnd={() => onChange(order)}
            className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs active:cursor-grabbing"
            whileDrag={{ scale: 1.02, boxShadow: '0 12px 30px -12px oklch(0.38 0.06 45 / 0.35)' }}
          >
            <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
            <span className="grid size-7 shrink-0 place-items-center rounded-lg border text-xs font-bold">{i + 1}</span>
            <RichText text={byId.get(id)?.text} className="min-w-0 flex-1 text-[0.95rem]" />
            {!readOnly && (
              <span className="flex shrink-0 flex-col">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move up"><ArrowUp className="size-3.5" /></button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === order.length - 1} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move down"><ArrowDown className="size-3.5" /></button>
              </span>
            )}
          </Reorder.Item>
        ))}
      </Reorder.Group>
      {!readOnly && response.length === 0 && (
        <button type="button" onClick={() => onChange(order)} className="text-sm font-medium text-primary hover:underline">
          This order is my answer
        </button>
      )}
    </div>
  );
}

const ordinal = (n: number) => (n <= 0 ? '—' : `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`);

// ---------------------------------------------------------------- matching

function MatchList({ item, response, onChange, revealed, readOnly }: {
  item: PublicQuestion; response: string[]; onChange: (r: string[]) => void; revealed?: RevealedQuestion | null; readOnly: boolean;
}) {
  const chosen = new Map(response.map((p) => p.split('=') as [string, string]));
  const answers = new Map(revealed?.prompts?.map((p) => [p.id, p.answer]) ?? []);
  const optionText = new Map(item.options.map((o) => [o.id, o.text]));

  function set(promptId: string, optionId: string) {
    const next = new Map(chosen);
    next.set(promptId, optionId);
    onChange([...next].map(([p, o]) => `${p}=${o}`));
  }

  return (
    <div className="space-y-2.5">
      {(item.prompts ?? []).map((p) => {
        const mine = chosen.get(p.id);
        const key = answers.get(p.id);
        const right = revealed ? mine === key : undefined;
        return (
          <div
            key={p.id}
            className={cn(
              'grid gap-2 rounded-2xl border bg-card p-3.5 sm:grid-cols-[1fr_minmax(0,1.1fr)] sm:items-center',
              right === true && 'border-success/50 bg-success/[0.07]',
              right === false && 'border-destructive/40 bg-destructive/[0.05]',
            )}
          >
            <RichText text={p.text} className="text-[0.95rem] font-medium" />
            {revealed ? (
              <div className="space-y-1 text-sm">
                <div className="flex items-start gap-1.5"><Check className="mt-0.5 size-4 shrink-0 text-success" /><span>{optionText.get(key ?? '')}</span></div>
                {!right && <div className="flex items-start gap-1.5 text-muted-foreground"><X className="mt-0.5 size-4 shrink-0 text-destructive" /><span>{mine ? optionText.get(mine) : 'No answer'}</span></div>}
              </div>
            ) : (
              <Select value={mine ?? ''} onValueChange={(v) => set(p.id, v)} disabled={readOnly}>
                <SelectTrigger className="h-auto min-h-10 w-full whitespace-normal text-left"><SelectValue placeholder="Choose a match" /></SelectTrigger>
                <SelectContent>
                  {item.options.map((o) => <SelectItem key={o.id} value={o.id} className="whitespace-normal">{o.text}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- fill-in

function FillIn({ response, onChange, revealed, readOnly }: {
  response: string[]; onChange: (r: string[]) => void; revealed?: RevealedQuestion | null; readOnly: boolean;
}) {
  const [value, setValue] = useState(response[0] ?? '');
  if (revealed) {
    return (
      <div className="space-y-2">
        <div className="rounded-2xl border bg-card p-3.5 text-sm">
          <span className="text-muted-foreground">Your answer: </span>
          <span className="font-medium">{response[0]?.trim() || 'No answer'}</span>
        </div>
        <div className="rounded-2xl border border-success/50 bg-success/[0.07] p-3.5 text-sm">
          <span className="text-muted-foreground">Accepted: </span>
          <span className="font-medium">{revealed.accepted?.join(' · ')}</span>
        </div>
      </div>
    );
  }
  return (
    <Input
      value={value}
      disabled={readOnly}
      onChange={(e) => { setValue(e.target.value); onChange([e.target.value]); }}
      placeholder="Type your answer"
      className="h-12 rounded-xl text-base"
      autoComplete="off"
      spellCheck={false}
    />
  );
}
