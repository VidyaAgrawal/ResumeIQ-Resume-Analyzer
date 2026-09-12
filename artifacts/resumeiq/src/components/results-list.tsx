import { Check, CircleAlert, Lightbulb, Plus } from 'lucide-react';

type ListKind = 'strength' | 'gap' | 'suggestion' | 'improvement';

const config: Record<ListKind, { icon: typeof Check; color: string; label: string }> = {
  strength: { icon: Check, color: 'text-accent', label: 'What is working' },
  gap: { icon: CircleAlert, color: 'text-[hsl(var(--destructive))]', label: 'Worth adding' },
  suggestion: { icon: Plus, color: 'text-[hsl(var(--chart-4))]', label: 'Keywords to consider' },
  improvement: { icon: Lightbulb, color: 'text-[hsl(var(--chart-5))]', label: 'Make it sharper' },
};

export function ResultsList({ kind, items }: { kind: ListKind; items: string[] }) {
  const { icon: Icon, color, label } = config[kind];
  return (
    <section className="rounded-2xl border border-card-border bg-card p-5 shadow-[var(--shadow-sm)] sm:p-6" data-testid={`section-${kind}`}>
      <div className="mb-5 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} strokeWidth={2.3} />
        <h3 className="text-sm font-extrabold tracking-[-0.02em]">{label}</h3>
        <span className="ml-auto font-mono-ui text-[10px] text-muted-foreground">{items.length.toString().padStart(2, '0')}</span>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li className="flex gap-3 text-[13px] leading-6 text-muted-foreground" key={`${kind}-${index}`} data-testid={`item-${kind}-${index}`}>
              <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${kind === 'strength' ? 'bg-accent' : kind === 'gap' ? 'bg-[hsl(var(--destructive))]' : 'bg-primary'}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] leading-6 text-muted-foreground">No items surfaced in this review.</p>
      )}
    </section>
  );
}