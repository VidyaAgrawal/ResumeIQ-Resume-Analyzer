import { ArrowUpRight } from 'lucide-react';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-resumeiq">
      <div className="relative grid h-9 w-9 place-items-center rounded-[11px] bg-primary text-accent shadow-[4px_4px_0_hsl(var(--accent))]">
        <span className="font-mono-ui text-sm font-bold tracking-[-0.1em]">ri</span>
        <ArrowUpRight className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full bg-accent p-[2px] text-primary" strokeWidth={3} />
      </div>
      {!compact && <span className="text-[15px] font-extrabold tracking-[-0.04em]">Resume<span className="text-accent">IQ</span></span>}
    </div>
  );
}